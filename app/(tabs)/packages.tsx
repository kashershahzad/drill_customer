import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DashedSeparator from "~/components/dashed_seprator";
import Header from "~/components/header";
import { Colors } from "~/constants/Colors";
import { FONTS } from "~/constants/Fonts";
import { apiCall } from "~/utils/api";
import { ms, s, vs } from "~/utils/responsive";

interface Package {
  id: string;
  name: string;
  hours: number;
  price: number;
  features?: string[];
}

export default function Packages() {
  const { t } = useTranslation();
  const [packages, setPackages] = useState<Package[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAvailablePlans();
  }, []);

  const fetchAvailablePlans = async () => {
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("type", "get_data");
      formData.append("table_name", "plans");

      const response = await apiCall(formData);

      console.log("package response", response);
      if (response && response.data) {
        const transformedPlans = response.data.map((plan: any) => ({
          id: plan.id,
          name: plan.name,
          hours: parseInt(plan.hours) || 0,
          price: parseFloat(plan.price) || 0,
          features: plan.features ? JSON.parse(plan.features) : [],
        }));

        setPackages(transformedPlans);

        if (transformedPlans.length > 0 && !selectedPackage) {
          setSelectedPackage(transformedPlans[0]);
        }
      }
    } catch (error) {
      console.error("Error fetching plans:", error);
      setError(t("packages.unableToFetch"));
      Alert.alert(t("error"), t("packages.unableToFetch"));
    } finally {
      setLoading(false);
    }
  };

  const handlePackageSelect = (pkg: Package) => {
    setSelectedPackage(pkg);
  };

  const renderPackageCard = (pkg: Package) => {
    const isSelected = selectedPackage?.id === pkg.id;

    return (
      <TouchableOpacity
        key={pkg.id}
        onPress={() => handlePackageSelect(pkg)}
        style={[styles.packageCard, isSelected && styles.selectedPackageCard]}
        activeOpacity={0.8}
      >
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.packageName}>{pkg.name}</Text>
            <Text style={styles.packageDetails}>
              {pkg.hours} {t("booking.hoursPackage")} {pkg.price.toFixed(2)}
            </Text>
          </View>
          <View style={styles.radioOuter}>
            {isSelected && <View style={styles.radioInner} />}
          </View>
        </View>

        {isSelected && pkg.features && pkg.features.length > 0 && (
          <>
            <DashedSeparator />
            {pkg.features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Text style={styles.bulletPoint}>•</Text>
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Header title={t("packages.packages")} icon={true} />

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={fetchAvailablePlans}
            >
              <Text style={styles.retryButtonText}>{t("retry")}</Text>
            </TouchableOpacity>
          </View>
        ) : packages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {t("packages.noPackagesAvailable")}
            </Text>
          </View>
        ) : (
          <ScrollView>{packages.map(renderPackageCard)}</ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.white },
  container: {
    flex: 1,
    paddingHorizontal: s(16),
    paddingTop: vs(8),
    backgroundColor: Colors.white,
  },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: s(16),
  },
  errorText: {
    fontSize: ms(15),
    color: "red",
    marginBottom: vs(14),
    textAlign: "center",
    fontFamily: FONTS.bold,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: vs(8),
    paddingHorizontal: s(16),
    borderRadius: ms(8),
  },
  retryButtonText: {
    color: Colors.white,
    fontFamily: FONTS.bold,
    fontSize: ms(14),
  },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: {
    fontSize: ms(15),
    color: Colors.secondary,
    textAlign: "center",
    fontFamily: FONTS.bold,
  },
  packageCard: {
    backgroundColor: Colors.primary300,
    padding: s(16),
    borderRadius: ms(10),
    marginBottom: vs(14),
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  selectedPackageCard: { borderWidth: 2, borderColor: Colors.primary },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  packageName: {
    fontSize: ms(17),
    fontFamily: FONTS.bold,
    color: Colors.secondary,
    marginBottom: vs(4),
  },
  packageDetails: {
    fontSize: ms(13),
    color: Colors.secondary,
    fontFamily: FONTS.medium,
  },
  radioOuter: {
    width: s(24),
    height: s(24),
    borderRadius: ms(12),
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: s(14),
    height: s(14),
    borderRadius: ms(7),
    backgroundColor: Colors.primary,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: vs(8),
  },
  bulletPoint: {
    fontSize: ms(15),
    color: Colors.primary,
    marginRight: s(8),
    fontFamily: FONTS.regular,
  },
  featureText: {
    fontSize: ms(13),
    color: Colors.secondary,
    flex: 1,
    lineHeight: ms(20),
    fontFamily: FONTS.regular,
  },
});
