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
  Image,
  RefreshControl,
  ScrollView,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { SPACING, RADIUS } from "../../constants/theme";
import { supabase } from "../../lib/supabase";

const ADMIN_DARK = "#1e1e2e";
const ADMIN_CARD = "#2a2a3d";
const ADMIN_ACCENT = "#7c3aed";

type TabKey = "all" | "pending" | "verified" | "suspended";

export default function AdminArtisansScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [artisans, setArtisans] = useState<any[]>([]);

  const tabs: { key: TabKey; label: string }[] = [
    { key: "all", label: t("admin.all") },
    { key: "pending", label: t("admin.pending") },
    { key: "verified", label: t("admin.verified") },
    { key: "suspended", label: t("admin.suspended") },
  ];

  const fetchArtisans = useCallback(async () => {
    try {
      let query = supabase.from("artisans").select("*").order("created_at", { ascending: false });

      if (activeTab === "pending") {
        query = query.eq("is_verified", false).or("suspended_until.is.null,suspended_until.lt." + new Date().toISOString());
      } else if (activeTab === "verified") {
        query = query.eq("is_verified", true);
      } else if (activeTab === "suspended") {
        query = query.gt("suspended_until", new Date().toISOString());
      }

      if (search.trim()) {
        query = query.ilike("full_name", `%${search.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setArtisans(data || []);
    } catch (error) {
      console.error("Error fetching artisans:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, search]);

  useEffect(() => {
    setLoading(true);
    fetchArtisans();
  }, [fetchArtisans]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchArtisans();
  }, [fetchArtisans]);

  const isSuspended = (artisan: any) => {
    return artisan.suspended_until && new Date(artisan.suspended_until) > new Date();
  };

  const renderArtisan = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.artisanCard}
      onPress={() => navigation.navigate("AdminArtisanDetail", { artisanId: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.artisanRow}>
        {item.avatar_url ? (
          <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Icon name="person" size={20} color="#9ca3af" />
          </View>
        )}
        <View style={styles.artisanInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.artisanName} numberOfLines={1}>
              {item.full_name}
            </Text>
            {item.is_verified && (
              <Icon name="checkmark-circle" size={16} color="#10b981" />
            )}
            {isSuspended(item) && (
              <Icon name="ban" size={16} color="#ef4444" />
            )}
          </View>
          <View style={styles.ratingRow}>
            <Icon name="star" size={14} color="#f59e0b" />
            <Text style={styles.ratingText}>
              {item.rating?.toFixed(1) || "0.0"} ({item.review_count || 0})
            </Text>
          </View>
          <View style={styles.categoriesRow}>
            {(item.categories || []).slice(0, 3).map((cat: string, idx: number) => (
              <View key={idx} style={styles.categoryChip}>
                <Text style={styles.categoryChipText}>{cat}</Text>
              </View>
            ))}
            {(item.categories || []).length > 3 && (
              <Text style={styles.moreCategories}>+{item.categories.length - 3}</Text>
            )}
          </View>
        </View>
        <View style={styles.artisanMeta}>
          <Text style={styles.dateText}>
            {new Date(item.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
          </Text>
          <Icon name="chevron-forward" size={16} color="#6b7280" />
        </View>
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
        <Text style={styles.headerTitle}>{t("admin.artisans")}</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={18} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher..."
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

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContainer}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ADMIN_ACCENT} />
        </View>
      ) : (
        <FlatList
          data={artisans}
          keyExtractor={(item) => item.id}
          renderItem={renderArtisan}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ADMIN_ACCENT} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="people-outline" size={48} color="#6b7280" />
              <Text style={styles.emptyText}>Aucun artisan</Text>
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
  tabsContainer: {
    flexDirection: "row",
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.md,
    paddingBottom: SPACING.sm,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: ADMIN_CARD,
  },
  tabActive: {
    backgroundColor: ADMIN_ACCENT,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9ca3af",
  },
  tabTextActive: {
    color: "#ffffff",
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  artisanCard: {
    backgroundColor: ADMIN_CARD,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  artisanRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#3a3a4d",
    alignItems: "center",
    justifyContent: "center",
  },
  artisanInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  artisanName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
    flexShrink: 1,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  ratingText: {
    fontSize: 12,
    color: "#9ca3af",
  },
  categoriesRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 6,
  },
  categoryChip: {
    backgroundColor: ADMIN_ACCENT + "30",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  categoryChipText: {
    fontSize: 10,
    fontWeight: "600",
    color: ADMIN_ACCENT,
  },
  moreCategories: {
    fontSize: 10,
    color: "#6b7280",
    fontWeight: "600",
  },
  artisanMeta: {
    alignItems: "flex-end",
    gap: 8,
  },
  dateText: {
    fontSize: 11,
    color: "#6b7280",
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
