import Location from "@/assets/svgs/locationIcon.svg";
import { Colors } from "@/constants/Colors";
import * as LocationService from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { FONTS } from "~/constants/Fonts";
import { ms, s, vs } from "~/utils/responsive";

type Category = {
  id: string;
  image: string;
  name: string;
};

type Prop = {
  onSelectLocation?: (
    location: string,
    coordinates?: { latitude: number; longitude: number },
  ) => void;
  selectedLocation?: any;
  disabled?: boolean;
  category: Category;
};

export default function SelectedLocation({
  category,
  onSelectLocation,
  selectedLocation,
  disabled = false,
}: Prop) {
  const params = useLocalSearchParams();
  const { t } = useTranslation();
  const [address, setAddress] = useState<string | null>(
    selectedLocation || params?.location || null,
  );
  const [isLoadingLocation, setIsLoadingLocation] = useState<boolean>(false);
  console.log("address", address);
  useEffect(() => {
    const checkLocationPermission = async () => {
      try {
        if (address) return;

        setIsLoadingLocation(true);

        let { status } =
          await LocationService.requestForegroundPermissionsAsync();

        if (status !== "granted") {
          console.log("Location permission denied");
          setIsLoadingLocation(false);
          return;
        }

        const location = await LocationService.getCurrentPositionAsync({
          accuracy: LocationService.Accuracy.Balanced,
        });

        const geocodedAddress = await reverseGeocodeLocation(
          location.coords.latitude,
          location.coords.longitude,
        );

        if (geocodedAddress) {
          setAddress(geocodedAddress);
          if (onSelectLocation && !disabled) {
            onSelectLocation(geocodedAddress, {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            });
          }
        }
      } catch (error) {
        console.error("Error getting location:", error);
        Alert.alert(
          t("booking.locationError"),
          t("booking.unableToRetrieveLocation"),
        );
      } finally {
        setIsLoadingLocation(false);
      }
    };

    checkLocationPermission();
  }, []);

  // Function to convert coordinates to address
  const reverseGeocodeLocation = async (
    latitude: number,
    longitude: number,
  ): Promise<string | null> => {
    try {
      const reverseGeocode = await LocationService.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (reverseGeocode && reverseGeocode.length > 0) {
        const location = reverseGeocode[0];
        // Format the address based on available data
        const addressParts = [
          location.name,
          location.street,
          location.district,
          location.city,
          location.region,
          location.postalCode,
          location.country,
        ].filter(Boolean);

        return addressParts.join(", ");
      }
      return null;
    } catch (error) {
      console.error("Error in reverse geocoding:", error);
      return null;
    }
  };

  // Handle route params for location
  useEffect(() => {
    if (params?.location) {
      const locationString = params.location as string;
      setAddress(locationString);
      if (onSelectLocation && !disabled) {
        onSelectLocation(locationString);
      }
    }
  }, [params.location, onSelectLocation, disabled]);

  const handleLocation = () => {
    if (!disabled) {
      router.push({
        pathname: "/booking/location",
        params: {
          location: address,
          categoryId: category.id,
          categoryName: category.name,
          categoryImage: category.image,
          // Pass through schedule parameters if they exist
          service_type: params.service_type,
          schedule_date: params.schedule_date,
          schedule_time: params.schedule_time,
          // Pass through other booking parameters
          selectedImage: params.selectedImage,
          description: params.description,
        },
      });
    }
  };

  return (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>{t("booking.location")}</Text>
        {!disabled && (
          <TouchableOpacity onPress={handleLocation}>
            <Text style={styles.changeText}>{t("change")}</Text>
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity
        style={styles.locationContainer}
        onPress={!disabled ? handleLocation : undefined}
        disabled={disabled || isLoadingLocation}
      >
        <View style={styles.iconWrapper}>
          <Location />
        </View>
        <Text style={styles.address}>
          {isLoadingLocation
            ? t("gettingLocation")
            : address || t("selectLocation")}
        </Text>
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: vs(14),
  },
  title: {
    fontSize: ms(17),
    fontFamily: FONTS.semiBold,
    color: Colors.secondary,
  },
  changeText: {
    fontSize: ms(13),
    fontFamily: FONTS.regular,
    color: Colors.primary,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary300,
    paddingHorizontal: s(14),
    paddingVertical: vs(14),
    borderRadius: ms(10),
  },
  iconWrapper: {
    backgroundColor: "white",
    borderRadius: ms(12),
    padding: s(10),
  },
  address: {
    marginLeft: s(14),
    color: Colors.secondary300,
    flex: 1,
    fontSize: ms(14),
  },
  disabledText: {
    color: Colors.secondary300,
    fontSize: ms(12),
    fontFamily: FONTS.regular,
    marginTop: vs(8),
    textAlign: "center",
  },
});
