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
  Image,
  Alert,
  RefreshControl,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SPACING, RADIUS } from "../../constants/theme";
import { supabase } from "../../lib/supabase";

const ADMIN_DARK = "#1e1e2e";
const ADMIN_CARD = "#2a2a3d";
const ADMIN_ACCENT = "#7c3aed";

export default function AdminArtisanDetailScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { artisanId } = route.params;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [artisan, setArtisan] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchArtisan = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("artisans")
        .select("*")
        .eq("id", artisanId)
        .single();
      if (error) throw error;
      setArtisan(data);
    } catch (error) {
      console.error("Error fetching artisan:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [artisanId]);

  useEffect(() => {
    fetchArtisan();
  }, [fetchArtisan]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchArtisan();
  }, [fetchArtisan]);

  const isSuspended = artisan?.suspended_until && new Date(artisan.suspended_until) > new Date();

  const handleValidate = () => {
    Alert.alert(t("admin.validate"), t("admin.validateConfirm"), [
      { text: "Non", style: "cancel" },
      {
        text: t("admin.validate"),
        onPress: async () => {
          setActionLoading(true);
          try {
            await supabase
              .from("artisans")
              .update({ is_verified: true })
              .eq("id", artisanId);
            await fetchArtisan();
          } catch (error) {
            console.error("Error validating artisan:", error);
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleSuspend = () => {
    Alert.alert(t("admin.suspend"), t("admin.suspendConfirm"), [
      { text: "Non", style: "cancel" },
      {
        text: t("admin.suspend"),
        style: "destructive",
        onPress: async () => {
          setActionLoading(true);
          try {
            const suspendedUntil = new Date();
            suspendedUntil.setDate(suspendedUntil.getDate() + 30);
            await supabase
              .from("artisans")
              .update({ suspended_until: suspendedUntil.toISOString(), is_available: false })
              .eq("id", artisanId);
            await fetchArtisan();
          } catch (error) {
            console.error("Error suspending artisan:", error);
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleReactivate = () => {
    Alert.alert(t("admin.reactivate"), t("admin.reactivateConfirm"), [
      { text: "Non", style: "cancel" },
      {
        text: t("admin.reactivate"),
        onPress: async () => {
          setActionLoading(true);
          try {
            await supabase
              .from("artisans")
              .update({ suspended_until: null, is_available: true })
              .eq("id", artisanId);
            await fetchArtisan();
          } catch (error) {
            console.error("Error reactivating artisan:", error);
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

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

  if (!artisan) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={ADMIN_DARK} />
        <View style={styles.loadingContainer}>
          <Text style={{ color: "#9ca3af" }}>Artisan introuvable</Text>
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
        </View>

        {/* Profile Section */}
        <View style={styles.profileSection}>
          {artisan.avatar_url ? (
            <Image source={{ uri: artisan.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Icon name="person" size={40} color="#9ca3af" />
            </View>
          )}
          <Text style={styles.artisanName}>{artisan.full_name}</Text>
          <View style={styles.badgeRow}>
            {artisan.is_verified && (
              <View style={[styles.badge, { backgroundColor: "#10b98120" }]}>
                <Icon name="checkmark-circle" size={14} color="#10b981" />
                <Text style={[styles.badgeText, { color: "#10b981" }]}>{t("admin.verified")}</Text>
              </View>
            )}
            {isSuspended && (
              <View style={[styles.badge, { backgroundColor: "#ef444420" }]}>
                <Icon name="ban" size={14} color="#ef4444" />
                <Text style={[styles.badgeText, { color: "#ef4444" }]}>{t("admin.suspended")}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Info Cards */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Telephone</Text>
            <Text style={styles.infoValue}>{artisan.phone || "N/A"}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{artisan.email || "N/A"}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>NIE / NIF</Text>
            <Text style={styles.infoValue}>{artisan.nie_nif || "N/A"}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>N. Autonomo</Text>
            <Text style={styles.infoValue}>{artisan.autonomo_number || "N/A"}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Adresse</Text>
            <Text style={styles.infoValue}>{artisan.business_address || "N/A"}</Text>
          </View>
        </View>

        {/* ID Document */}
        {artisan.id_document_url && (
          <View style={styles.documentSection}>
            <Text style={styles.sectionTitle}>Document d'identite</Text>
            <Image
              source={{ uri: artisan.id_document_url }}
              style={styles.documentImage}
              resizeMode="contain"
            />
          </View>
        )}

        {/* Categories */}
        <View style={styles.categoriesSection}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <View style={styles.categoriesGrid}>
            {(artisan.categories || []).map((cat: string, idx: number) => (
              <View key={idx} style={styles.categoryChip}>
                <Text style={styles.categoryChipText}>{cat}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Rating */}
        <View style={styles.ratingSection}>
          <View style={styles.ratingCard}>
            <Icon name="star" size={24} color="#f59e0b" />
            <Text style={styles.ratingValue}>{artisan.rating?.toFixed(1) || "0.0"}</Text>
            <Text style={styles.ratingCount}>({artisan.review_count || 0} avis)</Text>
          </View>
          <View style={styles.ratingCard}>
            <Icon name="calendar" size={24} color="#3b82f6" />
            <Text style={styles.ratingValue}>
              {new Date(artisan.created_at).toLocaleDateString("fr-FR")}
            </Text>
            <Text style={styles.ratingCount}>Inscription</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          {!artisan.is_verified && (
            <TouchableOpacity
              style={[styles.actionButton, styles.validateButton]}
              onPress={handleValidate}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Icon name="checkmark-circle" size={20} color="#ffffff" />
                  <Text style={styles.actionButtonText}>{t("admin.validate")}</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {!isSuspended ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.suspendButton]}
              onPress={handleSuspend}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Icon name="ban" size={20} color="#ffffff" />
                  <Text style={styles.actionButtonText}>{t("admin.suspend")}</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, styles.reactivateButton]}
              onPress={handleReactivate}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Icon name="refresh" size={20} color="#ffffff" />
                  <Text style={styles.actionButtonText}>{t("admin.reactivate")}</Text>
                </>
              )}
            </TouchableOpacity>
          )}
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: ADMIN_CARD,
    alignItems: "center",
    justifyContent: "center",
  },
  profileSection: {
    alignItems: "center",
    paddingVertical: SPACING.lg,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: ADMIN_CARD,
    alignItems: "center",
    justifyContent: "center",
  },
  artisanName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#ffffff",
    marginTop: SPACING.md,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: SPACING.sm,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  infoSection: {
    marginHorizontal: SPACING.md,
    backgroundColor: ADMIN_CARD,
    borderRadius: RADIUS.lg,
    overflow: "hidden",
  },
  infoCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#3a3a4d",
  },
  infoLabel: {
    fontSize: 13,
    color: "#9ca3af",
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 14,
    color: "#ffffff",
    fontWeight: "600",
    flexShrink: 1,
    textAlign: "right",
    maxWidth: "60%",
  },
  documentSection: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },
  documentImage: {
    width: "100%",
    height: 200,
    borderRadius: RADIUS.lg,
    backgroundColor: ADMIN_CARD,
  },
  categoriesSection: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.lg,
  },
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    backgroundColor: ADMIN_ACCENT + "30",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: ADMIN_ACCENT,
  },
  ratingSection: {
    flexDirection: "row",
    marginHorizontal: SPACING.md,
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },
  ratingCard: {
    flex: 1,
    backgroundColor: ADMIN_CARD,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: "center",
    gap: 4,
  },
  ratingValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#ffffff",
  },
  ratingCount: {
    fontSize: 12,
    color: "#9ca3af",
  },
  actionsSection: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.xl,
    marginBottom: SPACING.xl,
    gap: SPACING.sm,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: RADIUS.lg,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },
  validateButton: {
    backgroundColor: "#10b981",
  },
  suspendButton: {
    backgroundColor: "#ef4444",
  },
  reactivateButton: {
    backgroundColor: "#3b82f6",
  },
});
