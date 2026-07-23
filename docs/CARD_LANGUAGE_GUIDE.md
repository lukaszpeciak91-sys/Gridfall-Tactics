# Card Language Guide

## 1. Purpose

This guide defines canonical card wording for the Gridfall Tactics MVP and for future localization work. It is intended to keep card text consistent before broader mobile-first wording cleanup, tooltip work, glossary work, icon expansion, or translation passes begin.

The guide is documentation only. It does not define gameplay changes, balance changes, card data changes, rendering changes, or localization file changes. Card wording should describe the behavior players experience in the game, not the code path that produces that behavior.

## 2. Core principles

- Prefer clarity over flavor.
- Prefer consistency over clever wording.
- Optimize for mobile readability: short lines, predictable phrases, and minimal visual noise.
- Card rules text must fit in Collection, Hand, and Inspect views.
- Active card rules do not end with a trailing period. Use punctuation only when needed inside the text; the final character of an active card description should not be a period. Commas and semicolons should appear only when they are genuinely necessary for meaning or readability; prefer a line break or established short construction when it preserves the same meaning. Trigger colons such as `On play:` and deterministic tie notation such as `Ties:` are allowed structural punctuation.
- Do not create gameplay changes through wording. If wording and behavior disagree, fix the implementation or data in a dedicated gameplay/content task, not through silent text drift.
- Card text should describe player-facing behavior, not code internals. Active repository precedent outranks creative rewriting; choose the closest mechanically analogous active wording before inventing a new phrase.

## 3. Canonical terms

Use these preferred forms for card text unless a specific UI context requires an exception.

| Concept | Preferred wording | Notes |
| --- | --- | --- |
| Friendly unit | `ally` / `allies` or `[ALLY]` / `[ALLIES]` on cards | Use for units controlled by the player or card owner; card rules should prefer the existing ally icon marker where it shortens text. |
| Opposing unit | `enemy` / `enemies` or `[ENEMY]` / `[ENEMIES]` on cards | Use for opposing board units only; card rules should prefer the enemy icon marker where it shortens text without reducing clarity. Do not use these markers for the enemy base, enemy player, or UI labels. |
| HP objective | `base` / `bases` | Use instead of hero/bohater for the player/enemy HP target in presentation text. |
| Neighboring slot or unit | `adjacent` | Use instead of `nearby`. |
| Lane-facing logic | `opposing` / `opposed` | Use only when lane-facing or directly across-slot logic matters. |
| Play trigger | `On play:` | Use as the standard trigger label. |
| Death trigger | `On death:` | Use when any death source can trigger the effect. |
| Combat-specific death trigger | `Combat death:` | Use only when the death source matters. |
| Current turn duration | `this turn` | Use only for effects that truly expire at turn end outside the combat cleanup window. |
| Combat cleanup duration | `until combat` | Use for temporary ATK/ARM, movement immunity, Last Stand-style prevention, and other effects that clear at the nearest standard combat cleanup window. |
| Single chosen friendly target | `target ally` | Use when the player chooses one allied unit. |
| Single chosen enemy target | `target enemy` | Use when the player chooses one enemy unit. |
| All friendly units | `all allies` | Use for all allied units affected by an effect. |
| All enemy units | `all enemies` | Use for all enemy units affected by an effect. |
| Empty friendly board position | `empty [ALLY] slot` on cards; `empty ally slot` in prose | Use for allied-side empty slot requirements. |

## 4. Forbidden and discouraged wording

Avoid these forms in canonical card text.

- `nearby` → use `adjacent`.
- `friendly` → use `ally`, unless a UI context specifically requires `friendly`.
- Internal generated-unit names for unnamed summons, such as generated Grunts, in player-facing descriptions → use visible stats such as `1/1` and preserve placement wording such as `here` or `in a chosen free slot`.
- Vague flavor-only text on vanilla units.
- Inconsistent verbs. For example, do not alternate between `gets` and `gains` if `gains` is the chosen canonical verb.
- Implementation-detail wording unless required for gameplay clarity, including:
  - `leftmost`
  - `lowest index` / `lowest-index`
  - raw board index values
  - code-only ordering or resolver terms

## 5. Implementation-detail policy

Card text should avoid leaking code concepts, scan order, array order, or renderer implementation details. Players should not need to understand board indices or deterministic resolver internals to understand a card.

However, deterministic wording is acceptable when the player needs it to predict the result. Player-facing words such as `first`, `newest`, or `lowest-HP` are allowed when they are strategically relevant and describe something the player can reason about. For example, if an effect always chooses a specific valid target and the UI does not preview that target, wording may need to explain the selection rule. Forbidden implementation details are code-only ordering terms such as `leftmost`, `lowest index`, raw board index values, or internal resolver language.

Use these guidelines:

- Avoid code or scan-order language by default.
- Keep deterministic wording when it is necessary for player prediction.
- Prefer player-facing deterministic words over implementation details: `first` can be acceptable; `leftmost`, `lowest index`, and raw board indices are not.
- If the UI preview clearly highlights affected targets, card text may be shorter.
- If no preview exists, deterministic wording may be acceptable.
- Prefer player-facing spatial terms over implementation terms whenever possible.

## 6. Vanilla unit policy

Units with no gameplay effect should usually have empty `textShort`.

Do not add flavor filler such as `Durable guard.` just to occupy the rules text area. Vanilla identity should come from the unit's name, stats, art, frame, faction context, and role in the deck or encounter.

## 7. Sentence patterns

Use short, repeatable sentence patterns. These examples are canonical style references, not new card designs.

