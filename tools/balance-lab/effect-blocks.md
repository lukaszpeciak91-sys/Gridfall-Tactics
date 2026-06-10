# Balance Lab v3 Experimental Effect Blocks Catalog

## Purpose

Experimental Effect Blocks are a controlled planning catalog for Balance Lab v3 temp-copy simulations. They are intended to let Balance Lab test temporary card redesign variants, such as Shield Push variants, by composing small reusable mechanics that already have equivalents in the repo.

Experimental Effect Blocks are **not** production card data. They must not permanently change faction JSON, production gameplay, or simulator behavior in the real repository. A Balance Lab v3 run should apply any variant behavior only inside its temporary copied repository and should keep the real working tree unchanged.

This catalog is documentation only. It does not implement effect blocks.

## Source-of-truth principles

- Existing repo mechanics are the source of truth for block meanings.
- Use repo/game perspective wording:
  - `owner` means the side playing or owning the source card/effect.
  - `opponent` means the other side.
  - `player base` means `playerHP`.
  - `enemy base` means `enemyHP`.
- MVP variants should keep existing base `effectId` behavior and add controlled temporary augmentation blocks.
- For Shield Push variants, the base card should keep `effectId: "swap_adjacent_enemy_units"` so existing targeting and AI continue to use the base Shield Push effect.

## Supported MVP selectors

### `selectedOpponentUnit`

**Meaning:** One board unit selected by the effect user that must belong to the opponent.

**Owner/opponent perspective:** If `owner` is `player`, the selected unit must belong to `enemy`. If `owner` is `enemy`, the selected unit must belong to `player`.

**Existing repo behavior it maps to:** Single-target opponent effects such as Pierce Strike, System Override, and Rotten Gift validate that the selected target belongs to `getOpponentOwner(owner)` before resolving.

**Risks / caveats:**

- Target must still exist at resolution time.
- Damage operations using this selector must define whether death cleanup is non-combat or combat cleanup.
- AI target value may need variant-specific reporting even if the base effect target generation is reused.

### `selectedOwnerUnit`

**Meaning:** One board unit selected by the effect user that must belong to the owner.

**Owner/opponent perspective:** The selected unit must belong to the acting `owner`.

**Existing repo behavior it maps to:** Single-target owner effects such as Quick Fix, Brace, Recall, Substrate, Feast, and Quick Strike validate owner-unit targeting before resolving.

**Risks / caveats:**

- Returning a unit to hand must respect hand-size limits.
- Destroying a unit is not the same as damage death; fallen/death-trigger semantics must be explicit.
- Temporary buffs should expire on the same timing as existing temporary attack and armor modifiers.

### `selectedTwoAdjacentOpponentUnits`

**Meaning:** Two selected opponent units that are adjacent in the same row.

**Owner/opponent perspective:** Both selected units must belong to the opponent of the acting `owner`.

**Existing repo behavior it maps to:** Shield Push uses two selected opponent units and rejects duplicate, empty, owner-owned, or non-adjacent targets.

**Risks / caveats:**

- This selector is positional and order-sensitive: the first selected index and second selected index should be preserved for follow-up selectors.
- The adjacency rule is same-row lane adjacency; it must not cross rows or sides.
- If later blocks run after a swap, a target alias must state whether it refers to the unit before or after the base effect.

### `firstSelectedAfterBaseEffect`

**Meaning:** The unit that was selected first by the base effect, resolved to its board location after `runBaseEffect` completes.

**Owner/opponent perspective:** The original target legality comes from the base effect. For Shield Push, this is the first selected opponent unit after the base swap.

**Existing repo behavior it maps to:** Shield Push swaps the two selected unit objects between their board slots. A post-base selector is needed because the unit originally selected first no longer occupies the first selected index after the swap.

**Risks / caveats:**

- This selector is only meaningful when the base effect preserved target identity and the unit still exists.
- Damage or cleanup from the base effect could remove a target in future variants; MVP Shield Push base swap does not deal damage.
- Reports must clearly state that “first selected” means first selected by the base effect, not leftmost or current-slot-first after the swap.

### `secondSelectedAfterBaseEffect`

**Meaning:** The unit that was selected second by the base effect, resolved to its board location after `runBaseEffect` completes.

