import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabase";
import { Booking, BookingStatus } from "../lib/database.types";
import { CATEGORIES } from "../constants/categories";
import { COLORS, SPACING, RADIUS } from "../constants/theme";

type Props = {
  navigation: any;
};

const STATUS_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  pending: { icon: "time", color: "#6b7280", bg: "#f3f4f6" },
  searching: { icon: "search", color: "#3b82f6", bg: "#EFF6FF" },
  matched: { icon: "person-add", color: "#8b5cf6", bg: "#f5f3ff" },
  in_progress: { icon: "construct", color: "#f59e0b", bg: "#FEF3C7" },
  price_proposed: { icon: "pricetag", color: "#e11d48", bg: "#fff1f2" },
  price_accepted: { icon: "checkmark-circle", color: "#16a34a", bg: "#dcfce7" },
  disputed: { icon: "flag", color: "#dc2626", bg: "#fee2e2" },
  work_in_progress: { icon: "hammer", color: "#f59e0b", bg: "#FEF3C7" },
  pending_client_confirmation: { icon: "alert-circle", color: "#e11d48", bg: "#fff1f2" },
  work_completed: { icon: "checkmark-done", color: "#16a34a", bg: "#dcfce7" },
  completed: { icon: "checkmark-done-circle", color: "#16a34a", bg: "#dcfce7" },
  cancelled: { icon: "close-circle", color: "#6b7280", bg: "#f3f4f6" },
};

