# Localization

Gridfall Tactics routes player-facing UI copy through the localization service in `src/localization/localeService.js`.

## Supported languages

- English (`en`) — base and required fallback language.
- Polish (`pl`) — full UI dictionary for the current player-facing surfaces.

The active language is selected in Settings and stored in the existing settings object at `gridfall:tactics:settings:v1` under the `language` field.

## Runtime behavior

- `getActiveLocale()` reads the saved language and normalizes unsupported values to `en`.
- `setActiveLocale(locale)` persists a normalized language value.
- `translate(key, locale, fallbackValue, replacements)` resolves dotted keys, falls back to English, then falls back to the provided value or the key itself.
- `translateActive(key, fallbackValue, replacements)` is the active-locale convenience wrapper for UI code.
- `translateList()` / `translateActiveList()` resolve array entries such as rules sections.
- Placeholder replacements use `{name}` style tokens, for example `DECK {count}`.

Missing Polish keys fall back to English. Missing keys do not crash the UI; they render the explicit fallback or the key name.

## Dictionaries

Dictionaries live in:

- `src/localization/translations/en.json`
- `src/localization/translations/pl.json`

Current groups:

- `cards.<cardId>.name`
- `cards.<cardId>.textShort`
- `cardTypes.unit` / `cardTypes.effect`
- `stats.attack`, `stats.hp`, `stats.armor`, and aliases
- `ui.common.*`
- `ui.start.*`
- `ui.mainMenu.*`
- `ui.factionSelect.*`
- `ui.settings.*`
- `ui.collection.*`
- `ui.battleMenu.*`
- `ui.battle.*`
- `ui.rules.*`
- `ui.cardDetails.*`

## Localized UI surfaces

The current dictionaries cover and the routed UI includes:

- Start screen title and Start button.
- Main menu title, Arena, Tutorial, Collection, Settings, and “coming soon” status text.
- Faction select title, subtitle, faction descriptions, and tag pills.
- Settings title, help text, language labels, language status, audio panel labels, and volume labels.
- Collection title, subtitle, card detail back buttons, card type labels, stats, and card effect snippets.
- Rules / How To Play title, sections, bullets, scroll hints, and back button.
- Battle menu title, “coming soon” text, and How To Play button.
- Battle UI labels including hero labels, action badges, PASS, mulligan/keep hand, deck counter, Deck Info panel headings, empty-group labels, result modal win/lose/draw/retry/exit text, enemy action banners, effect summaries, block text, card type labels, and stat labels.

## Card text

Card names still prefer presentation metadata for the visible card name so existing English/Polish presentation names continue to render without mutating gameplay card data. Card `textShort` copy now resolves through `cards.<cardId>.textShort` when a card id is present, while preserving support for future `textKey` fields and falling back to the card’s source `textShort` if a dictionary key is missing.

Gameplay card JSON remains the source for ids, stats, `effectId`, targeting, and behavior. Do not change card ids, faction ids, stats, or rules as part of localization-only work.

## Art localization

Card art and frame/background assets remain language-neutral. UI renders text dynamically from dictionaries and presentation metadata. Do not create separate image files per language for UI text.

## Key naming conventions

- Use lowercase camelCase for UI key names: `ui.mainMenu.tutorialComingSoon`.
- Use stable scene/group prefixes: `ui.<surface>.<label>`.
- Use existing gameplay ids for card dictionary entries: `cards.aggro_runner_1.textShort`.
- Use semantic keys instead of literal placement keys when text is reused: `ui.common.back`.
- Use placeholders for dynamic values: `ui.battle.deckCounter = "DECK {count}"`.

## Adding a language

1. Add a new dictionary file under `src/localization/translations/<locale>.json` with the same UI groups as `en.json`.
2. Import the dictionary in `src/localization/localeService.js`.
3. Add the locale code to `SUPPORTED_LOCALES` and to `ui.settings.languages` in every supported dictionary.
4. Add or update tests so major UI groups, card type/stat labels, and card display entries exist for the new language.
5. Verify `npm test` and `npm run build`.

## Future work

- Add richer long-form card rules text if a future card detail design needs copy beyond `textShort`.
- Continue moving any newly introduced UI literals into `ui.*` keys as new screens are added.
