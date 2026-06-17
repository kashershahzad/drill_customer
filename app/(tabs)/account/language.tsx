import * as Updates from "expo-updates";
import React from "react";
import { useTranslation } from "react-i18next";
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Header from "~/components/header";
import { ms, s, vs } from "~/utils/responsive";
import { saveLanguagePreference } from "~/utils/config";

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

interface LanguageOptionProps {
  language: Language;
  isSelected: boolean;
  onPress: () => void;
}

const Language: React.FC = () => {
  const { t, i18n } = useTranslation();

  const languages: Language[] = [
    {
      code: "en",
      name: t("language.en"),
      nativeName: t("language.nativeEn"),
      flag: "🇺🇸",
    },
    {
      code: "ar",
      name: t("language.ar"),
      nativeName: t("language.nativeAr"),
      flag: "🇸🇦",
    },
  ];

  const changeLanguage = async (languageCode: string): Promise<void> => {
    if (i18n.language === languageCode) {
      return;
    }

    try {
      await saveLanguagePreference(languageCode);
      // RTL layout change requires reload to take effect (App Store 4.0 Design)
      if (Platform.OS !== "web" && Updates.reloadAsync) {
        await Updates.reloadAsync();
      }
    } catch (error) {
      console.error("Failed to change language:", error);
      Alert.alert(t("error"), t("language.changeError"));
    }
  };

  const LanguageOption: React.FC<LanguageOptionProps> = ({
    language,
    isSelected,
    onPress,
  }) => (
    <TouchableOpacity
      style={[styles.languageOption, isSelected && styles.selectedOption]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={t("language.selectLanguageOption", {
        language: language.name,
      })}
      accessibilityState={{ selected: isSelected }}
    >
      <View style={styles.languageContent}>
        <Text style={styles.flag} accessibilityLabel={t("language.languageFlag", { language: language.name })}>
          {language.flag}
        </Text>
        <View style={styles.languageText}>
          <Text
            style={[styles.languageName, isSelected && styles.selectedText]}
          >
            {language.name}
          </Text>
          <Text style={[styles.nativeName, isSelected && styles.selectedText]}>
            {language.nativeName}
          </Text>
        </View>
      </View>
      {isSelected && (
        <View style={styles.checkmark}>
          <Text style={styles.checkmarkIcon} accessibilityLabel={t("language.selected")}>
            ✓
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header title={t("language.language")} backBtn />
      <View style={styles.content}>
        <Text style={styles.subtitle}>
          {t("language.selectLanguage")}
        </Text>
        <View style={styles.languageList}>
          {languages.map((language: Language) => (
            <LanguageOption
              key={language.code}
              language={language}
              isSelected={i18n.language === language.code}
              onPress={() => changeLanguage(language.code)}
            />
          ))}
        </View>
        <Text style={styles.note}>
          {t("language.languageNote")}
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: s(12), paddingTop: vs(8), backgroundColor: "#ffffff" },
  content: { flex: 1, paddingHorizontal: s(16), paddingTop: vs(16) },
  subtitle: { fontSize: ms(15), color: "#666666", marginBottom: vs(24), textAlign: "center", lineHeight: ms(24) },
  languageList: { marginBottom: vs(24) },
  languageOption: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#f8f9fa", borderRadius: ms(12), paddingHorizontal: s(14), paddingVertical: vs(14),
    marginBottom: vs(10), borderWidth: 2, borderColor: "transparent",
    elevation: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  selectedOption: { backgroundColor: "#e3f2fd", borderColor: "#2196f3", elevation: 2, shadowOpacity: 0.1 },
  languageContent: { flexDirection: "row", alignItems: "center", flex: 1 },
  flag: { fontSize: ms(22), marginRight: s(14), width: s(30), textAlign: "center" },
  languageText: { flex: 1 },
  languageName: { fontSize: ms(17), fontWeight: "600", color: "#333333", marginBottom: vs(2), lineHeight: ms(22) },
  nativeName: { fontSize: ms(13), color: "#666666", lineHeight: ms(18) },
  selectedText: { color: "#2196f3" },
  checkmark: { width: s(22), height: s(22), borderRadius: ms(11), backgroundColor: "#2196f3", alignItems: "center", justifyContent: "center" },
  checkmarkIcon: { color: "#ffffff", fontSize: ms(15), fontWeight: "bold" },
  note: { fontSize: ms(11), color: "#999999", textAlign: "center", fontStyle: "italic", paddingHorizontal: s(18), lineHeight: ms(16) },
});

export default Language;
