// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {WebAuthn} from "solady/utils/WebAuthn.sol";
import {ThunaiVault} from "../src/ThunaiVault.sol";
import {PasskeySigner} from "./utils/PasskeySigner.sol";
import {ThunaiFixture} from "./ThunaiVault.t.sol";

/// @notice SafeSend: a backup guardian can stop or approve a paused payment when the main
///         guardian is unreachable, and can do nothing else.
contract BackupGuardianTest is ThunaiFixture {
    uint256 internal constant BACKUP_PASSKEY = 0xBAC0;

    function setUp() public override {
        super.setUp();
        _giveArjunBalance(2_000 * USD);
    }

    function _setBackup(uint256 signer, uint256 backupKey) internal {
        _setBackup(signer, backupKey, false);
    }

    /// @dev Builds the assertion first, so `expectRevert` lands on the write and not the view.
    function _setBackup(uint256 signer, uint256 backupKey, bool expectBadSignature) internal {
        bytes32 x;
        bytes32 y;
        if (backupKey != 0) (x, y) = PasskeySigner.publicKey(backupKey);
        bytes32 challenge = vault.backupGuardianChallenge(familyId, x, y);
        WebAuthn.WebAuthnAuth memory auth = PasskeySigner.sign(signer, challenge);
        vm.prank(relayer);
        if (expectBadSignature) vm.expectRevert(ThunaiVault.BadSignature.selector);
        vault.setBackupGuardian(familyId, x, y, auth);
    }

    function test_GuardianAddsBackup() public {
        _setBackup(AMMA_PASSKEY, BACKUP_PASSKEY);
        (bytes32 x,) = PasskeySigner.publicKey(BACKUP_PASSKEY);
        assertEq(vault.backupGuardian(familyId).x, x);
    }

    function test_StrangerCannotAddBackup() public {
        _setBackup(STRANGER_PASSKEY, STRANGER_PASSKEY, true);
    }

    function test_ProtectedUserCannotAddBackup() public {
        _setBackup(ARJUN_PASSKEY, ARJUN_PASSKEY, true);
    }

    function test_BackupCanStopAPausedPayment() public {
        _setBackup(AMMA_PASSKEY, BACKUP_PASSKEY);
        uint256 holdId = _withdraw(scammer, 1_500 * USD, "safe account", _noProof());
        _resolve(holdId, false, BACKUP_PASSKEY);
        assertEq(vault.family(familyId).balance, 2_000 * USD);
        assertEq(ausd.balanceOf(scammer), 0);
    }

    function test_BackupCanApproveAPausedPayment() public {
        _setBackup(AMMA_PASSKEY, BACKUP_PASSKEY);
        uint256 holdId = _withdraw(scammer, 500 * USD, "gift", _noProof());
        _resolve(holdId, true, BACKUP_PASSKEY);
        assertEq(ausd.balanceOf(scammer), 500 * USD);
    }

    function test_MainGuardianStillWorksWithABackupSet() public {
        _setBackup(AMMA_PASSKEY, BACKUP_PASSKEY);
        uint256 holdId = _withdraw(scammer, 500 * USD, "x", _noProof());
        _resolve(holdId, false, AMMA_PASSKEY);
        assertEq(vault.hold(holdId).status, 3);
    }

    function test_WithoutABackupOnlyTheGuardianCanResolve() public {
        uint256 holdId = _withdraw(scammer, 500 * USD, "x", _noProof());
        bytes32 challenge = vault.resolveChallenge(familyId, holdId, true);
        WebAuthn.WebAuthnAuth memory auth = PasskeySigner.sign(BACKUP_PASSKEY, challenge);
        vm.prank(relayer);
        vm.expectRevert(ThunaiVault.BadSignature.selector);
        vault.resolveHold(holdId, true, auth);
    }

    function test_BackupCannotChangeTheRules() public {
        _setBackup(AMMA_PASSKEY, BACKUP_PASSKEY);
        ThunaiVault.Envelope memory e = _defaultEnvelope();
        e.perWithdrawalCap = 1_000_000 * USD;
        bytes32 challenge = vault.envelopeChallenge(familyId, e);
        WebAuthn.WebAuthnAuth memory auth = PasskeySigner.sign(BACKUP_PASSKEY, challenge);
        vm.prank(relayer);
        vm.expectRevert(ThunaiVault.BadSignature.selector);
        vault.setEnvelope(familyId, e, auth);
    }

    function test_BackupCannotReplaceItself() public {
        _setBackup(AMMA_PASSKEY, BACKUP_PASSKEY);
        _setBackup(BACKUP_PASSKEY, STRANGER_PASSKEY, true);
    }

    function test_GuardianCanRemoveBackup() public {
        _setBackup(AMMA_PASSKEY, BACKUP_PASSKEY);
        _setBackup(AMMA_PASSKEY, 0);
        uint256 holdId = _withdraw(scammer, 500 * USD, "x", _noProof());
        bytes32 challenge = vault.resolveChallenge(familyId, holdId, false);
        WebAuthn.WebAuthnAuth memory auth = PasskeySigner.sign(BACKUP_PASSKEY, challenge);
        vm.prank(relayer);
        vm.expectRevert(ThunaiVault.BadSignature.selector);
        vault.resolveHold(holdId, false, auth);
    }
}
