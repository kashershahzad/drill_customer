import DOB from "@/assets/svgs/profile/Calendar.svg";
import Phone from "@/assets/svgs/profile/Call.svg";
import City from "@/assets/svgs/profile/Global.svg";
import Address from "@/assets/svgs/profile/location.svg";
import Email from "@/assets/svgs/profile/Sms.svg";
import Zip from "@/assets/svgs/profile/zip.svg";
import Profile from "@/assets/svgs/profileIcon.svg";
import Header from "@/components/header";
import Inputfield from "@/components/inputfield";
import Seprator from "@/components/seprator";
import { Colors } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "~/components/button";
import { FONTS } from "~/constants/Fonts";
import { apiCall } from "~/utils/api";
import { ms, s, vs } from "~/utils/responsive";

type User = {
  name: string;
  email: string;
  phone: string;
  dob: string;
  address: string;
  city: string;
  zip: string;
  image: string;
  verified?: boolean;
};

export default function EditProfile() {
  const { t } = useTranslation();
  const [user, setUser] = useState<User>({
    name: "",
    email: "",
    phone: "",
    dob: "",
    address: "",
    city: "",
    zip: "",
    image: "",
    verified: false,
  });

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const storedUserId = await AsyncStorage.getItem("user_id");
      if (!storedUserId) throw new Error("User ID not found");

      setUserId(storedUserId);
      const formData = new FormData();
      formData.append("type", "profile");
      formData.append("user_id", storedUserId);

      const response = await apiCall(formData);
      if (response.profile) {
        const profileData = response.profile;
        setUser({
          name: profileData.name || "",
          email: profileData.email || "",
          phone: profileData.phone || "",
          dob: profileData.dob !== "0000-00-00" ? profileData.dob : "",
          address: profileData.address || "",
          city: profileData.city || "",
          zip: profileData.postal || "",
          image: profileData.image || "",
        });
      } else {
        throw new Error(response.message || t("account.failedToLoadProfile"));
      }
    } catch (err: any) {
      setError(err.message || t("alerts.somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async (source: "camera" | "gallery") => {
    let result;

    try {
      const permissionStatus =
        source === "camera"
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (permissionStatus.status !== "granted") {
              Alert.alert(
                t("alerts.permissionDenied"),
                t("alerts.cameraGalleryRequired")
              );
              return;
            }

      result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 1,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 1,
            });

      if (!result.canceled) {
        const selectedUri = result.assets[0].uri;
        setSelectedImage(selectedUri);
        await handleImageUpdate(selectedUri);
      }
          } catch (error) {
            Alert.alert(
              t("alerts.imagePickerError"),
              t("alerts.imagePickerErrorDesc")
            );
          }
  };

  const handleImageUpdate = async (imageUri: string) => {
        if (!userId) {
          Alert.alert(t("alerts.error"), t("alerts.userNotFound"));
          return;
        }

    try {
      const uriParts = imageUri.split(".");
      const fileType = uriParts[uriParts.length - 1];

      const formData = new FormData();
      formData.append("type", "upload_data");
      formData.append("user_id", userId);
      formData.append("file", {
        uri: imageUri,
        name: `profile.${fileType}`,
        type: `image/${fileType}`,
      } as any);

      const response = await apiCall(formData);

      if (response.result && response.file_name) {
              setUser((prevUser) => ({
                ...prevUser,
                image: response.file_name,
              }));
              Alert.alert(t("success"), t("booking.cardSaved"));
            } else {
              throw new Error(response.message || t("alerts.uploadFailed"));
            }
          } catch (err: any) {
            Alert.alert(t("alerts.error"), err.message || t("alerts.somethingWentWrong"));
          }
  };

  const openImagePicker = () => {
    Alert.alert(t("alerts.selectOption"), t("alerts.chooseOption"), [
      { text: t("alerts.camera"), onPress: () => pickImage("camera") },
      { text: t("alerts.gallery"), onPress: () => pickImage("gallery") },
      { text: t("cancel"), style: "cancel" },
    ]);
  };

  const handleInputChange = (field: keyof User, value: string) => {
    setUser((prevUser) => ({ ...prevUser, [field]: value }));
  };

  const handleUpdate = async () => {
    try {
      setError(null);
            const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(user.dob);

            if (user.dob && !isValidDate) {
              Alert.alert(t("alerts.invalidDate"), t("alerts.invalidDateFormat"));
              return;
            }

      if (!userId) throw new Error("User ID not found");

      const imageName = user.image?.split("/").pop() || "";

      const formData = new FormData();
      formData.append("type", "update_data");
      formData.append("table_name", "users");
      formData.append("id", userId);
      formData.append("name", user.name);
      formData.append("email", user.email);
      formData.append("phone", user.phone);
      formData.append("dob", user.dob);
      formData.append("address", user.address);
      formData.append("city", user.city);
      formData.append("postal", user.zip);
      if (imageName) formData.append("image", imageName);

      const response = await apiCall(formData);

      if (response.result) {
        await AsyncStorage.setItem("user_name", user.name);
        router.push("/(tabs)/account");
      } else {
        throw new Error(response.message || t("alerts.failedToUpdateProfile"));
      }
    } catch (err: any) {
      setError(err.message || t("alerts.somethingWentWrong"));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Header title={t("account.editProfile")} backBtn />
        {loading ? (
          <View style={styles.loadingScreen}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContainer}
          >
            <View style={styles.profileContainer}>
              <TouchableOpacity onPress={openImagePicker}>
                <View style={styles.imageWrapper}>
                  <Image
                    source={
                      selectedImage
                        ? { uri: selectedImage }
                        : user.image
                        ? { uri: user.image }
                        : require("~/assets/images/default-profile.png")
                    }
                    style={styles.profileImage}
                  />
                  <View style={styles.imageIconWrapper}>
                    <Ionicons name="camera" size={16} color={Colors.primary} />
                  </View>
                </View>
              </TouchableOpacity>
              <Text style={styles.userName}>{user.name || t("notAvailable")}</Text>
              <Text style={styles.userEmail}>{user.email || t("notAvailable")}</Text>
            </View>

            <Seprator />

            <View style={styles.fieldsContainer}>
            <Inputfield
              containerStyle={styles.fieldItem}
              label={t("account.fullname")}
              placeholder={t("account.enterName")}
              IconComponent={<Profile />}
              value={user.name}
              onChangeText={(text) => handleInputChange("name", text)}
            />
            <Inputfield
              containerStyle={styles.fieldItem}
              label={t("account.phonenumber")}
              placeholder={t("account.enterPhone")}
              IconComponent={<Phone />}
              value={user.phone}
              onChangeText={(text) => handleInputChange("phone", text)}
            />
            <Inputfield
              containerStyle={styles.fieldItem}
              label={t("account.emailaddress")}
              placeholder={t("account.enterEmail")}
              IconComponent={<Email />}
              value={user.email}
              onChangeText={(text) => handleInputChange("email", text)}
            />
            <Inputfield
              containerStyle={styles.fieldItem}
              label={t("account.dob")}
              placeholder={t("account.dobFormat")}
              IconComponent={<DOB />}
              value={user.dob}
              onChangeText={(text) => handleInputChange("dob", text)}
              dateFormat={true}
            />
            <Inputfield
              containerStyle={styles.fieldItem}
              label={t("account.address")}
              placeholder={t("account.enterAddress")}
              IconComponent={<Address />}
              value={user.address}
              onChangeText={(text) => handleInputChange("address", text)}
            />

            <View style={styles.rowContainer}>
              <View style={styles.flexItem}>
                <Inputfield
                  containerStyle={styles.fieldItem}
                  label={t("account.city")}
                  placeholder={t("account.enterCity")}
                  IconComponent={<City />}
                  value={user.city}
                  onChangeText={(text) => handleInputChange("city", text)}
                />
              </View>
              <View style={styles.flexItem}>
                <Inputfield
                  containerStyle={styles.fieldItem}
                  label={t("account.zipcode")}
                  placeholder={t("account.enterZipCode")}
                  IconComponent={<Zip />}
                  value={user.zip}
                  maxLength={6}
                  onChangeText={(text) => handleInputChange("zip", text)}
                />
              </View>
            </View>
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}
            <Button onPress={handleUpdate} title={t("account.update")} style={styles.updateButton} />
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: s(12), paddingTop: vs(8), backgroundColor: "white" },
  scrollContainer: { paddingBottom: vs(100) },
  loadingScreen: { flex: 1, justifyContent: "center", alignItems: "center" },
  profileContainer: { alignItems: "center" },
  imageWrapper: { borderWidth: 2, borderColor: Colors.success, borderRadius: 999, position: "relative" },
  profileImage: { height: s(88), width: s(88), borderRadius: 999 },
  imageIconWrapper: { position: "absolute", bottom: 0, right: 0, backgroundColor: "white", height: s(24), width: s(24), borderRadius: 999, borderWidth: 1, borderColor: "white", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  userName: { fontSize: ms(22), fontFamily: FONTS.semiBold, color: Colors.secondary, marginTop: vs(10) },
  userEmail: { color: Colors.secondary300, fontFamily: FONTS.regular, fontSize: ms(13) },
  fieldsContainer: { gap: vs(20) },
  fieldItem: { marginBottom: 0 },
  rowContainer: { flexDirection: "row", gap: s(20) },
  flexItem: { flex: 1 },
  errorText: { color: "red", textAlign: "center", marginTop: vs(10), fontFamily: FONTS.medium, fontSize: ms(13) },
  updateButton: { marginTop: vs(20) },
});
