import { Logo } from "@/ui/Logo";
import { useState } from "react";
import { Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ErrorNote, Small } from "@/ui/components";
import { colors, fonts, radius, shadow, space, type as type_ } from "@/theme";
import { t } from "@/i18n/strings";
import { connectionProblem, passkeySupport } from "@/config";
import { endpoints } from "@/api/client";
import { restoreFromPasskey, startAsStudent } from "@/actions/onboarding";

// eslint-disable-next-line @typescript-eslint/no-require-imports

/**
 * The landing page.
 *
 * Laid out like a social app's sign-in: a centred wordmark, one field, one big button, an
 * "or", and the other door pinned to the bottom. That is a pattern a parent already knows
 * how to read, which matters more here than being original.
 *
 * Only the student sees this. A guardian never reaches it: she arrives on
 * `/onboard/accept` from a WhatsApp link, which is the entire difference between a parent
 * who finishes setup and one who does not. The "invited as a parent" door at the bottom
 * is the fallback for a link that did not open the app directly.
 */
export default function Onboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [focused, setFocused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const support = passkeySupport();
  const connection = connectionProblem(endpoints.relayer, endpoints.agent);

  async function create() {
    if (!name.trim()) {
      setError(t("yourName", "en") + " ?");
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      await startAsStudent(name.trim());
      router.replace("/onboard/invite");
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  /**
   * The stateless restore, offered up front.
   *
   * A judge who clears storage, or a student on a new phone, needs exactly this: one
   * Face ID and everything is back. No email, no recovery phrase, no support ticket.
   */
  async function restore() {
    setRestoring(true);
    setError(undefined);
    try {
      const result = await restoreFromPasskey("student");
      if (!result) {
        setError("That Face ID is not part of a SafeSend family yet.");
        return;
      }
      router.replace("/student");
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setRestoring(false);
    }
  }

  const disabled = busy || restoring || !support.supported;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, alignItems: "center" }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            flex: 1,
            width: "100%",
            maxWidth: 380,
            paddingHorizontal: space.xl,
            paddingTop: insets.top + space.lg,
          }}
        >

          <View style={{ flex: 1, justifyContent: "center", paddingVertical: space.xxl }}>
            {/* Wordmark */}
            <View style={{ alignItems: "center", gap: space.sm, marginBottom: space.xl }}>
              <Logo size={92} />
              <Text
                style={[
                  type_.body,
                  { color: colors.inkMuted, textAlign: "center", marginTop: space.sm },
                ]}
              >
                {t("welcomeTitle", "en")}
              </Text>
            </View>

            {connection ? (
              <View style={{ marginBottom: space.md }}>
                <ErrorNote message={connection} />
              </View>
            ) : null}

            {!support.supported ? (
              <View style={{ marginBottom: space.md }}>
                <ErrorNote message={support.reason!} />
              </View>
            ) : null}

            {/* Form */}
            <View style={{ gap: space.md }}>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder={t("yourName", "en")}
                placeholderTextColor={colors.inkFaint}
                autoCapitalize="words"
                autoComplete="name"
                editable={!disabled}
                onSubmitEditing={create}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                returnKeyType="go"
                style={{
                  backgroundColor: colors.surfaceMuted,
                  borderWidth: 1,
                  borderColor: focused ? colors.ink : colors.hairline,
                  borderRadius: radius.md,
                  minHeight: 50,
                  paddingHorizontal: space.lg,
                  fontSize: 16,
                  color: colors.ink,
                }}
              />

              <Pressable
                accessibilityRole="button"
                onPress={create}
                disabled={disabled}
                style={({ pressed }) => [
                  {
                    backgroundColor: colors.trust,
                    borderRadius: radius.md,
                    minHeight: 50,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: disabled ? 0.55 : pressed ? 0.88 : 1,
                  },
                  shadow.trust as object,
                ]}
              >
                <Text style={[type_.bodyStrong, { color: colors.onTrust }]}>
                  {busy ? t("loading", "en") : t("createWithFaceId", "en")}
                </Text>
              </Pressable>

              {error ? <ErrorNote message={error} /> : null}

              {/* OR */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: space.lg, marginVertical: space.sm }}>
                <View style={{ flex: 1, height: 1, backgroundColor: colors.hairline }} />
                <Text style={[type_.label, { color: colors.inkFaint, letterSpacing: 1 }]}>OR</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: colors.hairline }} />
              </View>

              <Pressable onPress={restore} disabled={disabled} style={{ alignItems: "center", paddingVertical: space.sm }}>
                <Text style={[type_.bodyStrong, { color: colors.trustText, opacity: restoring ? 0.5 : 1 }]}>
                  {restoring ? t("loading", "en") : "I already use SafeSend"}
                </Text>
              </Pressable>

              <Small style={{ textAlign: "center" }}>
                No password. No recovery phrase. One Face ID, and nothing is stored on our servers.
              </Small>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* The other door, pinned to the bottom. */}
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: colors.hairline,
          paddingTop: space.lg,
          paddingBottom: insets.bottom + space.lg,
          alignItems: "center",
          backgroundColor: colors.surface,
        }}
      >
        <Pressable onPress={() => router.push("/onboard/accept")} hitSlop={8}>
          <Text style={[type_.small, { color: colors.inkMuted }]}>
            Family sent you a link?{" "}
            <Text style={{ color: colors.trustText, fontWeight: "700" }}>Join as a guardian</Text>
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
