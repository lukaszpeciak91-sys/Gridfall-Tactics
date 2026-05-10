# Localization Foundation

Gridfall Tactics has a central active-locale read service at `src/localization/localeService.js`.

## Locale service API

- `getActiveLocale()` reads the currently selected language.
- `setActiveLocale(locale)` normalizes and persists a selected language.
- `normalizeLocale(locale)` returns a supported locale or falls back to `en`.
- `getSupportedLocales()` returns a safe copy of the currently supported locale list.

Supported locales are currently:

- `en`
- `pl`

Any missing, malformed, or unsupported locale falls back to `en`.

## Source of truth

The Settings screen language option is the source of truth for the selected language. The locale service reuses the existing SettingsScene localStorage settings key (`gridfall:tactics:settings:v1`) and reads/writes the `language` field inside that settings object so there is no competing localization storage key.

## Translation status

Translation dictionaries are intentionally not implemented yet. There are no `en.json` or `pl.json` dictionaries, and no UI strings or card text have been translated as part of this foundation.

## Render-helper readiness

Card display and render helpers already accept a locale argument. Low-risk scene call sites now pass `getActiveLocale()` into those helpers, but output remains unchanged because the card display helpers still fall back to the existing English card fields and labels.
