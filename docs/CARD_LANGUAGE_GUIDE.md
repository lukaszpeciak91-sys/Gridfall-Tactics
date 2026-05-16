# Card Language Guide

## 1. Purpose

This guide defines canonical card wording for the Gridfall Tactics MVP and for future localization work. It is intended to keep card text consistent before broader mobile-first wording cleanup, tooltip work, glossary work, icon expansion, or translation passes begin.

The guide is documentation only. It does not define gameplay changes, balance changes, card data changes, rendering changes, or localization file changes. Card wording should describe the behavior players experience in the game, not the code path that produces that behavior.

## 2. Core principles

- Prefer clarity over flavor.
- Prefer consistency over clever wording.
- Optimize for mobile readability: short lines, predictable phrases, and minimal visual noise.
- Do not create gameplay changes through wording. If wording and behavior disagree, fix the implementation or data in a dedicated gameplay/content task, not through silent text drift.
- Card text should describe player-facing behavior, not code internals.

## 3. Canonical terms

Use these preferred forms for card text unless a specific UI context requires an exception.

| Concept | Preferred wording | Notes |
| --- | --- | --- |
| Friendly unit | `ally` / `allies` | Use for units controlled by the player or card owner. |
| Opposing unit | `enemy` / `enemies` | Use for units controlled by the opposing side. |
| Neighboring slot or unit | `adjacent` | Use instead of `nearby`. |
| Lane-facing logic | `opposing` / `opposed` | Use only when lane-facing or directly across-slot logic matters. |
| Play trigger | `On play:` | Use as the standard trigger label. |
| Death trigger | `On death:` | Use when any death source can trigger the effect. |
| Combat-specific death trigger | `Combat death:` | Use only when the death source matters. |
| Current turn duration | `this turn` | Use for effects that expire at turn end. |
| Combat duration | `until combat ends` | Use for effects that expire when combat ends. |
| Single chosen friendly target | `target ally` | Use when the player chooses one allied unit. |
| Single chosen enemy target | `target enemy` | Use when the player chooses one enemy unit. |
| All friendly units | `all allies` | Use for all allied units affected by an effect. |
| All enemy units | `all enemies` | Use for all enemy units affected by an effect. |
| Empty friendly board position | `empty ally slot` | Use for allied-side empty slot requirements. |

## 4. Forbidden and discouraged wording

Avoid these forms in canonical card text.

- `nearby` → use `adjacent`.
- `friendly` → use `ally`, unless a UI context specifically requires `friendly`.
- Vague flavor-only text on vanilla units.
- Inconsistent verbs. For example, do not alternate between `gets` and `gains` if `gains` is the chosen canonical verb.
- Implementation-detail wording unless required for gameplay clarity, including:
  - `first`
  - `leftmost`
  - `lowest-index`
  - `deterministic`
  - `board index`

## 5. Implementation-detail policy

Card text should avoid leaking code concepts, scan order, array order, or renderer implementation details. Players should not need to understand board indices or deterministic resolver internals to understand a card.

However, deterministic wording is acceptable when the player needs it to predict the result. For example, if an effect always chooses a specific valid target and the UI does not preview that target, wording may need to explain the selection rule.

Use these guidelines:

- Avoid code or scan-order language by default.
- Keep deterministic wording when it is necessary for player prediction.
- If the UI preview clearly highlights affected targets, card text may be shorter.
- If no preview exists, deterministic wording may be acceptable.
- Prefer player-facing spatial terms over implementation terms whenever possible.

## 6. Vanilla unit policy

Units with no gameplay effect should usually have empty `textShort`.

Do not add flavor filler such as `Durable guard.` just to occupy the rules text area. Vanilla identity should come from the unit's name, stats, art, frame, faction context, and role in the deck or encounter.

## 7. Sentence patterns

Use short, repeatable sentence patterns. These examples are canonical style references, not new card designs.

- `On play: deal 1 to opposing enemy.`
- `On death: summon 1/1 here.`
- `Combat death: deal 1 to opposing enemy.`
- `Adjacent allies gain +1 ARM until combat ends.`
- `Target ally gains +1 ARM until combat ends.`
- `If opposed: +1 ATK.`
- `Attackers: -1 ATK.`

## 8. Icons policy

ATK, ARM, and HP are already symbol-supported by the formatter. Future wording and UI passes may expand icon support, but icon use should remain deliberate and readable.

Current and future direction:

- ATK / ARM / HP are already symbol-supported by the formatter.
- Ally/allies icon is the first supported non-stat icon candidate and should be limited to pilot usages until a broader wording pass.
- Pilot card text should use the `[ALLY]` marker so the formatter can render the game-consistent ally glyph.
- Do not introduce icons for `adjacent`, `combat`, `this turn`, or `on play` yet.
- Avoid emoji in production UI; use game-consistent glyphs or icons.
- Icons must not create “hieroglyph soup.” Text should remain understandable at mobile size.

## 9. English and Polish localization notes

English remains the source-of-truth wording for canonical card language. Polish localization should preserve gameplay meaning rather than mirror English grammar literally.

Preferred Polish canonical equivalents:

| English | Polish |
| --- | --- |
| `ally` / `allies` | `sprzymierzeniec` / `sprzymierzeńcy` |
| `enemy` / `enemies` | `wróg` / `wrogowie` |
| `adjacent` | `sąsiedni` |
| `opposed` | `naprzeciwko` |
| `this turn` | `w tej turze` |
| `until combat ends` | `do końca walki` |
| `On play` | `Po zagraniu` |
| `On death` | `Po śmierci` |
| `Combat death` | `Śmierć w walce` |

## 10. MVP scope

This guide does not require immediate tooltip or glossary UI. It also does not require broad keyword expansion, broad icon expansion, card JSON rewrites, localization rewrites, renderer changes, or gameplay logic changes.

For MVP, use this guide as the reference for future card wording standardization tasks and review proposed wording changes against it before changing player-facing card text.
