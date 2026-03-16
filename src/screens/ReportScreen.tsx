import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import { createReport, ReportReason } from "../services/reports";
import { COLORS, SPACING, RADIUS } from "../constants/theme";

type Props = {
  route: {
    params: {
      bookingId: string;
      reportedUserId: string;
      reportedUserName: string;
    };
  };
  navigation: any;
};

const REASONS: { key: ReportReason; icon: string }[] = [
  { key: "off_app_payment", icon: "cash-outline" },
  { key: "no_show", icon: "close-circle-outline" },
  { key: "inappropriate_behavior", icon: "warning-outline" },
  { key: "price_dispute", icon: "pricetag-outline" },
  { key: "poor_quality", icon: "thumbs-down-outline" },
  { key: "other", icon: "ellipsis-horizontal-outline" },
];

export default function ReportScreen({ route, navigation }: Props) {
  const { bookingId, reportedUserId, reportedUserName } = route.params;
  const { t } = useTranslation();

  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    if (!selectedReason) {
      Alert.alert("", t("report.selectReason"));
      return;
    }
    setLoading(true);
    const { error } = await createReport({
      bookingId,
      reportedUserId,
      reason: selectedReason,
      description: description.trim() || undefined,
    });
    setLoading(false);

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      setSubmitted(true);
    }
  }

  if (submitted) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.successScreen}>
          <View style={styles.successCircle}>
            <Icon name="shield-checkmark" size={48} color="#FFFFFF" />
          </View>
          <Text style={styles.successTitle}>{t("report.thankYou")}</Text>
          <Text style={styles.successSubtitle}>{t("report.submitted")}</Text>
          <TouchableOpacity
            style={styles.homeBtn}
            onPress={() => navigation.popToTop()}
            activeOpacity={0.85}
          >
            <Text style={styles.homeBtnText}>{t("booking.backHome")}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("report.title")}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.subtitle}>
          {t("report.about")} <Text style={styles.boldText}>{reportedUserName}</Text>
        </Text>

        {/* Reasons */}
        <View style={styles.reasonsList}>
          {REASONS.map(({ key, icon }) => (
            <TouchableOpacity
              key={key}
              style={[styles.reasonBtn, selectedReason === key && styles.reasonBtnActive]}
              onPress={() => setSelectedReason(key)}
              activeOpacity={0.7}
            >
              <Icon
                name={icon}
                size={20}
                color={selectedReason === key ? COLORS.primary : COLORS.textLight}
              />
              <Text
                style={[styles.reasonText, selectedReason === key && styles.reasonTextActive]}
              >
                {t(`report.reasons.${key}`)}
              </Text>
              {selectedReason === key && (
                <Icon name="checkmark-circle" size={20} color={COLORS.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Description */}
        <Text style={styles.descLabel}>{t("report.descriptionLabel")}</Text>
        <TextInput
          style={styles.descInput}
          placeholder={t("report.descriptionPlaceholder")}
          placeholderTextColor={COLORS.textLight}
          value={description}
          onChangeText={setDescription}
          multiline
          textAlignVertical="top"
          maxLength={500}
        />
      </View>

      {/* Submit */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.submitBtn, (!selectedReason || loading) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!selectedReason || loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Icon name="flag" size={20} color="#FFFFFF" />
              <Text style={styles.submitBtnText}>{t("report.submit")}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: "#f5f5f5",
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: COLORS.text },
  content: { flex: 1, paddingHorizontal: SPACING.lg },
  subtitle: { fontSize: 15, color: COLORS.textLight, marginBottom: SPACING.lg },
  boldText: { fontWeight: "700", color: "#1f2937" },
  reasonsList: { gap: 8, marginBottom: SPACING.lg },
  reasonBtn: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#f9fafb", borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: "#e5e7eb",
    padding: 14,
  },
  reasonBtnActive: {
    backgroundColor: "#eff6ff", borderColor: COLORS.primary,
  },
  reasonText: { flex: 1, fontSize: 14, color: "#6b7280" },
  reasonTextActive: { color: COLORS.primary, fontWeight: "600" },
  descLabel: { fontSize: 14, fontWeight: "600", color: "#1f2937", marginBottom: 8 },
  descInput: {
    backgroundColor: "#f9fafb", borderRadius: RADIUS.md, borderWidth: 1, borderColor: "#e5e7eb",
    padding: 14, fontSize: 14, color: "#1f2937", minHeight: 80,
  },
  bottomBar: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    borderTopWidth: 1, borderTopColor: "#f3f4f6",
  },
  submitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#dc2626", paddingVertical: 14, borderRadius: RADIUS.md, gap: 10,
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  successScreen: { flex: 1, alignItems: "center", justifyContent: "center", padding: SPACING.xl },
  successCircle: {
    width: 90, height: 90, borderRadius: 45, backgroundColor: "#16a34a",
    alignItems: "center", justifyContent: "center", marginBottom: SPACING.lg,
  },
  successTitle: { fontSize: 22, fontWeight: "700", color: "#1f2937", marginBottom: 8 },
  successSubtitle: { fontSize: 14, color: COLORS.textLight, textAlign: "center", marginBottom: SPACING.xl },
  homeBtn: {
    backgroundColor: COLORS.primary, paddingVertical: 14, paddingHorizontal: 40,
    borderRadius: RADIUS.md,
  },
  homeBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
});
