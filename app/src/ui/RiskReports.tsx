import { Linking, Pressable, Text, View } from "react-native";
import { Body, Card, Heading, Pill, Small } from "@/ui/components";
import { colors, space, type as type_ } from "@/theme";
import { correctionLink, reportCountLabel, type RiskReport } from "@/safety";

/**
 * Risk reports, shown honestly: where each one came from, when, and whether anyone has
 * verified it. A recipient with no reports is "No reports found", never "safe", because
 * the absence of reports is not evidence of anything.
 */
export function RiskReports({ reports, subject }: { reports: RiskReport[]; subject: string }) {
  return (
    <Card tone={reports.length > 0 ? { bg: colors.scamSoft, accent: colors.scam } : undefined}>
      <Heading>Reports</Heading>
      <Body>{reportCountLabel(reports)}</Body>
      {reports.length === 0 ? (
        <Small>No reports does not mean safe.</Small>
      ) : null}

      {reports.map((r, i) => (
        <View key={i} style={{ gap: space.xs, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: colors.hairline }}>
          <View style={{ flexDirection: "row", gap: space.sm, flexWrap: "wrap" }}>
            <Pill label={r.verified ? "Verified" : "Unverified"} tone={r.verified ? "scam" : "neutral"} />
          </View>
          <Body>{r.summary}</Body>
          <Small>
            {r.source}
            {" · "}{r.reportedAt ? new Date(r.reportedAt * 1000).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" }) : "date not recorded"}
          </Small>
        </View>
      ))}

      {reports.length > 0 ? (
        <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(correctionLink(subject))}>
          <Text style={[type_.body, { color: colors.ink, textDecorationLine: "underline" }]}>
            Wrong report? Ask to correct
          </Text>
        </Pressable>
      ) : null}
    </Card>
  );
}
