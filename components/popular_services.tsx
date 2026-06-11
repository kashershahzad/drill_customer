import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { Colors } from "~/constants/Colors";
import { FONTS } from "~/constants/Fonts";
import { apiCall } from "~/utils/api";
import { ms, s, vs } from "~/utils/responsive";
import ServiceCard from "./service_card";

type Service = {
  id: string;
  image: string;
  title: string;
  rating: number;
  reviews: number;
  price: number;
  provider: string;
  providerImage?: string;
};

type ApiService = {
  id: string;
  image: string;
  name: string;
  rating: number;
  reviews: number;
  price: string;
  company_name: string;
  banners: string;
  status: string;
  timestamp: string;
  translations: string;
};

const toServiceCardItem = (item: Service) => ({
  ...item,
  image: { uri: item.image },
  providerImage: item.providerImage
    ? { uri: item.providerImage }
    : require("@/assets/images/user.png"),
  rating: String(item.rating),
  reviews: String(item.reviews),
});

export default function PopularServices() {
  const { t } = useTranslation();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const IMAGE_BASE_URL = "https://7tracking.com/saudiservices/images/";

  useEffect(() => {
    const getCategories = async () => {
      try {
        setLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append("type", "home");

        const response = await apiCall(formData);
        console.log("response", response);

        if (response?.data) {
          const transformedServices: Service[] = response.data.map(
            (apiService: ApiService) => ({
              id: apiService.id,
              image: `${IMAGE_BASE_URL}${apiService.image}`,
              title: apiService.name,
              rating: apiService.rating || 0,
              reviews: apiService.reviews || 0,
              price: parseFloat(apiService.price) || 0,
              provider: apiService.company_name || t("popularServices.serviceProvider"),
              providerImage: apiService.banners
                ? `${IMAGE_BASE_URL}${apiService.banners}`
                : undefined,
            })
          );
          setServices(transformedServices);
        }
      } catch (err) {
        setError(t("add.somethingWentWrong"));
        console.error("API Error:", err);
      } finally {
        setLoading(false);
      }
    };

    getCategories();
  }, []);

  return (
    <View>
      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.headerText}>{t("popularservices")}</Text>
        {/* <Text style={styles.seeAllText}>See All</Text> */}
      </View>

      {/* Loading State */}
      {loading && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t("loadingservices")}</Text>
        </View>
      )}

      {/* Error State */}
      {error && services.length === 0 && !loading && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Services List */}
      {!loading && (
        <FlatList
          data={services}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          nestedScrollEnabled={true}
          renderItem={({ item }) => (
            <ServiceCard item={toServiceCardItem(item)} />
          )}
          ListEmptyComponent={
            !error && services.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>{t("popularServices.noServicesAvailable")}</Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: vs(14),
  },
  headerText: {
    fontSize: ms(17),
    fontFamily: FONTS.bold,
    color: Colors.secondary,
  },
  seeAllText: {
    color: Colors.primary,
    fontSize: ms(14),
  },
  loadingContainer: {
    padding: s(20),
    alignItems: "center",
  },
  loadingText: {
    color: Colors.secondary,
    fontSize: ms(15),
  },
  errorContainer: {
    padding: s(20),
    alignItems: "center",
  },
  errorText: {
    color: "red",
    fontSize: ms(15),
    textAlign: "center",
  },
  emptyContainer: {
    padding: s(20),
    alignItems: "center",
  },
  emptyText: {
    color: Colors.secondary,
    fontSize: ms(15),
    textAlign: "center",
  },
});
