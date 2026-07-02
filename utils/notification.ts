// src/utils/notifications.ts
import messaging, {
  FirebaseMessagingTypes,
} from "@react-native-firebase/messaging";
import * as Device from "expo-device";
import { PermissionsAndroid, Platform } from "react-native";
import { apiCall } from "./api";

export type NotificationData = Record<string, string | undefined>;

export type ForegroundNotificationPayload = {
  title?: string;
  body?: string;
  data?: NotificationData;
};

const ensureIosMessagingReady = async (): Promise<boolean> => {
  if (Platform.OS !== "ios") return true;

  const permitted = await requestFCMPermission();
  if (!permitted) {
    console.warn("🍎 iOS notification permission not granted");
    return false;
  }

  if (!messaging().isDeviceRegisteredForRemoteMessages) {
    await messaging().registerDeviceForRemoteMessages();
  }

  return true;
};

export const registerDeviceWithBackend = async (
  userId: string,
): Promise<void> => {
  try {
    let token: string | null = null;
    try {
      token = await getFCMToken();
    } catch {
      // Token unavailable without notification permission — still register device.
    }

    const deviceModel = Device.modelName || "unknown";

    const formData = new FormData();
    formData.append("type", "update_noti");
    formData.append("user_id", userId);
    formData.append("devicePlatform", Platform.OS || "");
    formData.append("deviceRid", token || "");
    formData.append("deviceModel", deviceModel);

    const response = await apiCall(formData);

    console.log("✅ Device registered with backend:", response);
  } catch (error) {
    console.error("❌ Device registration failed:", error);
  }
};

export const requestFCMPermission = async (): Promise<boolean> => {
  try {
    if (Platform.OS === "ios") {
      const authStatus = await messaging().hasPermission();

      if (authStatus === messaging.AuthorizationStatus.NOT_DETERMINED) {
        const requestStatus = await messaging().requestPermission();
        console.log(`🍎 iOS permission requested: ${requestStatus}`);
        return (
          requestStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          requestStatus === messaging.AuthorizationStatus.PROVISIONAL
        );
      }

      return (
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL
      );
    }

    if (Platform.OS === "android") {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      console.log(`🤖 Android notification permission: ${result}`);
      return result === PermissionsAndroid.RESULTS.GRANTED;
    }

    return false;
  } catch (error) {
    console.error("❌ FCM permission request failed:", error);
    return false;
  }
};

export const getFCMToken = async (): Promise<string | null> => {
  try {
    if (Platform.OS === "ios") {
      const ready = await ensureIosMessagingReady();
      if (!ready) return null;
    }

    const token = await messaging().getToken();
    console.log("🔑 FCM Token:", token);
    return token;
  } catch (error) {
    console.error("❌ FCM token retrieval failed:", error);
    return null;
  }
};

export const initializePushNotifications = async (
  userId?: string | null,
): Promise<void> => {
  const permitted = await requestFCMPermission();
  if (!permitted) return;

  if (userId) {
    await registerDeviceWithBackend(userId);
    return;
  }

  await getFCMToken();
};

const toNotificationData = (
  data?: FirebaseMessagingTypes.RemoteMessage["data"],
): NotificationData | undefined => {
  if (!data) return undefined;
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, String(value)]),
  );
};

export const setupNotificationListeners = (
  handleNotificationPress: (data: NotificationData) => void,
  onForegroundNotification?: (payload: ForegroundNotificationPayload) => void,
) => {
  const unsubscribeOnMessage = messaging().onMessage(
    async (remoteMessage) => {
      console.log("📩 Foreground notification received:", remoteMessage);

      const title = remoteMessage.notification?.title;
      const body = remoteMessage.notification?.body;
      const data = toNotificationData(remoteMessage.data);

      if (onForegroundNotification && (title || body || data?.message)) {
        onForegroundNotification({
          title,
          body,
          data,
        });
      }

      if (data && Object.keys(data).length > 0) {
        handleNotificationPress(data);
      }
    },
  );

  const unsubscribeOnOpenedApp = messaging().onNotificationOpenedApp(
    (remoteMessage) => {
      const data = toNotificationData(remoteMessage.data);
      if (data && Object.keys(data).length > 0) {
        console.log(
          "📲 App opened from background notification:",
          data,
        );
        handleNotificationPress(data);
      }
    },
  );

  messaging()
    .getInitialNotification()
    .then((remoteMessage) => {
      const data = toNotificationData(remoteMessage?.data);
      if (data && Object.keys(data).length > 0) {
        console.log(
          "🆕 App opened from quit state via notification:",
          data,
        );
        handleNotificationPress(data);
      }
    });

  return () => {
    unsubscribeOnMessage();
    unsubscribeOnOpenedApp();
  };
};
