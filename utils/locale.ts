import i18n from "./config";

export function getAppLocale(): string {
  return i18n.language?.startsWith("ar") ? "ar-SA" : "en-US";
}

export function formatAppDate(
  date: Date,
  options?: Intl.DateTimeFormatOptions,
): string {
  return date.toLocaleDateString(getAppLocale(), options);
}

export function formatAppTime(
  date: Date,
  options?: Intl.DateTimeFormatOptions,
): string {
  return date.toLocaleTimeString(getAppLocale(), options);
}
