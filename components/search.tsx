import CurrentLocation from "@/assets/svgs/GPS.svg";
import LocationIcon from "@/assets/svgs/locationIcon.svg";
import SearchIcon from "@/assets/svgs/searchIcon.svg";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import { Colors } from "~/constants/Colors";
import { inputFieldStyles, INPUT_ICON_SIZE, INPUT_PLACEHOLDER_FONT_SIZE } from "~/components/inputfield";
import { FONTS } from "~/constants/Fonts";
import { ms, s, vs } from "~/utils/responsive";

export default function Search() {
  const { t } = useTranslation();

  const handleSearch = () => router.push("/(tabs)/add");
  const handleLocation = () => router.push("/(tabs)/add");

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <LocationIcon width={INPUT_ICON_SIZE} height={INPUT_ICON_SIZE} />
        <TextInput
          placeholder={t("search.allServicesAvailable")}
          placeholderTextColor={Colors.secondary300}
          style={styles.input}
          editable={false}
          onTouchEnd={handleSearch}
          accessibilityLabel={t("search.allServicesAvailable")}
        />
        <TouchableOpacity
          onPress={handleLocation}
          style={styles.locationButton}
          accessibilityRole="button"
          accessibilityLabel={t("search.browseServices")}
        >
          <CurrentLocation width={INPUT_ICON_SIZE} height={INPUT_ICON_SIZE} />
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={styles.searchButton}
        onPress={handleSearch}
        accessibilityRole="button"
        accessibilityLabel={t("search.searchServices")}
      >
        <SearchIcon width={s(24)} height={s(24)} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: s(12),
    borderRadius: ms(12),
    marginBottom: vs(16),
  },
  inputContainer: {
    ...inputFieldStyles.fieldContainer,
    flex: 1,
  },
  input: {
    ...inputFieldStyles.fieldInput,
    fontSize: INPUT_PLACEHOLDER_FONT_SIZE,
    color: Colors.secondary100,
    fontFamily: FONTS.medium,
  },
  locationButton: {
    justifyContent: "center",
    alignItems: "center",
  },
  searchButton: {
    minWidth: vs(44),
    minHeight: vs(44),
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.secondary,
    padding: s(10),
    borderRadius: ms(12),
  },
});
