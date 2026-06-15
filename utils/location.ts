import * as Location from "expo-location";

const DEFAULT_DEV_COORDS = {
  latitude: 24.7136,
  longitude: 46.6753,
};

export const getLocationPermission = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();

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

    if (__DEV__) {
      console.warn(
        "Using default dev coordinates. Set emulator location via Extended controls > Location.",
      );
      return DEFAULT_DEV_COORDS;
    }

    throw currentError;
  }
}
