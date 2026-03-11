import React from "react";
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  Image,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { COLORS, RADIUS } from "../constants/theme";

const CATEGORY_IMAGES: Record<string, any> = {
  plumbing: require("../assets/categories/plumbing.jpg"),
  electrical: require("../assets/categories/electrical.jpg"),
  locksmith: require("../assets/categories/locksmith.jpg"),
  heating: require("../assets/categories/heating.jpg"),
  ac: require("../assets/categories/ac.jpg"),
  pest: require("../assets/categories/pest.jpg"),
  appliances: require("../assets/categories/appliances.jpg"),
  glazing: require("../assets/categories/glazing.jpg"),
  smallworks: require("../assets/categories/smallworks.jpg"),
  renovation: require("../assets/categories/renovation.jpg"),
  pool: require("../assets/categories/pool.jpg"),
  garden: require("../assets/categories/garden.jpg"),
};

type Props = {
  id: string;
  name: string;
  icon: string;
  color: string;
  bg: string;
  onPress: () => void;
};

export default function CategoryCard({ id, name, icon, color, bg, onPress }: Props) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Image source={CATEGORY_IMAGES[id]} style={styles.image} />
      <View style={styles.overlay} />
      <View style={styles.content}>
        <View style={[styles.iconBox, { backgroundColor: bg }]}>
          <Icon name={icon} size={20} color={color} />
        </View>
        <Text style={styles.name}>{name}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    overflow: "hidden",
    margin: 6,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  image: {
    width: "100%",
    height: 110,
    resizeMode: "cover",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    height: 110,
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 10,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    flexShrink: 1,
  },
});
