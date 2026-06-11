import CategoryCard from "@/components/category_card";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "~/constants/Colors";
import { FONTS } from "~/constants/Fonts";
import { useAuth } from "~/contexts/AuthContext";
import { apiCall } from "~/utils/api";
import { ms, vs } from "~/utils/responsive";

type Category = {
  id: string;
  image: string;
  name: string;
};

export default function Categories() {
  const { t } = useTranslation();
  const { isLoggedIn, setPendingBooking } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<boolean>(false);

  useEffect(() => {
    const getCategories = async () => {
      try {
        setLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append("type", "get_data");
        formData.append("table_name", "categories");

        const response = await apiCall(formData);
        if (response.data) {
          const mappedCategories = response.data.map((item: any) => ({
            id: item.id,
            image: item.thumb,
            name: item.name,
          }));

          setCategories(mappedCategories);
        } else {
          setError(response.message || "Failed to load categories.");
        }
      } catch (err) {
        setError("Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    getCategories();
  }, []);

  const visibleData = expanded ? categories : categories.slice(0, 6);

  const handleBooking = async (category: Category) => {
    if (!isLoggedIn) {
      await setPendingBooking({
        entry: "serviceType",
        id: category.id,
        name: category.name,
        image: category.image,
      });
      router.push("/auth/login");
      return;
    }
    router.push({
      pathname: "/booking/serviceType",
      params: {
        id: category.id,
        name: category.name,
        image: category.image,
      },
    });
  };

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.title}>{t("categories")}</Text>
        {categories.length > 6 && (
          <TouchableOpacity onPress={() => setExpanded(!expanded)}>
            <Text style={styles.seeAllText}>
              {expanded ? t("showless") : t("seeall")}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Loading & Error Handling */}
      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <FlatList
          scrollEnabled={false}
          data={visibleData}
          keyExtractor={(item) => item.id}
          numColumns={3}
          columnWrapperStyle={styles.columnWrapper}
          nestedScrollEnabled={true}
          renderItem={({ item }) => (
            <CategoryCard item={item} onPress={() => handleBooking(item)} />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: vs(20),
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: vs(10),
  },
  title: {
    fontSize: ms(17),
    fontFamily: FONTS.bold,
    color: Colors.secondary,
  },
  seeAllText: {
    color: Colors.primary,
    fontFamily: FONTS.medium,
    fontSize: ms(14),
  },
  columnWrapper: {
    justifyContent: "space-between",
    marginBottom: vs(12),
  },
  errorText: {
    color: "red",
    textAlign: "center",
    marginTop: vs(10),
    fontFamily: FONTS.bold,
  },
});
