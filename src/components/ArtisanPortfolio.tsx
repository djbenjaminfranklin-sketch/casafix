import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Dimensions,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import { COLORS, SPACING, RADIUS } from "../constants/theme";
import { getArtisanPortfolio, PortfolioImage } from "../services/portfolio";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const THUMB_SIZE = 80;
const THUMB_GAP = 8;
const MAX_VISIBLE = 5;

type Props = {
  artisanId: string;
};

export default function ArtisanPortfolio({ artisanId }: Props) {
  const { t } = useTranslation();
  const [images, setImages] = useState<PortfolioImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      const data = await getArtisanPortfolio(artisanId);
      if (!cancelled) {
        setImages(data);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [artisanId]);

  const openGallery = useCallback((index: number) => {
    setGalleryIndex(index);
    setGalleryVisible(true);
  }, []);

  const onGalleryScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offset = e.nativeEvent.contentOffset.x;
      const idx = Math.round(offset / SCREEN_WIDTH);
      setGalleryIndex(idx);
    },
    []
  );

  // Don't render anything if loading or no images
  if (loading || images.length === 0) {
    return null;
  }

  const visibleImages = images.slice(0, MAX_VISIBLE);
  const hasMore = images.length > MAX_VISIBLE;

  return (
    <View style={styles.container}>
      {/* Section title */}
      <View style={styles.header}>
        <Icon name="images-outline" size={16} color={COLORS.textSecondary} />
        <Text style={styles.title}>{t("portfolio.title")}</Text>
        <Text style={styles.count}>
          {t("portfolio.photos", { count: images.length })}
        </Text>
      </View>

      {/* Horizontal thumbnail scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {visibleImages.map((img, index) => (
          <TouchableOpacity
            key={img.id}
            activeOpacity={0.85}
            onPress={() => openGallery(index)}
          >
            <Image
              source={{ uri: img.image_url }}
              style={styles.thumb}
              resizeMode="cover"
            />
          </TouchableOpacity>
        ))}

        {/* "See all" button */}
        {hasMore && (
          <TouchableOpacity
            style={styles.seeAllBtn}
            activeOpacity={0.8}
            onPress={() => openGallery(0)}
          >
            <Icon name="arrow-forward" size={18} color={COLORS.primary} />
            <Text style={styles.seeAllText}>{t("portfolio.seeAll")}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Fullscreen gallery modal */}
      <Modal
        visible={galleryVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setGalleryVisible(false)}
      >
        <View style={styles.galleryOverlay}>
          {/* Close button */}
          <TouchableOpacity
            style={styles.galleryClose}
            onPress={() => setGalleryVisible(false)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Page indicator */}
          <View style={styles.galleryCounter}>
            <Text style={styles.galleryCounterText}>
              {galleryIndex + 1} / {images.length}
            </Text>
          </View>

          {/* Swipeable images */}
          <FlatList
            data={images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={galleryIndex}
            getItemLayout={(_, index) => ({
              length: SCREEN_WIDTH,
              offset: SCREEN_WIDTH * index,
              index,
            })}
            onMomentumScrollEnd={onGalleryScroll}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.gallerySlide}>
                <Image
                  source={{ uri: item.image_url }}
                  style={styles.galleryImage}
                  resizeMode="contain"
                />
                {item.description ? (
                  <View style={styles.galleryCaption}>
                    <Text style={styles.galleryCaptionText}>
                      {item.description}
                    </Text>
                  </View>
                ) : null}
              </View>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: SPACING.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: SPACING.xs,
  },
  title: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
  },
  count: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  scrollContent: {
    gap: THUMB_GAP,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: RADIUS.sm,
    backgroundColor: "#f3f4f6",
  },
  seeAllBtn: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: RADIUS.sm,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  seeAllText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.primary,
    textAlign: "center",
  },
  // Fullscreen gallery
  galleryOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
  },
  galleryClose: {
    position: "absolute",
    top: 60,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  galleryCounter: {
    position: "absolute",
    top: 68,
    left: 0,
    right: 0,
    zIndex: 10,
    alignItems: "center",
  },
  galleryCounterText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  gallerySlide: {
    width: SCREEN_WIDTH,
    justifyContent: "center",
    alignItems: "center",
  },
  galleryImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
  galleryCaption: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
  },
  galleryCaptionText: {
    fontSize: 14,
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 20,
  },
});
