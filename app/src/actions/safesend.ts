import { Platform } from "react-native";
import { toUnits } from "@thunai/shared";
import { api } from "@/api/client";
import { createThunaiAccount, signActionHash } from "@/mera/account";
import { getDeviceState, setDeviceState } from "@/state/store";
import { BASE_PATH, rpId } from "@/config";

/**
 * SafeSend actions: the rolling total limit and the backup guardian.
 *
 * Both are authorised by the main guardian's Face ID and checked by the contract. The
 * server only relays them.
 */

/** Sets "no more than $X in total every N days without asking me". 0 turns it off. */
export async function setRollingLimit(options: { familyId: string; limitUsd: number; days: number }) {
  const periodLimit = options.limitUsd > 0 ? toUnits(options.limitUsd).toString() : "0";
  const period = options.limitUsd > 0 ? String(Math.round(options.days * 24 * 60 * 60)) : "0";
  const { challenge } = await api.limitChallenge({ familyId: options.familyId, periodLimit, period });
  const auth = await signActionHash({ rpId: rpId(), actionHash: challenge, credential: getDeviceState().credential });
  return api.setLimit({ familyId: options.familyId, periodLimit, period, auth });
}

export function backupInviteUrl(code: string): string {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return `${window.location.origin}${BASE_PATH}/onboard/backup?code=${code}`;
  }
  return `https://thunai.app/onboard/backup?code=${code}`;
}

/** Step 1, on the main guardian's phone: make a link for the backup guardian. */
export async function inviteBackup(familyId: string): Promise<string> {
  const { code } = await api.backupInvite(familyId);
  return backupInviteUrl(code);
}

/** Step 2, on the backup's own phone: create their passkey. They have no power yet. */
export async function joinAsBackup(code: string, name: string) {
  const { account } = await createThunaiAccount({ rpId: rpId(), role: "guardian", displayName: name });
  const joined = await api.backupJoin({ code, name, passkey: account.passkey, acct: account.address });
  await setDeviceState({
    role: "guardian",
    familyId: joined.familyId,
    credential: account.credential,
    address: account.address,
    duressAddress: account.duressAddress,
    onboardedAt: Date.now(),
    isBackup: true,
  });
  return joined;
}

/** Step 3, on the main guardian's phone: approve the backup with Face ID. */
export async function approveBackup(familyId: string) {
  const { challenge } = await api.backupChallenge(familyId);
  const auth = await signActionHash({ rpId: rpId(), actionHash: challenge, credential: getDeviceState().credential });
  return api.backupApprove({ familyId, auth });
}
