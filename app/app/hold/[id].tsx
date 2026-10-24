import { useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { HOLD_REASON, HOLD_STATUS, formatAgo, formatCountdown, handleHash } from "@thunai/shared";
import {
  Amount,
  Body,
  Bullets,
  Card,
  Divider,
  ErrorNote,
  FamilyThread,
  Heading,
  Pill,
  Proof,
  Screen,
  SecondaryButton,
  Small,
  Title,
  StopButton,
  TrustButton,
  TrustSeal,
} from "@/ui/components";
import { colors, radius, reasonTone, space, type as type_ } from "@/theme";
import { t } from "@/i18n/strings";
import { RiskReports } from "@/ui/RiskReports";
import {
  GUARDIAN_CHECKLIST,
  OFFICIAL_NUMBER_TIP,
  SAFETY_TIP,
  pauseReasons,
  purposeHint,
  riskReports,
  splitMemo,
} from "@/safety";
import { useAsync, useCountdown, useFamily, useHold, useHoldBrief } from "@/hooks/useThunai";
import { loadEvidence } from "@/network";
import { reportPayee, resolveHold } from "@/actions/money";
import { useDeviceState } from "@/state/store";

/**
 * The hold screen: the moment the product exists for.
 *
 * SafeSend: the protected user sees why it was paused, in plain words, and that the money
 * is safe. The guardian gets a guided review, top to bottom: what and to whom, why it was
 * paused and what the user said it is for, the reports, a checklist, a Call button that
 * only uses the number saved at setup, and then Stop or Approve.
 *
 * One route, two very different jobs:
 *
 *   Arjun sees reassurance. The money is safe, his family has been asked, and it comes
 *   back by itself if nobody answers. He is given nothing to decide, because under
 *   pressure from a scammer any button he can press is a button he can be made to press.
 *
 *   Kavya sees a decision. Two buttons, the scam named in plain words, and the line that
 *   makes stopping it easy: "Not sure? Stop it. He gets his money back."
 */
export default function HoldScreen() {
  const router = useRouter();
  const device = useDeviceState();
  const params = useLocalSearchParams<{ id?: string }>();
  const holdId = params.id;

  const { data: hold, error, refresh } = useHold(holdId);
  // The network's evidence: from the Envio indexer when it is connected, otherwise the contract's own
  // counter that the relayer already put on the hold. Either way it is the contract's number.
  const { data: evidence } = useAsync(
    async () =>
      hold
        ? loadEvidence(handleHash(hold.to), { count: hold.networkFlagCount, lastAt: hold.networkLastAt })
        : undefined,
    [hold?.to, hold?.networkFlagCount],
  );
  const { data: brief } = useHoldBrief(holdId);
  const { data: family } = useFamily(device.familyId);

  const secondsLeft = useCountdown(hold ? Number(hold.releaseAt) : undefined);
  const [busy, setBusy] = useState<"stop" | "allow" | "report" | undefined>();
  const [actionError, setActionError] = useState<string | undefined>();
  const [outcome, setOutcome] = useState<{ released: boolean; seconds: number } | undefined>();
  const [reported, setReported] = useState(false);
  const [checked, setChecked] = useState<boolean[]>(GUARDIAN_CHECKLIST.map(() => false));
  const [confirmed, setConfirmed] = useState(false);

  const lang = device.lang;
  const isGuardian = device.role === "guardian";
  const studentName = family?.studentName ?? "your family member";
  const payee = hold?.payeeName
    ? hold.payeeContact
      ? `${hold.payeeName} (${hold.payeeContact})`
      : hold.payeeName
    : "someone new";
  const settled = hold ? hold.status !== HOLD_STATUS.OPEN : false;

  async function decide(release: boolean) {
    if (!hold || !device.familyId) return;
    setBusy(release ? "allow" : "stop");
    setActionError(undefined);
    try {
      const result = await resolveHold({
        familyId: device.familyId,
        holdId: hold.holdId,
        release,
      });
      setOutcome({ released: release, seconds: result.secondsToResolve });
      refresh();
    } catch (cause) {
      setActionError((cause as Error).message);
    } finally {
      setBusy(undefined);
    }
  }

  /** Only offered after a cancel, because only a cancelled hold can back a report. */
  async function report() {
    if (!hold || !device.familyId) return;
    setBusy("report");
    setActionError(undefined);
    try {
      await reportPayee({
        familyId: device.familyId,
        holdId: hold.holdId,
        payee: hold.to,
        scriptId: brief?.classification.scriptId ?? 0,
      });
      setReported(true);
    } catch (cause) {
      setActionError((cause as Error).message);
    } finally {
      setBusy(undefined);
    }
  }

  if (error) {
    return (
      <Screen>
        <ErrorNote message={error} />
        <SecondaryButton label={t("back", lang)} onPress={() => router.replace("/")} />
      </Screen>
    );
  }

  if (!hold) {
    return (
      <Screen>
        <Small>{t("loading", lang)}</Small>
      </Screen>
    );
  }

  const tone = reasonTone(hold.reason);

  // ---------------------------------------------------- already decided

  if (settled || outcome) {
    const cancelled =
      outcome?.released === false ||
      hold.status === HOLD_STATUS.CANCELLED ||
      hold.status === HOLD_STATUS.EXPIRED;
    const expired = hold.status === HOLD_STATUS.EXPIRED;

    return (
      <Screen>
        <Card tone={{ bg: cancelled ? colors.arrivedSoft : colors.surfaceMuted }}>
          <Title>
            {expired
              ? t("noOneAnswered", lang)
              : cancelled
                ? t("guardianStoppedThis", lang, { amount: hold.amountLabel })
                : t("guardianAllowedThis", lang)}
          </Title>
          {outcome ? (
            <TrustSeal
              label={t("signedBy", lang, { name: family?.guardianName ?? "your guardian" })}
              detail={`decided in ${outcome.seconds}s`}
            />
          ) : null}
        </Card>

        {/* The network step. Available only because a guardian actually cancelled. */}
        {isGuardian && cancelled && !expired ? (
          <Card>
            <Heading>{t("reportThisPayee", lang)}</Heading>
            <Body muted>{t("reportThisPayeeBody", lang)}</Body>
            {reported ? (
              <Pill label={t("reportSent", lang)} tone="trust" icon="✓" />
            ) : (
              <TrustButton
                label={t("reportThisPayee", lang)}
                onPress={report}
                busy={busy === "report"}
              />
            )}
          </Card>
        ) : null}

        {actionError ? <ErrorNote message={actionError} /> : null}
        <SecondaryButton
          label={t("done", lang)}
          onPress={() => router.replace(isGuardian ? "/guardian" : "/student")}
        />
      </Screen>
    );
  }

  // ------------------------------------------------------------- open

  const { purpose, note } = splitMemo(brief?.memo);
  const reports = riskReports({
    contact: hold.payeeContact,
    networkCount: evidence?.count ?? hold.networkFlagCount,
    networkLastAt: evidence?.lastAt ?? hold.networkLastAt,
  });
  const reasons = pauseReasons({ reason: hold.reason, reportCount: reports.length });
  const hint = purposeHint(purpose, studentName);
  const phone = device.protectedUserPhone;
  const guardianName = family?.guardianName ?? "your guardian";

  if (!isGuardian) {
    return (
      <Screen>
        <Card tone={{ bg: tone.bg, accent: tone.accent }}>
          <Small muted={false} style={{ color: tone.fg }}>
            Paused for safety. Your money is safe.
          </Small>
          <Amount color={tone.fg}>{hold.amountLabel}</Amount>
          <Body>To {payee}</Body>
        </Card>

        <Card>
          <Heading>Why it was paused</Heading>
          <Bullets items={reasons} />
        </Card>

        <Card tone={{ bg: colors.scamSoft }}>
          <Body style={{ fontWeight: "600" }}>{SAFETY_TIP}</Body>
        </Card>

        <Card>
          <Pill label={`${guardianName} is checking  ${formatCountdown(secondsLeft)}`} tone="held" icon="⏳" />
          <Body>We have asked {guardianName} to check this payment.</Body>
          <Body muted>
            If you want to cancel it, tell {guardianName} to tap Stop. If nobody answers, your money comes back to
            you automatically.
          </Body>
        </Card>

        <RiskReports reports={reports} subject={payee} />

        <Card>
          <FamilyThread studentName={studentName} guardianName={guardianName} pulse />
        </Card>

        <SecondaryButton label={t("back", lang)} onPress={() => router.replace("/student")} />
        <Proof>
          {t("receiptNumber", lang)} #{hold.holdId} · paused {formatAgo(Number(hold.openedAt))}
        </Proof>
      </Screen>
    );
  }

  // The guardian's guided review, in the order SafeSend specifies.
  return (
    <Screen>
      {/* 1. Amount, recipient, time waiting. */}
      <Card tone={{ bg: tone.bg, accent: tone.accent }}>
        <Small muted={false} style={{ color: tone.fg }}>
          {studentName} wants to send
        </Small>
        <Amount color={tone.fg}>{hold.amountLabel}</Amount>
        <Body>To {payee}</Body>
        <Small muted={false}>
          Waiting since {formatAgo(Number(hold.openedAt))} · comes back to {studentName} automatically in{" "}
          {formatCountdown(secondsLeft)}
        </Small>
      </Card>

      {/* 2. Why it was paused, and what they said it is for. */}
      <Card>
        <Heading>Why it was paused</Heading>
        <Bullets items={reasons} />
        <Divider />
        <Body>
          {studentName} says it is for: <Text style={{ fontWeight: "700" }}>{purpose ?? "not given"}</Text>
        </Body>
        {note ? <Body muted>In their words: "{note}"</Body> : null}
        {hint ? (
          <Card tone={{ bg: colors.heldSoft }} style={{ padding: space.md }}>
            <Body>{hint}</Body>
          </Card>
        ) : null}
        {brief?.callDurationMinutes ? (
          <Small muted={false}>
            {studentName} said they have been on a call for {brief.callDurationMinutes} minutes.
          </Small>
        ) : null}
      </Card>

      {/* 3. Risk reports, with source, date and status. */}
      <RiskReports reports={reports} subject={payee} />

      {/* 4. Checklist before deciding. */}
      <Card>
        <Heading>Before you decide, check with {studentName}</Heading>
        {GUARDIAN_CHECKLIST.map((item, i) => (
          <CheckRow
            key={item}
            label={item}
            value={checked[i] ?? false}
            onToggle={() => setChecked((c) => c.map((v, j) => (j === i ? !v : v)))}
          />
        ))}
        {brief?.classification.explanation_en ? (
          <>
            <Divider />
            <Small>
              {brief.classifierSource === "model" ? "Written by AI" : "Written by SafeSend's fixed rules"}. It can be
              wrong, and it does not change the pause.
            </Small>
            <Body>{brief.classification.explanation_en}</Body>
            {brief.classification.familyQuestionSuggested ? (
              <Body muted>Suggested question: {brief.classification.familyQuestionSuggested}</Body>
            ) : null}
          </>
        ) : null}
      </Card>

      {/* 5. Call, using only the number saved at setup. */}
      {phone ? (
        <SecondaryButton
          label={family?.studentName ? `Call ${family.studentName} (${phone})` : `Call (${phone})`}
          onPress={() => void Linking.openURL(`tel:${phone.replace(/[^\d+]/g, "")}`)}
        />
      ) : (
        <Card tone={{ bg: colors.surfaceMuted }}>
          <Body>
            No phone number saved for {studentName}. Add it under "Setup" on your home screen. Never use a number
            from a message or a caller.
          </Body>
        </Card>
      )}

      {/* 6. Official-number warning. */}
      <Card tone={{ bg: colors.scamSoft }}>
        <Body>{OFFICIAL_NUMBER_TIP}</Body>
      </Card>

      {/* 7. Stop / Approve. Both are the existing passkey-signed resolveHold. */}
      <StopButton
        label="Stop transfer"
        subtitle={`Money goes back to ${studentName}`}
        onPress={() => decide(false)}
        busy={busy === "stop"}
      />
      <CheckRow
        label={`I have spoken to ${studentName} and checked this request.`}
        value={confirmed}
        onToggle={() => setConfirmed((v) => !v)}
      />
      <TrustButton
        label="Approve"
        subtitle={confirmed ? t("faceId", lang) : "Tick the box above first"}
        onPress={() => decide(true)}
        busy={busy === "allow"}
        disabled={!confirmed}
      />
      <Small muted={false} style={{ textAlign: "center" }}>
        Not sure? Stop it. {studentName} gets the money back.
      </Small>

      {actionError ? <ErrorNote message={actionError} /> : null}

      <Proof>
        {t("receiptNumber", lang)} #{hold.holdId}
      </Proof>
    </Screen>
  );
}

/** A big tick box with a label: the whole row is the target. */
function CheckRow({ label, value, onToggle }: { label: string; value: boolean; onToggle: () => void }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value }}
      onPress={onToggle}
      style={{ flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 56 }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: radius.sm,
          borderWidth: 2,
          borderColor: colors.ink,
          backgroundColor: value ? colors.ink : colors.surface,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {value ? <Text style={{ color: colors.white, fontSize: 20, fontWeight: "700" }}>✓</Text> : null}
      </View>
      <Text style={[type_.body, { color: colors.ink, flex: 1 }]}>{label}</Text>
    </Pressable>
  );
}
