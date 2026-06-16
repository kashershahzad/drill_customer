import Accepted from "@/assets/svgs/Button.svg";
import OTW from "@/assets/svgs/RecordButton.svg";
import Arrived from "@/assets/svgs/TrackButton.svg";
import Profile from "@/assets/svgs/profile-circle.svg";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Animated,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Button from "~/components/button";
import Header from "~/components/header";
import ProviderCard from "~/components/provider_card";
import { Colors } from "~/constants/Colors";
import { FONTS } from "~/constants/Fonts";
import { OrderType } from "~/types/dataTypes";
import { apiCall } from "~/utils/api";
import { ms, s, vs } from "~/utils/responsive";
type LocationStateType = Location.LocationObject;
type MapCoordinate = { latitude: number; longitude: number };

const parseCoordinates = (
  lat?: string | number,
  lng?: string | number,
): MapCoordinate | null => {
  if (lat == null || lng == null || lat === "" || lng === "") return null;

  const latitude = typeof lat === "number" ? lat : parseFloat(lat);
  const longitude = typeof lng === "number" ? lng : parseFloat(lng);

  if (isNaN(latitude) || isNaN(longitude)) return null;

  return { latitude, longitude };
};

const MAP_FIT_PADDING = {
  top: 140,
  right: 80,
  bottom: 380,
  left: 80,
};

const getRegionForCoordinates = (points: MapCoordinate[]) => {
  const lats = points.map((point) => point.latitude);
  const lngs = points.map((point) => point.longitude);

  let minLat = Math.min(...lats);
  let maxLat = Math.max(...lats);
  let minLng = Math.min(...lngs);
  let maxLng = Math.max(...lngs);

  const latSpan = Math.max(maxLat - minLat, 0.008);
  const lngSpan = Math.max(maxLng - minLng, 0.008);
  const latPad = latSpan * 0.45;
  const lngPad = lngSpan * 0.45;

  minLat -= latPad;
  maxLat += latPad;
  minLng -= lngPad;
  maxLng += lngPad;

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(maxLat - minLat, 0.05),
    longitudeDelta: Math.max(maxLng - minLng, 0.05),
  };
};

