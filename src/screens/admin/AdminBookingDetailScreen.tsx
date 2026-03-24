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
import MapView, { Marker } from "react-native-maps";
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

const ACTIVE_STATUSES = ["searching", "matched", "in_progress", "price_proposed", "price_accepted", "work_in_progress"];

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
      // Fetch booking
      const { data: bookingData, error: bookingError } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", bookingId)
        .single();

      if (bookingError || !bookingData) throw bookingError;

      // Fetch client profile
      let clientData = null;
      if (bookingData.client_id) {
        const { data } = await supabase
          .from("profiles")
          .select("id, full_name, phone, address")
          .eq("id", bookingData.client_id)
          .single();
        clientData = data;
        // Get email from auth
        const { data: userData } = await supabase.auth.admin?.getUserById?.(bookingData.client_id) || {};
      }

      // Fetch artisan
      let artisanData = null;
      if (bookingData.artisan_id) {
        const { data } = await supabase
          .from("artisans")
          .select("id, full_name, phone, latitude, longitude")
          .eq("id", bookingData.artisan_id)
          .single();
        artisanData = data;
      }

      setBooking({ ...bookingData, client: clientData, artisan: artisanData });
    } catch (error) {

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

  const handleCancelBooking = () => {
    Alert.alert(t("admin.cancelBooking"), t("admin.cancelConfirm"), [
      { text: t("admin.no"), style: "cancel" },
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

          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleReassign = () => {
    Alert.alert(t("admin.reassign"), t("admin.reassignConfirm"), [
      { text: t("admin.no"), style: "cancel" },
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

          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleForceStatus = (newStatus: string) => {
    Alert.alert(t("admin.forceStatus"), `${t("admin.actionConfirm")} \u2192 ${getStatusLabel(newStatus)}`, [
      { text: t("admin.no"), style: "cancel" },
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

  const handleChatClient = () => {
    if (!booking) return;
    navigation.navigate("Chat", {
      bookingId: booking.id,
      artisanName: booking.client?.full_name || t("admin.client"),
    });
  };

  const handleChatArtisan = () => {
    if (!booking || !booking.artisan) return;
    navigation.navigate("Chat", {
      bookingId: booking.id,
      artisanName: booking.artisan?.full_name || t("admin.artisan"),
    });
  };

  const isActiveBooking = booking && ACTIVE_STATUSES.includes(booking.status);
  const hasClientLocation = booking?.client_latitude && booking?.client_longitude;
  const hasArtisanLocation = booking?.artisan?.latitude && booking?.artisan?.longitude;
  const showMap = isActiveBooking && (hasClientLocation || hasArtisanLocation);

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
          {booking.category_id && (
            <Text style={styles.categoryText}>{booking.category_id}</Text>
          )}
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

        {/* Client Info Card */}
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
                {booking.client?.address && (
                  <Text style={styles.personSub}>{booking.client.address}</Text>
                )}
              </View>
            </View>
            <View style={styles.personActions}>
              {booking.client?.phone && (
                <TouchableOpacity
                  style={styles.smallBtn}
                  onPress={() => handleContact("phone", "client")}
                >
                  <Icon name="call-outline" size={16} color="#10b981" />
                </TouchableOpacity>
              )}
              {booking.client?.email && (
                <TouchableOpacity
                  style={styles.smallBtn}
                  onPress={() => handleContact("email", "client")}
                >
                  <Icon name="mail-outline" size={16} color="#3b82f6" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Artisan Info Card */}
        {booking.artisan && (
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
                {booking.artisan?.phone && (
                  <TouchableOpacity
                    style={styles.smallBtn}
                    onPress={() => handleContact("phone", "artisan")}
                  >
                    <Icon name="call-outline" size={16} color="#10b981" />
                  </TouchableOpacity>
                )}
                {booking.artisan?.email && (
                  <TouchableOpacity
                    style={styles.smallBtn}
                    onPress={() => handleContact("email", "artisan")}
                  >
                    <Icon name="mail-outline" size={16} color="#3b82f6" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Live Map */}
        {showMap && (
          <View style={styles.mapSection}>
            <Text style={styles.sectionTitle}>{t("admin.liveMap")}</Text>
            <View style={styles.mapContainer}>
              <MapView
                style={styles.map}
                initialRegion={{
                  latitude: booking.client_latitude || booking.artisan?.latitude || 36.7213,
                  longitude: booking.client_longitude || booking.artisan?.longitude || -4.4214,
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05,
                }}
              >
                {hasClientLocation && (
                  <Marker
                    coordinate={{
                      latitude: booking.client_latitude,
                      longitude: booking.client_longitude,
                    }}
                    title={t("admin.clientPosition")}
                    description={booking.client?.full_name || ""}
                    pinColor="#3b82f6"
                  />
                )}
                {hasArtisanLocation && (
                  <Marker
                    coordinate={{
                      latitude: booking.artisan.latitude,
                      longitude: booking.artisan.longitude,
                    }}
                    title={t("admin.artisanPosition")}
                    description={booking.artisan?.full_name || ""}
                    pinColor="#ef4444"
                  />
                )}
              </MapView>
            </View>
          </View>
        )}

        {/* Price Info */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>{t("admin.service")}</Text>
            <Text style={styles.infoValue}>{booking.service_name}</Text>
          </View>
          {booking.category_id && (
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>{t("admin.category")}</Text>
              <Text style={styles.infoValue}>{booking.category_id}</Text>
            </View>
          )}
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>{t("admin.status")}</Text>
            <Text style={styles.infoValue}>{getStatusLabel(booking.status)}</Text>
          </View>
          {booking.max_price != null && (
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>{t("admin.maxPrice")}</Text>
              <Text style={styles.infoValue}>{booking.max_price} EUR</Text>
            </View>
          )}
          {booking.proposed_price != null && (
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>{t("admin.proposedPrice")}</Text>
              <Text style={[styles.infoValue, { color: "#f59e0b" }]}>
                {booking.proposed_price} EUR
              </Text>
            </View>
          )}
          {booking.final_price != null && (
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>{t("admin.finalPrice")}</Text>
              <Text style={[styles.infoValue, { color: "#10b981" }]}>
                {booking.final_price} EUR
              </Text>
            </View>
          )}
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>{t("admin.createdAt")}</Text>
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
          {booking.appointment_date && (
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>{t("admin.scheduledDate")}</Text>
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
          {booking.scheduled_date && !booking.appointment_date && (
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>{t("admin.scheduledDate")}</Text>
              <Text style={styles.infoValue}>
                {new Date(booking.scheduled_date).toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
                {booking.scheduled_slot ? ` - ${booking.scheduled_slot}` : ""}
              </Text>
            </View>
          )}
          {booking.client?.address && (
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>{t("admin.clientAddress")}</Text>
              <Text style={styles.infoValue}>{booking.client.address}</Text>
            </View>
          )}
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
            {booking.proposed_price != null && (
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, { backgroundColor: "#f59e0b" }]} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineEvent}>{t("admin.priceProposed")}</Text>
                  <Text style={styles.timelineDate}>{booking.proposed_price} EUR</Text>
                </View>
              </View>
            )}
            {booking.final_price != null && (
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, { backgroundColor: "#10b981" }]} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineEvent}>{t("admin.priceAccepted")}</Text>
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
            {booking.status === "disputed" && (
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, { backgroundColor: "#ef4444" }]} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineEvent}>{t("admin.disputed")}</Text>
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
          {/* Chat buttons */}
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: ADMIN_ACCENT }]}
            onPress={handleChatClient}
            disabled={actionLoading}
          >
            <Icon name="chatbubble-outline" size={20} color="#ffffff" />
            <Text style={styles.actionButtonText}>{t("admin.chatClient")}</Text>
          </TouchableOpacity>

          {booking.artisan && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: "#10b981" }]}
              onPress={handleChatArtisan}
              disabled={actionLoading}
            >
              <Icon name="chatbubble-outline" size={20} color="#ffffff" />
              <Text style={styles.actionButtonText}>{t("admin.chatArtisan")}</Text>
            </TouchableOpacity>
          )}

          {/* Reassign button */}
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

          {/* View invoice button */}
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

          {/* Cancel button */}
          {booking.status !== "cancelled" && booking.status !== "completed" && (
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

          {/* Delete button */}
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: "#991b1b", marginTop: SPACING.md }]}
            onPress={() => {
              Alert.alert(
                t("admin.deleteConfirm"),
                t("admin.actionConfirm"),
                [
                  { text: t("admin.cancel"), style: "cancel" },
                  {
                    text: t("admin.deleteAccount"),
                    style: "destructive",
                    onPress: async () => {
                      setActionLoading(true);
                      await supabase.from("bookings").delete().eq("id", bookingId);
                      setActionLoading(false);
                      navigation.goBack();
                    },
                  },
                ]
              );
            }}
            disabled={actionLoading}
          >
            <Icon name="trash" size={20} color="#ffffff" />
            <Text style={styles.actionButtonText}>{t("admin.deleteBooking")}</Text>
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
  categoryText: {
    fontSize: 13,
    color: "#9ca3af",
    marginTop: 4,
    textTransform: "capitalize",
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
  mapSection: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.lg,
  },
  mapContainer: {
    borderRadius: RADIUS.lg,
    overflow: "hidden",
    height: 200,
  },
  map: {
    width: "100%",
    height: "100%",
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
