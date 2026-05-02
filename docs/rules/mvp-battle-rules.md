# MVP Battle Rules (Canonical)

**Status:** Frozen for MVP implementation  
**Last Updated:** 2026-05-02  
**Scope:** Gameplay rules for the MVP battle loop

This is the **single canonical source of truth** for MVP battle rules.
If any other document conflicts with this file, this file wins.

## 1) Battle Outcome and Hero HP

- Player Hero HP: **12**
- Enemy Hero HP: **12**
- Battle ends immediately when either hero reaches **0 HP**.

## 2) Board Model

- Visual presentation may appear as a **3x3** board.
- Gameplay logic uses only:
  - **3 enemy slots** (top combat row)
  - **3 player slots** (bottom combat row)
- Middle row is **visual/effects-only**.
- **No unit placement** is allowed in the middle row.
- Middle row does not create extra combat lanes or extra deployment capacity.

## 3) Combat Rules (Column Attack)

- Units attack only in the **same column**.
- **No diagonal attacks**.
- If the opposing slot in the same column is empty, the unit attacks the opposing hero HP.
- Combat resolves for all 3 columns after both sides have taken their turn action for the round.
- Both sides in a column can deal damage in the same combat resolution.

## 4) Deck and Hand Rules

- Deck size: **10 cards**.
- Starting hand: **3 cards**.
- Draw: **1 card per turn**.
- Max hand size: **5 cards**.
- Mulligan Lite at battle start: replace **1** card.
- No extra deck size rules for MVP.

## 5) Turn and Action Economy (Auto-Turn)

- Each side gets **one action per turn**.
- There is **no END TURN button/action**.
- The battle loop is **auto-turn**:
  1. Player takes one action.
  2. Enemy takes one action.
  3. Combat resolves.
  4. Player draws 1 card.
  5. Next player action begins.
- Valid player actions are:
  - Play card
  - Use effect/special
  - Swap two friendly board units
  - Redeploy from hand onto occupied friendly slot
  - Pass

### PASS

- `PASS` spends the player's one action for the turn.
- After `PASS`, enemy action and combat resolution still occur in the normal auto-turn flow.

## 6) Redeploy Rule (Locked)

Redeploy means:

1. Play a **unit card from hand** onto an **occupied friendly slot**.
2. The old board unit returns to hand.
3. The new unit takes the slot.
4. Redeploy consumes the full turn action.
5. Redeploy is blocked if hand is already full.

## 7) Swap Rule (Locked)

- Swap exchanges positions of **two friendly units** on the same side's combat row.
- Swap is only valid when both selected slots contain friendly units.
- Swap consumes the full turn action.

## 8) Hard MVP Exclusions

- No matchup bonuses.
- No diagonal attack rules.
- No middle-row gameplay placement (middle row remains visual-only).
- No extra deck-size systems.
- No END TURN flow.

## 9) Win Condition (Locked)

- Hero HP is the only MVP win/loss condition.
- Battle ends immediately when a hero reaches `0` HP.
- Unit wipeouts alone do not end the battle unless hero HP also reaches `0`.

## 10) Document Authority and References

- Canonical rules: `docs/rules/mvp-battle-rules.md` (this file).
- Historical/spec context only:
  - `docs/battle_mvp_v1.md`
  - `docs/project/decisions.md`
  - `docs/project/progress.md`
