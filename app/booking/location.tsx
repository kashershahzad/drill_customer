import Button from "@/components/button";
import { Colors } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Region } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { getInputFontSize, inputFieldStyles } from "~/components/inputfield";
import { FONTS } from "~/constants/Fonts";
import { DEFAULT_LOCATION } from "~/utils/location";
import { ms, s, vs } from "~/utils/responsive";

export default function LocationScreen() {
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const { t } = useTranslation();
  const mapRef = useRef(null);
  const [manualLocation, setManualLocation] = useState(false);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    address?: string;
    latitude?: number;
    longitude?: number;
  }>({
    address: (params?.location as string) || "",
    latitude: params?.latitude
      ? parseFloat(params.latitude as string)
      : undefined,
    longitude: params?.longitude
      ? parseFloat(params.longitude as string)
      : undefined,
  });

  const fetchAddressFromCoords = async (
    latitude: number,
    longitude: number
  ) => {
    try {
      const geocode = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });
      if (geocode.length > 0) {
        const { name, street, city, region, country } = geocode[0];
        const address = `${name || ""} ${street || ""}, ${city || ""}, ${
          region || ""
        }, ${country || ""}`;
        setSelectedLocation((prev) => ({ ...prev, address }));
      }
    } catch (error) {
      console.error("Failed to fetch address:", error);
    }
  };

  // New function to geocode a manual address
  const geocodeAddress = async (address: string) => {
    if (!address.trim()) return;

    try {
      setSearchingAddress(true);
      const geocode = await Location.geocodeAsync(address);

      if (geocode.length > 0) {
        const { latitude, longitude } = geocode[0];

        setSelectedLocation({
          address,
          latitude,
          longitude,
        });

        // Animate map to the geocoded location
        mapRef.current?.animateToRegion({
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      } else {
        Alert.alert(
          t("booking.locationError"),
          t("booking.couldNotFindLocation")
        );
      }
    } catch (error) {
      console.error("Failed to geocode address:", error);
      Alert.alert(
        t("error"),
        t("booking.failedToFindAddress")
      );
    } finally {
      setSearchingAddress(false);
    }
  };

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setSelectedLocation({
          latitude: parseFloat(DEFAULT_LOCATION.latitude),
          longitude: parseFloat(DEFAULT_LOCATION.longitude),
          address: DEFAULT_LOCATION.address,
        });
        return;
      }

      // If we already have coordinates from params, use them
      if (params?.latitude && params?.longitude) {
        const latitude = parseFloat(params.latitude as string);
        const longitude = parseFloat(params.longitude as string);

        setSelectedLocation({
          latitude,
          longitude,
          address: (params?.location as string) || t("booking.fetchingAddress"),
        });

        if (!params?.location) {
          fetchAddressFromCoords(latitude, longitude);
        }

        mapRef.current?.animateToRegion({
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });

        return;
      }

      // Try to get from AsyncStorage first
      try {
        const storedLat = await AsyncStorage.getItem("latitude");
        const storedLng = await AsyncStorage.getItem("longitude");
        
        if (storedLat && storedLng) {
          const latitude = parseFloat(storedLat);
          const longitude = parseFloat(storedLng);
          
          // Validate parsed values
          if (!isNaN(latitude) && !isNaN(longitude)) {
            setSelectedLocation({
              latitude,
              longitude,
              address: t("booking.fetchingAddress"),
            });
            
            fetchAddressFromCoords(latitude, longitude);
            
            mapRef.current?.animateToRegion({
              latitude,
              longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            });
            return;
          }
        }
      } catch (error) {
        console.error("Error getting stored location:", error);
      }

      // Otherwise get current location
      try {
        const location = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = location.coords;

        setSelectedLocation({
          latitude,
          longitude,
          address: t("booking.fetchingAddress"),
        });

        fetchAddressFromCoords(latitude, longitude);

        mapRef.current?.animateToRegion({
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      } catch (error) {
        console.error("Error getting current location:", error);
        setSelectedLocation({
          latitude: parseFloat(DEFAULT_LOCATION.latitude),
          longitude: parseFloat(DEFAULT_LOCATION.longitude),
          address: DEFAULT_LOCATION.address,
        });
      }
    })();
  }, []);

  const handleRegionChange = (region: Region) => {
    setSelectedLocation({
      latitude: region.latitude,
      longitude: region.longitude,
      address: t("booking.fetchingAddress"),
    });
    fetchAddressFromCoords(region.latitude, region.longitude);
  };

  const centerToUserLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({});
      mapRef.current?.animateToRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    } catch (error) {
      console.error("Error getting current location:", error);
      Alert.alert(t("error"), t("booking.couldNotAccessLocation"));
    }
  };

  const handleManualAddressChange = (text: string) => {
    setSelectedLocation((prev) => ({
      ...prev,
      address: text,
    }));
  };

  const handleSearchAddress = () => {
    if (selectedLocation.address) {
      geocodeAddress(selectedLocation.address);
    }
  };

  const handleConfirm = async () => {
    if (
      !selectedLocation.address ||
      !selectedLocation.latitude ||
      !selectedLocation.longitude
    ) {
      Alert.alert(t("error"), t("booking.pleaseSelectValidLocation"));
      return;
    }

    // Save customer location to AsyncStorage
    try {
      await AsyncStorage.setItem("latitude", selectedLocation.latitude.toString());
      await AsyncStorage.setItem("longitude", selectedLocation.longitude.toString());
    } catch (error) {
      console.error("❌ Error saving location to AsyncStorage:", error);
    }

    const newParams = { ...params };

    // Update location data
    newParams.location = selectedLocation.address;
    newParams.latitude = selectedLocation.latitude.toString();
    newParams.longitude = selectedLocation.longitude.toString();

    // Preserve schedule parameters if they exist
    if (params.service_type) {
      newParams.service_type = params.service_type as string;
    }
    if (params.schedule_date) {
      newParams.schedule_date = params.schedule_date as string;
    }
    if (params.schedule_time) {
      newParams.schedule_time = params.schedule_time as string;
    }

    // Preserve other booking parameters
    if (params.selectedImage) {
      newParams.selectedImage = params.selectedImage as string;
    }
    if (params.description) {
      newParams.description = params.description as string;
    }

    router.push({ pathname: "/booking", params: newParams });
  };

  const toggleLocation = () => setManualLocation((prev) => !prev);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color="black" />
          </TouchableOpacity>
          <Text style={styles.headerText}>{t("booking.selectLocation")}</Text>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={centerToUserLocation}
          >
            <Ionicons name="location-outline" size={24} color="black" />
          </TouchableOpacity>
        </View>

        {manualLocation && (
          <View style={styles.searchContainer}>
            <TextInput
              style={[
                styles.input,
                { fontSize: getInputFontSize(selectedLocation.address) },
              ]}
              placeholder={t("booking.enterAddressManually")}
              placeholderTextColor={Colors.secondary300}
              value={selectedLocation.address || ""}
              onChangeText={handleManualAddressChange}
              multiline={true}
              numberOfLines={3}
            />
            <TouchableOpacity
              style={styles.searchButton}
              onPress={handleSearchAddress}
              disabled={searchingAddress || !selectedLocation.address}
            >
              <Text style={styles.searchButtonText}>
                {searchingAddress ? t("booking.searching") : t("booking.search")}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={{
              latitude: selectedLocation.latitude || 24.7136, // Riyadh, Saudi Arabia default
              longitude: selectedLocation.longitude || 46.6753,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            onRegionChangeComplete={handleRegionChange}
            showsUserLocation={true}
            showsMyLocationButton={true}
          />
          {/* Fixed Marker Icon */}
          <Ionicons
            name="location-sharp"
            size={32}
            color={Colors.primary}
            style={styles.markerFixed}
          />
        </View>

        <View style={styles.addressContainer}>
          <Text style={styles.addressTitle}>{t("booking.selectedAddress")}</Text>
          <Text style={styles.addressText}>
            {selectedLocation.address || t("booking.noLocationSelected")}
          </Text>
          {selectedLocation.latitude && selectedLocation.longitude && (
            <Text style={styles.coordsText}>
              {`Lat: ${selectedLocation.latitude.toFixed(
                6
              )}, Lng: ${selectedLocation.longitude.toFixed(6)}`}
            </Text>
          )}
        </View>
      </ScrollView>

      <TouchableOpacity
        onPress={centerToUserLocation}
        style={styles.myLocationButton}
      >
        <Ionicons name="locate" size={24} color={Colors.primary} />
      </TouchableOpacity>

      <View style={styles.buttonContainer}>
        <Button
          title={t("booking.confirmLocation")}
          onPress={handleConfirm}
          disabled={
            !selectedLocation.address ||
            !selectedLocation.latitude ||
            !selectedLocation.longitude
          }
        />
        <Button
          variant="secondary"
          textColor={Colors.primary}
          title={manualLocation ? t("booking.useMapInstead") : t("booking.enterLocationManually")}
          onPress={toggleLocation}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white", justifyContent: "space-between" },
  scrollContainer: { paddingHorizontal: s(16), paddingTop: vs(8) },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: vs(18) },
  backButton: { minWidth: s(44), minHeight: s(44), justifyContent: "center", alignItems: "center", backgroundColor: Colors.gray100, padding: s(10), borderRadius: ms(22) },
  headerText: { fontSize: ms(22), fontFamily: FONTS.semiBold, color: Colors.secondary },
  iconButton: { minWidth: s(44), minHeight: s(44), justifyContent: "center", alignItems: "center", padding: s(10) },
  mapContainer: { borderRadius: ms(16), overflow: "hidden", marginBottom: vs(14), height: vs(380) },
  map: { width: "100%", height: "100%" },
  markerFixed: { position: "absolute", top: "50%", left: "50%", marginLeft: -s(16), marginTop: -s(32), zIndex: 10 },
  myLocationButton: { position: "absolute", bottom: vs(100), right: s(20), minWidth: s(44), minHeight: s(44), justifyContent: "center", alignItems: "center", backgroundColor: Colors.white, padding: s(10), borderRadius: ms(22), elevation: 3, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1.41 },
  addressContainer: { backgroundColor: Colors.secondary200, padding: s(14), borderRadius: ms(10), marginTop: vs(14) },
  addressTitle: { fontSize: ms(17), fontFamily: FONTS.medium },
  addressText: { color: Colors.secondary300, marginTop: vs(4), fontSize: ms(13) },
  coordsText: { color: Colors.secondary300, marginTop: vs(4), fontSize: ms(11), fontStyle: "italic" },
  searchContainer: { marginBottom: vs(14) },
  input: {
    ...inputFieldStyles.field,
    marginBottom: vs(7),
    textAlignVertical: "top",
  },
  searchButton: { backgroundColor: Colors.primary, padding: s(12), borderRadius: ms(8), alignItems: "center" },
  searchButtonText: { color: Colors.white, fontFamily: FONTS.semiBold, fontSize: ms(14) },
  buttonContainer: { paddingHorizontal: s(16), paddingVertical: vs(10), gap: vs(8) },
});