export default function MyBookingsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<"active" | "past">("active");

  const activeStatuses: BookingStatus[] = [
    "pending", "searching", "matched", "in_progress",
    "price_proposed", "price_accepted", "work_in_progress",
    "pending_client_confirmation", "disputed",
  ];

  const PAGE_SIZE = 20;
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchBookings = useCallback(async (loadMore = false) => {
    const from = loadMore ? bookings.length : 0;
    const to = from + PAGE_SIZE - 1;

    const { data } = await supabase
      .from("bookings")
      .select(`
        *,
        artisan:artisans(id, full_name, phone, avatar_url, rating)
      `)
      .order("created_at", { ascending: false })
      .range(from, to);

    const newData = data || [];
    if (loadMore) {
      setBookings((prev) => [...prev, ...newData]);
    } else {
      setBookings(newData);
    }
    setHasMore(newData.length === PAGE_SIZE);
    setLoading(false);
    setRefreshing(false);
    setLoadingMore(false);
  }, [bookings.length]);

  useEffect(() => {
    fetchBookings();

    // Listen for realtime updates on all user bookings
    const channel = supabase
      .channel("my-bookings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => fetchBookings()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchBookings]);

  const filtered = bookings.filter((b) =>
    tab === "active"
      ? activeStatuses.includes(b.status)
      : !activeStatuses.includes(b.status)
  );

  function handleBookingPress(booking: any) {
    const s = booking.status as BookingStatus;

    if (s === "price_proposed") {
      navigation.navigate("PriceConfirmation", {
        bookingId: booking.id,
        serviceName: booking.service_name,
        artisanName: booking.artisan?.full_name || "",
        depositAmount: booking.deposit_amount || booking.max_price,
        proposedPrice: booking.proposed_price,
        paymentIntentId: booking.stripe_payment_intent_id,
      });
    } else if (s === "pending_client_confirmation") {
      navigation.navigate("WorkCompletion", {
        bookingId: booking.id,
        serviceName: booking.service_name,
        artisanName: booking.artisan?.full_name || "",
        finalPrice: booking.final_price || booking.proposed_price,
        artisanMarkedDoneAt: booking.artisan_marked_done_at,
      });
    } else if (s === "completed" || s === "work_completed") {
      navigation.navigate("Review", {
        bookingId: booking.id,
        artisanId: booking.artisan_id || "",
        artisanName: booking.artisan?.full_name || "",
        serviceName: booking.service_name,
      });
    }
  }

  function renderBooking({ item }: { item: any }) {
    const category = CATEGORIES.find((c) => c.id === item.category_id);
    const config = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
    const needsAction = item.status === "price_proposed" || item.status === "pending_client_confirmation";
    const date = new Date(item.created_at).toLocaleDateString();

    return (
      <TouchableOpacity
        style={[styles.bookingCard, needsAction && styles.bookingCardAction]}
        onPress={() => handleBookingPress(item)}
        activeOpacity={0.8}
      >
        {needsAction && (
          <View style={styles.actionBadge}>
            <Icon name="alert-circle" size={12} color="#FFFFFF" />
            <Text style={styles.actionBadgeText}>{t("bookings.actionNeeded")}</Text>
          </View>
        )}

        <View style={styles.bookingRow}>
          <View style={[styles.catIcon, { backgroundColor: category?.bg || "#f3f4f6" }]}>
            <Icon name={category?.icon || "build"} size={20} color={category?.color || COLORS.primary} />
          </View>
          <View style={styles.bookingInfo}>
            <Text style={styles.bookingService}>{item.service_name}</Text>
            {item.artisan?.full_name && (
              <Text style={styles.bookingArtisan}>{item.artisan.full_name}</Text>
            )}
            <Text style={styles.bookingDate}>{date}</Text>
          </View>
          <View style={styles.bookingRight}>
            <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
              <Icon name={config.icon} size={12} color={config.color} />
              <Text style={[styles.statusText, { color: config.color }]}>
                {t(`bookings.status.${item.status}`)}
              </Text>
            </View>
            {item.final_price ? (
              <Text style={styles.bookingPrice}>{item.final_price}€</Text>
            ) : item.proposed_price ? (
              <Text style={styles.bookingPrice}>{item.proposed_price}€</Text>
            ) : (
              <Text style={styles.bookingPriceRange}>{item.price_range}</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("bookings.title")}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === "active" && styles.tabActive]}
          onPress={() => setTab("active")}
        >
          <Text style={[styles.tabText, tab === "active" && styles.tabTextActive]}>
            {t("bookings.active")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === "past" && styles.tabActive]}
          onPress={() => setTab("past")}
        >
          <Text style={[styles.tabText, tab === "past" && styles.tabTextActive]}>
            {t("bookings.past")}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderBooking}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchBookings(false); }} />
        }
        onEndReached={() => {
          if (hasMore && !loadingMore && !loading) {
            setLoadingMore(true);
            fetchBookings(true);
          }
        }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator style={{ paddingVertical: 20 }} color={COLORS.primary} />
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="document-text-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>{t("bookings.empty")}</Text>
          </View>
        }
      />
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
  headerTitle: { fontSize: 18, fontWeight: "700", color: COLORS.text },
  tabs: {
    flexDirection: "row", marginHorizontal: SPACING.md, marginBottom: SPACING.md,
    backgroundColor: "#f3f4f6", borderRadius: RADIUS.sm, padding: 3,
  },
  tab: {
    flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: RADIUS.sm - 2,
  },
  tabActive: { backgroundColor: "#FFFFFF" },
  tabText: { fontSize: 14, fontWeight: "500", color: COLORS.textLight },
  tabTextActive: { color: COLORS.text, fontWeight: "600" },
  list: { paddingHorizontal: SPACING.md, paddingBottom: 30 },
  bookingCard: {
    backgroundColor: "#FFFFFF", borderRadius: RADIUS.md, padding: SPACING.md,
    marginBottom: SPACING.sm, borderWidth: 1, borderColor: "#f3f4f6",
  },
  bookingCardAction: { borderColor: "#fecaca", borderWidth: 2 },
  actionBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#e11d48", paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 10, alignSelf: "flex-start", marginBottom: 8,
  },
  actionBadgeText: { fontSize: 11, fontWeight: "600", color: "#FFFFFF" },
  bookingRow: { flexDirection: "row", alignItems: "center" },
  catIcon: {
    width: 44, height: 44, borderRadius: RADIUS.sm,
    alignItems: "center", justifyContent: "center", marginRight: 12,
  },
  bookingInfo: { flex: 1 },
  bookingService: { fontSize: 14, fontWeight: "600", color: "#1f2937" },
  bookingArtisan: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  bookingDate: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
  bookingRight: { alignItems: "flex-end", gap: 4 },
  statusBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  statusText: { fontSize: 10, fontWeight: "600" },
  bookingPrice: { fontSize: 15, fontWeight: "700", color: COLORS.primary },
  bookingPriceRange: { fontSize: 12, color: COLORS.textLight },
  empty: { alignItems: "center", paddingTop: 80 },
  emptyText: { fontSize: 14, color: "#9ca3af", marginTop: 12 },
});
