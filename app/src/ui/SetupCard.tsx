import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Body, Card, Field, Heading, SecondaryButton, Small, styles as ui } from "@/ui/components";
import { colors, radius, space, type as type_ } from "@/theme";
import { setDeviceState, useDeviceState } from "@/state/store";

/**
 * SafeSend setup, kept on this device only.
 *
 *   Large text  - for both roles.
 *   Phone       - guardian only: the protected user's number, typed in once by the
 *                 guardian. The hold screen's Call button uses this and nothing else, so a
 *                 scammer's "call me back on this number" never reaches it.
 */
export default function SetupCard({ protectedName }: { protectedName?: string }) {
  const device = useDeviceState();
  const [phone, setPhone] = useState(device.protectedUserPhone ?? "");
  const [saved, setSaved] = useState(false);
  const isGuardian = device.role === "guardian";

  return (
    <Card>
      <Heading>Setup</Heading>

      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: Boolean(device.largeText) }}
        onPress={() => void setDeviceState({ largeText: !device.largeText })}
        style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 56 }}
      >
        <Body>Large text</Body>
        <View
          style={{
            minWidth: 72,
            minHeight: 40,
            borderRadius: radius.pill,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: device.largeText ? colors.ink : colors.surfaceMuted,
          }}
        >
          <Text style={[type_.bodyStrong, { color: device.largeText ? colors.white : colors.ink }]}>
            {device.largeText ? "On" : "Off"}
          </Text>
        </View>
      </Pressable>

      {isGuardian ? (
        <>
          <Field
            label={`${protectedName ?? "Their"} phone number`}
            hint="Type it from your own contacts. The Call button only ever uses this number."
          >
            <TextInput
              value={phone}
              onChangeText={(v) => {
                setPhone(v);
                setSaved(false);
              }}
              keyboardType="phone-pad"
              placeholder="+65 9123 4567"
              placeholderTextColor={colors.inkFaint}
              style={ui.input}
            />
          </Field>
          <SecondaryButton
            label="Save phone number"
            onPress={() => {
              void setDeviceState({ protectedUserPhone: phone.trim() || undefined });
              setSaved(true);
            }}
          />
          {saved ? <Small muted={false}>Saved on this phone.</Small> : null}
          <View style={{ height: space.xs }} />
        </>
      ) : null}
    </Card>
  );
}
