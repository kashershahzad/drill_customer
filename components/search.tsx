import LocationIcon from "@/assets/svgs/locationIcon.svg";
import SearchIcon from "@/assets/svgs/searchIcon.svg";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Colors } from "~/constants/Colors";
import { inputFieldStyles, INPUT_ICON_SIZE, INPUT_PLACEHOLDER_FONT_SIZE } from "~/components/inputfield";
import { FONTS } from "~/constants/Fonts";
import { ms, s, vs } from "~/utils/responsive";

type SearchProps = {
  value: string;
  onChangeText: (text: string) => void;
};

export default function Search({ value, onChangeText }: SearchProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <LocationIcon width={INPUT_ICON_SIZE} height={INPUT_ICON_SIZE} />
        <TextInput
          placeholder={t("search.allServicesAvailable")}
          placeholderTextColor={Colors.secondary300}
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          returnKeyType="search"
          accessibilityLabel={t("search.allServicesAvailable")}
        />
        {value.length > 0 && (
          <TouchableOpacity
            onPress={() => onChangeText("")}
            style={styles.clearButton}
            accessibilityRole="button"
            accessibilityLabel={t("search.clearSearch")}
          >
            <Text style={styles.clearText}>×</Text>
          </TouchableOpacity>
        )}
      </View>
      <View
        style={styles.searchButton}
        accessibilityRole="image"
        accessibilityLabel={t("search.searchServices")}
      >
        <SearchIcon width={s(24)} height={s(24)} />
      </View>
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
  clearButton: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: s(4),
  },
  clearText: {
    fontSize: ms(22),
    lineHeight: ms(22),
    color: Colors.secondary300,
    fontFamily: FONTS.medium,
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
