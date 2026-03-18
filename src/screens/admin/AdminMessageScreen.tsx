import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { SPACING, RADIUS } from "../../constants/theme";
import { supabase } from "../../lib/supabase";

const ADMIN_DARK = "#1e1e2e";
const ADMIN_CARD = "#2a2a3d";
const ADMIN_ACCENT = "#7c3aed";

type RecipientType = "client" | "artisan";

export default function AdminMessageScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);

  // Form state
  const [recipientType, setRecipientType] = useState<RecipientType>("client");
  const [recipients, setRecipients] = useState<any[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<any>(null);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [showRecipientPicker, setShowRecipientPicker] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  // History
  const [sentMessages, setSentMessages] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"compose" | "history">("compose");

  const fetchRecipients = useCallback(async () => {
    try {
      if (recipientType === "client") {
        let query = supabase.from("profiles").select("id, full_name, email").order("full_name");
        if (recipientSearch.trim()) {
          query = query.or(
            `full_name.ilike.%${recipientSearch.trim()}%,email.ilike.%${recipientSearch.trim()}%`
          );
        }
        const { data } = await query.limit(20);
        setRecipients(data || []);
      } else {
        let query = supabase.from("artisans").select("id, full_name, email").order("full_name");
        if (recipientSearch.trim()) {
          query = query.or(
            `full_name.ilike.%${recipientSearch.trim()}%,email.ilike.%${recipientSearch.trim()}%`
          );
        }
        const { data } = await query.limit(20);
        setRecipients(data || []);
      }
    } catch (error) {
      console.error("Error fetching recipients:", error);
    }
  }, [recipientType, recipientSearch]);

  const fetchSentMessages = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("notification_queue")
        .select("*")
        .eq("source", "admin")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setSentMessages(data || []);
    } catch (error) {
      console.error("Error fetching sent messages:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRecipients();
  }, [fetchRecipients]);

  useEffect(() => {
    fetchSentMessages();
  }, [fetchSentMessages]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSentMessages();
  }, [fetchSentMessages]);

  const handleSend = () => {
    if (!selectedRecipient) {
      Alert.alert(t("admin.selectRecipient"));
      return;
    }
    if (!title.trim() || !body.trim()) {
      Alert.alert(t("admin.messageTitle"), t("admin.messageBody"));
      return;
    }

    Alert.alert(t("admin.sendMessage"), t("admin.actionConfirm"), [
      { text: t("admin.cancel"), style: "cancel" },
      {
        text: t("admin.sendMessage"),
        onPress: async () => {
          setSending(true);
          try {
            await supabase.from("notification_queue").insert({
              user_id: selectedRecipient.id,
              title: title.trim(),
              body: body.trim(),
              source: "admin",
              type: "admin_message",
              data: {
                recipient_type: recipientType,
                recipient_name: selectedRecipient.full_name,
              },
            });

            Alert.alert(t("admin.messageSent"));
            setTitle("");
            setBody("");
            setSelectedRecipient(null);
            await fetchSentMessages();
          } catch (error) {
            console.error("Error sending message:", error);
          } finally {
            setSending(false);
          }
        },
      },
    ]);
  };

  const renderSentMessage = ({ item }: { item: any }) => (
    <View style={styles.messageCard}>
      <View style={styles.messageHeader}>
        <Text style={styles.messageTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.messageDate}>
          {new Date(item.created_at).toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>
      <Text style={styles.messageBody} numberOfLines={2}>
        {item.body}
      </Text>
      {item.data?.recipient_name && (
        <View style={styles.recipientTag}>
          <Icon
            name={item.data.recipient_type === "artisan" ? "construct-outline" : "person-outline"}
            size={12}
            color={ADMIN_ACCENT}
          />
          <Text style={styles.recipientTagText}>{item.data.recipient_name}</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={ADMIN_DARK} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("admin.messages")}</Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "compose" && styles.tabActive]}
            onPress={() => setActiveTab("compose")}
          >
            <Text style={[styles.tabText, activeTab === "compose" && styles.tabTextActive]}>
              {t("admin.sendMessage")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "history" && styles.tabActive]}
            onPress={() => setActiveTab("history")}
          >
            <Text style={[styles.tabText, activeTab === "history" && styles.tabTextActive]}>
              {t("admin.sentMessages")}
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === "compose" ? (
          <ScrollView
            style={styles.composeContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Recipient Type */}
            <Text style={styles.fieldLabel}>{t("admin.recipientType")}</Text>
            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  recipientType === "client" && styles.typeButtonActive,
                ]}
                onPress={() => {
                  setRecipientType("client");
                  setSelectedRecipient(null);
                  setRecipientSearch("");
                }}
              >
                <Icon
                  name="person-outline"
                  size={16}
                  color={recipientType === "client" ? "#ffffff" : "#9ca3af"}
                />
                <Text
                  style={[
                    styles.typeButtonText,
                    recipientType === "client" && styles.typeButtonTextActive,
                  ]}
                >
                  {t("admin.client")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  recipientType === "artisan" && styles.typeButtonActive,
                ]}
                onPress={() => {
                  setRecipientType("artisan");
                  setSelectedRecipient(null);
                  setRecipientSearch("");
                }}
              >
                <Icon
                  name="construct-outline"
                  size={16}
                  color={recipientType === "artisan" ? "#ffffff" : "#9ca3af"}
                />
                <Text
                  style={[
                    styles.typeButtonText,
                    recipientType === "artisan" && styles.typeButtonTextActive,
                  ]}
                >
                  {t("admin.artisan")}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Recipient Selection */}
            <Text style={styles.fieldLabel}>{t("admin.selectRecipient")}</Text>
            {selectedRecipient ? (
              <TouchableOpacity
                style={styles.selectedRecipientCard}
                onPress={() => {
                  setSelectedRecipient(null);
                  setShowRecipientPicker(true);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.selectedRecipientInfo}>
                  <Icon
                    name={recipientType === "artisan" ? "construct" : "person"}
                    size={18}
                    color={ADMIN_ACCENT}
                  />
                  <View>
                    <Text style={styles.selectedRecipientName}>
                      {selectedRecipient.full_name}
                    </Text>
                    <Text style={styles.selectedRecipientEmail}>
                      {selectedRecipient.email}
                    </Text>
                  </View>
                </View>
                <Icon name="close-circle" size={20} color="#6b7280" />
              </TouchableOpacity>
            ) : (
              <>
                <View style={styles.searchContainer}>
                  <Icon name="search" size={16} color="#9ca3af" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder={
                      recipientType === "client"
                        ? t("admin.searchClients")
                        : t("admin.searchArtisans")
                    }
                    placeholderTextColor="#6b7280"
                    value={recipientSearch}
                    onChangeText={(text) => {
                      setRecipientSearch(text);
                      setShowRecipientPicker(true);
                    }}
                    onFocus={() => setShowRecipientPicker(true)}
                  />
                </View>
                {showRecipientPicker && recipients.length > 0 && (
                  <View style={styles.recipientsList}>
                    {recipients.map((r) => (
                      <TouchableOpacity
                        key={r.id}
                        style={styles.recipientItem}
                        onPress={() => {
                          setSelectedRecipient(r);
                          setShowRecipientPicker(false);
                          setRecipientSearch("");
                        }}
                      >
                        <Text style={styles.recipientName}>{r.full_name || "N/A"}</Text>
                        <Text style={styles.recipientEmail}>{r.email}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}

            {/* Title */}
            <Text style={styles.fieldLabel}>{t("admin.messageTitle")}</Text>
            <TextInput
              style={styles.textInput}
              value={title}
              onChangeText={setTitle}
              placeholder={t("admin.messageTitle")}
              placeholderTextColor="#6b7280"
            />

            {/* Body */}
            <Text style={styles.fieldLabel}>{t("admin.messageBody")}</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={body}
              onChangeText={setBody}
              placeholder={t("admin.messageBody")}
              placeholderTextColor="#6b7280"
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />

            {/* Send Button */}
            <TouchableOpacity
              style={[styles.sendButton, (!title.trim() || !body.trim() || !selectedRecipient) && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={sending || !title.trim() || !body.trim() || !selectedRecipient}
              activeOpacity={0.7}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Icon name="send" size={18} color="#ffffff" />
                  <Text style={styles.sendButtonText}>{t("admin.sendMessage")}</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={{ height: SPACING.xl }} />
          </ScrollView>
        ) : (
          <FlatList
            data={sentMessages}
            keyExtractor={(item) => item.id}
            renderItem={renderSentMessage}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={ADMIN_ACCENT}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Icon name="chatbubbles-outline" size={48} color="#6b7280" />
                <Text style={styles.emptyText}>{t("admin.noMessages")}</Text>
              </View>
            }
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ADMIN_DARK,
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
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: ADMIN_CARD,
    alignItems: "center",
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
  composeContainer: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  typeRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  typeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ADMIN_CARD,
    borderRadius: RADIUS.lg,
    paddingVertical: 14,
    gap: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  typeButtonActive: {
    backgroundColor: ADMIN_ACCENT + "30",
    borderColor: ADMIN_ACCENT,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9ca3af",
  },
  typeButtonTextActive: {
    color: "#ffffff",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ADMIN_CARD,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#ffffff",
  },
  recipientsList: {
    backgroundColor: ADMIN_CARD,
    borderRadius: RADIUS.md,
    marginTop: 4,
    maxHeight: 200,
    overflow: "hidden",
  },
  recipientItem: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#3a3a4d",
  },
  recipientName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
  recipientEmail: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 2,
  },
  selectedRecipientCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: ADMIN_CARD,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 2,
    borderColor: ADMIN_ACCENT,
  },
  selectedRecipientInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  selectedRecipientName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
  },
  selectedRecipientEmail: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 2,
  },
  textInput: {
    backgroundColor: ADMIN_CARD,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    fontSize: 15,
    color: "#ffffff",
  },
  textArea: {
    minHeight: 120,
    paddingTop: 14,
  },
  sendButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ADMIN_ACCENT,
    borderRadius: RADIUS.lg,
    paddingVertical: 16,
    marginTop: SPACING.xl,
    gap: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  messageCard: {
    backgroundColor: ADMIN_CARD,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  messageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  messageTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
    flex: 1,
    marginRight: 8,
  },
  messageDate: {
    fontSize: 11,
    color: "#6b7280",
  },
  messageBody: {
    fontSize: 13,
    color: "#9ca3af",
    lineHeight: 20,
  },
  recipientTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: ADMIN_ACCENT + "20",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  recipientTagText: {
    fontSize: 11,
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
