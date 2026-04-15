import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import Icon from "react-native-vector-icons/Ionicons";
import { COLORS, SPACING, RADIUS } from "../constants/theme";

type Props = { navigation: any };

const STEPS_CLIENT = [
  { icon: "search", color: "#3b82f6", key: "howItWorks.step1" },
  { icon: "flash", color: "#E8292C", key: "howItWorks.step2" },
  { icon: "camera", color: "#8b5cf6", key: "howItWorks.step3" },
  { icon: "card", color: "#f59e0b", key: "howItWorks.step4" },
  { icon: "people", color: "#16a34a", key: "howItWorks.step5" },
  { icon: "navigate", color: "#3b82f6", key: "howItWorks.step6" },
  { icon: "qr-code", color: "#06b6d4", key: "howItWorks.step7" },
  { icon: "cash", color: "#16a34a", key: "howItWorks.step8" },
  { icon: "moon", color: "#f59e0b", key: "howItWorks.step9" },
  { icon: "shield-checkmark", color: "#E8292C", key: "howItWorks.step10" },
  { icon: "star", color: "#f59e0b", key: "howItWorks.step11" },
];

export default function HowItWorksScreen({ navigation }: Props) {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("howItWorks.title")}</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.introCard}>
          <Icon name="information-circle" size={28} color={COLORS.primary} />
          <Text style={styles.introText}>{t("howItWorks.intro")}</Text>
        </View>

        {STEPS_CLIENT.map((step, index) => (
          <View key={index} style={styles.stepRow}>
            <View style={styles.stepNumberCol}>
              <View style={[styles.stepCircle, { backgroundColor: step.color }]}>
                <Text style={styles.stepNumber}>{index + 1}</Text>
              </View>
              {index < STEPS_CLIENT.length - 1 && <View style={styles.stepLine} />}
            </View>
            <View style={styles.stepContent}>
              <View style={[styles.stepIconBox, { backgroundColor: step.color + "15" }]}>
                <Icon name={step.icon} size={24} color={step.color} />
              </View>
              <View style={styles.stepTextBox}>
                <Text style={styles.stepTitle}>{t(`${step.key}.title`)}</Text>
                <Text style={styles.stepDesc}>{t(`${step.key}.desc`)}</Text>
              </View>
            </View>
          </View>
        ))}

        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>{t("howItWorks.tipsTitle")}</Text>
          <View style={styles.tipRow}>
            <Icon name="shield-checkmark" size={16} color="#16a34a" />
            <Text style={styles.tipText}>{t("howItWorks.tip1")}</Text>
          </View>
          <View style={styles.tipRow}>
            <Icon name="time" size={16} color="#f59e0b" />
            <Text style={styles.tipText}>{t("howItWorks.tip2")}</Text>
          </View>
          <View style={styles.tipRow}>
            <Icon name="star" size={16} color="#3b82f6" />
            <Text style={styles.tipText}>{t("howItWorks.tip3")}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 17, fontWeight: "600", color: COLORS.text },
  scrollContent: { padding: SPACING.lg, paddingBottom: 40 },
  introCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#eff6ff", padding: SPACING.md, borderRadius: RADIUS.md,
    marginBottom: SPACING.xl, borderWidth: 1, borderColor: "#bfdbfe",
  },
  introText: { fontSize: 14, color: "#1e40af", flex: 1, lineHeight: 20 },
  stepRow: { flexDirection: "row", minHeight: 90 },
  stepNumberCol: { width: 40, alignItems: "center" },
  stepCircle: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  stepNumber: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
  stepLine: { width: 2, flex: 1, backgroundColor: "#e5e7eb", marginVertical: 4 },
  stepContent: {
    flex: 1, flexDirection: "row", gap: 12, marginBottom: SPACING.md,
    backgroundColor: COLORS.card, padding: 12, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  stepIconBox: {
    width: 48, height: 48, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  stepTextBox: { flex: 1 },
  stepTitle: { fontSize: 14, fontWeight: "600", color: COLORS.text, marginBottom: 4 },
  stepDesc: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17 },
  tipsCard: {
    backgroundColor: "#fefce8", padding: SPACING.md, borderRadius: RADIUS.md,
    marginTop: SPACING.md, borderWidth: 1, borderColor: "#fde68a",
  },
  tipsTitle: { fontSize: 15, fontWeight: "700", color: "#92400e", marginBottom: SPACING.sm },
  tipRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  tipText: { fontSize: 13, color: "#78350f", flex: 1 },
});
