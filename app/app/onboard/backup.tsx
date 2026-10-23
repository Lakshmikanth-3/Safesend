import { useEffect, useState } from "react";
import { TextInput } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Body, Card, ErrorNote, Field, Screen, SecondaryButton, Small, Title, TrustButton, styles as ui } from "@/ui/components";
import { colors } from "@/theme";
import { api } from "@/api/client";
import { joinAsBackup } from "@/actions/safesend";

/**
 * Joining as a backup guardian.
 *
 * Creating the passkey here gives no power on its own: the main guardian still has to
 * approve it with their Face ID, and only then will the contract accept this person's
 * Stop or Approve on a paused payment.
 */
export default function JoinAsBackup() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const code = params.code ?? "";

  const [info, setInfo] = useState<{ studentName: string; guardianName: string; status: string } | undefined>();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!code) return;
    api
      .backupInviteInfo(code)
      .then(setInfo)
      .catch((cause) => setError((cause as Error).message));
  }, [code]);

  async function join() {
    if (!name.trim()) {
      setError("Please type your name.");
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      await joinAsBackup(code, name.trim());
      setJoined(true);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!code) {
    return (
      <Screen>
        <ErrorNote message="This link is missing its code. Ask for a new link." />
      </Screen>
    );
  }

  if (joined) {
    return (
      <Screen>
        <Card tone={{ bg: colors.heldSoft }}>
          <Title>Almost done</Title>
          <Body>
            {info?.guardianName ?? "The main guardian"} now needs to approve you in their SafeSend app. After that,
            you will be able to stop or approve {info?.studentName ?? "their"} paused payments.
          </Body>
        </Card>
        <SecondaryButton label="Continue" onPress={() => router.replace("/guardian")} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Title>Become a backup guardian</Title>
      <Card>
        <Body>
          {info
            ? `${info.guardianName} has asked you to be a backup guardian for ${info.studentName}.`
            : "Checking the link…"}
        </Body>
        <Small>
          If {info?.guardianName ?? "the main guardian"} cannot be reached, you will be asked to check a paused payment
          and either stop it or approve it. You cannot change any limits.
        </Small>
        <Field label="Your name">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Mei Ling"
            placeholderTextColor={colors.inkFaint}
            style={ui.input}
            editable={!busy}
          />
        </Field>
      </Card>
      <TrustButton label="Join with Face ID" onPress={join} busy={busy} disabled={!info || info.status === "active"} />
      {info?.status === "active" ? <Small>This family already has a backup guardian.</Small> : null}
      {error ? <ErrorNote message={error} /> : null}
    </Screen>
  );
}
