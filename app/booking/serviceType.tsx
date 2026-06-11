import Button from "@/components/button";
import Header from "@/components/header";
import SimpleRadioButton from "@/components/simple_radio_button";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "~/constants/Colors";
import { FONTS } from "~/constants/Fonts";
import { ms, s, vs } from "~/utils/responsive";

export default function ServiceTypeScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams();

  const [serviceType, setServiceType] = useState<"instant" | "schedule">(
    "instant"
  );
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (time: Date) => {
    return time.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const isDateValid = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selectedDate >= today;
  };

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === "ios") {
      // On iOS, only close picker when user confirms or cancels
      if (event.type === "dismissed") {
        setShowDatePicker(false);
      } else if (date) {
        setSelectedDate(date);
      }
    } else {
      // On Android, close immediately after selection
      setShowDatePicker(false);
      if (date) {
        setSelectedDate(date);
      }
    }
  };

  const handleTimeChange = (event: any, time?: Date) => {
    if (Platform.OS === "ios") {
      // On iOS, only close picker when user confirms or cancels
      if (event.type === "dismissed") {
        setShowTimePicker(false);
      } else if (time) {
        setSelectedTime(time);
      }
    } else {
      // On Android, close immediately after selection
      setShowTimePicker(false);
      if (time) {
        setSelectedTime(time);
      }
    }
  };

  const handleContinue = () => {
    if (serviceType === "schedule" && !isDateValid()) {
      return; // Don't proceed if date is invalid
    }

    const navigationParams: any = {
      // Pass through existing params
      id: params.id,
      name: params.name,
      image: params.image,
      service_type: serviceType,
    };

    // Add schedule data if scheduled service
    if (serviceType === "schedule") {
      // Use local date formatting to avoid timezone issues
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const day = String(selectedDate.getDate()).padStart(2, "0");
      navigationParams.schedule_date = `${year}-${month}-${day}`;

      // Use local time formatting to avoid timezone issues
      const hours = String(selectedTime.getHours()).padStart(2, "0");
      const minutes = String(selectedTime.getMinutes()).padStart(2, "0");
      const seconds = String(selectedTime.getSeconds()).padStart(2, "0");
      navigationParams.schedule_time = `${hours}:${minutes}:${seconds}`;

    }

    router.push({
      pathname: "/booking",
      params: navigationParams,
    });
  };

  const canProceed = () => {
    if (serviceType === "instant") return true;
    return serviceType === "schedule" && isDateValid();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 25}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <View style={styles.content}>
            <Header backBtn={true} title={t("booking.selectServiceType")} />

            <Text style={styles.title}>
              {t("booking.howToBook")}
            </Text>
            <Text style={styles.subtitle}>
              {t("booking.chooseServiceType")}
            </Text>

            {/* Service Type Selection */}
            <View style={styles.section}>
              <View style={styles.optionContainer}>
                <SimpleRadioButton
                  selected={serviceType === "instant"}
                  onPress={() => setServiceType("instant")}
                />
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>{t("booking.instantService")}</Text>
                  <Text style={styles.optionDescription}>
                    {t("booking.instantServiceDesc")}
                  </Text>
                </View>
              </View>

              <View style={styles.optionContainer}>
                <SimpleRadioButton
                  selected={serviceType === "schedule"}
                  onPress={() => setServiceType("schedule")}
                />
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>{t("booking.scheduleService")}</Text>
                  <Text style={styles.optionDescription}>
                    {t("booking.scheduleServiceDesc")}
                  </Text>
                </View>
              </View>
            </View>

            {/* Schedule Fields - Only show when schedule is selected */}
            {serviceType === "schedule" && (
              <View style={styles.scheduleSection}>
                <Text style={styles.sectionTitle}>{t("booking.scheduleDetails")}</Text>

                {/* Date Selection */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>{t("booking.selectDate")}</Text>
                  <View
                    style={styles.dateTimeField}
                    onTouchEnd={() => setShowDatePicker(true)}
                  >
                    <Text style={styles.fieldText}>
                      {formatDate(selectedDate)}
                    </Text>
                  </View>
                </View>

                {/* Time Selection */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>{t("booking.selectTime")}</Text>
                  <View
                    style={styles.dateTimeField}
                    onTouchEnd={() => setShowTimePicker(true)}
                  >
                    <Text style={styles.fieldText}>
                      {formatTime(selectedTime)}
                    </Text>
                  </View>
                </View>

                {!isDateValid() && (
                  <Text style={styles.errorText}>
                    {t("booking.selectFutureDate")}
                  </Text>
                )}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Continue Button */}
        <View style={styles.buttonContainer}>
          <Button
            title={t("booking.continue")}
            onPress={handleContinue}
            disabled={!canProceed()}
          />
        </View>

        {/* Date Picker */}
        {showDatePicker && (
          <View style={styles.pickerOverlay}>
            <TouchableOpacity
              style={styles.pickerBackdrop}
              activeOpacity={1}
              onPress={() => setShowDatePicker(false)}
            />
            <View style={styles.pickerContainer}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>{t("booking.selectDate")}</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={styles.closeButtonText}>{t("confirm")}</Text>
                </TouchableOpacity>
              </View>
              <View
                style={{
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display={Platform.OS === "ios" ? "compact" : "default"}
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                />
              </View>
            </View>
          </View>
        )}

        {/* Time Picker */}
        {showTimePicker && (
          <View style={styles.pickerOverlay}>
            <TouchableOpacity
              style={styles.pickerBackdrop}
              activeOpacity={1}
              onPress={() => setShowTimePicker(false)}
            />
            <View style={styles.pickerContainer}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>{t("booking.selectTime")}</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowTimePicker(false)}
                >
                  <Text style={styles.closeButtonText}>{t("confirm")}</Text>
                </TouchableOpacity>
              </View>
              <View style={{ alignItems: "center", justifyContent: "center" }}>
                <DateTimePicker
                  value={selectedTime}
                  mode="time"
                  display={Platform.OS === "ios" ? "compact" : "default"}
                  onChange={handleTimeChange}
                />
              </View>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  content: { flex: 1, paddingHorizontal: s(16), paddingTop: vs(8) },
  title: { fontSize: ms(22), fontFamily: FONTS.bold, color: Colors.secondary, marginBottom: vs(6), textAlign: "left" },
  subtitle: { fontSize: ms(15), fontFamily: FONTS.regular, color: Colors.secondary, marginBottom: vs(24), textAlign: "left" },
  section: { marginBottom: vs(20) },
  optionContainer: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.primary300, paddingHorizontal: s(14), paddingVertical: vs(14), borderRadius: ms(12), marginBottom: vs(10) },
  optionContent: { flex: 1, marginLeft: s(12) },
  optionTitle: { fontSize: ms(16), fontFamily: FONTS.semiBold, color: Colors.secondary, marginBottom: vs(4) },
  optionDescription: { fontSize: ms(13), fontFamily: FONTS.regular, color: Colors.secondary },
  scheduleSection: { backgroundColor: Colors.primary300, padding: s(16), borderRadius: ms(12), marginBottom: vs(20) },
  sectionTitle: { fontSize: ms(17), fontFamily: FONTS.semiBold, color: Colors.secondary, marginBottom: vs(14) },
  fieldContainer: { marginBottom: vs(14) },
  fieldLabel: { fontSize: ms(15), fontFamily: FONTS.medium, color: Colors.secondary, marginBottom: vs(7) },
  dateTimeField: { backgroundColor: Colors.white, padding: s(14), borderRadius: ms(8), borderWidth: 1, borderColor: Colors.secondary },
  fieldText: { fontSize: ms(14), fontFamily: FONTS.regular, color: Colors.secondary },
  errorText: { fontSize: ms(13), fontFamily: FONTS.regular, color: "red", textAlign: "center", marginTop: vs(7) },
  buttonContainer: { paddingHorizontal: s(16), paddingVertical: vs(12) },
  pickerOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 },
  pickerBackdrop: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)" },
  pickerContainer: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.white,
    borderTopLeftRadius: ms(20), borderTopRightRadius: ms(20),
    padding: s(18), elevation: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.25, shadowRadius: 8,
  },
  pickerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: vs(14), paddingBottom: vs(10), borderBottomWidth: 1, borderBottomColor: Colors.primary300 },
  pickerTitle: { fontSize: ms(17), fontFamily: FONTS.semiBold, color: Colors.secondary },
  closeButton: { backgroundColor: Colors.primary, paddingHorizontal: s(14), paddingVertical: vs(7), borderRadius: ms(8) },
  closeButtonText: { fontSize: ms(14), fontFamily: FONTS.semiBold, color: Colors.white },
});
