import React from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useTranslation } from "react-i18next";
import { CATEGORIES } from "../constants/categories";
import { SPACING, RADIUS } from "../constants/theme";
import CategoryCard from "../components/CategoryCard";

type Props = {
  navigation: any;
};

export default function EmergencyScreen({ navigation }: Props) {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#dc2626" />

      <FlatList
        data={CATEGORIES}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            {/* Back button + Title */}
            <View style={styles.topRow}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.backButton}
              >
                <Icon name="arrow-back" size={22} color="#ffffff" />
              </TouchableOpacity>
              <View style={styles.titleContainer}>
                <Icon name="flash" size={20} color="#fbbf24" />
                <Text style={styles.title}>{t("emergencyTitle")}</Text>
              </View>
              <View style={{ width: 40 }} />
            </View>

            {/* Subtitle */}
            <Text style={styles.sectionTitle}>{t("servicesTitle")}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <CategoryCard
            id={item.id}
            name={t(`categories.${item.id}`)}
            icon={item.icon}
            color={item.color}
            bg={item.bg}
            onPress={() => navigation.navigate("CategoryDetail", { categoryId: item.id })}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#dc2626",
  },
  listContent: {
    paddingHorizontal: SPACING.sm,
    paddingBottom: 40,
    backgroundColor: "#fef2f2",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: 8,
  },
  header: {
    paddingBottom: SPACING.md,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    marginTop: -8,
    backgroundColor: "#dc2626",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#991b1b",
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
});
