import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import { COLORS, SPACING, RADIUS } from "../constants/theme";

type Props = {
  navigation: any;
};

export default function PaymentScreen({ navigation }: Props) {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("profile.payment")}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* How it works */}
        <Text style={styles.sectionTitle}>{t("paymentSettings.howItWorks")}</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <View style={[styles.iconCircle, { backgroundColor: "#eff6ff" }]}>
              <Icon name="shield-checkmark" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>{t("paymentSettings.secureTitle")}</Text>
              <Text style={styles.infoDesc}>{t("paymentSettings.secureDesc")}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={[styles.iconCircle, { backgroundColor: "#f0fdf4" }]}>
              <Icon name="card" size={20} color="#16a34a" />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>{t("paymentSettings.preauthTitle")}</Text>
              <Text style={styles.infoDesc}>{t("paymentSettings.preauthDesc")}</Text>
            </View>
          </View>

          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <View style={[styles.iconCircle, { backgroundColor: "#fefce8" }]}>
              <Icon name="receipt" size={20} color="#ca8a04" />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>{t("paymentSettings.invoiceTitle")}</Text>
              <Text style={styles.infoDesc}>{t("paymentSettings.invoiceDesc")}</Text>
            </View>
          </View>
        </View>

        {/* Payment method */}
        <Text style={[styles.sectionTitle, { marginTop: SPACING.lg }]}>
          {t("paymentSettings.methodTitle")}
        </Text>
        <View style={styles.card}>
          <View style={styles.methodRow}>
            <View style={styles.methodLeft}>
              <Icon name="card-outline" size={22} color={COLORS.textLight} />
              <Text style={styles.methodText}>{t("paymentSettings.addedAtBooking")}</Text>
            </View>
            <Icon name="checkmark-circle" size={20} color="#16a34a" />
          </View>
        </View>
        <Text style={styles.methodNote}>{t("paymentSettings.methodNote")}</Text>

        {/* Powered by Stripe */}
        <View style={styles.stripeSection}>
          <Text style={styles.stripeText}>{t("paymentSettings.poweredBy")}</Text>
          <Text style={styles.stripeBrand}>Stripe</Text>
        </View>
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
    padding: SPACING.md,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingBottom: SPACING.md,
    marginBottom: SPACING.md,
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
  infoText: { flex: 1 },
  infoTitle: { fontSize: 14, fontWeight: "600", color: "#1f2937" },
  infoDesc: { fontSize: 13, color: COLORS.textLight, marginTop: 2 },
  methodRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  methodLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  methodText: { fontSize: 14, color: "#1f2937" },
  methodNote: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  stripeSection: {
    alignItems: "center",
    marginTop: SPACING.xl,
    marginBottom: 40,
  },
  stripeText: { fontSize: 12, color: COLORS.textLight },
  stripeBrand: { fontSize: 20, fontWeight: "700", color: "#635bff", marginTop: 4 },
});