**Owner/opponent perspective:** The original target legality comes from the base effect. For Shield Push, this is the second selected opponent unit after the base swap.

**Existing repo behavior it maps to:** Same Shield Push swap target-order behavior as `firstSelectedAfterBaseEffect`.

**Risks / caveats:**

- Same target-identity caveats as `firstSelectedAfterBaseEffect`.
- The selector must not silently fall back to whichever unit is currently in the second original slot unless that is explicitly the identity rule.

### `bothSelectedAfterBaseEffect`

**Meaning:** Both units selected by the base effect, resolved to their board locations after `runBaseEffect` completes.

**Owner/opponent perspective:** The original target legality comes from the base effect. For Shield Push, both selected units are opponent units.

**Existing repo behavior it maps to:** Shield Push and Controller both operate on two selected opponent units; Control Swap operates on two same-side selected units.

**Risks / caveats:**

- Batch damage must define cleanup ordering.
- If both selected units die from a block, telemetry should report both damage and kill count.
- If one selected unit no longer exists, the variant must define whether to skip that unit or fail the variant.

### `enemyBase`

**Meaning:** The enemy base HP pool, represented by `enemyHP`.

**Owner/opponent perspective:** This selector is absolute, not relative. It always targets the enemy base, regardless of whether the acting `owner` is `player` or `enemy`.

**Existing repo behavior it maps to:** Combat open-lane damage can reduce `enemyHP` when a player-owned unit attacks the enemy base.

**Risks / caveats:**

- This is intentionally different from `opponent base`; an enemy-owned card damaging `enemyBase` would damage its own base.
- Variant JSON should prefer absolute `enemyBase` only when the intended target is truly always the enemy base.

### `playerBase`

**Meaning:** The player base HP pool, represented by `playerHP`.

**Owner/opponent perspective:** This selector is absolute, not relative. It always targets the player base, regardless of whether the acting `owner` is `player` or `enemy`.

**Existing repo behavior it maps to:** Combat open-lane damage can reduce `playerHP` when an enemy-owned unit attacks the player base.

**Risks / caveats:**

- This is intentionally different from `opponent base`; a player-owned card damaging `playerBase` would damage its own base.
- Variant reports should clearly separate player base and enemy base damage from owner/opponent-relative base damage.

## Supported MVP operations

### `runBaseEffect`

**Meaning:** Resolve the card’s existing production `effectId` behavior before applying augmentation blocks.

**Owner/opponent perspective:** Uses the normal owner/opponent perspective already encoded by the existing resolver.

**Existing repo behavior it maps to:** For Shield Push, this means resolving `swap_adjacent_enemy_units` through the current two-target adjacent opponent-unit swap behavior.

**Risks / caveats:**

- This operation must not create a new permanent `effectId`.
- Any following block must run at a declared timing, normally `afterBaseEffect` for MVP variants.
- If the base effect fails validation, augmentation blocks should not run.

### `damageUnit`

**Meaning:** Deal a fixed amount of damage to a selected unit.

**Owner/opponent perspective:** The selector defines whether the unit is an owner unit or opponent unit. The operation itself only changes the selected unit’s HP.

**Existing repo behavior it maps to:** Existing direct unit damage patterns subtract HP, respect current protection where applicable, and then clean up defeated units through existing death cleanup routines.

**Risks / caveats:**

- Must declare whether the cleanup context is combat or non-combat.
- Death cleanup can trigger death effects; combat-only triggers should only happen in combat cleanup.
- Last Stand-style minimum-HP protection and on-damage-survive behavior should match existing damage patterns.

### `damageEnemyBase`

**Meaning:** Deal a fixed amount of damage to the enemy base.

**Owner/opponent perspective:** Absolute base selector: always affects `enemyHP`, not necessarily the opponent of `owner`.

**Existing repo behavior it maps to:** Player open-lane attacks reduce the enemy base.

**Risks / caveats:**

- Do not use this when the intended target is “opponent base”; use a future owner-relative base block for that.
- Base damage can affect winner/tiebreaker interpretation in reports.

### `damagePlayerBase`

**Meaning:** Deal a fixed amount of damage to the player base.

