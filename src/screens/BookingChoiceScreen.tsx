import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import { CATEGORIES } from "../constants/categories";
import { COLORS, SPACING, RADIUS } from "../constants/theme";
import { isNightTime } from "../utils/nightRate";

type Props = {
  route: { params: { categoryId: string; serviceId: string; serviceName: string; priceRange: string } };
  navigation: any;
};

export default function BookingChoiceScreen({ route, navigation }: Props) {
  const { categoryId, serviceId, serviceName, priceRange } = route.params;
  const { t } = useTranslation();
  const category = CATEGORIES.find((c) => c.id === categoryId);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("booking.chooseType")}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Service summary */}
      <View style={styles.serviceSummary}>
        <View style={[styles.serviceIcon, { backgroundColor: category?.bg }]}>
          <Icon name={category?.icon || "build"} size={22} color={category?.color} />
        </View>
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceNameText}>{serviceName}</Text>
          <Text style={styles.servicePriceText}>{priceRange === "__onQuote__" ? t("pricing.onQuote") : priceRange}</Text>
          <Text style={styles.nightRateInfo}>
            {t("nightRate.label")} : {t("nightRate.info")}
          </Text>
          {isNightTime() && (
            <Text style={styles.nightRateBanner}>{t("nightRate.applied")}</Text>
          )}
        </View>
      </View>

      {/* Choice cards */}
      <View style={styles.choices}>
        {/* Emergency - Uber-like */}
        <TouchableOpacity
          style={styles.choiceCard}
          activeOpacity={0.85}
          onPress={() =>
            navigation.navigate("EmergencyBooking", {
              categoryId,
              serviceId,
              serviceName,
              priceRange,
            })
          }
        >
          <View style={styles.emergencyIconBox}>
            <Icon name="flash" size={32} color="#FFFFFF" />
          </View>
          <Text style={styles.choiceTitle}>{t("booking.emergency")}</Text>
          <Text style={styles.choiceSubtitle}>{t("booking.emergencyDesc")}</Text>
          <View style={styles.choiceFeatures}>
            <View style={styles.feature}>
              <Icon name="location" size={14} color={COLORS.primary} />
              <Text style={styles.featureText}>{t("booking.geolocated")}</Text>
            </View>
            <View style={styles.feature}>
              <Icon name="time" size={14} color={COLORS.primary} />
              <Text style={styles.featureText}>{t("booking.fastResponse")}</Text>
            </View>
            <View style={styles.feature}>
              <Icon name="navigate" size={14} color={COLORS.primary} />
              <Text style={styles.featureText}>{t("booking.liveTracking")}</Text>
            </View>
            <View style={styles.feature}>
              <Icon name="timer" size={14} color={COLORS.primary} />
              <Text style={styles.featureText}>{t("booking.guarantee2h")}</Text>
            </View>
          </View>
          <View style={styles.choiceBtn}>
            <Text style={styles.choiceBtnText}>{t("booking.bookEmergency")}</Text>
            <Icon name="arrow-forward" size={16} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        {/* Appointment */}
        <TouchableOpacity
          style={[styles.choiceCard, styles.appointmentCard]}
          activeOpacity={0.85}
          onPress={() =>
            navigation.navigate("AppointmentBooking", {
              categoryId,
              serviceId,
              serviceName,
              priceRange,
            })
          }
        >
          <View style={styles.appointmentIconBox}>
            <Icon name="calendar" size={32} color={COLORS.accent} />
          </View>
          <Text style={styles.choiceTitle}>{t("booking.appointment")}</Text>
          <Text style={styles.choiceSubtitle}>{t("booking.appointmentDesc")}</Text>
          <View style={styles.choiceFeatures}>
            <View style={styles.feature}>
              <Icon name="calendar-outline" size={14} color={COLORS.accent} />
              <Text style={styles.featureText}>{t("booking.chooseDate")}</Text>
            </View>
            <View style={styles.feature}>
              <Icon name="time-outline" size={14} color={COLORS.accent} />
              <Text style={styles.featureText}>{t("booking.chooseTime")}</Text>
            </View>
          </View>
          <View style={[styles.choiceBtn, styles.appointmentBtn]}>
            <Text style={[styles.choiceBtnText, { color: COLORS.accent }]}>
              {t("booking.bookAppointment")}
            </Text>
            <Icon name="arrow-forward" size={16} color={COLORS.accent} />
          </View>
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
  serviceSummary: {
    flexDirection: "row", alignItems: "center", gap: 12,
    marginHorizontal: SPACING.md, padding: SPACING.md,
    backgroundColor: "#f9f9f9", borderRadius: RADIUS.lg,
  },
  serviceIcon: {
    width: 48, height: 48, borderRadius: RADIUS.md,
    alignItems: "center", justifyContent: "center",
  },
  serviceInfo: { flex: 1 },
  serviceNameText: { fontSize: 15, fontWeight: "600", color: "#1f2937" },
  servicePriceText: { fontSize: 14, fontWeight: "700", color: COLORS.primary, marginTop: 2 },
  nightRateInfo: { fontSize: 11, color: "#9ca3af", fontStyle: "italic", marginTop: 2 },
  nightRateBanner: { fontSize: 11, color: "#f59e0b", fontWeight: "600", marginTop: 2 },
  choices: { flex: 1, paddingHorizontal: SPACING.md, paddingTop: SPACING.lg, gap: SPACING.md },
  choiceCard: {
    backgroundColor: "#FFFFFF", borderRadius: RADIUS.lg, padding: SPACING.lg,
    borderWidth: 2, borderColor: "#f3f3f3",
  },
  appointmentCard: { borderColor: "#FDE68A" },
  emergencyIconBox: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primary,
    alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  appointmentIconBox: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: "#FEF3C7",
    alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  choiceTitle: { fontSize: 18, fontWeight: "700", color: "#1f2937", marginBottom: 4 },
  choiceSubtitle: { fontSize: 13, color: COLORS.textLight, marginBottom: 12 },
  choiceFeatures: { gap: 6, marginBottom: 16 },
  feature: { flexDirection: "row", alignItems: "center", gap: 8 },
  featureText: { fontSize: 13, fontWeight: "500", color: "#4b5563" },
  choiceBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: COLORS.primary, paddingVertical: 12, borderRadius: RADIUS.sm, gap: 8,
  },
  appointmentBtn: { backgroundColor: "#FEF3C7" },
  choiceBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
});
