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
  Linking,
  Modal,
  Dimensions,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SPACING, RADIUS } from "../../constants/theme";
import { CATEGORIES } from "../../constants/categories";
import { supabase } from "../../lib/supabase";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const ADMIN_DARK = "#1e1e2e";
const ADMIN_CARD = "#2a2a3d";
const ADMIN_ACCENT = "#7c3aed";

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

export default function AdminArtisanDetailScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { artisanId } = route.params;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [artisan, setArtisan] = useState<any>(null);
  const [activeBookings, setActiveBookings] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  const fetchArtisan = useCallback(async () => {
    try {
      const [artisanRes, bookingsRes, reviewsRes] = await Promise.all([
        supabase.from("artisans").select("*").eq("id", artisanId).single(),
        supabase
          .from("bookings")
          .select("*, client:profiles!bookings_client_id_fkey(full_name)")
          .eq("artisan_id", artisanId)
          .not("status", "in", '("completed","cancelled")')
          .order("created_at", { ascending: false }),
        supabase
          .from("reviews")
          .select("*")
          .eq("artisan_id", artisanId)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      if (artisanRes.error) throw artisanRes.error;
      setArtisan(artisanRes.data);
      setActiveBookings(bookingsRes.data || []);
      setReviews(reviewsRes.data || []);
    } catch (error) {

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
      { text: t("admin.no"), style: "cancel" },
      {
        text: t("admin.validate"),
        onPress: async () => {
          setActionLoading(true);
          try {
            await supabase
              .from("artisans")
              .update({ verified: true })
              .eq("id", artisanId);
            await fetchArtisan();
          } catch (error) {

          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleSuspend = () => {
    Alert.alert(t("admin.suspend"), t("admin.suspendConfirm"), [
      { text: t("admin.no"), style: "cancel" },
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

          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleReactivate = () => {
    Alert.alert(t("admin.reactivate"), t("admin.reactivateConfirm"), [
      { text: t("admin.no"), style: "cancel" },
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

          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleDelete = () => {
    Alert.alert(t("admin.deleteArtisan"), t("admin.deleteArtisanConfirm"), [
      { text: t("admin.no"), style: "cancel" },
      {
        text: t("admin.deleteArtisan"),
        style: "destructive",
        onPress: async () => {
          setActionLoading(true);
          try {
            await supabase.from("artisans").delete().eq("id", artisanId);
            Alert.alert(t("admin.artisanDeleted"));
            navigation.goBack();
          } catch (error) {

          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleCall = () => {
    if (artisan?.phone) {
      Linking.openURL(`tel:${artisan.phone}`);
    }
  };

  const handleEmail = () => {
    if (artisan?.email) {
      Linking.openURL(`mailto:${artisan.email}`);
    }
  };

  const getStatusLabel = (status: string) => {
    const statusLabels: Record<string, string> = {
      pending: t("admin.pending"),
      searching: t("admin.searching"),
      matched: t("admin.matched"),
      in_progress: t("admin.inProgress"),
      price_proposed: t("admin.priceProposed"),
      price_accepted: t("admin.priceAccepted"),
      work_in_progress: t("admin.workInProgress"),
      pending_client_confirmation: t("admin.pendingConfirmation"),
      work_completed: t("admin.workCompleted"),
      completed: t("admin.completed"),
      disputed: t("admin.disputed"),
      cancelled: t("admin.cancelled"),
    };
    return statusLabels[status] || status;
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
          <Text style={{ color: "#9ca3af" }}>{t("admin.artisanNotFound")}</Text>
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
          <Text style={styles.headerTitle}>{t("admin.artisanDetail")}</Text>
        </View>

        {/* Profile Section */}
        <View style={styles.profileSection}>
          {(artisan.avatar_storage_url || artisan.avatar_url) ? (
            <TouchableOpacity
              onPress={() => setFullscreenImage(artisan.avatar_storage_url || artisan.avatar_url)}
              activeOpacity={0.8}
            >
              <Image source={{ uri: artisan.avatar_storage_url || artisan.avatar_url }} style={styles.avatar} />
            </TouchableOpacity>
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Icon name="person" size={40} color="#9ca3af" />
            </View>
          )}
          <Text style={styles.artisanName}>{artisan.full_name}</Text>
          <View style={styles.badgeRow}>
            {artisan.verified && (
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

        {/* Contact Buttons */}
        <View style={styles.contactRow}>
          {artisan.phone && (
            <TouchableOpacity
              style={[styles.contactButton, { backgroundColor: "#10b981" }]}
              onPress={handleCall}
              activeOpacity={0.7}
            >
              <Icon name="call-outline" size={18} color="#ffffff" />
              <Text style={styles.contactButtonText}>{t("admin.callArtisan")}</Text>
            </TouchableOpacity>
          )}
          {artisan.email && (
            <TouchableOpacity
              style={[styles.contactButton, { backgroundColor: "#3b82f6" }]}
              onPress={handleEmail}
              activeOpacity={0.7}
            >
              <Icon name="mail-outline" size={18} color="#ffffff" />
              <Text style={styles.contactButtonText}>{t("admin.emailArtisan")}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Info Cards */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>{t("admin.phone")}</Text>
            <Text style={styles.infoValue}>{artisan.phone || "N/A"}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>{t("admin.email")}</Text>
            <Text style={styles.infoValue}>{artisan.email || "N/A"}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>SIRET</Text>
            <Text style={styles.infoValue}>{artisan.siret_number || artisan.nie_nif || artisan.autonomo_number || "N/A"}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>{t("admin.address")}</Text>
            <Text style={styles.infoValue}>{artisan.business_address || "N/A"}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>TVA</Text>
            <Text style={styles.infoValue}>{artisan.iva_rate != null ? `${artisan.iva_rate}%` : "N/A"}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Kbis</Text>
            <Text style={[styles.infoValue, { color: artisan.kbis_url ? "#16a34a" : "#dc2626" }]}>
              {artisan.kbis_url ? "✅ Fourni" : "❌ Manquant"}
            </Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>RC Pro</Text>
            <Text style={[styles.infoValue, { color: artisan.rc_pro_url ? "#16a34a" : "#dc2626" }]}>
              {artisan.rc_pro_url ? "✅ Fourni" : "❌ Manquant"}
            </Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Assurance décennale</Text>
            <Text style={[styles.infoValue, { color: artisan.decennale_url ? "#16a34a" : "#9ca3af" }]}>
              {artisan.decennale_url ? "✅ Fourni" : "— Optionnel"}
            </Text>
          </View>
        </View>

        {/* ID Documents */}
        {(artisan.id_document_url || artisan.id_document_verso_url) && (
          <View style={styles.documentSection}>
            <Text style={styles.sectionTitle}>{t("admin.idDocument")}</Text>
            {artisan.id_document_url && (
              <View style={styles.documentCard}>
                <Text style={styles.documentLabel}>{t("admin.idRecto")}</Text>
                <TouchableOpacity
                  onPress={() => setFullscreenImage(artisan.id_document_url)}
                  activeOpacity={0.8}
                >
                  <Image
                    source={{ uri: artisan.id_document_url }}
                    style={styles.documentImage}
                    resizeMode="contain"
                  />
                  <View style={styles.fullscreenHint}>
                    <Icon name="expand-outline" size={14} color="#9ca3af" />
                    <Text style={styles.fullscreenHintText}>{t("admin.viewFullscreen")}</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}
            {artisan.id_document_verso_url && (
              <View style={styles.documentCard}>
                <Text style={styles.documentLabel}>{t("admin.idVerso")}</Text>
                <TouchableOpacity
                  onPress={() => setFullscreenImage(artisan.id_document_verso_url)}
                  activeOpacity={0.8}
                >
                  <Image
                    source={{ uri: artisan.id_document_verso_url }}
                    style={styles.documentImage}
                    resizeMode="contain"
                  />
                  <View style={styles.fullscreenHint}>
                    <Icon name="expand-outline" size={14} color="#9ca3af" />
                    <Text style={styles.fullscreenHintText}>{t("admin.viewFullscreen")}</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Categories */}
        {artisan.categories && artisan.categories.length > 0 && (
          <View style={styles.categoriesSection}>
            <Text style={styles.sectionTitle}>{t("admin.categoriesTitle")}</Text>
            <View style={styles.categoriesGrid}>
              {artisan.categories.map((catId: string, idx: number) => {
                const catDef = CATEGORIES.find((c) => c.id === catId);
                return (
                  <View
                    key={idx}
                    style={[
                      styles.categoryChip,
                      catDef && { backgroundColor: catDef.bg, borderColor: catDef.color, borderWidth: 1 },
                    ]}
                  >
                    {catDef && <Icon name={catDef.icon} size={14} color={catDef.color} />}
                    <Text style={[styles.categoryChipText, catDef && { color: catDef.color }]}>
                      {t(`categories.${catId}`)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Rating & Registration */}
        <View style={styles.ratingSection}>
          <View style={styles.ratingCard}>
            <Icon name="star" size={24} color="#f59e0b" />
            <Text style={styles.ratingValue}>{artisan.rating?.toFixed(1) || "0.0"}</Text>
            <Text style={styles.ratingCount}>({artisan.review_count || 0} {t("admin.reviews").toLowerCase()})</Text>
          </View>
          <View style={styles.ratingCard}>
            <Icon name="calendar" size={24} color="#3b82f6" />
            <Text style={styles.ratingValue}>
              {new Date(artisan.created_at).toLocaleDateString("fr-FR")}
            </Text>
            <Text style={styles.ratingCount}>{t("admin.inscription")}</Text>
          </View>
        </View>

        {/* Active Bookings */}
        <View style={styles.bookingsSection}>
          <Text style={styles.sectionTitle}>{t("admin.activeBookings")}</Text>
          {activeBookings.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>{t("admin.noActiveBookings")}</Text>
            </View>
          ) : (
            activeBookings.map((booking) => (
              <TouchableOpacity
                key={booking.id}
                style={styles.bookingCard}
                onPress={() => navigation.navigate("AdminBookingDetail", { bookingId: booking.id })}
                activeOpacity={0.7}
              >
                <View style={styles.bookingHeader}>
                  <Text style={styles.bookingService} numberOfLines={1}>
                    {booking.service_name}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: (STATUS_COLORS[booking.status] || "#6b7280") + "20" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: STATUS_COLORS[booking.status] || "#6b7280" },
                      ]}
                    >
                      {getStatusLabel(booking.status)}
                    </Text>
                  </View>
                </View>
                <View style={styles.bookingMeta}>
                  <Text style={styles.bookingClient}>
                    {t("admin.client")}: {booking.client?.full_name || "N/A"}
                  </Text>
                  <Text style={styles.bookingDate}>
                    {new Date(booking.created_at).toLocaleDateString("fr-FR")}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Reviews */}
        <View style={styles.reviewsSection}>
          <Text style={styles.sectionTitle}>{t("admin.reviews")}</Text>
          {reviews.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>{t("admin.noReviews")}</Text>
            </View>
          ) : (
            reviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewStars}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Icon
                        key={star}
                        name={star <= review.rating ? "star" : "star-outline"}
                        size={14}
                        color="#f59e0b"
                      />
                    ))}
                  </View>
                  <Text style={styles.reviewDate}>
                    {new Date(review.created_at).toLocaleDateString("fr-FR")}
                  </Text>
                </View>
                <Text style={styles.reviewAuthor}>
                  {review.client?.full_name || "N/A"}
                </Text>
                {review.comment && (
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                )}
              </View>
            ))
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          {!artisan.verified && (
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

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={handleDelete}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Icon name="trash" size={20} color="#ffffff" />
                <Text style={styles.actionButtonText}>{t("admin.deleteArtisan")}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Fullscreen Image Modal */}
      <Modal
        visible={!!fullscreenImage}
        transparent
        animationType="fade"
        onRequestClose={() => setFullscreenImage(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setFullscreenImage(null)}
          >
            <Icon name="close" size={28} color="#ffffff" />
          </TouchableOpacity>
          {fullscreenImage && (
            <Image
              source={{ uri: fullscreenImage }}
              style={styles.modalImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
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
  contactRow: {
    flexDirection: "row",
    marginHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  contactButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: RADIUS.lg,
    paddingVertical: 14,
    gap: 8,
  },
  contactButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
  },
  infoSection: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.lg,
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
  documentCard: {
    marginBottom: SPACING.md,
  },
  documentLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#d1d5db",
    marginBottom: SPACING.xs,
  },
  documentImage: {
    width: "100%",
    height: 200,
    borderRadius: RADIUS.lg,
    backgroundColor: ADMIN_CARD,
  },
  fullscreenHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: 6,
  },
  fullscreenHintText: {
    fontSize: 12,
    color: "#9ca3af",
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
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
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
  bookingsSection: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.xl,
  },
  emptyCard: {
    backgroundColor: ADMIN_CARD,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#6b7280",
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
  },
  bookingService: {
    fontSize: 14,
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
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  bookingMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  bookingClient: {
    fontSize: 12,
    color: "#9ca3af",
  },
  bookingDate: {
    fontSize: 12,
    color: "#6b7280",
  },
  reviewsSection: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.xl,
  },
  reviewCard: {
    backgroundColor: ADMIN_CARD,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reviewStars: {
    flexDirection: "row",
    gap: 2,
  },
  reviewDate: {
    fontSize: 11,
    color: "#6b7280",
  },
  reviewAuthor: {
    fontSize: 13,
    fontWeight: "600",
    color: "#ffffff",
    marginTop: 6,
  },
  reviewComment: {
    fontSize: 13,
    color: "#9ca3af",
    lineHeight: 20,
    marginTop: 4,
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
    backgroundColor: "#f59e0b",
  },
  reactivateButton: {
    backgroundColor: "#3b82f6",
  },
  deleteButton: {
    backgroundColor: "#ef4444",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCloseButton: {
    position: "absolute",
    top: 60,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalImage: {
    width: SCREEN_WIDTH - 32,
    height: SCREEN_HEIGHT * 0.7,
  },
});