**Owner/opponent perspective:** Absolute base selector: always affects `playerHP`, not necessarily the opponent of `owner`.

**Existing repo behavior it maps to:** Enemy open-lane attacks reduce the player base.

**Risks / caveats:**

- Do not use this when the intended target is “opponent base”; use a future owner-relative base block for that.
- Base damage can affect winner/tiebreaker interpretation in reports.

### `debuffAttack`

**Meaning:** Apply a temporary negative attack modifier to a selected unit.

**Owner/opponent perspective:** The selector defines whose unit can be debuffed. Current examples primarily debuff opponent units.

**Existing repo behavior it maps to:** Hacker and Jam Signal apply `tempAttackMod -= 1` to opponent units, with effective attack clamped by existing attack calculation.

**Risks / caveats:**

- Temporary attack modifiers clear after combat.
- Targeting should usually avoid units already at 0 effective ATK unless the variant intentionally allows it.
- AI/reporting should distinguish attack debuff value from immediate damage or kills.

### `debuffArmor`

**Meaning:** Apply a temporary negative armor modifier to a selected unit.

**Owner/opponent perspective:** The selector defines whose unit can be debuffed. Shield Push armor-debuff variants should target a selected opponent unit.

**Existing repo behavior it maps to:** Existing code already uses temporary armor modifiers for positive armor buffs and clamps effective armor to a minimum of 0. No current card uses a negative armor modifier.

**Risks / caveats:**

- This is an MVP experimental block, not an existing card behavior.
- It must use the same temporary modifier lifetime as existing temporary armor buffs.
- Reports should treat it as armor reduction, not damage.

### `buffAttack`

**Meaning:** Apply a temporary positive attack modifier to a selected unit or group of selected units.

**Owner/opponent perspective:** Current repo examples buff owner units.

**Existing repo behavior it maps to:** Full Attack, Swarm Attack, Quick Fix, and Rotcaller-style effects use temporary attack modifiers.

**Risks / caveats:**

- Temporary attack modifiers clear after combat.
- Buffing after immediate combat may have no effect until later combat; timing must be explicit.
- AI scoring may need to see whether the buff changes pressure before combat.

### `buffArmor`

**Meaning:** Apply a temporary positive armor modifier to a selected unit or group of selected units.

**Owner/opponent perspective:** Current repo examples buff owner units.

**Existing repo behavior it maps to:** Fortify, Brace, Reinforce Line, and Hold The Line use temporary armor modifiers.

**Risks / caveats:**

- Temporary armor modifiers clear after combat.
- Armor may not matter if the unit is not likely to take unit damage before cleanup.
- AI already has some armor-gain scoring, but variants should still be probe-scored.

### `drawOne`

**Meaning:** Draw one card for the owner side.

**Owner/opponent perspective:** The acting `owner` draws from its own deck into its own hand.

**Existing repo behavior it maps to:** Recall, Feast/Substrate, and Quick Fix draw-trigger behavior all draw for the relevant owner side and produce draw result feedback where applicable.

**Risks / caveats:**

- Hand-size and deck exhaustion behavior must match existing draw helpers.
- Draw timing should be explicit, especially when combined with destroy, return, or combat-kill triggers.
- MVP variants should avoid creating new delayed draw triggers; use immediate `drawOne` only.

## Explicitly unsupported for MVP

Balance Lab v3 Experimental Effect Blocks MVP should explicitly reject or avoid:

- Arbitrary JavaScript patches.
- New permanent `effectId` behavior.
- `effectParams` in production cards.
- Summon, revive, or fallen-list manipulation.
- Death-trigger creation.
- New AI systems.
- UI changes.

These may become future design topics, but they are out of scope for the first controlled block catalog.

## Example variant JSONs

These examples are documentation examples only. They describe intended variant shape for a future Balance Lab v3 task and are not currently executable by Balance Lab v2-lite.

### A) Shield Push + damage first selected enemy after base swap