export default function Track() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<string>("OnTheWay");
  const slideAnim = useRef(new Animated.Value(800)).current;
  const [location, setLocation] = useState<LocationStateType | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOrderLoaded, setIsOrderLoaded] = useState<boolean>(false);
  const [routeCoordinates, setRouteCoordinates] = useState<
    { latitude: number; longitude: number }[]
  >([]);
  const mapRef = useRef<MapView | null>(null);
  const [order, setOrder] = useState<OrderType | null>(null);
  const params = useLocalSearchParams();
  const orderId = useMemo(
    () => params.orderId?.toString() || "",
    [params.orderId],
  );
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(
    null,
  );
  const hasFittedMapRef = useRef(false);
  const GOOGLE_MAPS_API_KEY = "AIzaSyAQiilQ_i4LRPFyMhfLB5ZT3UGMTIxqL0Y";

  // Decode Google polyline to coordinates
  const decodePolyline = (
    encoded: string,
  ): { latitude: number; longitude: number }[] => {
    const poly = [];
    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;

    while (index < len) {
      let b;
      let shift = 0;
      let result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      poly.push({
        latitude: lat * 1e-5,
        longitude: lng * 1e-5,
      });
    }
    return poly;
  };

  // Fetch route from Google Directions API
  const fetchRoute = async (
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number },
  ) => {
    try {
      const originStr = `${origin.latitude},${origin.longitude}`;
      const destinationStr = `${destination.latitude},${destination.longitude}`;

      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destinationStr}&key=${GOOGLE_MAPS_API_KEY}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === "OK" && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const polyline = route.overview_polyline.points;
        const decodedCoordinates = decodePolyline(polyline);
        return decodedCoordinates;
      } else {
        return [origin, destination];
      }
    } catch (error) {
      console.error("❌ Error fetching route:", error);
      // Fallback to straight line on error
      return [origin, destination];
    }
  };

  const getOrderDetails = useCallback(async () => {
    if (isOrderLoaded || !orderId) return;

    setIsLoading(true);
    const formData = new FormData();
    formData.append("type", "get_data");
    formData.append("table_name", "orders");
    formData.append("id", orderId);

    try {
      const response = await apiCall(formData);
      if (response && response.data && response.data.length > 0) {
        const orderData = response.data[0];
        setOrder(orderData);
        setStatus(orderData?.status);
      } else {
        setOrder(null);
      }
    } catch (error) {
      console.error("Failed to fetch order details", error);
      setOrder(null);
    } finally {
      setIsLoading(false);
      setIsOrderLoaded(true); // Mark as loaded to prevent refetching
    }
  }, [orderId, isOrderLoaded]);

  const customerLocation = useMemo((): MapCoordinate | null => {
    return (
      parseCoordinates(order?.lat, order?.lng) ||
      parseCoordinates(order?.user?.lat, order?.user?.lng)
    );
  }, [order]);

  const providerLocation = useMemo((): MapCoordinate | null => {
    if (!location?.coords) return null;

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  }, [location]);

  const mapInitialRegion = useMemo(() => {
    if (providerLocation && customerLocation) {
      return getRegionForCoordinates([providerLocation, customerLocation]);
    }

    if (customerLocation) {
      return {
        ...customerLocation,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      };
    }

    if (providerLocation) {
      return {
        ...providerLocation,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      };
    }

    return {
      latitude: 24.7136,
      longitude: 46.6753,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    };
  }, [providerLocation, customerLocation]);

  const fitMapToPoints = useCallback((points: MapCoordinate[]) => {
    if (!mapRef.current || points.length < 2) return;

    mapRef.current.fitToCoordinates(points, {
      edgePadding: MAP_FIT_PADDING,
      animated: true,
    });
  }, []);

  const fitMapToBothMarkers = useCallback(() => {
    if (!providerLocation || !customerLocation) return;
    fitMapToPoints([providerLocation, customerLocation]);
  }, [providerLocation, customerLocation, fitMapToPoints]);

  const handleMapReady = useCallback(() => {
    fitMapToBothMarkers();
  }, [fitMapToBothMarkers]);

  useEffect(() => {
    if (orderId && !isOrderLoaded) {
      getOrderDetails();
    }
  }, [orderId, getOrderDetails, isOrderLoaded]);

  useEffect(() => {
    hasFittedMapRef.current = false;
  }, [orderId]);

  useEffect(() => {
    // Animate bottom sheet
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start();

    let isMounted = true;

    const setupLocationTracking = async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          if (isMounted) {
            setErrorMsg(t("order.permissionDenied"));
            setIsLoading(false);
          }
          return;
        }

        // Get initial location
        let currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (isMounted) {
          setLocation(currentLocation);
        }

        // Subscribe to location updates - properly store the subscription
        const subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            distanceInterval: 5, // Update every 5 meters
            timeInterval: 5000, // Or every 5 seconds
          },
          (newLocation) => {
            if (isMounted) {
              setLocation(newLocation);
            }
          },
        );

        // Store the subscription reference
        locationSubscriptionRef.current = subscription;
      } catch (error) {
        console.error("Error getting location:", error);
        if (isMounted) {
          setErrorMsg(t("order.failedToGetLocation"));
          setIsLoading(false);
        }
      }
    };

    setupLocationTracking();

    return () => {
      isMounted = false;
      // Use the ref for cleanup instead of the variable
      if (locationSubscriptionRef.current) {
        locationSubscriptionRef.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (!providerLocation || !customerLocation) return;

    const timers = [300, 1000, 1800].map((delay) =>
      setTimeout(fitMapToBothMarkers, delay),
    );

    return () => timers.forEach(clearTimeout);
  }, [providerLocation, customerLocation, orderId, fitMapToBothMarkers]);

  useEffect(() => {
    if (!providerLocation || !customerLocation) return;

    let cancelled = false;

    const loadRoute = async () => {
      try {
        const routeCoords = await fetchRoute(
          providerLocation,
          customerLocation,
        );

        if (cancelled) return;

        setRouteCoordinates(routeCoords);

        const fitPoints =
          routeCoords.length > 2
            ? routeCoords
            : [providerLocation, customerLocation];

        setTimeout(() => {
          if (!cancelled) {
            fitMapToPoints(fitPoints);
          }
        }, 500);
      } catch (error) {
        console.error("Error loading route:", error);
        if (!cancelled) {
          setRouteCoordinates([providerLocation, customerLocation]);
          fitMapToBothMarkers();
        }
      }
    };

    loadRoute();

    return () => {
      cancelled = true;
    };
  }, [
    providerLocation,
    customerLocation,
    orderId,
    fitMapToBothMarkers,
    fitMapToPoints,
  ]);

  if (isLoading && !errorMsg && !order) {
    return (
      <View style={styles.fullScreenLoading}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>{t("order.loadingOrderDetails")}</Text>
      </View>
    );
  }
  return (
    <SafeAreaProvider style={styles.container}>
      {/* Map View */}
      {isLoading && !order ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>{t("order.gettingLocation")}</Text>
        </View>
      ) : errorMsg ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorMsg}</Text>
          <Button
            title={t("goBack")}
            onPress={() => router.back()}
            variant="primary"
          />
        </View>
      ) : (
        <View style={{ height: "70%" }}>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            initialRegion={mapInitialRegion}
            showsUserLocation={true}
            showsMyLocationButton={false}
            onMapReady={handleMapReady}
          >
            {providerLocation && (
              <Marker
                coordinate={providerLocation}
                title={t("order.onTheWay")}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View style={styles.providerMarkerContainer}>
                  <Ionicons name="navigate" size={10} color="#fff" />
                </View>
              </Marker>
            )}

            {customerLocation && (
              <Marker
                coordinate={customerLocation}
                title={order?.user?.name || t("order.customer")}
                description={
                  order?.address ||
                  order?.user?.address ||
                  t("order.customerLocation")
                }
              >
                <View style={styles.providerMarkerContainer2}>
                  <Ionicons name="person" size={10} color="#fff" />
                </View>
              </Marker>
            )}

            {routeCoordinates.length > 1 && (
              <Polyline
                coordinates={routeCoordinates}
                strokeWidth={5}
                strokeColor={Colors.primary}
                geodesic
                lineCap="round"
                lineJoin="round"
                zIndex={1}
              />
            )}
          </MapView>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <Header
          backBtn={true}
          title={t("order.trackCustomer")}
          icon={true}
          support={true}
        />
      </View>

      {/* Animated Bottom Sheet */}
      <Animated.View
        style={[
          styles.contentWrapper,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={styles.contentHeader}>
          <Profile />
          <Text style={styles.title}>{t("order.estimatedArrival")}</Text>
        </View>
        <View style={styles.content}>
          {/* Status Tracking */}
          <View style={styles.statusContainer}>
            <View style={styles.statusItem}>
              <Accepted width={40} height={40} />
              <Text style={styles.statusText}>
                {t("order.orderAcceptedStatus")}
              </Text>
            </View>
            <View style={styles.line} />
            <View style={styles.statusItem}>
              <OTW width={40} height={40} />
              <Text
                style={[
                  styles.statusText,
                  status === "OnTheWay" ? styles.activeStatusText : {},
                ]}
              >
                {t("order.onTheWay")}
              </Text>
            </View>
            <View
              style={[
                styles.line,
                status === "Arrived" ? styles.line : styles.lineInactive,
              ]}
            />
            <View style={styles.statusItem}>
              <Arrived width={40} height={40} />
              <Text
                style={[
                  styles.statusText,
                  status === "Arrived" ? styles.activeStatusText : {},
                ]}
              >
                {t("order.arrived")}
              </Text>
            </View>
          </View>

          {order && <ProviderCard order={order} />}
        </View>
      </Animated.View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  map: { ...StyleSheet.absoluteFillObject },
  fullScreenLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.white,
  },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: {
    marginTop: vs(10),
    fontSize: ms(15),
    fontFamily: FONTS.regular,
    color: Colors.primary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: s(18),
  },
  errorText: {
    fontSize: ms(15),
    fontFamily: FONTS.regular,
    color: "red",
    textAlign: "center",
    marginBottom: vs(18),
  },
  header: { paddingTop: vs(50), paddingHorizontal: s(16) },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: s(14),
    backgroundColor: Colors.gray100,
    borderRadius: ms(14),
    marginVertical: vs(16),
  },
  statusItem: { alignItems: "center" },
  statusText: {
    fontSize: ms(11),
    fontFamily: FONTS.regular,
    color: Colors.gray300,
    textAlign: "center",
    marginTop: vs(12),
  },
  statusText2: {
    fontSize: ms(11),
    fontFamily: FONTS.regular,
    color: Colors.gray300,
    textAlign: "center",
  },
  activeStatusText: { color: Colors.primary, fontFamily: FONTS.semiBold },
  line: {
    height: vs(3),
    flex: 1,
    borderRadius: 99,
    backgroundColor: Colors.primary,
    marginHorizontal: s(7),
  },
  lineInactive: {
    height: vs(3),
    flex: 1,
    borderRadius: 99,
    backgroundColor: Colors.primary100,
    marginHorizontal: s(7),
  },
  contentWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderTopLeftRadius: ms(35),
    borderTopRightRadius: ms(35),
    width: "100%",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    overflow: "hidden",
    maxHeight: "60%",
    paddingBottom: vs(40),
  },
  contentHeader: {
    backgroundColor: Colors.primary,
    paddingVertical: vs(14),
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: s(6),
  },
  title: {
    color: Colors.white,
    fontSize: ms(12),
    fontFamily: FONTS.semiBold,
    textAlign: "center",
    maxWidth: "80%",
  },
  content: { paddingHorizontal: s(16) },
  buttonContainer: {
    padding: s(14),
    paddingBottom: Platform.OS === "ios" ? vs(30) : vs(16),
  },
  centerButtonContainer: {
    position: "absolute",
    bottom: vs(300),
    right: s(20),
    zIndex: 10,
  },
  centerButton: {
    backgroundColor: "white",
    padding: s(10),
    borderRadius: ms(30),
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  // markerContainer: {
  //   backgroundColor: Colors.primary,
  //   borderRadius: ms(20),
  //   padding: s(8),
  //   borderWidth: 2,
  //   borderColor: Colors.white,
  // },
  providerMarkerContainer: {
    backgroundColor: Colors.secondary,
    borderRadius: ms(20),
    padding: s(8),
    borderWidth: 2,
    borderColor: Colors.white,
  },
  providerMarkerContainer2: {
    backgroundColor: Colors.primary,
    borderRadius: ms(20),
    padding: s(8),
    borderWidth: 2,
    borderColor: Colors.white,
  },

  noOrderContainer: {
    padding: s(18),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.gray100,
    borderRadius: ms(8),
  },
  noOrderText: {
    fontSize: ms(15),
    fontFamily: FONTS.regular,
    color: Colors.gray300,
  },
  arrived: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: s(16),
    paddingVertical: vs(20),
    gap: vs(18),
  },
  arrivedTitle: {
    fontSize: ms(21),
    color: Colors.secondary,
    fontFamily: FONTS.bold,
    marginTop: vs(10),
  },
  arrivedText: {
    fontSize: ms(16),
    fontFamily: FONTS.regular,
    paddingHorizontal: s(16),
    marginBottom: vs(10),
    textAlign: "center",
  },
});
