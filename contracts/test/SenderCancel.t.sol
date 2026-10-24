// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ThunaiVault} from "../src/ThunaiVault.sol";
import {ThunaiFixture} from "./ThunaiVault.t.sol";

/// @notice SafeSend: the protected user can cancel their own paused payment, and an approved
///         payment waits out a cooling-off period during which they can still cancel.
contract SenderCancelTest is ThunaiFixture {
    uint8 internal constant STATUS_RELEASED = 2;
    uint8 internal constant STATUS_CANCELLED = 3;
    uint8 internal constant STATUS_APPROVED = 5;

    function setUp() public override {
        super.setUp();
        _giveArjunBalance(2_000 * USD);
    }

    function _senderSig(uint256 holdId, uint256 key) internal view returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(key, vault.senderCancelDigest(holdId));
        return abi.encodePacked(r, s, v);
    }

    function _setCoolOff(uint64 seconds_) internal {
        vm.prank(owner);
        vault.setCoolOff(seconds_);
    }

    function test_SenderCancelsAPausedPayment() public {
        uint256 holdId = _withdraw(scammer, 1_500 * USD, "safe account", _noProof());
        vault.cancelBySender(holdId, _senderSig(holdId, arjunAcctKey));
        assertEq(vault.hold(holdId).status, STATUS_CANCELLED);
        assertEq(vault.family(familyId).balance, 2_000 * USD);
        assertEq(ausd.balanceOf(scammer), 0);
    }

    function test_StrangerCannotCancel() public {
        uint256 holdId = _withdraw(scammer, 500 * USD, "x", _noProof());
        bytes memory sig = _senderSig(holdId, 0xBAD);
        vm.expectRevert(ThunaiVault.BadSignature.selector);
        vault.cancelBySender(holdId, sig);
    }

    function test_GuardianKeyCannotCancelAsSender() public {
        uint256 holdId = _withdraw(scammer, 500 * USD, "x", _noProof());
        bytes memory sig = _senderSig(holdId, ammaAcctKey);
        vm.expectRevert(ThunaiVault.BadSignature.selector);
        vault.cancelBySender(holdId, sig);
    }

    function test_CannotCancelTwice() public {
        uint256 holdId = _withdraw(scammer, 500 * USD, "x", _noProof());
        bytes memory sig = _senderSig(holdId, arjunAcctKey);
        vault.cancelBySender(holdId, sig);
        vm.expectRevert(ThunaiVault.HoldNotOpen.selector);
        vault.cancelBySender(holdId, sig);
    }

    function test_CannotCancelAfterGuardianStopped() public {
        uint256 holdId = _withdraw(scammer, 500 * USD, "x", _noProof());
        _resolve(holdId, false, AMMA_PASSKEY);
        bytes memory sig = _senderSig(holdId, arjunAcctKey);
        vm.expectRevert(ThunaiVault.HoldNotOpen.selector);
        vault.cancelBySender(holdId, sig);
    }

    function test_WithoutCoolOffApprovalPaysAtOnce() public {
        uint256 holdId = _withdraw(scammer, 500 * USD, "gift", _noProof());
        _resolve(holdId, true, AMMA_PASSKEY);
        assertEq(vault.hold(holdId).status, STATUS_RELEASED);
        assertEq(ausd.balanceOf(scammer), 500 * USD);
    }

    function test_CoolOffDelaysPayment() public {
        _setCoolOff(10 minutes);
        uint256 holdId = _withdraw(scammer, 500 * USD, "gift", _noProof());
        _resolve(holdId, true, AMMA_PASSKEY);
        assertEq(vault.hold(holdId).status, STATUS_APPROVED);
        assertEq(ausd.balanceOf(scammer), 0);
        vm.expectRevert(ThunaiVault.HoldNotExpired.selector);
        vault.executeRelease(holdId);
        vm.warp(block.timestamp + 10 minutes);
        vault.executeRelease(holdId);
        assertEq(vault.hold(holdId).status, STATUS_RELEASED);
        assertEq(ausd.balanceOf(scammer), 500 * USD);
    }

    function test_SenderCanCancelDuringCoolOff() public {
        _setCoolOff(10 minutes);
        uint256 holdId = _withdraw(scammer, 500 * USD, "pressured", _noProof());
        _resolve(holdId, true, AMMA_PASSKEY);
        vault.cancelBySender(holdId, _senderSig(holdId, arjunAcctKey));
        assertEq(vault.hold(holdId).status, STATUS_CANCELLED);
        assertEq(vault.family(familyId).balance, 2_000 * USD);
        vm.warp(block.timestamp + 10 minutes);
        vm.expectRevert(ThunaiVault.HoldNotOpen.selector);
        vault.executeRelease(holdId);
    }

    function test_ApprovedPaymentDoesNotExpireBackToSender() public {
        _setCoolOff(10 minutes);
        uint256 holdId = _withdraw(scammer, 500 * USD, "gift", _noProof());
        _resolve(holdId, true, AMMA_PASSKEY);
        vm.warp(block.timestamp + 1 days);
        vm.expectRevert(ThunaiVault.HoldNotOpen.selector);
        vault.expireHold(holdId);
    }

    function test_OnlyOwnerSetsCoolOff() public {
        vm.expectRevert(ThunaiVault.NotOwner.selector);
        vault.setCoolOff(1);
    }
}
