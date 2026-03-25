import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import { COLORS, SPACING, RADIUS } from "../constants/theme";
import { CGU } from "../constants/legal";

type Props = {
  route: { params: { type: "cgu" | "legal" | "privacy" } };
  navigation: any;
};

export default function LegalScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { type } = route.params;

  const titleMap = {
    cgu: t("legal.cguTitle"),
    legal: t("legal.legalNoticeTitle"),
    privacy: t("legal.privacyTitle"),
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{titleMap[type]}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lastUpdated}>
          {t("legal.lastUpdated")}: {CGU.lastUpdated}
        </Text>

        {type === "cgu" &&
          CGU.articles.map((article) => (
            <View key={article.id} style={styles.article}>
              <Text style={styles.articleTitle}>{t(article.titleKey)}</Text>
              <Text style={styles.articleContent}>{t(article.contentKey)}</Text>
            </View>
          ))}

        {type === "legal" && (
          <View style={styles.article}>
            <Text style={styles.articleTitle}>
              {t("legal.legalNotice.publisherTitle")}
            </Text>
            <Text style={styles.articleContent}>
              {t("legal.legalNotice.publisherContent")}
            </Text>

            <Text style={[styles.articleTitle, { marginTop: SPACING.lg }]}>
              {t("legal.legalNotice.hostingTitle")}
            </Text>
            <Text style={styles.articleContent}>
              {t("legal.legalNotice.hostingContent")}
            </Text>

            <Text style={[styles.articleTitle, { marginTop: SPACING.lg }]}>
              {t("legal.legalNotice.ipTitle")}
            </Text>
            <Text style={styles.articleContent}>
              {t("legal.legalNotice.ipContent")}
            </Text>
          </View>
        )}

        {type === "privacy" && (
          <View style={styles.article}>
            <Text style={styles.articleTitle}>
              {t("legal.privacy.dataTitle")}
            </Text>
            <Text style={styles.articleContent}>
              {t("legal.privacy.dataContent")}
            </Text>

            <Text style={[styles.articleTitle, { marginTop: SPACING.lg }]}>
              {t("legal.privacy.purposeTitle")}
            </Text>
            <Text style={styles.articleContent}>
              {t("legal.privacy.purposeContent")}
            </Text>

            <Text style={[styles.articleTitle, { marginTop: SPACING.lg }]}>
              {t("legal.privacy.legalBasisTitle")}
            </Text>
            <Text style={styles.articleContent}>
              {t("legal.privacy.legalBasisContent")}
            </Text>

            <Text style={[styles.articleTitle, { marginTop: SPACING.lg }]}>
              {t("legal.privacy.subprocessorsTitle")}
            </Text>
            <Text style={styles.articleContent}>
              {t("legal.privacy.subprocessorsContent")}
            </Text>

            <Text style={[styles.articleTitle, { marginTop: SPACING.lg }]}>
              {t("legal.privacy.cookiesTitle")}
            </Text>
            <Text style={styles.articleContent}>
              {t("legal.privacy.cookiesContent")}
            </Text>

            <Text style={[styles.articleTitle, { marginTop: SPACING.lg }]}>
              {t("legal.privacy.rightsTitle")}
            </Text>
            <Text style={styles.articleContent}>
              {t("legal.privacy.rightsContent")}
            </Text>

            <Text style={[styles.articleTitle, { marginTop: SPACING.lg }]}>
              {t("legal.privacy.contactTitle")}
            </Text>
            <Text style={styles.articleContent}>
              {t("legal.privacy.contactContent")}
            </Text>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            CasaFix - France
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f1f1",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.text,
  },
  content: {
    padding: SPACING.md,
    paddingBottom: 60,
  },
  lastUpdated: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: SPACING.lg,
  },
  article: {
    marginBottom: SPACING.lg,
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
    marginBottom: SPACING.sm,
  },
  articleContent: {
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.text,
  },
  footer: {
    marginTop: SPACING.xl,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: "#f1f1f1",
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
});