- `On play: deal 1 to opposed [ENEMY]`
- `On death: summon 1/1 here`
- `Combat death:\n-1 [HP] to opposed [ENEMY]`
- `Adjacent allies gain +1 ARM until combat`
- `Target ally gains +1 ARM until combat`
- `If opposed: +1 ATK`
- `Attackers: -1 ATK`

## 8. Icons policy

ATK, ARM, HP, ally/allies, and enemy/enemies are symbol-supported by the formatter. Icon use should remain deliberate and readable.

Current convention:

- ATK / ARM / HP are already symbol-supported by the formatter.
- The existing ally/allies icon is yellow and must keep its current color and meaning.
- Card text should use `[ALLY]` for a single/all-context-sensitive ally marker and `[ALLIES]` when a plural/group ally icon is required without preceding context.
- Card text should use `[ENEMY]` for one opposing board unit and `[ENEMIES]` for grouped opposing board units.
- `[ENEMY]` / `[ENEMIES]` must not replace references to the enemy base, enemy player, or UI labels.
- The enemy/enemies icon is rose-red `#fb7185`, visually distinct from the yellow ally icon.
- The formatter renders gameplay-icon markers consistently in collection, hand, and inspect card previews through the shared card preview renderer.
- Treat gameplay icons as words. Use one normal word-space before and after unit icons when adjacent text exists, such as `Atakuje [ENEMY] z najniższym [HP]` and `[ENEMY] naprzeciw`. Stat icons also need readable spacing around adjacent prose, while number/stat pairs such as `+1 [ATK]` or `1 [HP]` may render with compact spacing.
- Do not remove icon-adjacent spaces to save width unless a very specific UI exception is documented.
- Do not introduce icons for `adjacent`, `combat`, `until combat`, or `on play` yet.
- Avoid emoji in production UI; use game-consistent glyphs or icons.
- Icons must not create “hieroglyph soup.” Text should remain understandable at mobile size.

Gameplay marker reference:

| Card marker | Displayed symbol | Meaning |
| --- | --- | --- |
| `[ALLY]` | `♙` | One allied unit, or context-sensitive ally usage handled by the formatter. |
| `[ALLIES]` | `♙♙` | Grouped allied units. |
| `[ENEMY]` | `♟` | One opposing board unit only. |
| `[ENEMIES]` | `♟♟` | Grouped opposing board units only. |

## 9. English and Polish localization notes

English remains the source-of-truth wording for canonical card language. Polish localization should preserve gameplay meaning rather than mirror English grammar literally.

Preferred Polish canonical equivalents:

| English | Polish |
| --- | --- |
| `ally` / `allies` | `sprzymierzeniec` / `sprzymierzeńcy`; use `[ALLY]` / `[ALLIES]` on card rules where the icon is clearer or shorter. |
| `enemy` / `enemies` | `wróg` / `wrogowie`; use `[ENEMY]` / `[ENEMIES]` on card rules for opposing board units where the icon is clearer or shorter. Do not use the markers for the enemy base or player. |
| `base` / `bases` | `baza` / `bazy`; use inflected forms such as `bazę`, `bazie`, or `własną bazę` as grammar requires. |
| `adjacent` | `sąsiedni` |
| `opposed` | `naprzeciwko` |
| `this turn` | `w tej turze` |
| `until combat` | `do walki` |
| `On play` | `Po zagraniu` |
| `On death` | `Po śmierci` |
| `Combat death` | `Śmierć w walce` |

## 10. Rules clarity notes

- `until combat` / `do walki` means the effect lasts until the nearest standard end-of-turn combat cleanup. Immediate fights do not consume these effects. Temporary values remain active through the standard combat resolution and are cleared after its presentation completes.
- `immediately fights` / `natychmiast walczy` means an additional immediate lane combat. It does not replace normal combat later in the turn.
- `immediately attacks its own base` for System Override is immediate effect damage, not delayed standard-combat timing.
- `first empty slot` / `pierwszy pusty slot` names deterministic summon placement.
- Revive text should use `fallen unit` / `poległa jednostka`, not generic discard/archive wording.
- Temporary Flood tokens are temporary board-only units that vanish after combat; do not describe them as normal persistent summons.

## 11. Mobile readability and fit

Card text is written for mobile cards first. Every player-facing card rule must fit in Collection, Hand, and Inspect card views without changing global layout or font sizing for a one-off wording issue.

Use these rules when wording is precise but too long:

- Prefer short, readable mobile wording over exhaustive legal precision.
- Use existing icon tokens for units and stats where they reduce length and improve clarity.
- For space-tight damage wording, prefer compact HP-loss language such as `-1 [HP] to opposed [ENEMY]` / `-1 [HP] [ENEMY] naprzeciw` when it accurately describes unit HP loss.
- Do not create “icon soup”; keep text readable at card size.
- If a precise wording overflows, shorten the text while preserving player-understandable meaning.
- Do not solve text overflow by changing global layout or font size unless the issue is systemic across many cards.
- Manual line breaks are acceptable when they protect localized readability, fit in the shared card views, or replace unnecessary sentence punctuation between short rule clauses.

## 12. MVP scope

This guide does not require broad keyword expansion, renderer redesigns, or gameplay logic changes. Keep card rule text within the shared rules panel width, avoid manual line breaks unless needed for localized readability, and prefer existing icon markers over long repeated ally/allies or enemy/enemies words when the result remains clear.

For MVP, use this guide as the reference for future card wording standardization tasks and review proposed wording changes against it before changing player-facing card text.
