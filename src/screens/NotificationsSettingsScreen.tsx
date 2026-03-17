import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Switch,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import { COLORS, SPACING, RADIUS } from "../constants/theme";
import { supabase } from "../lib/supabase";

const STORAGE_KEY = "@casafix_notifications";

type NotifSettings = {
  bookingUpdates: boolean;
  messages: boolean;
  reminders: boolean;
  promotions: boolean;
};

const DEFAULTS: NotifSettings = {
  bookingUpdates: true,
  messages: true,
  reminders: true,
  promotions: false,
};

type Props = {
  navigation: any;
};

export default function NotificationsSettingsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<NotifSettings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  // Load saved settings on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          setSettings({ ...DEFAULTS, ...JSON.parse(raw) });
        } catch {}
      }
      setLoaded(true);
    });
  }, []);

  // Save to AsyncStorage + Supabase whenever a setting changes
  const toggle = useCallback(
    (key: keyof NotifSettings) => {
      setSettings((prev) => {
        const updated = { ...prev, [key]: !prev[key] };
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        // Sync to database so edge functions can check preferences
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user) {
            supabase
              .from("profiles")
              .update({ notification_preferences: updated })
              .eq("id", user.id);
          }
        });
        return updated;
      });
    },
    []
  );

  const rows = [
    {
      key: "bookingUpdates" as const,
      icon: "calendar-outline",
      label: t("notifications.bookingUpdates"),
      desc: t("notifications.bookingUpdatesDesc"),
    },
    {
      key: "messages" as const,
      icon: "chatbubble-outline",
      label: t("notifications.messages"),
      desc: t("notifications.messagesDesc"),
    },
    {
      key: "reminders" as const,
      icon: "time-outline",
      label: t("notifications.reminders"),
      desc: t("notifications.remindersDesc"),
    },
    {
      key: "promotions" as const,
      icon: "megaphone-outline",
      label: t("notifications.promotions"),
      desc: t("notifications.promotionsDesc"),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("profile.notifications")}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>{t("notifications.pushTitle")}</Text>

        <View style={styles.card}>
          {rows.map((item, index) => (
            <View
              key={item.key}
              style={[styles.row, index < rows.length - 1 && styles.rowBorder]}
            >
              <View style={styles.rowLeft}>
                <Icon name={item.icon} size={20} color={COLORS.text} />
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>{item.label}</Text>
                  <Text style={styles.rowDesc}>{item.desc}</Text>
                </View>
              </View>
              <Switch
                value={loaded ? settings[item.key] : DEFAULTS[item.key]}
                onValueChange={() => toggle(item.key)}
                trackColor={{ false: "#e5e7eb", true: COLORS.primary + "60" }}
                thumbColor={settings[item.key] ? COLORS.primary : "#f4f4f5"}
              />
            </View>
          ))}
        </View>

        <Text style={styles.footerNote}>{t("notifications.note")}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: COLORS.text },
  content: { flex: 1, paddingHorizontal: SPACING.lg },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textLight,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  card: {
    backgroundColor: "#f9fafb",
    borderRadius: RADIUS.lg,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: SPACING.md,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  rowLeft: { flexDirection: "row", alignItems: "center", flex: 1, gap: 12 },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: "500", color: COLORS.text },
  rowDesc: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  footerNote: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: "center",
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
});
