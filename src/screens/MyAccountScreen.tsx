import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { COLORS, SPACING, RADIUS } from "../constants/theme";

type Props = {
  navigation: any;
};

export default function MyAccountScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { user, profile, updateProfile, signOut } = useAuth();

  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [address, setAddress] = useState(profile?.address || "");
  const [saving, setSaving] = useState(false);
  const [edited, setEdited] = useState(false);

  const hasChanges =
    fullName !== (profile?.full_name || "") ||
    email !== (user?.email || "") ||
    phone !== (profile?.phone || "") ||
    address !== (profile?.address || "");

  function isValidPhone(p: string): boolean {
    const cleaned = p.replace(/[\s\-\(\)]/g, "");
    return /^\+?\d{8,15}$/.test(cleaned);
  }

  async function handleSave() {
    if (!hasChanges) return;
    if (phone.trim() && !isValidPhone(phone.trim())) {
      Alert.alert("", t("account.invalidPhone"));
      return;
    }
    setSaving(true);
    try {
      await updateProfile({ full_name: fullName.trim(), phone: phone.trim(), address: address.trim() });

      // Update email if changed
      if (email.trim() && email.trim() !== user?.email) {
        const { error: emailError } = await supabase.auth.updateUser({ email: email.trim() });
        if (emailError) {
          Alert.alert(t("common.error"), emailError.message);
          setSaving(false);
          return;
        }
      }

      setEdited(false);
      Alert.alert("", t("account.saved"));
    } catch {
      Alert.alert(t("common.error"), t("account.saveError"));
    }
    setSaving(false);
  }

  function handleDeleteAccount() {
    Alert.alert(
      t("account.deleteTitle"),
      t("account.deleteConfirm"),
      [
        { text: t("priceConfirm.no"), style: "cancel" },
        {
          text: t("account.deleteAccount"),
          style: "destructive",
          onPress: async () => {
            try {
              // Mark profile as deleted in database
              if (user) {
                await supabase
                  .from("profiles")
                  .update({ deleted_at: new Date().toISOString() })
                  .eq("id", user.id);
              }
              await signOut();
            } catch {
              Alert.alert(t("common.error"), t("account.deleteError"));
            }
          },
        },
      ]
    );
  }

  function handleSignOut() {
    Alert.alert(t("account.signOutTitle"), t("account.signOutConfirm"), [
      { text: t("priceConfirm.no"), style: "cancel" },
      {
        text: t("account.signOut"),
        style: "destructive",
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("profile.myAccount")}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Icon name="person" size={36} color={COLORS.white} />
          </View>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        {/* Fields */}
        <Text style={styles.label}>{t("auth.fullName")}</Text>
        <TextInput
          style={styles.input}
          value={fullName}
          onChangeText={(v) => {
            setFullName(v);
            setEdited(true);
          }}
          placeholder={t("auth.fullName")}
          placeholderTextColor={COLORS.textLight}
        />

        <Text style={styles.label}>{t("account.phone")}</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={(v) => {
            setPhone(v);
            setEdited(true);
          }}
          placeholder={t("account.phonePlaceholder")}
          placeholderTextColor={COLORS.textLight}
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>{t("account.address")}</Text>
        <TextInput
          style={styles.input}
          value={address}
          onChangeText={(v) => {
            setAddress(v);
            setEdited(true);
          }}
          placeholder={t("account.addressPlaceholder")}
          placeholderTextColor={COLORS.textLight}
        />
        <Text style={styles.addressHint}>{t("account.addressRequired")}</Text>

        <Text style={styles.label}>{t("auth.email")}</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor={COLORS.textLight}
        />

        {/* Save */}
        {hasChanges && (
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveBtnText}>{t("account.save")}</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Sign out */}
        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={handleSignOut}
          activeOpacity={0.7}
        >
          <Icon name="log-out-outline" size={20} color="#dc2626" />
          <Text style={styles.signOutText}>{t("account.signOut")}</Text>
        </TouchableOpacity>

        {/* Delete account */}
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount} activeOpacity={0.7}>
          <Text style={styles.deleteText}>{t("account.deleteAccount")}</Text>
        </TouchableOpacity>
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
  avatarSection: { alignItems: "center", marginVertical: SPACING.lg },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  email: { fontSize: 14, color: COLORS.textLight },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textLight,
    marginBottom: 6,
    marginTop: SPACING.md,
  },
  input: {
    backgroundColor: "#f9fafb",
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 14,
    fontSize: 15,
    color: "#1f2937",
  },
  inputDisabled: { backgroundColor: "#f3f4f6" },
  addressHint: { fontSize: 12, color: COLORS.textLight, marginTop: 4 },
  disabledText: { fontSize: 15, color: COLORS.textLight },
  saveBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    alignItems: "center",
    marginTop: SPACING.lg,
  },
  saveBtnText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    marginTop: SPACING.xl,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2",
  },
  signOutText: { fontSize: 15, fontWeight: "600", color: "#dc2626" },
  deleteBtn: { alignItems: "center", paddingVertical: SPACING.md, marginBottom: 40 },
  deleteText: { fontSize: 13, color: COLORS.textLight, textDecorationLine: "underline" },
});
