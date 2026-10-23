// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {WebAuthn} from "solady/utils/WebAuthn.sol";
import {ThunaiVault} from "../src/ThunaiVault.sol";
import {PasskeySigner} from "./utils/PasskeySigner.sol";
import {ThunaiFixture} from "./ThunaiVault.t.sol";

/// @notice SafeSend rule 3: many small payments that add up past the guardian's limit are
///         held, even to a saved payee, just like one big payment would be.
contract SpendLimitTest is ThunaiFixture {
    uint8 internal constant REASON_OVER_CAP = 2;
    uint8 internal constant REASON_NEW_PAYEE = 1;
    uint8 internal constant REASON_OVER_PERIOD_LIMIT = 7;

    function setUp() public override {
        super.setUp();
        _giveArjunBalance(5_000 * USD);
        // 1,000 a day in total; each payment is still capped at 1,000 by the envelope.
        _setLimit(1_000 * USD, 1 days, AMMA_PASSKEY);
    }

    function _setLimit(uint128 limit, uint64 period, uint256 passkey) internal {
        bytes32 challenge = vault.spendLimitChallenge(familyId, limit, period);
        WebAuthn.WebAuthnAuth memory auth = PasskeySigner.sign(passkey, challenge);
        vm.prank(relayer);
        vault.setSpendLimit(familyId, limit, period, auth);
    }

    function test_LimitIsStoredAfterGuardianFaceId() public view {
        (uint128 limit, uint64 period) = vault.spendLimit(familyId);
        assertEq(limit, 1_000 * USD);
        assertEq(period, 1 days);
    }

    function test_StrangerCannotSetLimit() public {
        bytes32 challenge = vault.spendLimitChallenge(familyId, 0, 0);
        WebAuthn.WebAuthnAuth memory auth = PasskeySigner.sign(STRANGER_PASSKEY, challenge);
        vm.prank(relayer);
        vm.expectRevert(ThunaiVault.BadSignature.selector);
        vault.setSpendLimit(familyId, 0, 0, auth);
    }

    function test_LimitAssertionCannotBeReplayed() public {
        bytes32 challenge = vault.spendLimitChallenge(familyId, 0, 0);
        WebAuthn.WebAuthnAuth memory auth = PasskeySigner.sign(AMMA_PASSKEY, challenge);
        vm.prank(relayer);
        vault.setSpendLimit(familyId, 0, 0, auth);
        vm.prank(relayer);
        vm.expectRevert(ThunaiVault.BadSignature.selector);
        vault.setSpendLimit(familyId, 0, 0, auth);
    }

    function test_PaymentsUnderTheTotalGoThrough() public {
        assertEq(_withdraw(landlord, 400 * USD, "rent 1", landlordProof), 0);
        assertEq(_withdraw(landlord, 600 * USD, "rent 2", landlordProof), 0);
        assertEq(vault.spentThisPeriod(familyId), 1_000 * USD);
    }

    function test_SmallPaymentsThatAddUpPastTheLimitAreHeld() public {
        _withdraw(landlord, 400 * USD, "one", landlordProof);
        _withdraw(landlord, 400 * USD, "two", landlordProof);
        uint256 holdId = _withdraw(landlord, 400 * USD, "three", landlordProof);
        assertGt(holdId, 0);
        assertEq(vault.hold(holdId).reason, REASON_OVER_PERIOD_LIMIT);
        assertEq(ausd.balanceOf(landlord), 800 * USD);
    }

    function test_SingleCapStillTakesPriority() public {
        uint256 holdId = _withdraw(landlord, 1_500 * USD, "big", landlordProof);
        assertEq(vault.hold(holdId).reason, REASON_OVER_CAP);
    }

    function test_WindowResetsAfterThePeriod() public {
        _withdraw(landlord, 900 * USD, "one", landlordProof);
        vm.warp(block.timestamp + 1 days);
        assertEq(vault.spentThisPeriod(familyId), 0);
        assertEq(_withdraw(landlord, 900 * USD, "two", landlordProof), 0);
    }

    function test_WindowDoesNotResetEarly() public {
        _withdraw(landlord, 900 * USD, "one", landlordProof);
        vm.warp(block.timestamp + 1 days - 1);
        uint256 holdId = _withdraw(landlord, 200 * USD, "two", landlordProof);
        assertEq(vault.hold(holdId).reason, REASON_OVER_PERIOD_LIMIT);
    }

    function test_ApprovedHoldCountsTowardsTheTotal() public {
        uint256 holdId = _withdraw(scammer, 800 * USD, "new", _noProof());
        assertEq(vault.hold(holdId).reason, REASON_NEW_PAYEE);
        _resolve(holdId, true, AMMA_PASSKEY);
        assertEq(vault.spentThisPeriod(familyId), 800 * USD);
        uint256 next = _withdraw(landlord, 300 * USD, "rent", landlordProof);
        assertEq(vault.hold(next).reason, REASON_OVER_PERIOD_LIMIT);
    }

    function test_StoppedOrExpiredHoldsDoNotCount() public {
        uint256 a = _withdraw(scammer, 800 * USD, "a", _noProof());
        _resolve(a, false, AMMA_PASSKEY);
        uint256 b = _withdraw(scammer, 800 * USD, "b", _noProof());
        vm.warp(block.timestamp + 31 minutes);
        vault.expireHold(b);
        assertEq(vault.spentThisPeriod(familyId), 0);
    }

    function test_ZeroLimitTurnsTheRuleOff() public {
        _setLimit(0, 0, AMMA_PASSKEY);
        _withdraw(landlord, 1_000 * USD, "one", landlordProof);
        assertEq(_withdraw(landlord, 1_000 * USD, "two", landlordProof), 0);
    }
}
