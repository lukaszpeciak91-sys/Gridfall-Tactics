# Localization Foundation

Gridfall Tactics has a central active-locale read service at `src/localization/localeService.js` and a base English dictionary at `src/localization/translations/en.json`.

## Locale service API

- `getActiveLocale()` reads the currently selected language.
- `setActiveLocale(locale)` normalizes and persists a selected language.
- `normalizeLocale(locale)` returns a supported locale or falls back to `en`.
- `getSupportedLocales()` returns a safe copy of the currently supported locale list.
- `translate(key, locale, fallbackValue)` reads a dotted translation key from the requested locale, falls back to English, and then falls back to the provided value or the key itself.

Supported locales are currently:

- `en`
- `pl`

Any missing, malformed, or unsupported locale falls back to `en`. English is the required fallback language for all future dictionaries.

## Source of truth

The Settings screen language option is the source of truth for the selected language. The locale service reuses the existing SettingsScene localStorage settings key (`gridfall:tactics:settings:v1`) and reads/writes the `language` field inside that settings object so there is no competing localization storage key.

## Translation dictionaries

`src/localization/translations/en.json` is the base dictionary. It currently stores English card display strings and shared label strings in a nested structure:

- `cards.<cardId>.name`
- `cards.<cardId>.textShort`
- `cardTypes.effect`
- `cardTypes.unit`
- `stats.<statKey>`

No Polish dictionary is included yet. Requests for `pl` translation keys currently fall back to English.

## Card migration status

Card JSON still owns gameplay/source fields (`id`, `name`, `effectId`, targeting, stats, and `textShort`). Presentation metadata in `src/data/presentation/factionPresentation.js` is additive UI metadata only and must not replace or mutate gameplay card objects. Do not add `nameKey` or `textKey` to cards until the dedicated card-data migration happens later.

Card display helpers are ready for future keys:

- Card names first pass through `getCardPresentationName(card, locale)`, which currently activates English presentation-name overrides and falls back to the original `card.name`.
- Polish presentation names remain metadata-only until the broader Polish runtime migration is activated; `pl` requests still render English presentation names for now.
- `card.nameKey` can still resolve through `translate()` when present before presentation naming is applied.
- `card.textKey` resolves through `translate()` when present.
- Missing keys fall back to the existing `card.name` and `card.textShort` fields.

## Art localization

Card art and frame assets remain language-neutral. Future localization work should translate display text through dictionaries rather than creating language-specific card art.

## Render-helper readiness

Card display and render helpers already accept a locale argument. Low-risk scene call sites pass `getActiveLocale()` into those helpers. Safe UI surfaces now consume English presentation names through the display helpers while preserving gameplay ids, `effectId`, targeting, AI behavior, and source card JSON names. The localization migration remains in progress: runtime translation switching beyond the existing English fallback is not expanded here.
