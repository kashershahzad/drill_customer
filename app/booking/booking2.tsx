import Appwallet from "@/assets/images/appwallet.png";
import Cashonpay from "@/assets/images/cop.png";
import Visa from "@/assets/images/visa.png";
import Button from "@/components/button";
import Header from "@/components/header";
import Seprator from "@/components/seprator";
import Stepper from "@/components/stepper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DashedSeparator from "~/components/dashed_seprator";
import { Colors } from "~/constants/Colors";
import { FONTS } from "~/constants/Fonts";
import { apiCall } from "~/utils/api";
import { BOOKING_PAY_LATER_KEY } from "~/utils/booking";
import { ms, s, vs } from "~/utils/responsive";

interface Package {
  id: string;
  name: string;
  hours: number;
  price: number;
  features?: string[];
}

export default function Booking2Screen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams();

  // Payment methods - IDs are used for backend, names are translated for display

  // State for packages and selections
  const [packages, setPackages] = useState<Package[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);

  const paymentMethods = useMemo(
    () => [
      { id: "visa", image: Visa, name: t("booking.visacard") },
      { id: "wallet", image: Appwallet, name: t("booking.appwallet") },
      { id: "cash", image: Cashonpay, name: t("booking.cashonpay") },
    ],
    [t],
  );

  const categoryId = String(params.id || "");

  // Fetch available packages for selected category
  useEffect(() => {
    if (categoryId) {
      fetchAvailablePlans(categoryId);
    }
  }, [categoryId]);

  const fetchAvailablePlans = async (catId: string) => {
    try {
      const formData = new FormData();
      formData.append("type", "get_data");
      formData.append("table_name", "plans");
      formData.append("cat_id", catId);

      console.log("catId", catId);

      const response = await apiCall(formData);
      if (response && response.data) {
        // Transform the response to match Package interface
        const transformedPlans = response.data.map((plan: any) => ({
          id: plan.id,
          name: plan.name,
          hours: plan.hours,
          price: plan.price,
          features: plan.features ? JSON.parse(plan.features) : [],
        }));
        setPackages(transformedPlans);
      }
    } catch (error) {
      console.error("Error fetching plans:", error);
      Alert.alert(t("error"), t("booking.unableToFetchPackages"));
    }
  };

  const proceedToConfirm = async (payLater = false) => {
    if (!selectedPackage) {
      Alert.alert(
        t("booking.selectPackageRequired"),
        t("booking.pleaseSelectPackage"),
      );
      return;
    }

    if (!payLater && !selectedPayment) {
      Alert.alert(
        t("booking.selectPackageRequired"),
        t("booking.pleaseSelectPayment"),
      );
      return;
    }

    let finalLat = params.latitude;
    let finalLng = params.longitude;

    if (!finalLat || !finalLng) {
      try {
        const storedLat = await AsyncStorage.getItem("latitude");
        const storedLng = await AsyncStorage.getItem("longitude");
        finalLat = storedLat || "";
        finalLng = storedLng || "";
      } catch (error) {
        console.error("❌ Error getting location from AsyncStorage:", error);
      }
    }

    if (!finalLat || !finalLng) {
      Alert.alert(t("error"), t("booking.locationRequiredGoBack"));
      return;
    }

    const selectedPaymentMethod = paymentMethods.find(
      (method) => method.id === selectedPayment,
    );

    if (payLater) {
      await AsyncStorage.setItem(BOOKING_PAY_LATER_KEY, "1");
    } else {
      await AsyncStorage.removeItem(BOOKING_PAY_LATER_KEY);
    }

    const isTapPayment = selectedPayment === "visa";

    router.push({
      pathname: "/booking/confrimBooking",
      params: {
        id: params.id,
        name: params.name,
        image: params.image,
        location: params.location,
        selectedImage: params.selectedImage,
        description: params.description,
        latitude: finalLat,
        longitude: finalLng,
        service_type: params.service_type,
        schedule_date: params.schedule_date,
        schedule_time: params.schedule_time,
        packageId: selectedPackage.id,
        packageName: selectedPackage.name,
        packageHours: selectedPackage.hours,
        packagePrice: selectedPackage.price,
        paymentMethod: payLater
          ? t("later")
          : selectedPaymentMethod?.name || "",
        paymentMethodDetails: payLater
          ? selectedPayment || "later"
          : selectedPayment || "",
        payLater: payLater ? "1" : "0",
        autoPay: !payLater && isTapPayment ? "1" : "0",
      },
    });
  };

  const handleLater = () => proceedToConfirm(true);

  const handleNext = () => proceedToConfirm();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.innerContainer}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Header backBtn={true} title={t("booking.bookService")} />
          <Stepper step={true} />

          {/* Select Package */}
          <Text style={styles.sectionTitle}>{t("booking.selectpackage")}</Text>
          {packages.map((pkg) => (
            <TouchableOpacity
              key={pkg.id}
              onPress={() => setSelectedPackage(pkg)}
              style={[
                styles.packageCard,
                selectedPackage?.id === pkg.id && styles.selectedPackageCard,
              ]}
            >
              <View style={styles.rowBetween}>
                <View>
                  <Text style={styles.packageName}>{pkg.name}</Text>
                  <Text style={styles.packageDetails}>
                    {pkg.hours} {t("booking.hoursPackage")} {pkg.price}
                  </Text>
                </View>
                <View style={styles.radioOuter}>
                  {selectedPackage?.id === pkg.id && (
                    <View style={styles.radioInner} />
                  )}
                </View>
              </View>
              {selectedPackage?.id === pkg.id && pkg.features && (
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
          ))}

          <Seprator />

          <Text style={styles.sectionTitle}>{t("booking.paymentmethod")}</Text>

          {paymentMethods.map((method) => (
            <TouchableOpacity
              key={method.id}
              onPress={() => setSelectedPayment(method.id)}
              style={styles.paymentCard}
            >
              <View style={styles.row}>
                <Image source={method.image} style={styles.paymentImage} />
                <Text style={styles.paymentName}>{method.name}</Text>
              </View>
              <View style={styles.radioOuter}>
                {selectedPayment === method.id && (
                  <View style={styles.radioInner} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <Button
            title={t("later")}
            onPress={handleLater}
            variant="secondary"
            fullWidth={false}
            width="29%"
          />
          <Button
            title={t("payadvance")}
            onPress={handleNext}
            fullWidth={false}
            width="69%"
            variant="primary"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  innerContainer: { flex: 1, paddingHorizontal: s(16), paddingTop: vs(8) },
  sectionTitle: {
    fontSize: ms(17),
    fontFamily: FONTS.semiBold,
    marginBottom: vs(12),
    color: Colors.secondary,
  },
  packageCard: {
    backgroundColor: Colors.primary300,
    padding: s(14),
    borderRadius: ms(10),
    marginBottom: vs(10),
  },
  selectedPackageCard: { borderWidth: 2, borderColor: Colors.primary },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  packageName: {
    fontSize: ms(15),
    fontFamily: FONTS.semiBold,
    color: Colors.secondary,
  },
  packageDetails: { fontSize: ms(13), color: Colors.secondary },
  paymentCard: {
    backgroundColor: Colors.primary300,
    paddingHorizontal: s(14),
    paddingVertical: vs(12),
    borderRadius: ms(10),
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: vs(10),
  },
  row: { flexDirection: "row", alignItems: "center", gap: s(14) },
  paymentImage: { width: s(38), height: s(38), resizeMode: "contain" },
  paymentName: { fontSize: ms(15), color: "#333", fontFamily: FONTS.regular },
  radioOuter: {
    width: s(22),
    height: s(22),
    borderRadius: ms(11),
    borderWidth: 2,
    borderColor: "#666",
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: s(12),
    height: s(12),
    borderRadius: ms(6),
    backgroundColor: "#007AFF",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: vs(14),
    marginBottom: vs(14),
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: vs(4),
  },
  bulletPoint: { fontSize: ms(15), color: Colors.primary, marginRight: s(6) },
  featureText: {
    fontSize: ms(13),
    color: Colors.secondary,
    fontFamily: FONTS.regular,
  },
  marginBottom: { marginBottom: vs(12) },
});
