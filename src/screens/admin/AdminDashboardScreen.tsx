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
import { COLORS, SPACING, RADIUS } from "../../constants/theme";
import { supabase } from "../../lib/supabase";

const ADMIN_DARK = "#1e1e2e";
const ADMIN_CARD = "#2a2a3d";
const ADMIN_ACCENT = "#7c3aed";

export default function AdminDashboardScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalBookings: 0,
    activeArtisans: 0,
    pendingVerifications: 0,
    openDisputes: 0,
  });

  const fetchStats = useCallback(async () => {
    try {
      const [bookingsRes, artisansRes, pendingRes, disputesRes] = await Promise.all([
        supabase.from("bookings").select("id", { count: "exact", head: true }),
        supabase.from("artisans").select("id", { count: "exact", head: true }).eq("is_available", true),
        supabase.from("artisans").select("id", { count: "exact", head: true }).eq("verified", false),
        supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);

      setStats({
        totalBookings: bookingsRes.count ?? 0,
        activeArtisans: artisansRes.count ?? 0,
        pendingVerifications: pendingRes.count ?? 0,
        openDisputes: disputesRes.count ?? 0,
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
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

  const statsCards = [
    {
      label: t("admin.totalBookings"),
      value: stats.totalBookings,
      icon: "calendar",
      color: "#3b82f6",
      screen: "AdminBookings",
    },
    {
      label: t("admin.activeArtisans"),
      value: stats.activeArtisans,
      icon: "construct",
      color: "#10b981",
      screen: "AdminArtisans",
    },
    {
      label: t("admin.pendingVerifications"),
      value: stats.pendingVerifications,
      icon: "time",
      color: "#f59e0b",
      screen: "AdminArtisans",
    },
    {
      label: t("admin.openDisputes"),
      value: stats.openDisputes,
      icon: "warning",
      color: "#ef4444",
      screen: "AdminDisputes",
    },
  ];

  const menuItems = [
    {
      icon: "construct-outline",
      label: t("admin.artisans"),
      screen: "AdminArtisans",
      color: "#10b981",
    },
    {
      icon: "people-outline",
      label: t("admin.clients"),
      screen: "AdminClients",
      color: "#3b82f6",
    },
    {
      icon: "calendar-outline",
      label: t("admin.bookings"),
      screen: "AdminBookings",
      color: "#8b5cf6",
    },
    {
      icon: "warning-outline",
      label: t("admin.disputes"),
      screen: "AdminDisputes",
      color: "#ef4444",
    },
    {
      icon: "chatbubble-outline",
      label: t("admin.messages"),
      screen: "AdminMessage",
      color: "#f59e0b",
    },
    {
      icon: "receipt-outline",
      label: "Factures",
      screen: "AdminInvoices",
      color: "#10b981",
    },
    {
      icon: "stats-chart-outline",
      label: t("admin.stats"),
      screen: "AdminStats",
      color: ADMIN_ACCENT,
    },
  ];

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
          <Text style={styles.headerTitle}>{t("admin.title")}</Text>
          <Text style={styles.headerSubtitle}>CasaFix</Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          {statsCards.map((card, index) => (
            <TouchableOpacity
              key={index}
              style={styles.statCard}
              onPress={() => navigation.navigate(card.screen)}
              activeOpacity={0.7}
            >
              <View style={[styles.statIconContainer, { backgroundColor: card.color + "20" }]}>
                <Icon name={card.icon} size={20} color={card.color} />
              </View>
              <Text style={styles.statValue}>{card.value}</Text>
              <Text style={styles.statLabel}>{card.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={() => navigation.navigate(item.screen)}
              activeOpacity={0.7}
            >
              <View style={styles.menuLeft}>
                <View style={[styles.menuIconContainer, { backgroundColor: item.color + "20" }]}>
                  <Icon name={item.icon} size={22} color={item.color} />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
              </View>
              <Icon name="chevron-forward" size={18} color="#6b7280" />
            </TouchableOpacity>
          ))}
        </View>
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
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#ffffff",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  statCard: {
    backgroundColor: ADMIN_CARD,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    width: "48.5%",
    minWidth: 150,
    flexGrow: 1,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.sm,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "800",
    color: "#ffffff",
  },
  statLabel: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 2,
  },
  menuSection: {
    marginTop: SPACING.xl,
    marginHorizontal: SPACING.md,
    backgroundColor: ADMIN_CARD,
    borderRadius: RADIUS.lg,
    overflow: "hidden",
    marginBottom: SPACING.xl,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#3a3a4d",
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
});
