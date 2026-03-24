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
  Alert,
  RefreshControl,
  Linking,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SPACING, RADIUS } from "../../constants/theme";
import { supabase } from "../../lib/supabase";

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

export default function AdminClientDetailScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { clientId } = route.params;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [client, setClient] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [reportsCount, setReportsCount] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchClient = useCallback(async () => {
    try {
      const [clientRes, bookingsRes, reportsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", clientId).single(),
        supabase
          .from("bookings")
          .select("*, artisan:artisans!bookings_artisan_id_fkey(full_name)")
          .eq("client_id", clientId)
          .order("created_at", { ascending: false }),
        supabase
          .from("reports")
          .select("id", { count: "exact", head: true })
          .eq("reporter_id", clientId),
      ]);

      if (clientRes.error) throw clientRes.error;
      setClient(clientRes.data);
      setBookings(bookingsRes.data || []);
      setReportsCount(reportsRes.count ?? 0);
    } catch (error) {

    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchClient();
  }, [fetchClient]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchClient();
  }, [fetchClient]);

  const handleContact = (type: "email" | "phone") => {
    if (type === "email" && client?.email) {
      Linking.openURL(`mailto:${client.email}`);
    } else if (type === "phone" && client?.phone) {
      Linking.openURL(`tel:${client.phone}`);
    }
  };

  const handleSuspend = () => {
    Alert.alert(t("admin.suspendClient"), t("admin.suspendClientConfirm"), [
      { text: t("admin.cancel"), style: "cancel" },
      {
        text: t("admin.suspend"),
        style: "destructive",
        onPress: async () => {
          setActionLoading(true);
          try {
            await supabase
              .from("profiles")
              .update({ is_suspended: true })
              .eq("id", clientId);
            await fetchClient();
          } catch (error) {

          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleDelete = () => {
    Alert.alert(t("admin.deleteAccount"), t("admin.deleteConfirm"), [
      { text: t("admin.cancel"), style: "cancel" },
      {
        text: t("admin.deleteAccount"),
        style: "destructive",
        onPress: async () => {
          setActionLoading(true);
          try {
            await supabase.from("profiles").delete().eq("id", clientId);
            navigation.goBack();
          } catch (error) {

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

  if (!client) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={ADMIN_DARK} />
        <View style={styles.loadingContainer}>
          <Text style={{ color: "#9ca3af" }}>{t("admin.noClients")}</Text>
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
          <Text style={styles.headerTitle}>{t("admin.clientDetail")}</Text>
        </View>

        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarPlaceholder}>
            <Icon name="person" size={40} color="#9ca3af" />
          </View>
          <Text style={styles.clientName}>{client.full_name || "N/A"}</Text>
          {client.is_suspended && (
            <View style={styles.suspendedBadge}>
              <Icon name="ban" size={14} color="#ef4444" />
              <Text style={styles.suspendedText}>{t("admin.suspended")}</Text>
            </View>
          )}
        </View>

        {/* Info Cards */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>{t("admin.email")}</Text>
            <Text style={styles.infoValue}>{client.email || "N/A"}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>{t("admin.phone")}</Text>
            <Text style={styles.infoValue}>{client.phone || "N/A"}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>{t("admin.address")}</Text>
            <Text style={styles.infoValue}>{client.address || "N/A"}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>{t("admin.registrationDate")}</Text>
            <Text style={styles.infoValue}>
              {new Date(client.created_at).toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Icon name="clipboard" size={22} color="#3b82f6" />
            <Text style={styles.statValue}>{bookings.length}</Text>
            <Text style={styles.statLabel}>{t("admin.bookingsCount")}</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="flag" size={22} color="#ef4444" />
            <Text style={styles.statValue}>{reportsCount}</Text>
            <Text style={styles.statLabel}>{t("admin.reportsCount")}</Text>
          </View>
        </View>

        {/* Contact Buttons */}
        <View style={styles.contactRow}>
          {client.email && (
            <TouchableOpacity
              style={styles.contactButton}
              onPress={() => handleContact("email")}
              activeOpacity={0.7}
            >
              <Icon name="mail-outline" size={18} color="#ffffff" />
              <Text style={styles.contactButtonText}>{t("admin.email")}</Text>
            </TouchableOpacity>
          )}
          {client.phone && (
            <TouchableOpacity
              style={[styles.contactButton, { backgroundColor: "#10b981" }]}
              onPress={() => handleContact("phone")}
              activeOpacity={0.7}
            >
              <Icon name="call-outline" size={18} color="#ffffff" />
              <Text style={styles.contactButtonText}>{t("admin.phone")}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Booking History */}
        <View style={styles.bookingsSection}>
          <Text style={styles.sectionTitle}>{t("admin.bookingHistory")}</Text>
          {bookings.length === 0 ? (
            <View style={styles.emptyBookings}>
              <Text style={styles.emptyText}>{t("admin.noBookings")}</Text>
            </View>
          ) : (
            bookings.map((booking) => (
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
                      {booking.status}
                    </Text>
                  </View>
                </View>
                <View style={styles.bookingMeta}>
                  <Text style={styles.bookingDate}>
                    {new Date(booking.created_at).toLocaleDateString("fr-FR")}
                  </Text>
                  {booking.final_price != null && (
                    <Text style={styles.bookingPrice}>{booking.final_price} EUR</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
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
                <Text style={styles.actionButtonText}>{t("admin.suspendClient")}</Text>
              </>
            )}
          </TouchableOpacity>

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
                <Text style={styles.actionButtonText}>{t("admin.deleteAccount")}</Text>
              </>
            )}
          </TouchableOpacity>
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
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: ADMIN_CARD,
    alignItems: "center",
    justifyContent: "center",
  },
  clientName: {
    fontSize: 24,
    fontWeight: "800",
    color: "#ffffff",
    marginTop: SPACING.md,
  },
  suspendedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ef444420",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: SPACING.sm,
  },
  suspendedText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#ef4444",
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
  statsRow: {
    flexDirection: "row",
    marginHorizontal: SPACING.md,
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: ADMIN_CARD,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#ffffff",
  },
  statLabel: {
    fontSize: 11,
    color: "#9ca3af",
    textAlign: "center",
  },
  contactRow: {
    flexDirection: "row",
    marginHorizontal: SPACING.md,
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },
  contactButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3b82f6",
    borderRadius: RADIUS.lg,
    paddingVertical: 14,
    gap: 8,
  },
  contactButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
  },
  bookingsSection: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.xl,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },
  emptyBookings: {
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
  bookingDate: {
    fontSize: 12,
    color: "#9ca3af",
  },
  bookingPrice: {
    fontSize: 14,
    fontWeight: "800",
    color: "#10b981",
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
  suspendButton: {
    backgroundColor: "#f59e0b",
  },
  deleteButton: {
    backgroundColor: "#ef4444",
  },
});
