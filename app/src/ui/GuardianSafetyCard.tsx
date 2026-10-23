import { useState } from "react";
import { Platform, Pressable, Share, Text, TextInput, View } from "react-native";
import { formatAusd } from "@thunai/shared";
import { Body, Card, Divider, ErrorNote, Field, Heading, Proof, SecondaryButton, Small, TrustButton, styles as ui } from "@/ui/components";
import { colors, radius, space, type as type_ } from "@/theme";
import type { FamilyState } from "@/api/client";
import { approveBackup, inviteBackup, setRollingLimit } from "@/actions/safesend";

/**
 * The main guardian's two SafeSend settings:
 *
 *   Total limit      - "no more than $X in total every day / week without asking me".
 *   Backup guardian  - a second person who can stop or approve a paused payment when the
 *                      main guardian cannot be reached.
 *
 * Both are signed with the guardian's Face ID and checked by the contract.
 */
export default function GuardianSafetyCard({
  family,
  familyId,
  onChanged,
}: {
  family: FamilyState | undefined;
  familyId: string;
  onChanged: () => void;
}) {
  const name = family?.studentName ?? "your family member";
  const limit = family?.spendLimit;
  const backup = family?.backup;

  const [limitUsd, setLimitUsd] = useState("");
  const [days, setDays] = useState<1 | 7>(7);
  const [busy, setBusy] = useState<"limit" | "invite" | "approve" | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [note, setNote] = useState<string | undefined>();
  const [link, setLink] = useState<string | undefined>();

  async function run(kind: "limit" | "invite" | "approve", task: () => Promise<void>) {
    setBusy(kind);
    setError(undefined);
    setNote(undefined);
    try {
      await task();
      onChanged();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(undefined);
    }
  }

  const current =
    limit && limit.periodLimit !== "0"
      ? `${formatAusd(BigInt(limit.periodLimit))} every ${limit.period === "86400" ? "day" : `${Math.round(Number(limit.period) / 86400)} days`}. Used so far: ${formatAusd(BigInt(limit.spent))}.`
      : "No total limit yet.";

  return (
    <Card>
      <Heading>Limits and backup guardian</Heading>

      {/* Total limit */}
      <Body>Total limit</Body>
      <Small>
        Pause anything that would take {name}&apos;s total over this amount, even to people you already approved.
      </Small>
      {limit === null ? (
        <Small muted={false}>This needs the latest SafeSend contract.</Small>
      ) : (
        <>
          <Small muted={false}>Now: {current}</Small>
          <Field label="Most in total, without asking me">
            <TextInput
              value={limitUsd}
              onChangeText={setLimitUsd}
              keyboardType="decimal-pad"
              placeholder="500"
              placeholderTextColor={colors.inkFaint}
              style={ui.input}
            />
          </Field>
          <View style={{ flexDirection: "row", gap: space.sm }}>
            {([1, 7] as const).map((d) => (
              <Pressable
                key={d}
                accessibilityRole="radio"
                accessibilityState={{ selected: days === d }}
                onPress={() => setDays(d)}
                style={{
                  flex: 1,
                  minHeight: 56,
                  borderRadius: radius.pill,
                  borderWidth: 2,
                  borderColor: days === d ? colors.ink : colors.hairline,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={[type_.bodyStrong, { color: colors.ink }]}>{d === 1 ? "Every day" : "Every week"}</Text>
              </Pressable>
            ))}
          </View>
          <TrustButton
            label="Save limit"
            subtitle="Face ID"
            busy={busy === "limit"}
            onPress={() =>
              run("limit", async () => {
                const n = Number(limitUsd);
                if (!Number.isFinite(n) || n < 0) throw new Error("Type an amount, or 0 to turn the limit off.");
                await setRollingLimit({ familyId, limitUsd: n, days });
                setNote(n > 0 ? "Limit saved." : "Limit turned off.");
                setLimitUsd("");
              })
            }
          />
        </>
      )}

      <Divider />

      {/* Backup guardian */}
      <Body>Backup guardian</Body>
      <Small>
        Someone who can stop or approve a paused payment if you cannot be reached. They cannot change any limits.
      </Small>
      {backup?.status === "active" ? (
        <Small muted={false}>✓ {backup.name} is your backup guardian.</Small>
      ) : backup?.status === "waiting" ? (
        <TrustButton
          label={`Approve ${backup.name ?? "them"} as backup`}
          subtitle="Face ID"
          busy={busy === "approve"}
          onPress={() =>
            run("approve", async () => {
              await approveBackup(familyId);
              setNote(`${backup.name ?? "They"} can now stop or approve paused payments.`);
            })
          }
        />
      ) : (
        <SecondaryButton
          label={link ? "Make a new link" : "Add a backup guardian"}
          busy={busy === "invite"}
          onPress={() =>
            run("invite", async () => {
              const url = await inviteBackup(familyId);
              setLink(url);
              if (Platform.OS !== "web") await Share.share({ message: url });
            })
          }
        />
      )}
      {link && backup?.status !== "active" ? (
        <>
          <Small muted={false}>Send this link to them. After they open it, come back here to approve them.</Small>
          <Proof>{link}</Proof>
        </>
      ) : null}

      {note ? <Small muted={false}>{note}</Small> : null}
      {error ? <ErrorNote message={error} /> : null}
    </Card>
  );
}
