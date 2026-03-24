import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Modal,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabase";
import { COLORS, SPACING, RADIUS } from "../constants/theme";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

type BookingPhoto = {
  id: string;
  booking_id: string;
  image_url: string;
  type: "before" | "after";
  uploaded_by: string;
  created_at: string;
};

type Props = {
  bookingId: string;
};

export default function BeforeAfterPhotos({ bookingId }: Props) {
  const { t } = useTranslation();
  const [photos, setPhotos] = useState<BookingPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [fullscreenUri, setFullscreenUri] = useState<string | null>(null);

  useEffect(() => {
    fetchPhotos();
  }, [bookingId]);

  async function fetchPhotos() {
    const { data, error } = await supabase
      .from("booking_photos")
      .select("*")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setPhotos(data as BookingPhoto[]);
    }
    setLoading(false);
  }

  const beforePhotos = photos.filter((p) => p.type === "before");
  const afterPhotos = photos.filter((p) => p.type === "after");

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  if (photos.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Icon name="images" size={18} color={COLORS.primary} />
        <Text style={styles.title}>{t("beforeAfter.title")}</Text>
      </View>

      <View style={styles.columns}>
        {/* Before column */}
        <View style={styles.column}>
          <View style={styles.labelContainer}>
            <View style={[styles.labelBadge, styles.beforeBadge]}>
              <Text style={[styles.labelText, styles.beforeLabelText]}>
                {t("beforeAfter.before")}
              </Text>
            </View>
          </View>
          {beforePhotos.length > 0 ? (
            <View style={styles.photoGrid}>
              {beforePhotos.map((photo) => (
                <TouchableOpacity
                  key={photo.id}
                  style={styles.photoItem}
                  onPress={() => setFullscreenUri(photo.image_url)}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: photo.image_url }} style={styles.photo} />
                  <View style={styles.zoomOverlay}>
                    <Icon name="expand" size={14} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyPhoto}>
              <Icon name="image-outline" size={24} color="#d1d5db" />
            </View>
          )}
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Icon name="arrow-forward" size={16} color="#d1d5db" />
          <View style={styles.dividerLine} />
        </View>

        {/* After column */}
        <View style={styles.column}>
          <View style={styles.labelContainer}>
            <View style={[styles.labelBadge, styles.afterBadge]}>
              <Text style={[styles.labelText, styles.afterLabelText]}>
                {t("beforeAfter.after")}
              </Text>
            </View>
          </View>
          {afterPhotos.length > 0 ? (
            <View style={styles.photoGrid}>
              {afterPhotos.map((photo) => (
                <TouchableOpacity
                  key={photo.id}
                  style={styles.photoItem}
                  onPress={() => setFullscreenUri(photo.image_url)}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: photo.image_url }} style={styles.photo} />
                  <View style={styles.zoomOverlay}>
                    <Icon name="expand" size={14} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyPhoto}>
              <Icon name="image-outline" size={24} color="#d1d5db" />
            </View>
          )}
        </View>
      </View>

      {/* Fullscreen modal */}
      <Modal visible={!!fullscreenUri} transparent animationType="fade">
        <View style={styles.fullscreenContainer}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => setFullscreenUri(null)}
            activeOpacity={0.7}
          >
            <Icon name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          {fullscreenUri && (
            <Image
              source={{ uri: fullscreenUri }}
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f9fafb",
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.sm,
  },
  loadingContainer: {
    padding: SPACING.lg,
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
  },
  columns: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  column: {
    flex: 1,
  },
  labelContainer: {
    alignItems: "center",
    marginBottom: 8,
  },
  labelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  beforeBadge: {
    backgroundColor: "#FEF3C7",
  },
  afterBadge: {
    backgroundColor: "#dcfce7",
  },
  labelText: {
    fontSize: 11,
    fontWeight: "600",
  },
  beforeLabelText: {
    color: "#92400e",
  },
  afterLabelText: {
    color: "#166534",
  },
  photoGrid: {
    gap: 6,
  },
  photoItem: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: RADIUS.sm,
    overflow: "hidden",
  },
  photo: {
    width: "100%",
    height: "100%",
    borderRadius: RADIUS.sm,
  },
  zoomOverlay: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 10,
    padding: 4,
  },
  emptyPhoto: {
    aspectRatio: 1,
    backgroundColor: "#f3f4f6",
    borderRadius: RADIUS.sm,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderStyle: "dashed",
  },
  divider: {
    width: 30,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 40,
  },
  dividerLine: {
    width: 1,
    height: 20,
    backgroundColor: "#e5e7eb",
  },
  // Fullscreen
  fullscreenContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtn: {
    position: "absolute",
    top: 60,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  fullscreenImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
  },
});
