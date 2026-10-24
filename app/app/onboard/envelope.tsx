import { useState } from "react";
import { TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ENVELOPE_DEFAULTS } from "@thunai/shared";
import {
  Body,
  Card,
  Divider,
  ErrorNote,
  Field,
  Proof,
  Screen,
  Small,
  Title,
  TrustButton,
  TrustSeal,
  styles as ui,
} from "@/ui/components";
import { colors, space } from "@/theme";
import { t } from "@/i18n/strings";
import { signEnvelope } from "@/actions/onboarding";
import { setDeviceState, useDeviceState } from "@/state/store";
import { setRollingLimit } from "@/actions/safesend";

/**
 * The envelope: the only configuration in the product, and the guardian signs it once.
 *
 * It is one sentence by design. "Every week $X, ask me before anything new" is a rule
 * a parent can hold in her head, and because her passkey signs it and the contract
 * verifies that signature onchain, it is a rule no server and no scammer can edit — not
 * even with Arjun's unlocked phone in hand.
 */
export default function Envelope() {
  const router = useRouter();
  const device = useDeviceState();
  const params = useLocalSearchParams<{ familyId?: string }>();
  const familyId = params.familyId ?? device.familyId;

  const [weekly, setWeekly] = useState(String(ENVELOPE_DEFAULTS.weeklyAmountUsd));
  const [cap, setCap] = useState(String(ENVELOPE_DEFAULTS.perWithdrawalCapUsd));
  const [daily, setDaily] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [latency, setLatency] = useState<number | undefined>();

  async function sign() {
    if (!familyId) {
      setError("No family on this device yet.");
      return;
    }
    const weeklyUsd = Number(weekly);
    const capUsd = Number(cap);
    if (!Number.isFinite(weeklyUsd) || weeklyUsd <= 0) {
      setError("Enter how much to send each week.");
      return;
    }
    if (!Number.isFinite(capUsd) || capUsd <= 0) {
      setError("Enter the amount above which we should ask you.");
      return;
    }

    setBusy(true);
    setError(undefined);
    try {
      const result = await signEnvelope({ familyId, weeklyUsd, capUsd });
      setLatency(result.latencyMs);
      // The rest of setup, on the same screen: the number the Call button will use, and an optional
      // daily total (a second Face ID, checked by the contract).
      if (phone.trim()) await setDeviceState({ protectedUserPhone: phone.trim() });
      const dailyUsd = Number(daily);
      if (daily.trim() && Number.isFinite(dailyUsd) && dailyUsd > 0) {
        await setRollingLimit({ familyId, limitUsd: dailyUsd, days: 1 });
      }
      router.replace("/guardian");
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen tint>
      <View style={{ gap: space.md, marginTop: space.lg }}>
        <Title>{t("envelopeTitle", "en")}</Title>
      </View>

      <Card>
        <Field label={t("weeklyAmount", "en")}>
          <TextInput
            value={weekly}
            onChangeText={setWeekly}
            keyboardType="decimal-pad"
            style={ui.input}
            editable={!busy}
          />
        </Field>

        <Divider />

        <Field
          label={t("askMeAbove", "en")}
          hint="Anything larger than this waits for your Face ID."
        >
          <TextInput
            value={cap}
            onChangeText={setCap}
            keyboardType="decimal-pad"
            style={ui.input}
            editable={!busy}
          />
        </Field>
      </Card>

      <Card>
        <Field label="Most in total per day (optional)" hint="Anything that takes the day's total over this also asks you.">
          <TextInput
            value={daily}
            onChangeText={setDaily}
            keyboardType="decimal-pad"
            placeholder="e.g. 200"
            placeholderTextColor={colors.inkFaint}
            style={ui.input}
            editable={!busy}
          />
        </Field>
        <Divider />
        <Field label="Their phone number" hint="From your own contacts. The Call button only uses this.">
          <TextInput
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="+65 9123 4567"
            placeholderTextColor={colors.inkFaint}
            style={ui.input}
            editable={!busy}
          />
        </Field>
        <Small>Add a backup guardian from your home screen after this.</Small>
      </Card>

      <Card tone={{ bg: colors.trustSoft, accent: colors.trust }}>
        <Body>{t("envelopeSummary", "en", { weekly: `$${weekly}`, cap: `$${cap}` })}</Body>
      </Card>

      <Card>
        <TrustButton
          label={t("envelopeSign", "en")}
          onPress={sign}
          busy={busy}
        />
        <Small>
          You sign this once. After that top-ups run by themselves, and we only ask you
          about things outside these rules.
        </Small>
        {latency ? (
          <TrustSeal label={t("signedBy", "en", { name: "you" })} detail={`checked by the contract · ${latency}ms`} />
        ) : null}
        <Proof>Your approval is checked by the contract, not by our server.</Proof>
      </Card>

      {error ? <ErrorNote message={error} /> : null}
    </Screen>
  );
}
