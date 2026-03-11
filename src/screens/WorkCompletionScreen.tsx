import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabase";
import { COLORS, SPACING, RADIUS } from "../constants/theme";

type Props = {
  route: {
    params: {
      bookingId: string;
      serviceName: string;
      artisanName: string;
      finalPrice: number;
      artisanMarkedDoneAt: string; // ISO date string
    };
  };
  navigation: any;
};

export default function WorkCompletionScreen({ route, navigation }: Props) {
  const { bookingId, serviceName, artisanName, finalPrice, artisanMarkedDoneAt } = route.params;
  const { t } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [hoursLeft, setHoursLeft] = useState(48);

  // Calculate countdown
  useEffect(() => {
    function updateCountdown() {
      const deadline = new Date(artisanMarkedDoneAt);
      deadline.setHours(deadline.getHours() + 48);
      const now = new Date();
      const diffMs = deadline.getTime() - now.getTime();
      const diffH = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60)));
      setHoursLeft(diffH);
    }
    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [artisanMarkedDoneAt]);

  async function handleConfirmCompletion() {
    Alert.alert(
      t("completion.confirmTitle"),
      t("completion.confirmDesc", { price: finalPrice, artisan: artisanName }),
      [
        { text: t("priceConfirm.no"), style: "cancel" },
        {
          text: t("completion.yesConfirm"),
          onPress: async () => {
            setLoading(true);

            const { data, error } = await supabase.rpc("complete_work", {
              p_booking_id: bookingId,
              p_client_id: (await supabase.auth.getUser()).data.user?.id,
            });

            setLoading(false);

            if (error) {
              Alert.alert("Error", error.message);
              return;
            }

            setCompleted(true);
          },
        },
      ]
    );
  }

  async function handleDispute() {
    Alert.alert(
      t("completion.disputeTitle"),
      t("completion.disputeDesc"),
      [
        { text: t("priceConfirm.no"), style: "cancel" },
        {
          text: t("completion.yesDispute"),
          onPress: () => {
            // TODO: open dispute/chat with support
            Alert.alert(t("completion.disputeSent"), t("completion.disputeSentDesc"));
          },
        },
      ]
    );
  }

  // ─── SUCCESS ───
  if (completed) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.successScreen}>
          <View style={styles.checkCircle}>
            <Icon name="checkmark" size={48} color="#FFFFFF" />
          </View>
          <Text style={styles.successTitle}>{t("completion.workDone")}</Text>
          <Text style={styles.successSubtitle}>{t("completion.artisanPaid")}</Text>

          <View style={styles.receiptCard}>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>{t("priceConfirm.service")}</Text>
              <Text style={styles.receiptValue}>{serviceName}</Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>{t("priceConfirm.artisan")}</Text>
              <Text style={styles.receiptValue}>{artisanName}</Text>
            </View>
            <View style={styles.receiptDivider} />
            <View style={styles.receiptRow}>
              <Text style={[styles.receiptLabel, styles.finalLabel]}>{t("completion.released")}</Text>
              <Text style={styles.finalPrice}>{finalPrice}€</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.reviewBtn}
            onPress={() =>
              navigation.replace("Review", {
                bookingId,
                artisanId: "",
                artisanName,
                serviceName,
              })
            }
            activeOpacity={0.85}
          >
            <Icon name="star" size={20} color="#FFFFFF" />
            <Text style={styles.reviewBtnText}>{t("priceConfirm.leaveReview")}</Text>
          </TouchableOpacity>

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

  // ─── MAIN ───
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("completion.title")}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {/* Artisan marked done */}
        <View style={styles.doneCard}>
          <View style={styles.doneIconBox}>
            <Icon name="checkmark-done" size={36} color={COLORS.primary} />
          </View>
          <Text style={styles.doneTitle}>{t("completion.artisanMarkedDone")}</Text>
          <Text style={styles.doneSubtitle}>
            {artisanName} {t("completion.saysWorkDone")}
          </Text>
        </View>

        {/* 48h countdown */}
        <View style={styles.countdownCard}>
          <Icon name="time" size={20} color="#d97706" />
          <View style={{ flex: 1 }}>
            <Text style={styles.countdownTitle}>
              {hoursLeft > 0
                ? t("completion.hoursLeft", { hours: hoursLeft })
                : t("completion.autoConfirmSoon")}
            </Text>
            <Text style={styles.countdownDesc}>{t("completion.autoConfirmInfo")}</Text>
          </View>
        </View>

        {/* Booking details */}
        <View style={styles.detailCard}>
          <View style={styles.detailRow}>
            <Icon name="briefcase" size={16} color={COLORS.textLight} />
            <Text style={styles.detailText}>{serviceName}</Text>
          </View>
          <View style={styles.detailRow}>
            <Icon name="person" size={16} color={COLORS.textLight} />
            <Text style={styles.detailText}>{artisanName}</Text>
          </View>
          <View style={styles.detailRow}>
            <Icon name="card" size={16} color={COLORS.textLight} />
            <Text style={styles.detailText}>{finalPrice}€</Text>
          </View>
        </View>

        {/* Guarantee */}
        <View style={styles.guaranteeCard}>
          <Icon name="shield-checkmark" size={18} color="#16a34a" />
          <Text style={styles.guaranteeText}>{t("multiday.guaranteeReminder")}</Text>
        </View>
      </View>

      {/* Bottom actions */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.disputeBtn} onPress={handleDispute} activeOpacity={0.8}>
          <Icon name="alert-circle" size={18} color="#dc2626" />
          <Text style={styles.disputeBtnText}>{t("completion.dispute")}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.confirmBtn, loading && styles.confirmBtnDisabled]}
          onPress={handleConfirmCompletion}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Icon name="checkmark-circle" size={22} color="#FFFFFF" />
              <Text style={styles.confirmBtnText}>{t("completion.confirm")}</Text>
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
  // Artisan done card
  doneCard: {
    alignItems: "center", backgroundColor: "#EFF6FF", borderRadius: RADIUS.lg,
    padding: SPACING.lg, marginBottom: SPACING.md,
    borderWidth: 2, borderColor: "#BFDBFE",
  },
  doneIconBox: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: "#FFFFFF",
    alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  doneTitle: { fontSize: 18, fontWeight: "700", color: "#1e40af", marginBottom: 4 },
  doneSubtitle: { fontSize: 14, color: "#3b82f6", textAlign: "center" },
  // Countdown
  countdownCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#FEF3C7", padding: 14, borderRadius: RADIUS.md, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: "#FDE68A",
  },
  countdownTitle: { fontSize: 14, fontWeight: "700", color: "#92400e" },
  countdownDesc: { fontSize: 12, color: "#92400e", marginTop: 2 },
  // Details
  detailCard: {
    backgroundColor: "#f9fafb", borderRadius: RADIUS.md, padding: SPACING.md,
    marginBottom: SPACING.sm, gap: 10,
  },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  detailText: { fontSize: 14, fontWeight: "500", color: "#1f2937" },
  // Guarantee
  guaranteeCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: "#dcfce7", padding: 12, borderRadius: RADIUS.sm,
    borderWidth: 1, borderColor: "#bbf7d0",
  },
  guaranteeText: { fontSize: 12, color: "#166534", flex: 1, lineHeight: 18 },
  // Bottom
  bottomBar: {
    flexDirection: "row", gap: SPACING.sm,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    borderTopWidth: 1, borderTopColor: "#f3f4f6",
  },
  disputeBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 14, borderRadius: RADIUS.md, gap: 6,
    borderWidth: 2, borderColor: "#fecaca",
  },
  disputeBtnText: { fontSize: 13, fontWeight: "600", color: "#dc2626" },
  confirmBtn: {
    flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#16a34a", paddingVertical: 14, borderRadius: RADIUS.md, gap: 8,
  },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  // Success
  successScreen: { flex: 1, alignItems: "center", justifyContent: "center", padding: SPACING.xl },
  checkCircle: {
    width: 90, height: 90, borderRadius: 45, backgroundColor: "#16a34a",
    alignItems: "center", justifyContent: "center", marginBottom: SPACING.lg,
  },
  successTitle: { fontSize: 22, fontWeight: "700", color: "#1f2937", marginBottom: 8 },
  successSubtitle: { fontSize: 14, color: COLORS.textLight, textAlign: "center", marginBottom: SPACING.lg },
  receiptCard: {
    width: "100%", backgroundColor: "#f9fafb", borderRadius: RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.lg,
  },
  receiptRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 6,
  },
  receiptLabel: { fontSize: 13, color: COLORS.textLight },
  receiptValue: { fontSize: 14, fontWeight: "500", color: "#1f2937" },
  receiptDivider: { height: 1, backgroundColor: "#e5e7eb", marginVertical: 8 },
  finalLabel: { fontWeight: "600", color: "#1f2937" },
  finalPrice: { fontSize: 20, fontWeight: "800", color: "#16a34a" },
  reviewBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: COLORS.primary, paddingVertical: 14, paddingHorizontal: 30,
    borderRadius: RADIUS.md, gap: 8, marginBottom: SPACING.sm, width: "100%",
  },
  reviewBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  homeBtn: { paddingVertical: 12, paddingHorizontal: 30 },
  homeBtnText: { fontSize: 14, fontWeight: "600", color: COLORS.textLight },
});
