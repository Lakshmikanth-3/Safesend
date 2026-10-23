import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import {
  Body,
  Bullets,
  Card,
  Divider,
  ErrorNote,
  Field,
  Proof,
  Screen,
  SecondaryButton,
  Small,
  Title,
  TrustButton,
  StopButton,
  Heading,
  styles as ui,
} from "@/ui/components";
import { colors, radius, space, type as type_ } from "@/theme";
import { PURPOSES, SAFETY_TIP, memoWithPurpose, pauseReasons, riskReports, type Purpose } from "@/safety";
import { RiskReports } from "@/ui/RiskReports";
import { t } from "@/i18n/strings";
import { useFamily } from "@/hooks/useThunai";
import { SessionExpiredError, sendMoney } from "@/actions/money";
import { api } from "@/api/client";
import { formatAusd, normalizeContact, toUnits } from "@thunai/shared";
import SessionPrompt from "@/ui/SessionPrompt";
import { useDeviceState } from "@/state/store";
import type { Address } from "viem";

/**
 * Sending money.
 *
 * SafeSend: before a payment that will be paused is sent, the protected user sees WHY in
 * plain words, a safety tip, and two choices: cancel (nothing is sent) or ask the guardian
 * to check (the contract holds it and the guardian reviews it). They also say what the
 * payment is for, which the guardian sees.
 *
 * "What's this for?" is required, and that is a product decision rather than a form
 * validation one. It is the strongest signal the classifier gets, and a person made to
 * type "immigration bond for ICE officer" occasionally hears what they are saying.
 *
 * The payee can be chosen from the family's schedule, which pays straight through, or
 * entered fresh by NAME and PHONE or EMAIL, which will open a hold. Nobody types or sees a
 * blockchain address: the server turns the contact into the person to pay. Both paths are shown
 * plainly so there is no surprise about which one is about to happen.
 */
