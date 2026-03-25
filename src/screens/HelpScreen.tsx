import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Linking,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import { COLORS, SPACING, RADIUS } from "../constants/theme";

type Props = {
  navigation: any;
};

export default function HelpScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    { q: t("help.faq1q"), a: t("help.faq1a") },
    { q: t("help.faq2q"), a: t("help.faq2a") },
    { q: t("help.faq3q"), a: t("help.faq3a") },
    { q: t("help.faq4q"), a: t("help.faq4a") },
    { q: t("help.faq5q"), a: t("help.faq5a") },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("profile.help")}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Contact */}
        <Text style={styles.sectionTitle}>{t("help.contactTitle")}</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.contactRow}
            onPress={() => Linking.openURL("mailto:contact@casafix.fr")}
            activeOpacity={0.7}
          >
            <View style={[styles.iconCircle, { backgroundColor: "#eff6ff" }]}>
              <Icon name="mail" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.contactText}>
              <Text style={styles.contactLabel}>{t("help.email")}</Text>
              <Text style={styles.contactValue}>contact@casafix.fr</Text>
            </View>
            <Icon name="chevron-forward" size={18} color={COLORS.textLight} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.contactRow, { borderBottomWidth: 0 }]}
            onPress={() => Linking.openURL("https://wa.me/33600000000")}
            activeOpacity={0.7}
          >
            <View style={[styles.iconCircle, { backgroundColor: "#f0fdf4" }]}>
              <Icon name="logo-whatsapp" size={20} color="#16a34a" />
            </View>
            <View style={styles.contactText}>
              <Text style={styles.contactLabel}>WhatsApp</Text>
              <Text style={styles.contactValue}>+33 6 00 00 00 00</Text>
            </View>
            <Icon name="chevron-forward" size={18} color={COLORS.textLight} />
          </TouchableOpacity>
        </View>

        {/* FAQ */}
        <Text style={[styles.sectionTitle, { marginTop: SPACING.lg }]}>
          {t("help.faqTitle")}
        </Text>
        <View style={styles.card}>
          {faqs.map((faq, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.faqItem, index < faqs.length - 1 && styles.faqBorder]}
              onPress={() => setOpenFaq(openFaq === index ? null : index)}
              activeOpacity={0.7}
            >
              <View style={styles.faqHeader}>
                <Text style={styles.faqQuestion}>{faq.q}</Text>
                <Icon
                  name={openFaq === index ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={COLORS.textLight}
                />
              </View>
              {openFaq === index && (
                <Text style={styles.faqAnswer}>{faq.a}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

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
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.md,
    gap: 12,
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
  contactText: { flex: 1 },
  contactLabel: { fontSize: 14, fontWeight: "600", color: "#1f2937" },
  contactValue: { fontSize: 13, color: COLORS.textLight, marginTop: 1 },
  faqItem: { padding: SPACING.md },
  faqBorder: { borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  faqHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  faqQuestion: { fontSize: 14, fontWeight: "600", color: "#1f2937", flex: 1, marginRight: 8 },
  faqAnswer: { fontSize: 13, color: COLORS.textLight, marginTop: 8, lineHeight: 20 },
});
