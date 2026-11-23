import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { calculateDistance } from "~/utils/distance";

/** Madinah Al-Munawwarah center (Al-Masjid an-Nabawi). */
export const SERVICE_AREA_CENTER = {
  latitude: 24.4672,
  longitude: 39.6111,
};

/** Approx. greater Madinah urban coverage (~40 km). */
export const SERVICE_AREA_RADIUS_METERS = 40000;

/** Default map / fallback coords — Madinah only. */
export const DEFAULT_LOCATION = {
  latitude: String(SERVICE_AREA_CENTER.latitude),
  longitude: String(SERVICE_AREA_CENTER.longitude),
  address: "Madinah, Saudi Arabia",
};

/**
 * Returns true when coordinates fall inside the Madinah service area.
 */
export const isWithinServiceArea = (
  latitude: number | string | null | undefined,
  longitude: number | string | null | undefined,
): boolean => {
  const lat = typeof latitude === "string" ? parseFloat(latitude) : latitude;
  const lng =
    typeof longitude === "string" ? parseFloat(longitude) : longitude;

  if (
    lat == null ||
    lng == null ||
    Number.isNaN(lat) ||
    Number.isNaN(lng)
  ) {
    return false;
  }

  const distance = calculateDistance(
    SERVICE_AREA_CENTER.latitude,
    SERVICE_AREA_CENTER.longitude,
    lat,
    lng,
  );

  return distance <= SERVICE_AREA_RADIUS_METERS;
};

/**
 * Resolves the user's current/stored booking coordinates and checks Madinah coverage.
 * Returns null when coordinates cannot be determined.
 */
export const getUserServiceAreaStatus = async (): Promise<{
  latitude: number;
  longitude: number;
  inServiceArea: boolean;
} | null> => {
  try {
    const storedLat = await AsyncStorage.getItem("latitude");
    const storedLng = await AsyncStorage.getItem("longitude");
    if (storedLat && storedLng) {
      const latitude = parseFloat(storedLat);
      const longitude = parseFloat(storedLng);
      if (!Number.isNaN(latitude) && !Number.isNaN(longitude)) {
        const inServiceArea = isWithinServiceArea(latitude, longitude);
        if (!inServiceArea) {
          try {
            await AsyncStorage.multiRemove(["latitude", "longitude"]);
          } catch {
            // ignore
          }
        }
        return {
          latitude,
          longitude,
          inServiceArea,
        };
      }
    }
  } catch (error) {
    console.warn("Failed reading stored location:", error);
  }

  try {
    const existing = await Location.getForegroundPermissionsAsync();
    let status = existing.status;
    if (status === "undetermined") {
      const requested = await Location.requestForegroundPermissionsAsync();
      status = requested.status;
    }
    if (status !== "granted") {
      return null;
    }

    const coords = await getDeviceCoordinates();
    return {
      latitude: coords.latitude,
      longitude: coords.longitude,
      inServiceArea: isWithinServiceArea(coords.latitude, coords.longitude),
    };
  } catch (error) {
    console.warn("Failed reading device location:", error);
    return null;
  }
};

export const getLocationPermission = async () => {
  const existing = await Location.getForegroundPermissionsAsync();
  let status = existing.status;

  if (status === "undetermined") {
    const requested = await Location.requestForegroundPermissionsAsync();
    status = requested.status;
  }

  if (status !== "granted") {
    console.warn("Location permission not granted");
    return null;
  }

  const location = await Location.getCurrentPositionAsync({});
  return location;
};

export async function getDeviceCoordinates(): Promise<{
  latitude: number;
  longitude: number;
}> {
  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) {
    throw new Error("LOCATION_SERVICES_DISABLED");
  }

  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return location.coords;
  } catch (currentError) {
    console.warn("getCurrentPositionAsync failed:", currentError);

    const lastKnown = await Location.getLastKnownPositionAsync();
    if (lastKnown?.coords) {
      return lastKnown.coords;
    }

    throw currentError;
  }
}