```json
{
  "schemaVersion": 1,
  "variantId": "wardens_shield_push_damage_first_selected_after_swap_v1",
  "label": "Shield Push + damage first selected enemy after base swap",
  "scope": {
    "factionId": "wardens",
    "cardId": "wardens_shield_push_1",
    "baseEffectId": "swap_adjacent_enemy_units"
  },
  "timing": "afterBaseEffectBeforeDiscard",
  "sequence": [
    { "operation": "runBaseEffect" },
    {
      "operation": "damageUnit",
      "selector": "firstSelectedAfterBaseEffect",
      "amount": 1,
      "cleanup": "nonCombat"
    }
  ],
  "textPatch": {
    "textShort": "Swap two adjacent [ENEMIES]. Deal 1 damage to the first selected [ENEMY]."
  },
  "ai": {
    "reuseBaseEffectTargeting": true,
    "reuseBaseEffectHeuristic": true,
    "scoreByResolverProbe": true
  },
  "telemetryTags": ["shield-push", "damage-unit", "first-selected-after-base-effect"]
}
```

### B) Shield Push + debuff armor on first selected enemy after base swap

```json
{
  "schemaVersion": 1,
  "variantId": "wardens_shield_push_debuff_armor_first_selected_after_swap_v1",
  "label": "Shield Push + -1 ARM to first selected enemy after base swap",
  "scope": {
    "factionId": "wardens",
    "cardId": "wardens_shield_push_1",
    "baseEffectId": "swap_adjacent_enemy_units"
  },
  "timing": "afterBaseEffectBeforeDiscard",
  "sequence": [
    { "operation": "runBaseEffect" },
    {
      "operation": "debuffArmor",
      "selector": "firstSelectedAfterBaseEffect",
      "amount": 1,
      "duration": "untilCombatCleanup"
    }
  ],
  "textPatch": {
    "textShort": "Swap two adjacent [ENEMIES]. The first selected [ENEMY] gets -1 ARM until combat."
  },
  "ai": {
    "reuseBaseEffectTargeting": true,
    "reuseBaseEffectHeuristic": true,
    "scoreByResolverProbe": true
  },
  "telemetryTags": ["shield-push", "debuff-armor", "first-selected-after-base-effect"]
}
```

### C) Shield Push + damage enemy base after base swap

```json
{
  "schemaVersion": 1,
  "variantId": "wardens_shield_push_damage_enemy_base_after_swap_v1",
  "label": "Shield Push + damage enemy base after base swap",
  "scope": {
    "factionId": "wardens",
    "cardId": "wardens_shield_push_1",
    "baseEffectId": "swap_adjacent_enemy_units"
  },
  "timing": "afterBaseEffectBeforeDiscard",
  "sequence": [
    { "operation": "runBaseEffect" },
    {
      "operation": "damageEnemyBase",
      "selector": "enemyBase",
      "amount": 1
    }
  ],
  "textPatch": {
    "textShort": "Swap two adjacent [ENEMIES]. Enemy base loses 1 HP."
  },
  "ai": {
    "reuseBaseEffectTargeting": true,
    "reuseBaseEffectHeuristic": true,
    "scoreByResolverProbe": true
  },
  "telemetryTags": ["shield-push", "damage-enemy-base"]
}
```

## Future implementation notes

- Variants must run only in a Balance Lab temp copy.
- Real repo card data and production gameplay must remain unchanged by variant runs.
- `scripts/simulate-battles.mjs` should remain unchanged for this planning phase.
- For Shield Push variants, the base `effectId` should remain `swap_adjacent_enemy_units`.
- AI and targeting should keep using the base effect so existing Shield Push adjacent-pair targeting and heuristics continue to work.
- For Shield Push variants, the recommended timing is `afterBaseEffectBeforeDiscard`.
- `afterBaseEffectBeforeDiscard` means the normal Shield Push swap resolves first, then the augmentation block runs, then the card/action completes.
- This keeps base targeting and AI behavior intact while making the extra effect part of the same card resolution.
- When a non-Shield Push variant sequence includes `runBaseEffect`, augmentation blocks should run after the base effect unless the variant explicitly declares a safer supported timing.
- Damage blocks must use existing damage and defeated-unit cleanup patterns.
- Variant reports should include the active `variantId`, base commit SHA, seed, match count, and telemetry tags so results are interpretable.
- Any future implementation should prefer a small registry of supported selectors and operations over arbitrary custom code.
