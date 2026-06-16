import * as Location from "expo-location";

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

    throw currentError;
  }
}