export default function Send() {
  const router = useRouter();
  const device = useDeviceState();
  const { data: family } = useFamily(device.familyId);

  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  // The person to pay, once a name and contact have been looked up (or a saved person was tapped).
  const [payee, setPayee] = useState<
    | {
        address: Address;
        label: string;
        scheduled: boolean;
        contact?: string;
        reportCount?: number;
        reportLastAt?: number;
      }
    | undefined
  >();
  const [purpose, setPurpose] = useState<Purpose | undefined>();
  const [reviewing, setReviewing] = useState(false);
  const [contactError, setContactError] = useState<string | undefined>();
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [minutes, setMinutes] = useState("");
  const [busy, setBusy] = useState(false);
  const [expired, setExpired] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const lang = device.lang;
  const scheduled = family?.payees.filter((saved) => saved.scheduled) ?? [];
  const willPayThrough = payee?.scheduled ?? false;

  // Look the person up shortly after they stop typing, so the card below can say "pays straight through" or
  // "we will hold it" before anything is sent. A picked saved person skips this.
  useEffect(() => {
    if (!device.familyId || !name.trim() || !contact.trim()) {
      setContactError(undefined);
      return;
    }
    try {
      normalizeContact(contact);
    } catch (cause) {
      setPayee(undefined);
      setContactError((cause as Error).message);
      return;
    }
    setContactError(undefined);
    const familyId = device.familyId;
    const timer = setTimeout(() => {
      api
        .resolvePayee({ familyId, name: name.trim(), contact })
        .then((found) =>
          setPayee({
            address: found.address,
            label: `${found.name} (${found.contact})`,
            scheduled: found.scheduled,
            contact: found.contact,
            reportCount: found.networkFlagCount ?? 0,
            reportLastAt: found.networkLastAt ?? 0,
          }),
        )
        .catch((cause) => setContactError((cause as Error).message));
    }, 450);
    return () => clearTimeout(timer);
  }, [device.familyId, name, contact]);

  const guardianName = family?.guardianName ?? "your guardian";
  const reports = payee
    ? riskReports({ contact: payee.contact, networkCount: payee.reportCount, networkLastAt: payee.reportLastAt })
    : [];
  const capUnits = family ? BigInt(family.env.perWithdrawalCap) : 0n;
  const amountNumber = Number(amount);
  const amountOk = Number.isFinite(amountNumber) && amountNumber > 0;
  const overSingleLimit = capUnits > 0n && amountOk && toUnits(amountNumber) > capUnits;
  const reasons = pauseReasons({
    newRecipient: payee ? !payee.scheduled : false,
    reportCount: reports.length,
    overSingleLimit,
    limitLabel: capUnits > 0n ? formatAusd(capUnits) : undefined,
  });
  // A prediction for the warning screen only. The contract makes the real decision.
  const willPause = !payee?.scheduled || reports.length > 0 || overSingleLimit;

  /** First tap: check the form, then show the warning if this payment will be paused. */
  function review() {
    if (!checkForm()) return;
    if (willPause) setReviewing(true);
    else void send();
  }

  function checkForm(): boolean {
    if (!payee) {
      setError(contactError ?? "Who is this going to? Add their name and phone number or email.");
      return false;
    }
    if (!amountOk) {
      setError("How much?");
      return false;
    }
    if (!purpose) {
      setError("Please choose what this payment is for.");
      return false;
    }
    // Say it plainly before the contract does: it refuses a payment larger than the balance.
    if (family && toUnits(amountNumber) > BigInt(family.balance)) {
      setError(
        `You have ${formatAusd(BigInt(family.balance))}. Ask ${guardianName} to add money first, or send a smaller amount.`,
      );
      return false;
    }
    setError(undefined);
    return true;
  }

  async function send() {
    if (!device.familyId || !payee || !purpose) return;
    const amountUsd = amountNumber;

    setBusy(true);
    setError(undefined);
    try {
      const result = await sendMoney({
        familyId: device.familyId,
        to: payee.address,
        amountUsd,
        memo: memoWithPurpose(purpose, memo),
        callDurationMinutes: minutes ? Number(minutes) : undefined,
      });

      if (result.held) {
        router.replace(`/hold/${result.holdId}`);
      } else {
        router.replace("/student");
      }
    } catch (cause) {
      // An expired signing session is normal, not an error: ask for Face ID and go again.
      if (cause instanceof SessionExpiredError) setExpired(true);
      else setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (reviewing && payee) {
    return (
      <Screen>
        <Card tone={{ bg: colors.heldSoft, accent: colors.held }}>
          <Title>Let us check this first</Title>
          <Body>
            You are sending {formatAusd(toUnits(amountNumber))} to {payee.label}.
          </Body>
          <Heading>Why it was paused</Heading>
          <Bullets items={reasons} />
        </Card>

        <Card tone={{ bg: colors.scamSoft }}>
          <Body style={{ fontWeight: "600" }}>{SAFETY_TIP}</Body>
        </Card>

        <RiskReports reports={reports} subject={payee.label} />

        <Card>
          <Body>You said this payment is for: {purpose}.</Body>
          <Small>{guardianName} will see this.</Small>
        </Card>

        <StopButton
          label="Cancel transfer"
          subtitle="Nothing is sent"
          onPress={() => {
            setReviewing(false);
            router.replace("/student");
          }}
        />
        <SecondaryButton label={`Ask ${guardianName} to check`} onPress={send} busy={busy} />
        <Small style={{ textAlign: "center" }}>
          If {guardianName} does not answer, your money comes back to you automatically.
        </Small>
        {expired ? <SessionPrompt onRenewed={() => setExpired(false)} /> : null}
        {error ? <ErrorNote message={error} /> : null}
        <SecondaryButton label="Go back and change it" onPress={() => setReviewing(false)} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Title>{t("sendTitle", lang)}</Title>

      {expired ? <SessionPrompt onRenewed={() => setExpired(false)} /> : null}

      <Card>
        {scheduled.length > 0 ? (
          <View style={{ gap: space.sm }}>
            <Small>Already approved by {guardianName}:</Small>
            {scheduled.map((saved) => (
              <SecondaryButton
                key={saved.address}
                label={saved.name}
                onPress={() => {
                  setName("");
                  setContact("");
                  setContactError(undefined);
                  setPayee({ address: saved.address, label: saved.name, scheduled: true });
                }}
              />
            ))}
          </View>
        ) : null}

        {payee && !name && !contact ? (
          <Small>Sending to {payee.label}.</Small>
        ) : null}

        <Field label="Someone else: their name">
          <TextInput
            value={name}
            onChangeText={(value) => {
              setName(value);
              setPayee(undefined);
            }}
            placeholder="Lim Ah Kow"
            placeholderTextColor={colors.inkFaint}
            style={ui.input}
            editable={!busy}
          />
        </Field>

        <Field
          label="Their phone number or email"
          hint={contactError ?? (payee && (name || contact) ? `Sending to ${payee.label}.` : "With the country code, like +65 8123 4567.")}
        >
          <TextInput
            value={contact}
            onChangeText={(value) => {
              setContact(value);
              setPayee(undefined);
            }}
            placeholder="+65 8123 4567 or name@email.com"
            placeholderTextColor={colors.inkFaint}
            autoCapitalize="none"
            style={ui.input}
            editable={!busy}
          />
        </Field>

        <Divider />

        <Field label={t("amount", lang)}>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={colors.inkFaint}
            style={ui.input}
            editable={!busy}
          />
        </Field>
      </Card>

      <Card>
        <Field label="What is this payment for?" hint={`${guardianName} sees your answer if this needs checking.`}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
            {PURPOSES.map((p) => (
              <Pressable
                key={p}
                accessibilityRole="radio"
                accessibilityState={{ selected: purpose === p }}
                onPress={() => setPurpose(p)}
                style={{
                  minHeight: 56,
                  paddingHorizontal: space.lg,
                  justifyContent: "center",
                  borderRadius: radius.pill,
                  borderWidth: 2,
                  borderColor: purpose === p ? colors.ink : colors.hairline,
                  backgroundColor: purpose === p ? colors.surfaceMuted : colors.surface,
                }}
              >
                <Text style={[type_.bodyStrong, { color: colors.ink }]}>{p}</Text>
              </Pressable>
            ))}
          </View>
        </Field>
        <Field label="Anything else? (optional)" hint="In your own words.">
          <TextInput
            value={memo}
            onChangeText={setMemo}
            placeholder="For example: birthday gift for my grandson"
            placeholderTextColor={colors.inkFaint}
            multiline
            style={[ui.input, { minHeight: 84, textAlignVertical: "top", paddingTop: space.md }]}
            editable={!busy}
          />
        </Field>

        <Field label={t("onACall", lang)} hint={t("onACallHint", lang)}>
          <TextInput
            value={minutes}
            onChangeText={setMinutes}
            keyboardType="number-pad"
            placeholder="Minutes, if you are"
            placeholderTextColor={colors.inkFaint}
            style={ui.input}
            editable={!busy}
          />
        </Field>
      </Card>

      {/* Say what is about to happen before it happens. */}
      <Card tone={willPayThrough ? { bg: colors.arrivedSoft } : { bg: colors.heldSoft }}>
        <Body>
          {willPayThrough
            ? `This one pays straight away. ${guardianName} already approved this person.`
            : `This is someone new, so we will pause it and ask ${guardianName} first.`}
        </Body>
      </Card>

      <TrustButton label={t("sendNow", lang)} onPress={review} busy={busy} />
      {error ? <ErrorNote message={error} /> : null}

      <SecondaryButton label={t("cancel", lang)} onPress={() => router.back()} />
      <Proof>Available: {family ? formatAusd(BigInt(family.balance)) : "—"}</Proof>
    </Screen>
  );
}
