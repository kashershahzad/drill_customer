import { Colors } from "@/constants/Colors";
import React from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { FONTS } from "~/constants/Fonts";
import { ms, s, vs } from "~/utils/responsive";

interface InputFieldProps {
  label?: string;
  placeholder?: string;
  IconComponent?: React.ReactNode;
  value?: string;
  maxLength?: number;
  onChangeText: (text: string) => void;
  dateFormat?: boolean;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  placeholder,
  IconComponent,
  value,
  maxLength,
  onChangeText,
  dateFormat = false,
}) => {
  const handleTextChange = (text: string) => {
    if (dateFormat) {
      const sanitizedText = text.replace(/[^0-9]/g, "");
      let formattedText = sanitizedText;
      if (sanitizedText.length >= 5)
        formattedText = sanitizedText.slice(0, 4) + "-" + sanitizedText.slice(4);
      if (sanitizedText.length >= 7)
        formattedText =
          sanitizedText.slice(0, 4) +
          "-" +
          sanitizedText.slice(4, 6) +
          "-" +
          sanitizedText.slice(6, 8);
      onChangeText(formattedText.slice(0, 10));
    } else {
      onChangeText(text);
    }
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.inputContainer}>
        {IconComponent && <View>{IconComponent}</View>}
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={Colors.secondary300}
          value={value}
          maxLength={maxLength}
          onChangeText={handleTextChange}
          keyboardType={dateFormat ? "numeric" : "default"}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: vs(16),
  },
  label: {
    fontSize: ms(15),
    fontFamily: FONTS.semiBold,
    color: Colors.secondary,
    marginBottom: vs(8),
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary300,
    paddingHorizontal: s(14),
    paddingVertical: vs(8),
    borderRadius: ms(12),
    gap: s(8),
  },
  input: {
    flex: 1,
    fontSize: ms(15),
    fontFamily: FONTS.regular,
    color: Colors.secondary,
  },
});

export default InputField;
