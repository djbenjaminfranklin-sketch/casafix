import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  FlatList,
  ActivityIndicator,
  Alert,
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

type TabKey = "pending" | "resolved";

export default function AdminDisputesScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("pending");
  const [reports, setReports] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const tabs: { key: TabKey; label: string }[] = [
    { key: "pending", label: t("admin.pending") },
    { key: "resolved", label: t("admin.resolved") },
  ];

  const fetchReports = useCallback(async () => {
    try {
      let query = supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (activeTab === "pending") {
        query = query.eq("status", "pending");
      } else {
        query = query.neq("status", "pending");
      }

      const { data, error } = await query;
      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error("Error fetching reports:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    setLoading(true);
    fetchReports();
  }, [fetchReports]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchReports();
  }, [fetchReports]);

  const handleAction = (reportId: string, action: "refund" | "pay_artisan" | "reject") => {
    const titles: Record<string, string> = {
      refund: t("admin.refundClient"),
      pay_artisan: t("admin.payArtisan"),
      reject: t("admin.reject"),
    };

    Alert.alert(titles[action], t("admin.actionConfirm"), [
      { text: t("admin.cancel"), style: "cancel" },
      {
        text: t("admin.validate"),
        style: action === "reject" ? "destructive" : "default",
        onPress: async () => {
          setActionLoading(reportId);
          try {
            const report = reports.find((r) => r.id === reportId);
            const newStatus =
              action === "refund"
                ? "refunded"
                : action === "pay_artisan"
                ? "artisan_paid"
                : "rejected";

            await supabase
              .from("reports")
              .update({ status: newStatus, resolved_at: new Date().toISOString() })
              .eq("id", reportId);

            if (report?.booking?.id) {
              const bookingStatus =
                action === "refund"
                  ? "cancelled"
                  : action === "pay_artisan"
                  ? "completed"
                  : "completed";

              await supabase
                .from("bookings")
                .update({ status: bookingStatus })
                .eq("id", report.booking.id);
            }

            await fetchReports();
          } catch (error) {
            console.error("Error updating report:", error);
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
  };

  const renderReport = ({ item }: { item: any }) => {
    const isExpanded = expandedId === item.id;

    return (
      <TouchableOpacity
        style={styles.reportCard}
        onPress={() => setExpandedId(isExpanded ? null : item.id)}
        activeOpacity={0.8}
      >
        <View style={styles.reportHeader}>
          <View style={styles.reportInfo}>
            <View style={styles.reportRow}>
              <Icon name="person-outline" size={14} color="#9ca3af" />
              <Text style={styles.reporterText}>
                {item.reporter?.full_name || "Anonyme"}
              </Text>
              <Icon name="arrow-forward" size={12} color="#6b7280" />
              <Text style={styles.reportedText}>
                {item.reported?.full_name || "N/A"}
              </Text>
            </View>
            <Text style={styles.reasonText}>{item.reason}</Text>
            <Text style={styles.dateText}>
              {new Date(item.created_at).toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </Text>
          </View>
          <View style={styles.reportMeta}>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    item.status === "pending"
                      ? "#f59e0b20"
                      : item.status === "rejected"
                      ? "#ef444420"
                      : "#10b98120",
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  {
                    color:
                      item.status === "pending"
                        ? "#f59e0b"
                        : item.status === "rejected"
                        ? "#ef4444"
                        : "#10b981",
                  },
                ]}
              >
                {item.status}
              </Text>
            </View>
            <Icon
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={16}
              color="#6b7280"
            />
          </View>
        </View>

        {isExpanded && (
          <View style={styles.expandedContent}>
            {item.description ? (
              <View style={styles.descriptionBox}>
                <Text style={styles.descriptionLabel}>{t("report.descriptionLabel")}</Text>
                <Text style={styles.descriptionText}>{item.description}</Text>
              </View>
            ) : null}

            {item.booking && (
              <View style={styles.bookingInfo}>
                <View style={styles.bookingInfoRow}>
                  <Icon name="briefcase-outline" size={14} color="#9ca3af" />
                  <Text style={styles.bookingLabel}>
                    {t("admin.service")}: {item.booking.service_name}
                  </Text>
                </View>
                <View style={styles.bookingInfoRow}>
                  <Icon name="flag-outline" size={14} color="#9ca3af" />
                  <Text style={styles.bookingLabel}>
                    {t("admin.status")}: {item.booking.status}
                  </Text>
                </View>
                {item.booking.final_price != null && (
                  <View style={styles.bookingInfoRow}>
                    <Icon name="cash-outline" size={14} color="#9ca3af" />
                    <Text style={styles.bookingLabel}>
                      {t("admin.price")}: {item.booking.final_price} EUR
                    </Text>
                  </View>
                )}
              </View>
            )}

            {item.status === "pending" && (
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.refundBtn]}
                  onPress={() => handleAction(item.id, "refund")}
                  disabled={actionLoading === item.id}
                >
                  {actionLoading === item.id ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Icon name="card-outline" size={14} color="#ffffff" />
                      <Text style={styles.actionBtnText}>{t("admin.refundClient")}</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.payBtn]}
                  onPress={() => handleAction(item.id, "pay_artisan")}
                  disabled={actionLoading === item.id}
                >
                  {actionLoading === item.id ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Icon name="checkmark-circle-outline" size={14} color="#ffffff" />
                      <Text style={styles.actionBtnText}>{t("admin.payArtisan")}</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.rejectBtn]}
                  onPress={() => handleAction(item.id, "reject")}
                  disabled={actionLoading === item.id}
                >
                  {actionLoading === item.id ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Icon name="close-circle-outline" size={14} color="#ffffff" />
                      <Text style={styles.actionBtnText}>{t("admin.reject")}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
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
        <Text style={styles.headerTitle}>{t("admin.disputes")}</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
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
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ADMIN_ACCENT} />
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.id}
          renderItem={renderReport}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ADMIN_ACCENT} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="shield-checkmark-outline" size={48} color="#6b7280" />
              <Text style={styles.emptyText}>{t("admin.noDisputes")}</Text>
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
  tabsContainer: {
    flexDirection: "row",
    paddingHorizontal: SPACING.md,
    gap: 8,
    marginBottom: SPACING.sm,
  },
  tab: {
    paddingHorizontal: 18,
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
  reportCard: {
    backgroundColor: ADMIN_CARD,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  reportHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  reportInfo: {
    flex: 1,
    gap: 4,
  },
  reportRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  reporterText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
  reportedText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ef4444",
  },
  reasonText: {
    fontSize: 13,
    color: "#9ca3af",
    marginTop: 2,
  },
  dateText: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 2,
  },
  reportMeta: {
    alignItems: "flex-end",
    gap: 8,
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
  expandedContent: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: "#3a3a4d",
  },
  descriptionBox: {
    backgroundColor: "#1e1e2e",
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  descriptionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  descriptionText: {
    fontSize: 13,
    color: "#d1d5db",
    lineHeight: 20,
  },
  bookingInfo: {
    marginBottom: SPACING.md,
    backgroundColor: "#1e1e2e",
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: 8,
  },
  bookingInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bookingLabel: {
    fontSize: 13,
    color: "#d1d5db",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#ffffff",
    textAlign: "center",
  },
  refundBtn: {
    backgroundColor: "#3b82f6",
  },
  payBtn: {
    backgroundColor: "#10b981",
  },
  rejectBtn: {
    backgroundColor: "#ef4444",
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
