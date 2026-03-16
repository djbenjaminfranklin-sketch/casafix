import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Modal,
  StatusBar,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import { COLORS, SPACING, RADIUS } from "../constants/theme";
import { VisualizationResult } from "../services/ai-visualize";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const IMG_WIDTH = SCREEN_W - SPACING.lg * 2 - 2; // account for border

type Props = {
  originalUri: string;
  visualization: VisualizationResult;
};

export default function VisualizationCard({ originalUri, visualization }: Props) {
  const { t } = useTranslation();
  const [showAfter, setShowAfter] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);

  const currentUri = showAfter ? visualization.imageUrl : originalUri;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Icon name="color-palette" size={18} color={COLORS.primary} />
        <Text style={styles.title}>{t("visualization.title")}</Text>
      </View>

      {/* Toggle */}
      <View style={styles.toggle}>
        <TouchableOpacity
          style={[styles.toggleBtn, !showAfter && styles.toggleBtnActive]}
          onPress={() => setShowAfter(false)}
          activeOpacity={0.7}
        >
          <Text style={[styles.toggleText, !showAfter && styles.toggleTextActive]}>
            {t("visualization.before")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, showAfter && styles.toggleBtnActive]}
          onPress={() => setShowAfter(true)}
          activeOpacity={0.7}
        >
          <Icon
            name="sparkles"
            size={14}
            color={showAfter ? "#FFFFFF" : COLORS.primary}
          />
          <Text style={[styles.toggleText, showAfter && styles.toggleTextActive]}>
            {t("visualization.after")}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Image — tap to fullscreen */}
      <TouchableOpacity
        style={styles.imageContainer}
        onPress={() => setFullscreen(true)}
        activeOpacity={0.9}
      >
        <Image
          source={{ uri: currentUri }}
          style={styles.image}
          resizeMode="cover"
        />
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {showAfter ? t("visualization.after") : t("visualization.before")}
          </Text>
        </View>
        <View style={styles.expandIcon}>
          <Icon name="expand" size={16} color="#FFFFFF" />
        </View>
      </TouchableOpacity>

      {/* Disclaimer */}
      <View style={styles.disclaimer}>
        <Icon name="information-circle" size={14} color="#6b7280" />
        <Text style={styles.disclaimerText}>{t("visualization.disclaimer")}</Text>
      </View>

      {/* Fullscreen modal */}
      <Modal visible={fullscreen} animationType="fade" statusBarTranslucent>
        <View style={styles.fullscreenContainer}>
          <StatusBar barStyle="light-content" />
          <Image
            source={{ uri: currentUri }}
            style={styles.fullscreenImage}
            resizeMode="contain"
          />

          {/* Toggle avant/après in fullscreen */}
          <View style={styles.fullscreenToggle}>
            <TouchableOpacity
              style={[styles.fsToggleBtn, !showAfter && styles.fsToggleBtnActive]}
              onPress={() => setShowAfter(false)}
            >
              <Text style={[styles.fsToggleText, !showAfter && styles.fsToggleTextActive]}>
                {t("visualization.before")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.fsToggleBtn, showAfter && styles.fsToggleBtnActive]}
              onPress={() => setShowAfter(true)}
            >
              <Icon name="sparkles" size={14} color={showAfter ? "#FFFFFF" : "#e9d5ff"} />
              <Text style={[styles.fsToggleText, showAfter && styles.fsToggleTextActive]}>
                {t("visualization.after")}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Close button */}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => setFullscreen(false)}
          >
            <Icon name="close" size={26} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#faf5ff",
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: "#e9d5ff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1f2937",
  },
  toggle: {
    flexDirection: "row",
    backgroundColor: "#f3e8ff",
    borderRadius: 8,
    padding: 3,
    marginBottom: 10,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: COLORS.primary,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primary,
  },
  toggleTextActive: {
    color: "#FFFFFF",
  },
  imageContainer: {
    borderRadius: RADIUS.sm,
    overflow: "hidden",
    position: "relative",
  },
  image: {
    width: IMG_WIDTH,
    height: IMG_WIDTH * 0.75,
    borderRadius: RADIUS.sm,
  },
  badge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  expandIcon: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  // Fullscreen
  fullscreenContainer: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
  fullscreenImage: {
    width: SCREEN_W,
    height: SCREEN_H * 0.7,
  },
  fullscreenToggle: {
    position: "absolute",
    bottom: 50,
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 10,
    padding: 3,
  },
  fsToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  fsToggleBtnActive: {
    backgroundColor: COLORS.primary,
  },
  fsToggleText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#e9d5ff",
  },
  fsToggleTextActive: {
    color: "#FFFFFF",
  },
  closeBtn: {
    position: "absolute",
    top: 60,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  disclaimer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 10,
    backgroundColor: "#f3f4f6",
    padding: 8,
    borderRadius: RADIUS.sm,
  },
  disclaimerText: {
    fontSize: 10,
    color: "#6b7280",
    lineHeight: 14,
    flex: 1,
    fontStyle: "italic",
  },
});
