import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  TextInput,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { launchCamera, launchImageLibrary } from "react-native-image-picker";
import { useTranslation } from "react-i18next";
import { COLORS, SPACING, RADIUS } from "../constants/theme";
import { MediaItem } from "../services/media";

type Props = {
  media: MediaItem[];
  onMediaChange: (media: MediaItem[]) => void;
  maxItems?: number;
  description: string;
  onDescriptionChange: (text: string) => void;
  showDescription?: boolean;
  photoOnly?: boolean;
};

export default function MediaPicker({ media, onMediaChange, maxItems = 5, description, onDescriptionChange, showDescription = true, photoOnly = false }: Props) {
  const { t } = useTranslation();

  function handleAdd() {
    if (media.length >= maxItems) {
      Alert.alert(t("media.maxReached"), t("media.maxReachedDesc", { max: maxItems }));
      return;
    }

    const options: any[] = [
      {
        text: t("media.takePhoto"),
        onPress: () => pickFromCamera("photo"),
      },
    ];
    if (!photoOnly) {
      options.push({
        text: t("media.recordVideo"),
        onPress: () => pickFromCamera("video"),
      });
    }
    options.push(
      {
        text: t("media.fromGallery"),
        onPress: () => pickFromGallery(),
      },
      { text: t("priceConfirm.no"), style: "cancel" },
    );
    Alert.alert(t("media.addTitle"), t("media.addDesc"), options);
  }

  async function pickFromCamera(mediaType: "photo" | "video") {
    const result = await launchCamera({
      mediaType: mediaType === "photo" ? "photo" : "video",
      videoQuality: "medium",
      durationLimit: 30, // 30 seconds max for videos
      quality: 0.8,
    });

    if (result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      onMediaChange([
        ...media,
        {
          uri: asset.uri!,
          type: asset.type?.startsWith("video") ? "video" : "photo",
          fileName: asset.fileName,
          fileSize: asset.fileSize,
        },
      ]);
    }
  }

  async function pickFromGallery() {
    const remaining = maxItems - media.length;
    const result = await launchImageLibrary({
      mediaType: photoOnly ? "photo" : "mixed",
      selectionLimit: remaining,
      quality: 0.8,
      videoQuality: "medium",
    });

    if (result.assets && result.assets.length > 0) {
      const newItems: MediaItem[] = result.assets.map((asset) => ({
        uri: asset.uri!,
        type: asset.type?.startsWith("video") ? "video" as const : "photo" as const,
        fileName: asset.fileName,
        fileSize: asset.fileSize,
      }));
      onMediaChange([...media, ...newItems]);
    }
  }

  function handleRemove(index: number) {
    const updated = [...media];
    updated.splice(index, 1);
    onMediaChange(updated);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Icon name="camera" size={18} color={COLORS.primary} />
        <Text style={styles.title}>{t("media.title")}</Text>
        <Text style={styles.counter}>{media.length}/{maxItems}</Text>
      </View>
      <Text style={styles.subtitle}>{t("media.subtitle")}</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
        {media.map((item, index) => (
          <View key={index} style={styles.mediaItem}>
            <Image source={{ uri: item.uri }} style={styles.thumbnail} />
            {item.type === "video" && (
              <View style={styles.videoBadge}>
                <Icon name="videocam" size={14} color="#FFFFFF" />
              </View>
            )}
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => handleRemove(index)}
            >
              <Icon name="close" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ))}

        {media.length < maxItems && (
          <TouchableOpacity style={styles.addBtn} onPress={handleAdd} activeOpacity={0.7}>
            <Icon name="add" size={28} color={COLORS.primary} />
            <Text style={styles.addText}>{t("media.add")}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {media.length > 0 && showDescription && (
        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionLabel}>
            {t("media.descriptionLabel")}<Text style={styles.requiredAsterisk}> *</Text>
          </Text>
          <TextInput
            style={styles.descriptionInput}
            multiline
            placeholder={t("media.descriptionPlaceholder")}
            placeholderTextColor="#9ca3af"
            value={description}
            onChangeText={onDescriptionChange}
            maxLength={500}
          />
          <Text style={styles.charCount}>{description.length}/500</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f9fafb",
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  header: {
    flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4,
  },
  title: { fontSize: 14, fontWeight: "600", color: "#1f2937", flex: 1 },
  counter: { fontSize: 12, color: COLORS.textLight },
  subtitle: { fontSize: 12, color: COLORS.textLight, marginBottom: 12 },
  scroll: { flexDirection: "row" },
  mediaItem: {
    width: 80, height: 80, borderRadius: RADIUS.sm, marginRight: 8,
    overflow: "hidden",
  },
  thumbnail: { width: "100%", height: "100%", borderRadius: RADIUS.sm },
  videoBadge: {
    position: "absolute", bottom: 4, left: 4,
    backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 10,
    paddingHorizontal: 5, paddingVertical: 2,
  },
  removeBtn: {
    position: "absolute", top: 4, right: 4,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center", justifyContent: "center",
  },
  addBtn: {
    width: 80, height: 80, borderRadius: RADIUS.sm,
    borderWidth: 2, borderColor: "#e5e7eb", borderStyle: "dashed",
    alignItems: "center", justifyContent: "center",
  },
  addText: { fontSize: 10, color: COLORS.primary, marginTop: 2 },
  descriptionContainer: {
    marginTop: 12,
  },
  descriptionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 6,
  },
  requiredAsterisk: {
    color: "#ef4444",
    fontWeight: "700",
  },
  descriptionInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: RADIUS.sm,
    padding: 12,
    minHeight: 80,
    fontSize: 14,
    color: "#1f2937",
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: 11,
    color: COLORS.textLight,
    textAlign: "right",
    marginTop: 4,
  },
});
