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

export default function AdminClientsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [clients, setClients] = useState<any[]>([]);

  const fetchClients = useCallback(async () => {
    try {
      let query = supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (search.trim()) {
        query = query.or(
          `full_name.ilike.%${search.trim()}%,email.ilike.%${search.trim()}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch booking counts for each client
      const clientsWithCounts = await Promise.all(
        (data || []).map(async (client: any) => {
          const { count } = await supabase
            .from("bookings")
            .select("id", { count: "exact", head: true })
            .eq("client_id", client.id);
          return { ...client, bookings_count: count ?? 0 };
        })
      );

      setClients(clientsWithCounts);
    } catch (error) {
      console.error("Error fetching clients:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useEffect(() => {
    setLoading(true);
    fetchClients();
  }, [fetchClients]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchClients();
  }, [fetchClients]);

  const renderClient = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.clientCard}
      onPress={() => navigation.navigate("AdminClientDetail", { clientId: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.clientRow}>
        <View style={styles.avatarPlaceholder}>
          <Icon name="person" size={20} color="#9ca3af" />
        </View>
        <View style={styles.clientInfo}>
          <Text style={styles.clientName} numberOfLines={1}>
            {item.full_name || "N/A"}
          </Text>
          <View style={styles.detailRow}>
            <Icon name="mail-outline" size={12} color="#9ca3af" />
            <Text style={styles.detailText} numberOfLines={1}>
              {item.email || "N/A"}
            </Text>
          </View>
          {item.phone ? (
            <View style={styles.detailRow}>
              <Icon name="call-outline" size={12} color="#9ca3af" />
              <Text style={styles.detailText}>{item.phone}</Text>
            </View>
          ) : null}
          <View style={styles.metaRow}>
            <View style={styles.chip}>
              <Icon name="calendar-outline" size={10} color={ADMIN_ACCENT} />
              <Text style={styles.chipText}>
                {new Date(item.created_at).toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </Text>
            </View>
            <View style={styles.chip}>
              <Icon name="clipboard-outline" size={10} color={ADMIN_ACCENT} />
              <Text style={styles.chipText}>
                {item.bookings_count} {t("admin.bookingsCount")}
              </Text>
            </View>
          </View>
        </View>
        <Icon name="chevron-forward" size={16} color="#6b7280" />
      </View>
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
        <Text style={styles.headerTitle}>{t("admin.clients")}</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={18} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          placeholder={t("admin.searchClients")}
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
          data={clients}
          keyExtractor={(item) => item.id}
          renderItem={renderClient}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ADMIN_ACCENT} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="people-outline" size={48} color="#6b7280" />
              <Text style={styles.emptyText}>{t("admin.noClients")}</Text>
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
  listContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  clientCard: {
    backgroundColor: ADMIN_CARD,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  clientRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#3a3a4d",
    alignItems: "center",
    justifyContent: "center",
  },
  clientInfo: {
    flex: 1,
    marginLeft: 12,
  },
  clientName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  detailText: {
    fontSize: 12,
    color: "#9ca3af",
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ADMIN_ACCENT + "20",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  chipText: {
    fontSize: 10,
    fontWeight: "600",
    color: ADMIN_ACCENT,
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
