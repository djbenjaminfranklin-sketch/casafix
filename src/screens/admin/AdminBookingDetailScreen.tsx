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
  Image,
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

const ALL_STATUSES = [
  "pending",
  "searching",
  "matched",
  "in_progress",
  "price_proposed",
  "price_accepted",
  "work_in_progress",
  "pending_client_confirmation",
  "work_completed",
  "completed",
  "disputed",
  "cancelled",
];

export default function AdminBookingDetailScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { bookingId } = route.params;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [booking, setBooking] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);

  const fetchBooking = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          client:profiles!bookings_client_id_fkey(id, full_name, email, phone),
          artisan:artisans!bookings_artisan_id_fkey(id, full_name, email, phone)
        `)
        .eq("id", bookingId)
        .single();

      if (error) throw error;
      setBooking(data);
    } catch (error) {
      console.error("Error fetching booking:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [bookingId]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBooking();
  }, [fetchBooking]);

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
      price_accepted: t("admin.completed"),
      pending_client_confirmation: t("admin.pending"),
      work_completed: t("admin.completed"),
    };
    return statusLabels[status] || status;
  };

  const handleCancelBooking = () => {
    Alert.alert(t("admin.cancelBooking"), t("admin.cancelConfirm"), [
      { text: t("admin.cancel"), style: "cancel" },
      {
        text: t("admin.cancelBooking"),
        style: "destructive",
        onPress: async () => {
          setActionLoading(true);
          try {
            await supabase
              .from("bookings")
              .update({ status: "cancelled" })
              .eq("id", bookingId);
            Alert.alert(t("admin.bookingCancelled"));
            await fetchBooking();
          } catch (error) {
            console.error("Error cancelling booking:", error);
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleReassign = () => {
    Alert.alert(t("admin.reassign"), t("admin.reassignConfirm"), [
      { text: t("admin.cancel"), style: "cancel" },
      {
        text: t("admin.reassign"),
        onPress: async () => {
          setActionLoading(true);
          try {
            await supabase
              .from("bookings")
              .update({ status: "searching", artisan_id: null })
              .eq("id", bookingId);
            Alert.alert(t("admin.bookingReassigned"));
            await fetchBooking();
          } catch (error) {
            console.error("Error reassigning booking:", error);
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleForceStatus = (newStatus: string) => {
    Alert.alert(t("admin.forceStatus"), `${t("admin.actionConfirm")} → ${getStatusLabel(newStatus)}`, [
      { text: t("admin.cancel"), style: "cancel" },
      {
        text: t("admin.validate"),
        onPress: async () => {
          setActionLoading(true);
          setShowStatusPicker(false);
          try {
            await supabase
              .from("bookings")
              .update({ status: newStatus })
              .eq("id", bookingId);
            Alert.alert(t("admin.statusUpdated"));
            await fetchBooking();
          } catch (error) {
            console.error("Error forcing status:", error);
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleContact = (type: "email" | "phone", person: "client" | "artisan") => {
    const target = person === "client" ? booking?.client : booking?.artisan;
    if (!target) return;
    if (type === "email" && target.email) {
      Linking.openURL(`mailto:${target.email}`);
    } else if (type === "phone" && target.phone) {
      Linking.openURL(`tel:${target.phone}`);
    }
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

  if (!booking) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={ADMIN_DARK} />
        <View style={styles.loadingContainer}>
          <Text style={{ color: "#9ca3af" }}>{t("admin.noBookings")}</Text>
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
          <Text style={styles.headerTitle}>{t("admin.bookingDetail")}</Text>
        </View>

        {/* Service & Status */}
        <View style={styles.serviceSection}>
          <Text style={styles.serviceName}>{booking.service_name}</Text>
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

        {/* Details */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>{t("admin.service")}</Text>
            <Text style={styles.infoValue}>{booking.service_name}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>{t("admin.status")}</Text>
            <Text style={styles.infoValue}>{getStatusLabel(booking.status)}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>{t("admin.date")}</Text>
            <Text style={styles.infoValue}>
              {new Date(booking.created_at).toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
          {booking.max_price != null && (
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>{t("payment.maxPrice")}</Text>
              <Text style={styles.infoValue}>{booking.max_price} EUR</Text>
            </View>
          )}
          {booking.final_price != null && (
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>{t("admin.price")}</Text>
              <Text style={[styles.infoValue, { color: "#10b981" }]}>
                {booking.final_price} EUR
              </Text>
            </View>
          )}
          {booking.appointment_date && (
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>{t("booking.chooseDate")}</Text>
              <Text style={styles.infoValue}>
                {new Date(booking.appointment_date).toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          )}
        </View>

        {/* Client Info */}
        <View style={styles.personSection}>
          <Text style={styles.sectionTitle}>{t("admin.client")}</Text>
          <View style={styles.personCard}>
            <View style={styles.personInfo}>
              <View style={styles.personIconBg}>
                <Icon name="person" size={18} color="#3b82f6" />
              </View>
              <View style={styles.personDetails}>
                <Text style={styles.personName}>{booking.client?.full_name || "N/A"}</Text>
                {booking.client?.email && (
                  <Text style={styles.personSub}>{booking.client.email}</Text>
                )}
                {booking.client?.phone && (
                  <Text style={styles.personSub}>{booking.client.phone}</Text>
                )}
              </View>
            </View>
            <View style={styles.personActions}>
              {booking.client?.email && (
                <TouchableOpacity
                  style={styles.smallBtn}
                  onPress={() => handleContact("email", "client")}
                >
                  <Icon name="mail-outline" size={16} color="#3b82f6" />
                </TouchableOpacity>
              )}
              {booking.client?.phone && (
                <TouchableOpacity
                  style={styles.smallBtn}
                  onPress={() => handleContact("phone", "client")}
                >
                  <Icon name="call-outline" size={16} color="#10b981" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Artisan Info */}
        <View style={styles.personSection}>
          <Text style={styles.sectionTitle}>{t("admin.artisan")}</Text>
          <View style={styles.personCard}>
            <View style={styles.personInfo}>
              <View style={[styles.personIconBg, { backgroundColor: "#10b98120" }]}>
                <Icon name="construct" size={18} color="#10b981" />
              </View>
              <View style={styles.personDetails}>
                <Text style={styles.personName}>{booking.artisan?.full_name || "N/A"}</Text>
                {booking.artisan?.email && (
                  <Text style={styles.personSub}>{booking.artisan.email}</Text>
                )}
                {booking.artisan?.phone && (
                  <Text style={styles.personSub}>{booking.artisan.phone}</Text>
                )}
              </View>
            </View>
            <View style={styles.personActions}>
              {booking.artisan?.email && (
                <TouchableOpacity
                  style={styles.smallBtn}
                  onPress={() => handleContact("email", "artisan")}
                >
                  <Icon name="mail-outline" size={16} color="#3b82f6" />
                </TouchableOpacity>
              )}
              {booking.artisan?.phone && (
                <TouchableOpacity
                  style={styles.smallBtn}
                  onPress={() => handleContact("phone", "artisan")}
                >
                  <Icon name="call-outline" size={16} color="#10b981" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Photos */}
        {booking.media_urls && booking.media_urls.length > 0 && (
          <View style={styles.mediaSection}>
            <Text style={styles.sectionTitle}>{t("admin.photos")}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {booking.media_urls.map((url: string, idx: number) => (
                <Image
                  key={idx}
                  source={{ uri: url }}
                  style={styles.mediaImage}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* AI Diagnostic */}
        {booking.ai_diagnostic && (
          <View style={styles.diagnosticSection}>
            <Text style={styles.sectionTitle}>{t("admin.aiDiagnostic")}</Text>
            <View style={styles.diagnosticCard}>
              {booking.ai_diagnostic.severity && (
                <View style={styles.diagnosticRow}>
                  <Text style={styles.diagnosticLabel}>{t("diagnostic.severity")}</Text>
                  <Text style={styles.diagnosticValue}>{booking.ai_diagnostic.severity}</Text>
                </View>
              )}
              {booking.ai_diagnostic.estimated_price && (
                <View style={styles.diagnosticRow}>
                  <Text style={styles.diagnosticLabel}>{t("diagnostic.estimatedPrice")}</Text>
                  <Text style={styles.diagnosticValue}>{booking.ai_diagnostic.estimated_price}</Text>
                </View>
              )}
              {booking.ai_diagnostic.description && (
                <Text style={styles.diagnosticDesc}>{booking.ai_diagnostic.description}</Text>
              )}
            </View>
          </View>
        )}

        {/* Timeline */}
        <View style={styles.timelineSection}>
          <Text style={styles.sectionTitle}>{t("admin.timeline")}</Text>
          <View style={styles.timelineCard}>
            <View style={styles.timelineItem}>
              <View style={styles.timelineDot} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineEvent}>{t("admin.pending")}</Text>
                <Text style={styles.timelineDate}>
                  {new Date(booking.created_at).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            </View>
            {booking.artisan_id && (
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, { backgroundColor: "#8b5cf6" }]} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineEvent}>{t("admin.matched")}</Text>
                  <Text style={styles.timelineDate}>{booking.artisan?.full_name}</Text>
                </View>
              </View>
            )}
            {booking.final_price != null && (
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, { backgroundColor: "#10b981" }]} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineEvent}>{t("admin.priceProposed")}</Text>
                  <Text style={styles.timelineDate}>{booking.final_price} EUR</Text>
                </View>
              </View>
            )}
            {booking.status === "completed" && (
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, { backgroundColor: "#10b981" }]} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineEvent}>{t("admin.completed")}</Text>
                </View>
              </View>
            )}
            {booking.status === "cancelled" && (
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, { backgroundColor: "#ef4444" }]} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineEvent}>{t("admin.cancelled")}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Force Status */}
        <View style={styles.forceStatusSection}>
          <TouchableOpacity
            style={styles.forceStatusButton}
            onPress={() => setShowStatusPicker(!showStatusPicker)}
            activeOpacity={0.7}
          >
            <Icon name="swap-horizontal" size={18} color={ADMIN_ACCENT} />
            <Text style={styles.forceStatusButtonText}>{t("admin.forceStatus")}</Text>
            <Icon
              name={showStatusPicker ? "chevron-up" : "chevron-down"}
              size={16}
              color="#9ca3af"
            />
          </TouchableOpacity>
          {showStatusPicker && (
            <View style={styles.statusPickerContainer}>
              {ALL_STATUSES.filter((s) => s !== booking.status).map((status) => (
                <TouchableOpacity
                  key={status}
                  style={styles.statusOption}
                  onPress={() => handleForceStatus(status)}
                >
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: STATUS_COLORS[status] || "#6b7280" },
                    ]}
                  />
                  <Text style={styles.statusOptionText}>{getStatusLabel(status)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          {booking.status !== "cancelled" && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: "#ef4444" }]}
              onPress={handleCancelBooking}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Icon name="close-circle" size={20} color="#ffffff" />
                  <Text style={styles.actionButtonText}>{t("admin.cancelBooking")}</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {booking.artisan_id && booking.status !== "cancelled" && booking.status !== "completed" && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: "#f59e0b" }]}
              onPress={handleReassign}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Icon name="swap-horizontal" size={20} color="#ffffff" />
                  <Text style={styles.actionButtonText}>{t("admin.reassign")}</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {booking.status === "completed" && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: "#3b82f6" }]}
              onPress={() => navigation.navigate("Invoice", { bookingId: booking.id })}
              disabled={actionLoading}
            >
              <Icon name="document-text" size={20} color="#ffffff" />
              <Text style={styles.actionButtonText}>{t("admin.viewInvoice")}</Text>
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
  serviceSection: {
    marginHorizontal: SPACING.md,
    alignItems: "center",
    paddingVertical: SPACING.md,
  },
  serviceName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#ffffff",
    textAlign: "center",
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    marginTop: SPACING.sm,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  infoSection: {
    marginHorizontal: SPACING.md,
    backgroundColor: ADMIN_CARD,
    borderRadius: RADIUS.lg,
    overflow: "hidden",
    marginTop: SPACING.md,
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
  personSection: {
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
  personCard: {
    backgroundColor: ADMIN_CARD,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  personInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  personIconBg: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#3b82f620",
    alignItems: "center",
    justifyContent: "center",
  },
  personDetails: {
    marginLeft: 12,
    flex: 1,
  },
  personName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
  },
  personSub: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 2,
  },
  personActions: {
    flexDirection: "row",
    gap: 8,
  },
  smallBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#3a3a4d",
    alignItems: "center",
    justifyContent: "center",
  },
  mediaSection: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.lg,
  },
  mediaImage: {
    width: 120,
    height: 120,
    borderRadius: RADIUS.lg,
    marginRight: SPACING.sm,
    backgroundColor: ADMIN_CARD,
  },
  diagnosticSection: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.lg,
  },
  diagnosticCard: {
    backgroundColor: ADMIN_CARD,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: 8,
  },
  diagnosticRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  diagnosticLabel: {
    fontSize: 13,
    color: "#9ca3af",
  },
  diagnosticValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
  },
  diagnosticDesc: {
    fontSize: 13,
    color: "#d1d5db",
    lineHeight: 20,
    marginTop: 4,
  },
  timelineSection: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.lg,
  },
  timelineCard: {
    backgroundColor: ADMIN_CARD,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: 16,
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#f59e0b",
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
  },
  timelineEvent: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
  timelineDate: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 2,
  },
  forceStatusSection: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.lg,
  },
  forceStatusButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ADMIN_CARD,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: 8,
  },
  forceStatusButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: ADMIN_ACCENT,
    flex: 1,
  },
  statusPickerContainer: {
    backgroundColor: ADMIN_CARD,
    borderRadius: RADIUS.lg,
    marginTop: SPACING.sm,
    overflow: "hidden",
  },
  statusOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#3a3a4d",
    gap: 10,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusOptionText: {
    fontSize: 14,
    color: "#ffffff",
    fontWeight: "500",
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
});
