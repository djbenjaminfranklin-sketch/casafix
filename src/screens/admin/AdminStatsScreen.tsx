import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { SPACING, RADIUS } from "../../constants/theme";
import { supabase } from "../../lib/supabase";

const ADMIN_DARK = "#1e1e2e";
const ADMIN_CARD = "#2a2a3d";
const ADMIN_ACCENT = "#7c3aed";

export default function AdminStatsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    revenue: 0,
    completedThisWeek: 0,
    completedThisMonth: 0,
    completedTotal: 0,
    activeArtisans: 0,
    registeredClients: 0,
    averageRating: 0,
    topCategories: [] as { category: string; count: number }[],
  });

  const fetchStats = useCallback(async () => {
    try {
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [
        revenueRes,
        completedWeekRes,
        completedMonthRes,
        completedTotalRes,
        artisansRes,
        clientsRes,
        ratingsRes,
        bookingsForCategoriesRes,
      ] = await Promise.all([
        supabase
          .from("bookings")
          .select("final_price")
          .eq("status", "completed")
          .not("final_price", "is", null),
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("status", "completed")
          .gte("created_at", startOfWeek.toISOString()),
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("status", "completed")
          .gte("created_at", startOfMonth.toISOString()),
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("status", "completed"),
        supabase
          .from("artisans")
          .select("id", { count: "exact", head: true })
          .eq("is_available", true),
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("reviews")
          .select("rating"),
        supabase
          .from("bookings")
          .select("category_id")
          .eq("status", "completed"),
      ]);

      // Calculate revenue (assuming 15% commission)
      const totalRevenue = (revenueRes.data || []).reduce(
        (sum: number, b: any) => sum + (b.final_price || 0) * 0.15,
        0
      );

      // Calculate average rating
      const ratings = ratingsRes.data || [];
      const avgRating =
        ratings.length > 0
          ? ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / ratings.length
          : 0;

      // Calculate top categories
      const categoryCount: Record<string, number> = {};
      (bookingsForCategoriesRes.data || []).forEach((b: any) => {
        if (b.category_id) {
          categoryCount[b.category_id] = (categoryCount[b.category_id] || 0) + 1;
        }
      });
      const topCategories = Object.entries(categoryCount)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);

      setStats({
        revenue: Math.round(totalRevenue * 100) / 100,
        completedThisWeek: completedWeekRes.count ?? 0,
        completedThisMonth: completedMonthRes.count ?? 0,
        completedTotal: completedTotalRes.count ?? 0,
        activeArtisans: artisansRes.count ?? 0,
        registeredClients: clientsRes.count ?? 0,
        averageRating: Math.round(avgRating * 10) / 10,
        topCategories,
      });
    } catch (error) {

    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={ADMIN_DARK} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ADMIN_ACCENT} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={ADMIN_DARK} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ADMIN_ACCENT} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("admin.stats")}</Text>
        </View>

        {/* Revenue */}
        <View style={styles.revenueCard}>
          <Text style={styles.revenueLabel}>{t("admin.revenue")}</Text>
          <Text style={styles.revenueValue}>{stats.revenue.toLocaleString("fr-FR")} EUR</Text>
          <Text style={styles.revenueSubtext}>{t("admin.commissionRate")}</Text>
        </View>

        {/* Completed Bookings */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>{t("admin.completedBookings")}</Text>
          <View style={styles.completedGrid}>
            <View style={styles.completedCard}>
              <Text style={styles.completedValue}>{stats.completedThisWeek}</Text>
              <Text style={styles.completedLabel}>{t("admin.thisWeek")}</Text>
            </View>
            <View style={styles.completedCard}>
              <Text style={styles.completedValue}>{stats.completedThisMonth}</Text>
              <Text style={styles.completedLabel}>{t("admin.thisMonth")}</Text>
            </View>
            <View style={styles.completedCard}>
              <Text style={styles.completedValue}>{stats.completedTotal}</Text>
              <Text style={styles.completedLabel}>{t("admin.total")}</Text>
            </View>
          </View>
        </View>

        {/* Key Metrics */}
        <View style={styles.sectionContainer}>
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <View style={[styles.metricIcon, { backgroundColor: "#10b98120" }]}>
                <Icon name="construct" size={22} color="#10b981" />
              </View>
              <Text style={styles.metricValue}>{stats.activeArtisans}</Text>
              <Text style={styles.metricLabel}>{t("admin.activeArtisans")}</Text>
            </View>
            <View style={styles.metricCard}>
              <View style={[styles.metricIcon, { backgroundColor: "#3b82f620" }]}>
                <Icon name="people" size={22} color="#3b82f6" />
              </View>
              <Text style={styles.metricValue}>{stats.registeredClients}</Text>
              <Text style={styles.metricLabel}>{t("admin.registeredClients")}</Text>
            </View>
            <View style={styles.metricCard}>
              <View style={[styles.metricIcon, { backgroundColor: "#f59e0b20" }]}>
                <Icon name="star" size={22} color="#f59e0b" />
              </View>
              <Text style={styles.metricValue}>{stats.averageRating}</Text>
              <Text style={styles.metricLabel}>{t("admin.averageRating")}</Text>
            </View>
          </View>
        </View>

        {/* Top Categories */}
        {stats.topCategories.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>{t("admin.topCategories")}</Text>
            <View style={styles.categoriesList}>
              {stats.topCategories.map((cat, idx) => {
                const maxCount = stats.topCategories[0]?.count || 1;
                const barWidth = (cat.count / maxCount) * 100;

                return (
                  <View key={idx} style={styles.categoryRow}>
                    <View style={styles.categoryInfo}>
                      <Text style={styles.categoryRank}>#{idx + 1}</Text>
                      <Text style={styles.categoryName}>{cat.category}</Text>
                    </View>
                    <View style={styles.categoryBarContainer}>
                      <View style={[styles.categoryBar, { width: `${barWidth}%` }]} />
                    </View>
                    <Text style={styles.categoryCount}>{cat.count}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <View style={{ height: SPACING.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ADMIN_DARK,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: ADMIN_CARD,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#ffffff",
  },
  revenueCard: {
    marginHorizontal: SPACING.md,
    backgroundColor: ADMIN_ACCENT,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: "center",
  },
  revenueLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffffbb",
  },
  revenueValue: {
    fontSize: 36,
    fontWeight: "900",
    color: "#ffffff",
    marginTop: 4,
  },
  revenueSubtext: {
    fontSize: 12,
    color: "#ffffff90",
    marginTop: 4,
  },
  sectionContainer: {
    marginTop: SPACING.lg,
    marginHorizontal: SPACING.md,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },
  completedGrid: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  completedCard: {
    flex: 1,
    backgroundColor: ADMIN_CARD,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: "center",
  },
  completedValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#ffffff",
  },
  completedLabel: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 4,
    textAlign: "center",
  },
  metricsGrid: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  metricCard: {
    flex: 1,
    backgroundColor: ADMIN_CARD,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: "center",
  },
  metricIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#ffffff",
  },
  metricLabel: {
    fontSize: 10,
    color: "#9ca3af",
    marginTop: 4,
    textAlign: "center",
  },
  categoriesList: {
    backgroundColor: ADMIN_CARD,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: 12,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  categoryInfo: {
    flexDirection: "row",
    alignItems: "center",
    width: 100,
    gap: 8,
  },
  categoryRank: {
    fontSize: 12,
    fontWeight: "700",
    color: ADMIN_ACCENT,
    width: 22,
  },
  categoryName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#ffffff",
    flexShrink: 1,
  },
  categoryBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: "#3a3a4d",
    borderRadius: 4,
    overflow: "hidden",
  },
  categoryBar: {
    height: "100%",
    backgroundColor: ADMIN_ACCENT,
    borderRadius: 4,
  },
  categoryCount: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ffffff",
    width: 30,
    textAlign: "right",
  },
});
