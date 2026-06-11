import CurrentLocation from "@/assets/svgs/GPS.svg";
import LocationIcon from "@/assets/svgs/locationIcon.svg";
import SearchIcon from "@/assets/svgs/searchIcon.svg";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import { Colors } from "~/constants/Colors";
import { FONTS } from "~/constants/Fonts";
import { ms, s, vs } from "~/utils/responsive";

export default function Search() {
  const { t } = useTranslation();

  const handleSearch = () => router.push("/(tabs)/add");
  const handleLocation = () => router.push("/(tabs)/add");

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <LocationIcon width={s(20)} height={s(20)} />
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
          <CurrentLocation width={s(20)} height={s(20)} />
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
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    backgroundColor: Colors.gray100,
    paddingHorizontal: s(14),
    paddingVertical: vs(14),
    borderRadius: ms(12),
    height: vs(44),
    justifyContent: "center",
  },
  input: {
    flex: 1,
    color: Colors.secondary100,
    marginLeft: s(8),
    fontSize: ms(15),
    fontFamily: FONTS.medium,
    height: vs(44),
    justifyContent: "center",
  },
  locationButton: {
    minWidth: s(44),
    minHeight: vs(44),
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
