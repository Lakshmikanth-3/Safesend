import { Text, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { fonts } from "@/theme";

/** SafeSend teal, from the brand logo. The deeper shade keeps text readable on white. */
export const BRAND = { teal: "#00C8C8", tealDeep: "#00838F", ink: "#0B1A0F" };

/**
 * The SafeSend mark: a wallet with a lock on it. Drawn as vector, so it is sharp at any
 * size and sits on the page instead of in a pasted-in black square.
 */
export function LogoMark({ size = 64 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" accessibilityLabel="SafeSend">
      <Defs>
        <LinearGradient id="ss-teal" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#14E8E8" />
          <Stop offset="1" stopColor="#00909C" />
        </LinearGradient>
      </Defs>
      {/* the wallet's back flap */}
      <Path d="M12 18 L44 9 a4 4 0 0 1 5 3 L51 18" fill="none" stroke="url(#ss-teal)" strokeWidth={3.5} strokeLinejoin="round" strokeLinecap="round" />
      {/* the wallet body */}
      <Rect x={8} y={18} width={46} height={36} rx={7} fill="none" stroke="url(#ss-teal)" strokeWidth={3.5} />
      {/* the clasp */}
      <Rect x={44} y={29} width={14} height={13} rx={4} fill="#FFFFFF" stroke="url(#ss-teal)" strokeWidth={3.5} />
      <Circle cx={50} cy={35.5} r={2} fill="url(#ss-teal)" />
      {/* the lock */}
      <Path d="M23 37 v-5 a6 6 0 0 1 12 0 v5" fill="none" stroke="url(#ss-teal)" strokeWidth={3.5} strokeLinecap="round" />
      <Rect x={19.5} y={36} width={19} height={14} rx={3.5} fill="url(#ss-teal)" />
      <Circle cx={29} cy={41.5} r={2.2} fill="#FFFFFF" />
      <Rect x={28} y={42.5} width={2} height={4} rx={1} fill="#FFFFFF" />
    </Svg>
  );
}

/** Mark, wordmark and tagline, for the welcome screen. */
export function Logo({ size = 88 }: { size?: number }) {
  return (
    <View style={{ alignItems: "center" }}>
      <LogoMark size={size} />
      <Text style={{ fontFamily: fonts.display, fontSize: size * 0.5, fontWeight: "800", letterSpacing: -1, marginTop: 6 }}>
        <Text style={{ color: BRAND.ink }}>Safe</Text>
        <Text style={{ color: BRAND.tealDeep }}>Send</Text>
      </Text>
      <Text style={{ fontFamily: fonts.body, fontSize: Math.max(11, size * 0.14), fontWeight: "700", letterSpacing: 3, color: BRAND.tealDeep, marginTop: 2 }}>
        LOCK. REVIEW. SEND.
      </Text>
    </View>
  );
}
