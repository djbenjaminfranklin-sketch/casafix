import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import { COLORS, SPACING, RADIUS } from "../constants/theme";
import { DiagnosticResult, Severity } from "../services/ai-diagnostic";

const SEVERITY_CONFIG: Record<Severity, { color: string; bg: string; icon: string }> = {
  low: { color: "#16a34a", bg: "#dcfce7", icon: "checkmark-circle" },
  medium: { color: "#d97706", bg: "#fef3c7", icon: "alert-circle" },
  high: { color: "#dc2626", bg: "#fee2e2", icon: "warning" },
  urgent: { color: "#991b1b", bg: "#fecaca", icon: "flame" },
};

type Props = {
  diagnostic: DiagnosticResult;
};

export default function DiagnosticCard({ diagnostic }: Props) {
  const { t } = useTranslation();
  const sev = SEVERITY_CONFIG[diagnostic.severity] || SEVERITY_CONFIG.medium;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon name="sparkles" size={18} color={COLORS.primary} />
          <Text style={styles.title}>{t("diagnostic.title")}</Text>
        </View>
        <View style={[styles.severityBadge, { backgroundColor: sev.bg }]}>
          <Icon name={sev.icon} size={14} color={sev.color} />
          <Text style={[styles.severityText, { color: sev.color }]}>
            {t(`diagnostic.${diagnostic.severity}`)}
          </Text>
        </View>
      </View>

      {/* Diagnostic text */}
      <Text style={styles.diagnosticText}>{diagnostic.diagnostic}</Text>

      {/* Price estimate */}
      <View style={styles.row}>
        <Icon name="card-outline" size={16} color={COLORS.primary} />
        <Text style={styles.rowLabel}>{t("diagnostic.estimatedPrice")}</Text>
        <Text style={styles.priceText}>{diagnostic.estimatedPriceRange}</Text>
      </View>

      {/* Materials */}
      {diagnostic.materialsNeeded.length > 0 && (
        <View style={styles.materialsSection}>
          <View style={styles.row}>
            <Icon name="construct-outline" size={16} color={COLORS.primary} />
            <Text style={styles.rowLabel}>{t("diagnostic.materials")}</Text>
          </View>
          <View style={styles.materialsList}>
            {diagnostic.materialsNeeded.map((mat, i) => (
              <View key={i} style={styles.materialChip}>
                <Text style={styles.materialText}>{mat}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Disclaimer */}
      <View style={styles.disclaimer}>
        <Icon name="information-circle" size={16} color="#6b7280" />
        <Text style={styles.disclaimerText}>{t("diagnostic.disclaimer")}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f0f9ff",
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1f2937",
  },
  severityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  severityText: {
    fontSize: 12,
    fontWeight: "700",
  },
  diagnosticText: {
    fontSize: 13,
    color: "#374151",
    lineHeight: 19,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rowLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4b5563",
    flex: 1,
  },
  priceText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.primary,
  },
  materialsSection: {
    marginTop: 10,
  },
  materialsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  materialChip: {
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  materialText: {
    fontSize: 12,
    color: "#0369a1",
    fontWeight: "500",
  },
  tipsSection: {
    marginTop: 10,
    backgroundColor: "#fffbeb",
    padding: 10,
    borderRadius: RADIUS.sm,
  },
  tipsText: {
    fontSize: 12,
    color: "#92400e",
    lineHeight: 17,
    marginTop: 4,
  },
  disclaimer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 12,
    backgroundColor: "#f3f4f6",
    padding: 10,
    borderRadius: RADIUS.sm,
  },
  disclaimerText: {
    fontSize: 11,
    color: "#6b7280",
    lineHeight: 16,
    flex: 1,
    fontStyle: "italic",
  },
});
