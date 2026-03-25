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

export default function AdminInvoicesScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [invoices, setInvoices] = useState<any[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);

  const fetchInvoices = useCallback(async () => {
    try {
      let query = supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false });

      if (search.trim()) {
        query = query.or(`invoice_number.ilike.%${search.trim()}%,client_name.ilike.%${search.trim()}%,artisan_name.ilike.%${search.trim()}%,service_name.ilike.%${search.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      const list = data || [];
      setInvoices(list);
      setTotalRevenue(list.reduce((sum: number, inv: any) => sum + (inv.casafix_commission || 0), 0));
    } catch (error) {

    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useEffect(() => {
    setLoading(true);
    fetchInvoices();
  }, [fetchInvoices]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchInvoices();
  }, [fetchInvoices]);

  const renderInvoice = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.invoiceCard}
      onPress={() => navigation.navigate("Invoice", { bookingId: item.booking_id })}
      activeOpacity={0.7}
    >
      <View style={styles.invoiceHeader}>
        <View style={styles.invoiceNumberBadge}>
          <Icon name="document-text" size={14} color={ADMIN_ACCENT} />
          <Text style={styles.invoiceNumber}>{item.invoice_number}</Text>
        </View>
        <Text style={styles.invoiceDate}>
          {new Date(item.created_at).toLocaleDateString("fr-FR")}
        </Text>
      </View>

      <Text style={styles.serviceName}>{item.service_name}</Text>

      <View style={styles.invoiceParties}>
        <View style={styles.partyRow}>
          <Icon name="person-outline" size={13} color="#9ca3af" />
          <Text style={styles.partyText}>{item.client_name || "—"}</Text>
        </View>
        <View style={styles.partyRow}>
          <Icon name="construct-outline" size={13} color="#9ca3af" />
          <Text style={styles.partyText}>{item.artisan_name || "—"}</Text>
        </View>
      </View>

      <View style={styles.invoiceAmounts}>
        <View style={styles.amountItem}>
          <Text style={styles.amountLabel}>{t("admin.totalTTC")}</Text>
          <Text style={styles.amountValue}>{item.total?.toFixed(2)}€</Text>
        </View>
        <View style={styles.amountItem}>
          <Text style={styles.amountLabel}>{t("admin.commissionLabel")}</Text>
          <Text style={styles.amountCommission}>{item.casafix_commission?.toFixed(2)}€</Text>
        </View>
        <View style={styles.amountItem}>
          <Text style={styles.amountLabel}>{t("admin.netArtisan")}</Text>
          <Text style={styles.amountNet}>{item.artisan_net?.toFixed(2)}€</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={ADMIN_DARK} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("admin.invoicesTitle")}</Text>
      </View>

      {/* Revenue card */}
      <View style={styles.revenueCard}>
        <Text style={styles.revenueLabel}>{t("admin.invoiceRevenue")}</Text>
        <Text style={styles.revenueAmount}>{totalRevenue.toFixed(2)}€</Text>
        <Text style={styles.revenueCount}>{t("admin.invoiceCount", { count: invoices.length })}</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={18} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          placeholder={t("admin.searchInvoice")}
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

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ADMIN_ACCENT} />
        </View>
      ) : (
        <FlatList
          data={invoices}
          keyExtractor={(item) => item.id}
          renderItem={renderInvoice}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ADMIN_ACCENT} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="receipt-outline" size={48} color="#6b7280" />
              <Text style={styles.emptyText}>{t("admin.noInvoices")}</Text>
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
  revenueCard: {
    backgroundColor: "#10b981", borderRadius: RADIUS.lg,
    padding: SPACING.lg, marginHorizontal: SPACING.md, marginBottom: SPACING.md,
    alignItems: "center",
  },
  revenueLabel: { fontSize: 13, color: "rgba(255,255,255,0.8)", fontWeight: "500" },
  revenueAmount: { fontSize: 36, fontWeight: "900", color: "#ffffff", marginTop: 4 },
  revenueCount: { fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 4 },
  searchContainer: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: ADMIN_CARD, borderRadius: RADIUS.md,
    marginHorizontal: SPACING.md, marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md, height: 44, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, color: "#ffffff" },
  listContent: { padding: SPACING.md, paddingBottom: SPACING.xl },
  invoiceCard: {
    backgroundColor: ADMIN_CARD, borderRadius: RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.sm,
  },
  invoiceHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginBottom: 8,
  },
  invoiceNumberBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: ADMIN_ACCENT + "20", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  invoiceNumber: { fontSize: 12, fontWeight: "700", color: ADMIN_ACCENT },
  invoiceDate: { fontSize: 12, color: "#9ca3af" },
  serviceName: { fontSize: 15, fontWeight: "700", color: "#ffffff", marginBottom: 8 },
  invoiceParties: { gap: 4, marginBottom: 10 },
  partyRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  partyText: { fontSize: 13, color: "#9ca3af" },
  invoiceAmounts: {
    flexDirection: "row", justifyContent: "space-between",
    backgroundColor: ADMIN_DARK, borderRadius: RADIUS.sm, padding: 10,
  },
  amountItem: { alignItems: "center" },
  amountLabel: { fontSize: 10, color: "#6b7280", fontWeight: "500", marginBottom: 2 },
  amountValue: { fontSize: 15, fontWeight: "700", color: "#ffffff" },
  amountCommission: { fontSize: 15, fontWeight: "700", color: ADMIN_ACCENT },
  amountNet: { fontSize: 15, fontWeight: "700", color: "#10b981" },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 15, color: "#6b7280" },
});
