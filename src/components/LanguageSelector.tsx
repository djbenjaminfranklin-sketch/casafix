import React from "react";
import {
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
} from "react-native";
import { useTranslation } from "react-i18next";
import { LANGUAGES } from "../i18n";
import { COLORS, RADIUS } from "../constants/theme";

export default function LanguageSelector() {
  const { i18n } = useTranslation();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {LANGUAGES.map((lang) => {
        const isActive = i18n.language === lang.code;
        return (
          <TouchableOpacity
            key={lang.code}
            style={[styles.pill, isActive && styles.pillActive]}
            onPress={() => i18n.changeLanguage(lang.code)}
            activeOpacity={0.7}
          >
            <Text style={styles.flag}>{lang.flag}</Text>
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {lang.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    gap: 8,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryLight,
    gap: 6,
  },
  pillActive: {
    backgroundColor: COLORS.primary,
  },
  flag: {
    fontSize: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary,
  },
  labelActive: {
    color: COLORS.white,
  },
});
