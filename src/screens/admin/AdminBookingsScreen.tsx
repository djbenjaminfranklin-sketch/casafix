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
  Alert,
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
  "all", "pending", "searching", "matched", "in_progress",
  "price_proposed", "work_in_progress", "completed", "disputed", "cancelled",
];

export default function AdminBookingsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [bookings, setBookings] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);

  const fetchBookings = useCallback(async () => {
    try {
      let query = supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (search.trim()) {
        query = query.ilike("service_name", `%${search.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    setLoading(true);
    fetchBookings();
  }, [fetchBookings]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBookings();
  }, [fetchBookings]);

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
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
    return labels[status] || status;
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === bookings.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(bookings.map((b) => b.id)));
    }
  };

  const deleteSelected = () => {
    if (selectedIds.size === 0) return;
    Alert.alert(
      `Supprimer ${selectedIds.size} réservation(s) ?`,
      "Cette action est irréversible.",
      [
        { text: t("admin.cancel"), style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            const ids = Array.from(selectedIds);
            await supabase.from("bookings").delete().in("id", ids);
            setSelectedIds(new Set());
            setSelectMode(false);
            fetchBookings();
          },
        },
      ]
    );
  };

  const renderBooking = ({ item }: { item: any }) => {
    const isSelected = selectedIds.has(item.id);
    return (
      <TouchableOpacity
        style={[styles.bookingCard, isSelected && styles.bookingCardSelected]}
        onPress={() => {
          if (selectMode) {
            toggleSelect(item.id);
          } else {
            navigation.navigate("AdminBookingDetail", { bookingId: item.id });
          }
        }}
        onLongPress={() => {
          setSelectMode(true);
          toggleSelect(item.id);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.bookingRow}>
          {selectMode && (
            <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
              {isSelected && <Icon name="checkmark" size={14} color="#ffffff" />}
            </View>
          )}

          <View style={styles.bookingInfo}>
            <View style={styles.bookingHeader}>
              <Text style={styles.serviceName} numberOfLines={1}>{item.service_name}</Text>
              <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[item.status] || "#6b7280") + "20" }]}>
                <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] || "#6b7280" }]}>
                  {getStatusLabel(item.status)}
                </Text>
              </View>
            </View>

            <View style={styles.bookingDetails}>
              <View style={styles.detailRow}>
                <Icon name="calendar-outline" size={13} color="#9ca3af" />
                <Text style={styles.detailText}>
                  {new Date(item.created_at).toLocaleDateString("fr-FR")}
                </Text>
              </View>
              {item.max_price != null && (
                <Text style={styles.priceText}>max {item.max_price}€</Text>
              )}
            </View>
          </View>

          {!selectMode && <Icon name="chevron-forward" size={16} color="#6b7280" />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={ADMIN_DARK} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("admin.bookings")}</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          onPress={() => {
            if (selectMode) {
              setSelectMode(false);
              setSelectedIds(new Set());
            } else {
              setSelectMode(true);
            }
          }}
        >
          <Text style={styles.selectBtn}>{selectMode ? "Annuler" : "Sélectionner"}</Text>
        </TouchableOpacity>
      </View>

      {/* Bulk actions bar */}
      {selectMode && selectedIds.size > 0 && (
        <View style={styles.bulkBar}>
          <TouchableOpacity onPress={selectAll} style={styles.bulkBtn}>
            <Icon name="checkbox-outline" size={18} color="#ffffff" />
            <Text style={styles.bulkBtnText}>
              {selectedIds.size === bookings.length ? "Tout désélectionner" : "Tout sélectionner"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={deleteSelected} style={[styles.bulkBtn, { backgroundColor: "#ef4444" }]}>
            <Icon name="trash" size={18} color="#ffffff" />
            <Text style={styles.bulkBtnText}>Supprimer ({selectedIds.size})</Text>
          </TouchableOpacity>
        </View>
      )}

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
          ListHeaderComponent={
            <View style={styles.filterRow}>
              {STATUS_FILTERS.map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[styles.filterChip, statusFilter === status && styles.filterChipActive]}
                  onPress={() => setStatusFilter(status)}
                >
                  <Text style={[styles.filterText, statusFilter === status && styles.filterTextActive]}>
                    {getStatusLabel(status)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
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
  container: { flex: 1, backgroundColor: ADMIN_DARK },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, gap: 12,
  },
  backButton: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: ADMIN_CARD, alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#ffffff" },
  selectBtn: { fontSize: 14, fontWeight: "600", color: ADMIN_ACCENT },
  bulkBar: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, gap: SPACING.sm,
  },
  bulkBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: ADMIN_CARD, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
  },
  bulkBtnText: { fontSize: 13, fontWeight: "600", color: "#ffffff" },
  searchContainer: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: ADMIN_CARD, borderRadius: RADIUS.md,
    marginHorizontal: SPACING.md, paddingHorizontal: SPACING.md, height: 44, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, color: "#ffffff" },
  filterRow: {
    flexDirection: "row", flexWrap: "wrap",
    paddingHorizontal: SPACING.sm, paddingBottom: SPACING.md, gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
    backgroundColor: ADMIN_CARD, marginRight: 6,
  },
  filterChipActive: { backgroundColor: ADMIN_ACCENT },
  filterText: { fontSize: 14, fontWeight: "600", color: "#9ca3af" },
  filterTextActive: { color: "#ffffff" },
  listContent: { padding: SPACING.md, paddingBottom: SPACING.xl },
  bookingCard: {
    backgroundColor: ADMIN_CARD, borderRadius: RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.sm,
  },
  bookingCardSelected: { borderWidth: 2, borderColor: ADMIN_ACCENT },
  bookingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  checkbox: {
    width: 24, height: 24, borderRadius: 6,
    borderWidth: 2, borderColor: "#6b7280",
    alignItems: "center", justifyContent: "center",
  },
  checkboxActive: { backgroundColor: ADMIN_ACCENT, borderColor: ADMIN_ACCENT },
  bookingInfo: { flex: 1 },
  bookingHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 6,
  },
  serviceName: { fontSize: 15, fontWeight: "700", color: "#ffffff", flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  bookingDetails: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  detailText: { fontSize: 12, color: "#9ca3af" },
  priceText: { fontSize: 13, fontWeight: "700", color: "#f59e0b" },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 15, color: "#6b7280" },
});
