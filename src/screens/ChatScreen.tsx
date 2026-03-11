import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabase";
import { Message } from "../lib/database.types";
import { getMessages, sendMessage, subscribeToMessages, markMessagesAsRead } from "../services/messages";
import { COLORS, SPACING, RADIUS } from "../constants/theme";

type Props = {
  route: { params: { bookingId: string; artisanName: string } };
  navigation: any;
};

export default function ChatScreen({ route, navigation }: Props) {
  const { bookingId, artisanName } = route.params;
  const { t } = useTranslation();
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);

      const { data } = await getMessages(bookingId);
      setMessages(data);
      markMessagesAsRead(bookingId);
    })();

    const unsubscribe = subscribeToMessages(bookingId, (newMsg) => {
      setMessages((prev) => [...prev, newMsg]);
      markMessagesAsRead(bookingId);
    });

    return unsubscribe;
  }, [bookingId]);

  async function handleSend() {
    if (!text.trim() || sending) return;
    setSending(true);
    const content = text.trim();
    setText("");

    await sendMessage(bookingId, content);
    setSending(false);
  }

  function renderMessage({ item }: { item: Message }) {
    const isMe = item.sender_id === userId;
    const time = new Date(item.created_at).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    return (
      <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
        <View style={[styles.msgBubble, isMe ? styles.msgBubbleMe : styles.msgBubbleOther]}>
          <Text style={[styles.msgText, isMe && styles.msgTextMe]}>{item.content}</Text>
          <Text style={[styles.msgTime, isMe && styles.msgTimeMe]}>{time}</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={styles.headerAvatar}>
            <Icon name="person" size={18} color="#FFFFFF" />
          </View>
          <Text style={styles.headerName}>{artisanName}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="chatbubbles-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>{t("chat.empty")}</Text>
            </View>
          }
        />

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder={t("chat.placeholder")}
            placeholderTextColor="#9ca3af"
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!text.trim() || sending}
          >
            <Icon name="send" size={20} color={text.trim() ? "#FFFFFF" : "#9ca3af"} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: "#f3f4f6",
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: "#f5f5f5",
    alignItems: "center", justifyContent: "center",
  },
  headerInfo: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerAvatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary,
    alignItems: "center", justifyContent: "center",
  },
  headerName: { fontSize: 16, fontWeight: "600", color: COLORS.text },
  list: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.md },
  msgRow: { marginBottom: 8, alignItems: "flex-start" },
  msgRowMe: { alignItems: "flex-end" },
  msgBubble: {
    maxWidth: "75%", paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 18,
  },
  msgBubbleMe: {
    backgroundColor: COLORS.primary, borderBottomRightRadius: 4,
  },
  msgBubbleOther: {
    backgroundColor: "#f3f4f6", borderBottomLeftRadius: 4,
  },
  msgText: { fontSize: 14, color: "#1f2937", lineHeight: 20 },
  msgTextMe: { color: "#FFFFFF" },
  msgTime: { fontSize: 10, color: "#9ca3af", marginTop: 4, alignSelf: "flex-end" },
  msgTimeMe: { color: "rgba(255,255,255,0.7)" },
  empty: { alignItems: "center", paddingTop: 80 },
  emptyText: { fontSize: 14, color: "#9ca3af", marginTop: 12 },
  inputBar: {
    flexDirection: "row", alignItems: "flex-end", gap: 8,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderTopWidth: 1, borderTopColor: "#f3f4f6",
  },
  input: {
    flex: 1, backgroundColor: "#f3f4f6", borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 14, color: COLORS.text, maxHeight: 100,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: COLORS.primary,
    alignItems: "center", justifyContent: "center",
  },
  sendBtnDisabled: { backgroundColor: "#e5e7eb" },
});
