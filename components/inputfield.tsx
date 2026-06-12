import { Colors } from "@/constants/Colors";
import React from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { FONTS } from "~/constants/Fonts";
import { ms, s, vs } from "~/utils/responsive";

export const INPUT_FIELD_BACKGROUND = "#FAFAFA";
export const INPUT_FIELD_PADDING = s(16);
export const INPUT_ICON_SIZE = s(24);
export const INPUT_PLACEHOLDER_FONT_SIZE = ms(13);
export const INPUT_TEXT_FONT_SIZE = ms(15);

export function getInputFontSize(value?: string | null): number {
  return value && String(value).length > 0
    ? INPUT_TEXT_FONT_SIZE
    : INPUT_PLACEHOLDER_FONT_SIZE;
}

export function renderInputIcon(icon: React.ReactNode): React.ReactNode {
  if (!icon) return null;

  if (React.isValidElement(icon)) {
    return (
      <View style={inputFieldStyles.iconWrapper}>
        {React.cloneElement(
          icon as React.ReactElement<{ width?: number; height?: number; size?: number }>,
          {
            width: INPUT_ICON_SIZE,
            height: INPUT_ICON_SIZE,
            size: INPUT_ICON_SIZE,
          }
        )}
      </View>
    );
  }

  return <View style={inputFieldStyles.iconWrapper}>{icon}</View>;
}

export const inputFieldStyles = StyleSheet.create({
  iconWrapper: {
    width: INPUT_ICON_SIZE,
    height: INPUT_ICON_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldContainer: {
    width: "100%",
    minHeight: vs(48),
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: INPUT_FIELD_BACKGROUND,
    borderRadius: ms(12),
    padding: INPUT_FIELD_PADDING,
    gap: s(24),
  },
  field: {
    width: "100%",
    minHeight: vs(48),
    backgroundColor: INPUT_FIELD_BACKGROUND,
    borderRadius: ms(12),
    padding: INPUT_FIELD_PADDING,
    fontSize: INPUT_PLACEHOLDER_FONT_SIZE,
    fontFamily: FONTS.regular,
    color: Colors.secondary,
  },
  fieldInput: {
    flex: 1,
    fontSize: INPUT_PLACEHOLDER_FONT_SIZE,
    fontFamily: FONTS.regular,
    color: Colors.secondary,
    padding: 0,
    margin: 0,
  },
});

interface InputFieldProps {
  label?: string;
  placeholder?: string;
  IconComponent?: React.ReactNode;
  value?: string;
  maxLength?: number;
  onChangeText: (text: string) => void;
  dateFormat?: boolean;
  containerStyle?: object;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  placeholder,
  IconComponent,
  value,
  maxLength,
  onChangeText,
  dateFormat = false,
  containerStyle,
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
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={inputFieldStyles.fieldContainer}>
        {renderInputIcon(IconComponent)}
        <TextInput
          style={[
            inputFieldStyles.fieldInput,
            { fontSize: getInputFontSize(value) },
          ]}
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
    width: "100%",
    marginBottom: vs(16),
  },
  label: {
    fontSize: ms(15),
    fontFamily: FONTS.semiBold,
    color: Colors.secondary,
    marginBottom: vs(8),
  },
});

export default InputField;
