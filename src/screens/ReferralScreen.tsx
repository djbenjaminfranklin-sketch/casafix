import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Share,
  ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import { COLORS, SPACING, RADIUS } from "../constants/theme";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

type Props = {
  navigation: any;
};

export default function ReferralScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [referralCount, setReferralCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const referralCode = user?.id?.substring(0, 8).toUpperCase() || "";

  useEffect(() => {
    fetchReferralCount();
  }, []);

  const fetchReferralCount = async () => {
    if (!user) return;
    try {
      const { count, error } = await supabase
        .from("referrals")
        .select("*", { count: "exact", head: true })
        .eq("referrer_id", user.id)
        .eq("status", "completed");

      if (!error && count !== null) {
        setReferralCount(count);
      }
    } catch (e) {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: t("referral.shareMessage", { code: referralCode }),
      });
    } catch (e) {
      // user cancelled
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("referral.title")}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Illustration / Hero */}
        <View style={styles.heroCard}>
          <View style={styles.heroIconContainer}>
            <Icon name="gift" size={40} color={COLORS.primary} />
          </View>
          <Text style={styles.heroTitle}>{t("referral.reward")}</Text>
          <Text style={styles.heroDesc}>{t("referral.explanation")}</Text>
        </View>

        {/* Referral code */}
        <Text style={[styles.sectionTitle, { marginTop: SPACING.lg }]}>
          {t("referral.yourCode")}
        </Text>
        <View style={styles.codeCard}>
          <Text style={styles.codeText}>{referralCode}</Text>
        </View>

        {/* Share button */}
        <TouchableOpacity
          style={styles.shareBtn}
          onPress={handleShare}
          activeOpacity={0.7}
        >
          <Icon name="share-social" size={20} color={COLORS.white} />
          <Text style={styles.shareBtnText}>{t("referral.share")}</Text>
        </TouchableOpacity>

        {/* Stats */}
        <Text style={[styles.sectionTitle, { marginTop: SPACING.lg }]}>
          {t("referral.referrals")}
        </Text>
        <View style={styles.statsCard}>
          {loading ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <>
              <View style={[styles.iconCircle, { backgroundColor: "#f0fdf4" }]}>
                <Icon name="people" size={24} color="#16a34a" />
              </View>
              <Text style={styles.statsCount}>{referralCount}</Text>
              <Text style={styles.statsLabel}>{t("referral.referrals")}</Text>
            </>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: COLORS.text },
  content: { flex: 1, paddingHorizontal: SPACING.lg },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textLight,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  heroCard: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: "center",
    marginTop: SPACING.sm,
  },
  heroIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.md,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: SPACING.sm,
  },
  heroDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  codeCard: {
    backgroundColor: "#f9fafb",
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: "dashed",
  },
  codeText: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.primary,
    letterSpacing: 4,
  },
  shareBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    marginTop: SPACING.md,
    gap: 8,
  },
  shareBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "700",
  },
  statsCard: {
    backgroundColor: "#f9fafb",
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: "center",
    gap: 8,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  statsCount: {
    fontSize: 32,
    fontWeight: "800",
    color: COLORS.text,
  },
  statsLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: "500",
  },
});
