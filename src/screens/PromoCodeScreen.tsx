import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import { COLORS, SPACING, RADIUS } from "../constants/theme";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

type Props = {
  navigation: any;
};

type UserPromo = {
  id: string;
  code: string;
  discount_percent: number | null;
  discount_amount: number | null;
  used_at: string;
};

export default function PromoCodeScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [userPromos, setUserPromos] = useState<UserPromo[]>([]);
  const [loadingPromos, setLoadingPromos] = useState(true);

  useEffect(() => {
    fetchUserPromos();
  }, []);

  const fetchUserPromos = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("user_promo_codes")
        .select("id, code, discount_percent, discount_amount, used_at")
        .eq("user_id", user.id)
        .order("used_at", { ascending: false });

      if (!error && data) {
        setUserPromos(data);
      }
    } catch (e) {
      // silently fail
    } finally {
      setLoadingPromos(false);
    }
  };

  const applyCode = async () => {
    if (!code.trim() || !user) return;
    setLoading(true);

    try {
      // Check if promo code exists
      const { data: promo, error: promoError } = await supabase
        .from("promo_codes")
        .select("*")
        .eq("code", code.trim().toUpperCase())
        .single();

      if (promoError || !promo) {
        Alert.alert(t("common.error"), t("promo.invalid"));
        setLoading(false);
        return;
      }

      // Check expiration
      if (promo.valid_until && new Date(promo.valid_until) < new Date()) {
        Alert.alert(t("common.error"), t("promo.expired"));
        setLoading(false);
        return;
      }

      // Check max uses
      if (promo.max_uses && promo.current_uses >= promo.max_uses) {
        Alert.alert(t("common.error"), t("promo.expired"));
        setLoading(false);
        return;
      }

      // Check if user already used this code
      const { data: existing } = await supabase
        .from("user_promo_codes")
        .select("id")
        .eq("user_id", user.id)
        .eq("code", code.trim().toUpperCase())
        .single();

      if (existing) {
        Alert.alert(t("common.error"), t("promo.alreadyUsed"));
        setLoading(false);
        return;
      }

      // Apply the promo code
      await supabase.from("user_promo_codes").insert({
        user_id: user.id,
        code: promo.code,
        promo_code_id: promo.id,
        discount_percent: promo.discount_percent,
        discount_amount: promo.discount_amount,
        used_at: new Date().toISOString(),
      });

      // Increment current_uses
      await supabase
        .from("promo_codes")
        .update({ current_uses: (promo.current_uses || 0) + 1 })
        .eq("id", promo.id);

      Alert.alert(t("promo.success"), getDiscountText(promo));
      setCode("");
      fetchUserPromos();
    } catch (e) {
      Alert.alert(t("common.error"), t("promo.invalid"));
    } finally {
      setLoading(false);
    }
  };

  const getDiscountText = (promo: any) => {
    if (promo.discount_percent) return `-${promo.discount_percent}%`;
    if (promo.discount_amount) return `-${promo.discount_amount}\u20AC`;
    return "";
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("promo.title")}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Input section */}
        <View style={styles.card}>
          <View style={styles.inputRow}>
            <Icon name="pricetag-outline" size={22} color={COLORS.primary} />
            <TextInput
              style={styles.input}
              placeholder={t("promo.enterCode")}
              placeholderTextColor={COLORS.textLight}
              value={code}
              onChangeText={(text) => setCode(text.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>
          <TouchableOpacity
            style={[styles.applyBtn, !code.trim() && styles.applyBtnDisabled]}
            onPress={applyCode}
            disabled={loading || !code.trim()}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.applyBtnText}>{t("promo.apply")}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Active promos */}
        {!loadingPromos && userPromos.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: SPACING.lg }]}>
              {t("promo.activePromos")}
            </Text>
            <View style={styles.card}>
              {userPromos.map((promo, index) => (
                <View
                  key={promo.id}
                  style={[
                    styles.promoRow,
                    index < userPromos.length - 1 && styles.promoBorder,
                  ]}
                >
                  <View style={[styles.iconCircle, { backgroundColor: COLORS.primaryLight }]}>
                    <Icon name="checkmark-circle" size={20} color={COLORS.primary} />
                  </View>
                  <View style={styles.promoInfo}>
                    <Text style={styles.promoCode}>{promo.code}</Text>
                    <Text style={styles.promoDiscount}>
                      {promo.discount_percent
                        ? `-${promo.discount_percent}%`
                        : promo.discount_amount
                        ? `-${promo.discount_amount}\u20AC`
                        : ""}
                    </Text>
                  </View>
                  <Text style={styles.promoDate}>
                    {new Date(promo.used_at).toLocaleDateString()}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {loadingPromos && (
          <ActivityIndicator
            size="small"
            color={COLORS.primary}
            style={{ marginTop: SPACING.xl }}
          />
        )}

        <View style={{ height: 40 }} />
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
    marginTop: SPACING.sm,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    letterSpacing: 2,
  },
  applyBtn: {
    backgroundColor: COLORS.primary,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    alignItems: "center",
  },
  applyBtnDisabled: {
    opacity: 0.5,
  },
  applyBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "700",
  },
  promoRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.md,
    gap: 12,
  },
  promoBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  promoInfo: { flex: 1 },
  promoCode: { fontSize: 14, fontWeight: "700", color: COLORS.text },
  promoDiscount: { fontSize: 13, color: COLORS.primary, fontWeight: "600", marginTop: 2 },
  promoDate: { fontSize: 12, color: COLORS.textLight },
});
