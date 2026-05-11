# Localization (i18n)

This directory contains the localization strings for the LocalPDF Engine. The application uses a custom, lightweight, client-side i18n system built with React Context to keep the bundle size small and maintain the privacy-first architecture without heavy external dependencies.

## Adding a New Language

To add support for a new language (e.g., French - `fr`), follow these steps:

1. **Create a new JSON file**: Copy `en.json` to a new file named `fr.json` in this directory.
2. **Translate the strings**: Translate all values in `fr.json`. 
   - *Do not* change the keys (the left side).
   - Variables wrapped in curly braces (like `{count}` or `{year}`) must be preserved exactly as they are.
3. **Handle Pluralization**: For keys ending in `_one` and `_other`, translate them accordingly. The translation hook will automatically use `_one` when the `{count}` variable is exactly `1`, and `_other` for any other number.
4. **Register the locale**: Open `lib/i18n/index.tsx` and add your new language to the `SUPPORTED_LOCALES` array:
   ```typescript
   export const SUPPORTED_LOCALES = [
     { id: "en", label: "English", flag: "🇺🇸" },
     { id: "es", label: "Español", flag: "🇪🇸" },
     { id: "fr", label: "Français", flag: "🇫🇷" } // <-- Add your new locale here
   ] as const;
   ```
5. **Update type definitions**: Also in `lib/i18n/index.tsx`, update the `Locale` type definition to include your new locale:
   ```typescript
   export type Locale = "en" | "es" | "fr";
   ```
6. **Import the JSON file**: Finally, in `lib/i18n/index.tsx`, add an import for your new JSON file and include it in the `translations` object:
   ```typescript
   import fr from "@/locales/fr.json";

   const translations: Record<Locale, Record<string, string>> = {
     en,
     es,
     fr, // <-- Add this line
   };
   ```

## Best Practices

- **Fallback**: The system automatically falls back to `en.json` if a key is missing in another language.
- **Interpolation**: You can inject variables using `{variableName}`. The `t()` function accepts an object as its second argument: `t("key", { variableName: "value" })`.
- **RTL Support**: The provider automatically sets `dir="ltr"` on the HTML tag. If you add an RTL language (like Arabic or Hebrew), you may need to update the `I18nProvider` in `lib/i18n/index.tsx` to handle `dir="rtl"` dynamically.
