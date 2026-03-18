import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  FlatList,
  TextInput,
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
const PAGE_SIZE = 20;

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  searching: "#3b82f6",
  matched: "#8b5cf6",
  in_progress: "#3b82f6",
  price_proposed: "#f59e0b",
  price_accepted: "#10b981",
  work_in_progress: "#3b82f6",
  pending_client_confirmation: "#f59e0b",
  work_completed: "#10b981",
  completed: "#10b981",
  disputed: "#ef4444",
  cancelled: "#6b7280",
};

const STATUS_FILTERS = [
  "all",
  "pending",
  "searching",
  "matched",
  "in_progress",
  "price_proposed",
  "work_in_progress",
  "completed",
  "disputed",
  "cancelled",
];

export default function AdminBookingsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [bookings, setBookings] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchBookings = useCallback(
    async (pageNum: number = 0, append: boolean = false) => {
      try {
        let query = supabase
          .from("bookings")
          .select(`
            *,
            client:profiles!bookings_client_id_fkey(full_name),
            artisan:artisans!bookings_artisan_id_fkey(full_name)
          `)
          .order("created_at", { ascending: false })
          .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

        if (statusFilter !== "all") {
          query = query.eq("status", statusFilter);
        }

        if (search.trim()) {
          query = query.ilike("service_name", `%${search.trim()}%`);
        }

        const { data, error } = await query;
        if (error) throw error;

        const results = data || [];
        setHasMore(results.length === PAGE_SIZE);

        if (append) {
          setBookings((prev) => [...prev, ...results]);
        } else {
          setBookings(results);
        }
      } catch (error) {
        console.error("Error fetching bookings:", error);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [statusFilter, search]
  );

  useEffect(() => {
    setPage(0);
    setLoading(true);
    fetchBookings(0);
  }, [fetchBookings]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(0);
    fetchBookings(0);
  }, [fetchBookings]);

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    fetchBookings(nextPage, true);
  }, [hasMore, loadingMore, page, fetchBookings]);

  const getStatusColor = (status: string) => STATUS_COLORS[status] || "#6b7280";

  const getStatusLabel = (status: string) => {
    const statusLabels: Record<string, string> = {
      pending: t("admin.pending"),
      searching: t("admin.searching"),
      matched: t("admin.matched"),
      in_progress: t("admin.inProgress"),
      price_proposed: t("admin.priceProposed"),
      work_in_progress: t("admin.workInProgress"),
      completed: t("admin.completed"),
      disputed: t("admin.disputed"),
      cancelled: t("admin.cancelled"),
    };
    return statusLabels[status] || status;
  };

  const renderBooking = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.bookingCard}
      onPress={() => navigation.navigate("AdminBookingDetail", { bookingId: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.bookingHeader}>
        <Text style={styles.serviceName} numberOfLines={1}>
          {item.service_name}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + "20" }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {getStatusLabel(item.status)}
          </Text>
        </View>
      </View>

      <View style={styles.bookingDetails}>
        <View style={styles.detailRow}>
          <Icon name="person-outline" size={14} color="#9ca3af" />
          <Text style={styles.detailText}>
            {t("admin.client")}: {item.client?.full_name || "N/A"}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Icon name="construct-outline" size={14} color="#9ca3af" />
          <Text style={styles.detailText}>
            {t("admin.artisan")}: {item.artisan?.full_name || "N/A"}
          </Text>
        </View>
        <View style={styles.detailRowSpaced}>
          <View style={styles.detailRow}>
            <Icon name="calendar-outline" size={14} color="#9ca3af" />
            <Text style={styles.detailText}>
              {new Date(item.created_at).toLocaleDateString("fr-FR")}
            </Text>
          </View>
          {item.final_price != null && (
            <Text style={styles.priceText}>{item.final_price} EUR</Text>
          )}
          {item.final_price == null && item.max_price != null && (
            <Text style={styles.priceTextMuted}>max {item.max_price} EUR</Text>
          )}
        </View>
      </View>
      <Icon name="chevron-forward" size={16} color="#6b7280" style={styles.chevron} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={ADMIN_DARK} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("admin.bookings")}</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={18} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          placeholder={t("admin.searchBookings")}
          placeholderTextColor="#6b7280"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Icon name="close-circle" size={18} color="#6b7280" />
          </TouchableOpacity>
        )}
      </View>

      {/* Status Filter */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={STATUS_FILTERS}
        keyExtractor={(item) => item}
        contentContainerStyle={styles.filterContainer}
        renderItem={({ item }) => {
          const filterLabels: Record<string, string> = {
            all: t("admin.all"),
            pending: t("admin.pending"),
            searching: t("admin.searching"),
            matched: t("admin.matched"),
            in_progress: t("admin.inProgress"),
            price_proposed: t("admin.priceProposed"),
            work_in_progress: t("admin.workInProgress"),
            completed: t("admin.completed"),
            disputed: t("admin.disputed"),
            cancelled: t("admin.cancelled"),
          };
          return (
            <TouchableOpacity
              style={[styles.filterChip, statusFilter === item && styles.filterChipActive]}
              onPress={() => setStatusFilter(item)}
            >
              <Text style={[styles.filterText, statusFilter === item && styles.filterTextActive]}>
                {filterLabels[item] || item}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ADMIN_ACCENT} />
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id}
          renderItem={renderBooking}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ADMIN_ACCENT} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator size="small" color={ADMIN_ACCENT} style={{ paddingVertical: 16 }} />
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="calendar-outline" size={48} color="#6b7280" />
              <Text style={styles.emptyText}>{t("admin.noBookings")}</Text>
            </View>
          }
        />
      )}
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ADMIN_CARD,
    borderRadius: RADIUS.md,
    marginHorizontal: SPACING.md,
    paddingHorizontal: SPACING.md,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#ffffff",
  },
  filterContainer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: ADMIN_CARD,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: ADMIN_ACCENT,
  },
  filterText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9ca3af",
    textTransform: "capitalize",
  },
  filterTextActive: {
    color: "#ffffff",
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  bookingCard: {
    backgroundColor: ADMIN_CARD,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  bookingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  bookingDetails: {
    gap: 6,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailRowSpaced: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  detailText: {
    fontSize: 13,
    color: "#9ca3af",
  },
  priceText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#10b981",
  },
  priceTextMuted: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
  },
  chevron: {
    position: "absolute",
    right: SPACING.md,
    top: "50%",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: "#6b7280",
  },
});
