import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { supabase } from "../lib/supabase";
import { COLORS, SPACING, RADIUS } from "../constants/theme";

type Conversation = {
  booking_id: string;
  artisan_name: string;
  service_id: string;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
};

export default function MessagesScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchConversations() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get bookings with artisan info that have messages
    const { data: bookings } = await supabase
      .from("bookings")
      .select("id, service_id, artisan:artisan_id(full_name)")
      .eq("client_id", user.id)
      .not("artisan_id", "is", null)
      .order("updated_at", { ascending: false });

    if (!bookings || bookings.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const convos: Conversation[] = [];

    for (const booking of bookings) {
      // Get last message
      const { data: msgs } = await supabase
        .from("messages")
        .select("content, created_at, read")
        .eq("booking_id", booking.id)
        .order("created_at", { ascending: false })
        .limit(1);

      // Count unread
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("booking_id", booking.id)
        .neq("sender_id", user.id)
        .eq("read", false);

      const artisanData = booking.artisan as any;
      const artisanName = artisanData?.full_name || "Artisan";

      if (msgs && msgs.length > 0) {
        convos.push({
          booking_id: booking.id,
          artisan_name: artisanName,
          service_id: booking.service_id,
          last_message: msgs[0].content,
          last_message_at: msgs[0].created_at,
          unread_count: count || 0,
        });
      }
    }

    setConversations(convos);
    setLoading(false);
  }

  useFocusEffect(
    useCallback(() => {
      fetchConversations();
    }, [])
  );

  async function onRefresh() {
    setRefreshing(true);
    await fetchConversations();
    setRefreshing(false);
  }

  function formatTime(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = diff / (1000 * 60 * 60);

    if (hours < 24) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    if (hours < 48) {
      return t("booking.today");
    }
    return date.toLocaleDateString([], { day: "numeric", month: "short" });
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <Text style={styles.title}>{t("nav.messages")}</Text>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.booking_id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Icon name="chatbubbles-outline" size={56} color="#d1d5db" />
              <Text style={styles.emptyText}>{t("chat.empty")}</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.convoRow}
            activeOpacity={0.7}
            onPress={() =>
              navigation.navigate("Chat", {
                bookingId: item.booking_id,
                artisanName: item.artisan_name,
              })
            }
          >
            <View style={styles.avatar}>
              <Icon name="person" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.convoInfo}>
              <View style={styles.convoTop}>
                <Text style={styles.convoName} numberOfLines={1}>
                  {item.artisan_name}
                </Text>
                {item.last_message_at && (
                  <Text style={styles.convoTime}>{formatTime(item.last_message_at)}</Text>
                )}
              </View>
              <View style={styles.convoBottom}>
                <Text style={styles.convoMsg} numberOfLines={1}>
                  {item.last_message || ""}
                </Text>
                {item.unread_count > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.unread_count}</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.text,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  list: { paddingHorizontal: SPACING.md, paddingBottom: 100 },
  convoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  convoInfo: { flex: 1 },
  convoTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  convoName: { fontSize: 15, fontWeight: "600", color: COLORS.text, flex: 1, marginRight: 8 },
  convoTime: { fontSize: 12, color: COLORS.textLight },
  convoBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  convoMsg: { fontSize: 13, color: COLORS.textLight, flex: 1, marginRight: 8 },
  badge: {
    backgroundColor: COLORS.primary,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeText: { fontSize: 11, fontWeight: "700", color: "#FFFFFF" },
  empty: { alignItems: "center", paddingTop: 100 },
  emptyText: { fontSize: 15, color: "#9ca3af", marginTop: 12 },
});
