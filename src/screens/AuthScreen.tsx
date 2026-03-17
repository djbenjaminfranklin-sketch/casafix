import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { COLORS, SPACING, RADIUS } from "../constants/theme";

export default function AuthScreen() {
  const { t } = useTranslation();
  const { signIn, signUp, signInWithApple, signInWithGoogle } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"apple" | "google" | null>(null);

  async function handleSubmit() {
    if (!email || !password) {
      Alert.alert("Error", t("auth.fillAllFields"));
      return;
    }
    if (!isLogin && !fullName) {
      Alert.alert("Error", t("auth.fillAllFields"));
      return;
    }

    setLoading(true);
    if (isLogin) {
      const { error } = await signIn(email.trim(), password);
      if (error) Alert.alert("Error", error.message);
    } else {
      const { error } = await signUp(email.trim(), password, fullName.trim());
      if (error) {
        Alert.alert("Error", error.message);
      } else {
        Alert.alert(t("auth.success"), t("auth.checkEmail"));
      }
    }
    setLoading(false);
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={styles.logoSection}>
            <View style={styles.logoCircle}>
              <Icon name="home" size={40} color="#FFFFFF" />
            </View>
            <Text style={styles.appName}>
              <Text style={{ color: COLORS.primary }}>Casa</Text>
              <Text style={{ color: "#1f2937" }}>Fix</Text>
            </Text>
            <Text style={styles.tagline}>Costa del Sol</Text>
          </View>

          {/* Toggle */}
          <View style={styles.toggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, isLogin && styles.toggleBtnActive]}
              onPress={() => setIsLogin(true)}
            >
              <Text style={[styles.toggleText, isLogin && styles.toggleTextActive]}>
                {t("auth.login")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, !isLogin && styles.toggleBtnActive]}
              onPress={() => setIsLogin(false)}
            >
              <Text style={[styles.toggleText, !isLogin && styles.toggleTextActive]}>
                {t("auth.register")}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {!isLogin && (
              <View style={styles.inputGroup}>
                <Icon name="person-outline" size={20} color={COLORS.textLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={t("auth.fullName")}
                  placeholderTextColor={COLORS.textLight}
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Icon name="mail-outline" size={20} color={COLORS.textLight} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t("auth.email")}
                placeholderTextColor={COLORS.textLight}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Icon name="lock-closed-outline" size={20} color={COLORS.textLight} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder={t("auth.password")}
                placeholderTextColor={COLORS.textLight}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Icon
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={COLORS.textLight}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Icon name={isLogin ? "log-in-outline" : "person-add-outline"} size={20} color="#FFFFFF" />
                  <Text style={styles.submitBtnText}>
                    {isLogin ? t("auth.login") : t("auth.register")}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Social sign-in */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t("auth.orContinueWith")}</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialRow}>
            {Platform.OS === "ios" && (
              <TouchableOpacity
                style={styles.socialBtn}
                activeOpacity={0.8}
                disabled={socialLoading !== null}
                onPress={async () => {
                  setSocialLoading("apple");
                  const { error } = await signInWithApple();
                  if (error) Alert.alert("Error", error.message);
                  setSocialLoading(null);
                }}
              >
                {socialLoading === "apple" ? (
                  <ActivityIndicator color="#1f2937" />
                ) : (
                  <>
                    <Icon name="logo-apple" size={22} color="#1f2937" />
                    <Text style={styles.socialBtnText}>{t("auth.continueWithApple")}</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.socialBtn}
              activeOpacity={0.8}
              disabled={socialLoading !== null}
              onPress={async () => {
                setSocialLoading("google");
                const { error } = await signInWithGoogle();
                if (error) Alert.alert("Error", error.message);
                setSocialLoading(null);
              }}
            >
              {socialLoading === "google" ? (
                <ActivityIndicator color="#1f2937" />
              ) : (
                <>
                  <Icon name="logo-google" size={20} color="#DB4437" />
                  <Text style={styles.socialBtnText}>{t("auth.continueWithGoogle")}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Switch mode */}
          <View style={styles.switchRow}>
            <Text style={styles.switchText}>
              {isLogin ? t("auth.noAccount") : t("auth.hasAccount")}
            </Text>
            <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
              <Text style={styles.switchLink}>
                {isLogin ? t("auth.register") : t("auth.login")}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
  },
  logoSection: { alignItems: "center", marginBottom: 40 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary,
    alignItems: "center", justifyContent: "center", marginBottom: 16,
  },
  appName: { fontSize: 28, fontWeight: "800", color: "#1f2937" },
  tagline: { fontSize: 14, color: COLORS.textLight, marginTop: 4 },
  toggle: {
    flexDirection: "row", backgroundColor: "#f3f4f6", borderRadius: RADIUS.md,
    padding: 4, marginBottom: SPACING.lg,
  },
  toggleBtn: {
    flex: 1, paddingVertical: 10, borderRadius: RADIUS.sm, alignItems: "center",
  },
  toggleBtnActive: { backgroundColor: "#FFFFFF", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  toggleText: { fontSize: 14, fontWeight: "600", color: COLORS.textLight },
  toggleTextActive: { color: COLORS.primary },
  form: { gap: 12, marginBottom: SPACING.lg },
  inputGroup: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#f9fafb", borderRadius: RADIUS.md, borderWidth: 1, borderColor: "#e5e7eb",
    paddingHorizontal: 14, height: 52,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: "#1f2937" },
  passwordInput: { paddingRight: 40 },
  eyeBtn: { position: "absolute", right: 14 },
  submitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: RADIUS.md,
    gap: 10, marginTop: 4,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  dividerRow: {
    flexDirection: "row", alignItems: "center", marginBottom: SPACING.md,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#e5e7eb" },
  dividerText: { marginHorizontal: 12, fontSize: 13, color: COLORS.textLight },
  socialRow: { gap: 10, marginBottom: SPACING.lg },
  socialBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#FFFFFF", paddingVertical: 13, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: "#e5e7eb", gap: 10,
  },
  socialBtnText: { fontSize: 15, fontWeight: "600", color: "#1f2937" },
  switchRow: { flexDirection: "row", justifyContent: "center", gap: 6 },
  switchText: { fontSize: 14, color: COLORS.textLight },
  switchLink: { fontSize: 14, fontWeight: "600", color: COLORS.primary },
});
