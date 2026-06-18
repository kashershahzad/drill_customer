import i18n from "./config";

export function getCurrentLanguageKey(): "en" | "ar" {
  return i18n.language?.startsWith("ar") ? "ar" : "en";
}

export function getLocalizedText(
  translation: string | Record<string, string> | null | undefined,
  fallback = "",
): string {
  if (!translation) return fallback;

  let parsed: Record<string, string> | null = null;

  if (typeof translation === "string") {
    const trimmed = translation.trim();
    if (!trimmed) return fallback;

    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return fallback;
    }
  } else {
    parsed = translation;
  }

  const lang = getCurrentLanguageKey();
  const localized = parsed?.[lang]?.trim();
  if (localized) return localized;

  const english = parsed?.en?.trim();
  if (english) return english;

  return fallback;
}

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
