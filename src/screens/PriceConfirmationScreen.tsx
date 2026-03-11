import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabase";
import { capturePayment, chargeRemaining } from "../lib/stripe";
import { COLORS, SPACING, RADIUS } from "../constants/theme";

const DISPLACEMENT_FEE = 75; // €

type Props = {
  route: {
    params: {
      bookingId: string;
      serviceName: string;
      artisanName: string;
      depositAmount: number;
      proposedPrice: number;
      paymentIntentId: string;
      estimatedDays?: number;
      isMultiday?: boolean;
    };
  };
  navigation: any;
};

export default function PriceConfirmationScreen({ route, navigation }: Props) {
  const {
    bookingId, serviceName, artisanName, depositAmount, proposedPrice, paymentIntentId,
    estimatedDays = 1, isMultiday = false,
  } = route.params;
  const { t } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const remainingAmount = Math.max(proposedPrice - depositAmount, 0);
  const needsAdditionalCharge = remainingAmount > 0;

  async function handleAccept() {
    setLoading(true);

    // 1. Confirm price in database
    const { data, error } = await supabase.rpc("confirm_price", {
      p_booking_id: bookingId,
      p_client_id: (await supabase.auth.getUser()).data.user?.id,
    });

    if (error) {
      Alert.alert("Error", error.message);
      setLoading(false);
      return;
    }

    // 2. Capture the deposit from the pre-authorization
    const captureAmount = Math.min(proposedPrice, depositAmount);
    const captureResult = await capturePayment({
      paymentIntentId,
      finalAmount: Math.round(captureAmount * 100),
    });

    if (!captureResult.success) {
      Alert.alert("Error", t("priceConfirm.paymentError"));
      setLoading(false);
      return;
    }

    // 3. If price > deposit, charge the remaining amount
    if (needsAdditionalCharge) {
      const remainingResult = await chargeRemaining({
        bookingId,
        remainingAmount: Math.round(remainingAmount * 100),
      });

      if (!remainingResult.success) {
        Alert.alert("Error", t("priceConfirm.additionalPaymentError"));
        setLoading(false);
        return;
      }
    }

    // 4. For multi-day work, start the work tracking
    if (isMultiday) {
      await supabase.rpc("start_multiday_work", {
        p_booking_id: bookingId,
        p_artisan_id: data?.artisan_id,
      });
    }

    setLoading(false);
    setConfirmed(true);
  }

  async function handleCancel() {
    Alert.alert(
      t("priceConfirm.cancelTitle"),
      t("priceConfirm.displacementWarning", { fee: DISPLACEMENT_FEE }),
      [
        { text: t("priceConfirm.no"), style: "cancel" },
        {
          text: t("priceConfirm.yesCancel"),
          style: "destructive",
          onPress: async () => {
            const { data } = await supabase.rpc("client_cancel_booking", {
              p_booking_id: bookingId,
              p_client_id: (await supabase.auth.getUser()).data.user?.id,
            });

            if (data?.cancellation_fee > 0) {
              await capturePayment({
                paymentIntentId,
                finalAmount: Math.round(data.cancellation_fee * 100),
              });
            }

            navigation.popToTop();
          },
        },
      ]
    );
  }

  // ─── SUCCESS SCREEN ───
  if (confirmed) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.successScreen}>
          <View style={[styles.checkCircle, isMultiday && { backgroundColor: COLORS.primary }]}>
            <Icon name={isMultiday ? "lock-closed" : "checkmark"} size={48} color="#FFFFFF" />
          </View>
          <Text style={styles.successTitle}>
            {isMultiday ? t("multiday.moneyBlocked") : t("priceConfirm.paymentDone")}
          </Text>
          <Text style={styles.successSubtitle}>
            {isMultiday ? t("multiday.moneyBlockedDesc") : t("priceConfirm.paymentDoneDesc")}
          </Text>

          <View style={styles.receiptCard}>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>{t("priceConfirm.service")}</Text>
              <Text style={styles.receiptValue}>{serviceName}</Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>{t("priceConfirm.artisan")}</Text>
              <Text style={styles.receiptValue}>{artisanName}</Text>
            </View>
            {isMultiday && (
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>{t("multiday.duration")}</Text>
                <Text style={styles.receiptValue}>{estimatedDays} {t("multiday.days")}</Text>
              </View>
            )}
            <View style={styles.receiptDivider} />
            {needsAdditionalCharge && (
              <>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>{t("priceConfirm.deposit")}</Text>
                  <Text style={styles.receiptValue}>{depositAmount}€</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>{t("priceConfirm.additionalCharge")}</Text>
                  <Text style={styles.receiptValue}>{remainingAmount}€</Text>
                </View>
                <View style={styles.receiptDivider} />
              </>
            )}
            <View style={styles.receiptRow}>
              <Text style={[styles.receiptLabel, styles.finalLabel]}>
                {isMultiday ? t("multiday.blockedAmount") : t("priceConfirm.totalCharged")}
              </Text>
              <Text style={styles.finalPrice}>{proposedPrice}€</Text>
            </View>
          </View>

          {isMultiday && (
            <View style={[styles.infoCard, { width: "100%", marginBottom: SPACING.md }]}>
              <Icon name="shield-checkmark" size={18} color="#16a34a" />
              <Text style={styles.infoText}>{t("multiday.artisanPaidAtEnd")}</Text>
            </View>
          )}

          {isMultiday ? (
            <TouchableOpacity
              style={styles.reviewBtn}
              onPress={() => navigation.popToTop()}
              activeOpacity={0.85}
            >
              <Icon name="home" size={20} color="#FFFFFF" />
              <Text style={styles.reviewBtnText}>{t("booking.backHome")}</Text>
            </TouchableOpacity>
          ) : (
            <>
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
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // ─── MAIN SCREEN ───
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ width: 40 }} />
        <Text style={styles.headerTitle}>{t("priceConfirm.title")}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 20 }}>
        {/* Artisan proposed price */}
        <View style={styles.proposalCard}>
          <View style={styles.artisanBadge}>
            <Icon name="person" size={20} color="#FFFFFF" />
          </View>
          <Text style={styles.proposalLabel}>{artisanName} {t("priceConfirm.proposes")}</Text>

          <Text style={styles.proposedPrice}>{proposedPrice}€</Text>

          {/* Payment breakdown */}
          {needsAdditionalCharge ? (
            <View style={styles.breakdownContainer}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>{t("priceConfirm.deposit")}</Text>
                <Text style={styles.breakdownValue}>{depositAmount}€</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>{t("priceConfirm.additionalCharge")}</Text>
                <Text style={styles.breakdownValue}>+{remainingAmount}€</Text>
              </View>
            </View>
          ) : (
            <View style={styles.breakdownContainer}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>{t("priceConfirm.deposit")}</Text>
                <Text style={styles.breakdownValue}>{depositAmount}€</Text>
              </View>
              <View style={styles.savingsBadge}>
                <Icon name="trending-down" size={16} color="#16a34a" />
                <Text style={styles.savingsText}>
                  {t("priceConfirm.lessThanDeposit")}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Multi-day duration badge */}
        {isMultiday && (
          <View style={styles.multidayCard}>
            <Icon name="calendar" size={20} color={COLORS.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.multidayTitle}>
                {t("multiday.workDuration")}: {estimatedDays} {t("multiday.days")}
              </Text>
              <Text style={styles.multidayDesc}>{t("multiday.paidOnlyAtEnd")}</Text>
            </View>
          </View>
        )}

        {/* Service info */}
        <View style={styles.serviceCard}>
          <Icon name="construct" size={18} color={COLORS.primary} />
          <Text style={styles.serviceText}>{serviceName}</Text>
        </View>

        {/* Info */}
        <View style={styles.infoCard}>
          <Icon name="shield-checkmark" size={18} color="#16a34a" />
          <Text style={styles.infoText}>
            {isMultiday ? t("multiday.fundsSecured") : t("priceConfirm.guarantee")}
          </Text>
        </View>

        {/* Displacement fee warning */}
        <View style={styles.warningCard}>
          <Icon name="car" size={18} color="#d97706" />
          <Text style={styles.warningText}>
            {t("priceConfirm.displacementFeeInfo", { fee: DISPLACEMENT_FEE })}
          </Text>
        </View>
      </ScrollView>

      {/* Bottom actions */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} activeOpacity={0.8}>
          <Text style={styles.cancelBtnText}>{t("priceConfirm.refuse")}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.acceptBtn, loading && styles.acceptBtnDisabled]}
          onPress={handleAccept}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Icon name="card" size={20} color="#FFFFFF" />
              <Text style={styles.acceptBtnText}>{t("priceConfirm.accept")} {proposedPrice}€</Text>
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
  headerTitle: { fontSize: 17, fontWeight: "700", color: COLORS.text },
  content: { flex: 1, paddingHorizontal: SPACING.lg },
  proposalCard: {
    alignItems: "center", backgroundColor: "#f9fafb", borderRadius: RADIUS.lg,
    padding: SPACING.lg, marginBottom: SPACING.md,
    borderWidth: 2, borderColor: "#e5e7eb",
  },
  artisanBadge: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primary,
    alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  proposalLabel: { fontSize: 14, color: COLORS.textLight, marginBottom: 8 },
  proposedPrice: { fontSize: 48, fontWeight: "800", color: COLORS.primary, marginBottom: 12 },
  breakdownContainer: {
    width: "100%", backgroundColor: "#FFFFFF", borderRadius: RADIUS.md,
    padding: 12, gap: 8,
  },
  breakdownRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  breakdownLabel: { fontSize: 13, color: COLORS.textLight },
  breakdownValue: { fontSize: 14, fontWeight: "600", color: "#1f2937" },
  savingsBadge: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: "#dcfce7", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    marginTop: 4,
  },
  savingsText: { fontSize: 13, fontWeight: "600", color: "#16a34a" },
  serviceCard: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#f9fafb", padding: 14, borderRadius: RADIUS.md, marginBottom: SPACING.sm,
  },
  serviceText: { fontSize: 14, fontWeight: "500", color: "#1f2937" },
  infoCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: "#dcfce7", padding: 12, borderRadius: RADIUS.sm, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: "#bbf7d0",
  },
  infoText: { fontSize: 12, color: "#166534", flex: 1, lineHeight: 18 },
  warningCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: "#FEF3C7", padding: 12, borderRadius: RADIUS.sm,
    borderWidth: 1, borderColor: "#FDE68A",
  },
  warningText: { fontSize: 12, color: "#92400e", flex: 1, lineHeight: 18 },
  bottomBar: {
    flexDirection: "row", gap: SPACING.sm,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    borderTopWidth: 1, borderTopColor: "#f3f4f6",
  },
  cancelBtn: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingVertical: 14, borderRadius: RADIUS.md,
    borderWidth: 2, borderColor: "#e5e7eb",
  },
  cancelBtnText: { fontSize: 14, fontWeight: "600", color: "#6b7280" },
  acceptBtn: {
    flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: RADIUS.md, gap: 8,
  },
  acceptBtnDisabled: { opacity: 0.6 },
  acceptBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  // Success screen
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
  finalPrice: { fontSize: 20, fontWeight: "800", color: COLORS.primary },
  reviewBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: COLORS.primary, paddingVertical: 14, paddingHorizontal: 30,
    borderRadius: RADIUS.md, gap: 8, marginBottom: SPACING.sm, width: "100%",
  },
  reviewBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  homeBtn: { paddingVertical: 12, paddingHorizontal: 30 },
  homeBtnText: { fontSize: 14, fontWeight: "600", color: COLORS.textLight },
  // Multi-day
  multidayCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#EFF6FF", padding: 14, borderRadius: RADIUS.md, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: "#BFDBFE",
  },
  multidayTitle: { fontSize: 14, fontWeight: "700", color: COLORS.primary },
  multidayDesc: { fontSize: 12, color: "#1e40af", marginTop: 2 },
});
