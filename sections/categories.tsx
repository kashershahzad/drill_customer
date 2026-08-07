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
  translations?: string;
};

type CategoriesProps = {
  searchQuery?: string;
};

const resolveCategoryName = (
  name: string,
  translations: string | undefined,
  language: string,
) => {
  if (!translations) return name;

  try {
    const parsed = JSON.parse(translations) as Record<string, string>;
    const lang = language?.startsWith("ar") ? "ar" : "en";
    const translated = parsed[lang]?.trim();
    if (translated) return translated;
    const english = parsed.en?.trim();
    if (english) return english;
  } catch {
    // fall through to default name
  }

  return name;
};

export default function Categories({ searchQuery = "" }: CategoriesProps) {
  const { t, i18n } = useTranslation();
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
            translations: item.translations,
          }));

          setCategories(mappedCategories);
        } else {
          setError(response.message || t("add.failedToLoadCategories"));
        }
      } catch (err) {
        setError(t("add.somethingWentWrong"));
      } finally {
        setLoading(false);
      }
    };

    getCategories();
  }, []);

  const localizedCategories = categories.map((category) => ({
    ...category,
    name: resolveCategoryName(category.name, category.translations, i18n.language),
  }));

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredCategories =
    normalizedQuery.length > 0
      ? localizedCategories.filter((category) =>
          category.name.toLowerCase().includes(normalizedQuery),
        )
      : localizedCategories;
  const isSearching = normalizedQuery.length > 0;
  const visibleData = isSearching
    ? filteredCategories
    : expanded
      ? localizedCategories
      : localizedCategories.slice(0, 6);

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
        {!isSearching && localizedCategories.length > 6 && (
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
      ) : visibleData.length === 0 ? (
        <Text style={styles.emptyText}>{t("search.noCategoriesFound")}</Text>
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
  emptyText: {
    color: Colors.secondary300,
    textAlign: "center",
    marginTop: vs(10),
    fontFamily: FONTS.medium,
    fontSize: ms(14),
  },
});
