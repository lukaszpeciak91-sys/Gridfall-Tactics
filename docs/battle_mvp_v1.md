# Battle System MVP v1.0 (Frozen Specification)

## 🎯 PURPOSE

Define the **final, frozen MVP battle system**:

- core rules
- deck structure
- 4 universal faction archetypes

This document is the **single source of truth** for Codex tasks.

---

## 🔌 IMPLEMENTATION CONTRACT (CRITICAL)

This document defines gameplay rules only.

Code must implement:
- GameState structure (board, hand, deck, discard, turn)
- Card objects with:
  - id
  - type (unit/order/special/utility)
  - stats (hp, attack, initiative, armor if present)
  - effects (optional)

Scene responsibilities:
- BattleScene → rendering + input
- GameState → data + rules
- Systems → resolution logic

DO NOT implement rules outside GameState / systems.

---

# 🧠 CORE DESIGN PRINCIPLES

- simple > complex
- readable > realistic
- decisions > randomness
- no hard counters
- every matchup is winnable

Each faction:
- has a **core strategy**
- has **1–2 safety tools**
- is NOT hard-countered

---

# ⚙️ CORE RULES (LOCKED)

## Board

- 3x3 grid

Enemy Row  
Middle Row  
Player Row

---

## Turn System

Each turn:

1. Draw 1 card

2. Player performs **1 action only**:
   - play a card
   - OR use effect
   - OR pass

3. Enemy does the same

4. Resolve combat automatically

---

## Combat Resolution

- Units act in order of **initiative (higher first)**

Attack rules:
- melee: front cell
- ranged: same column

- Damage reduces HP
- Armor reduces damage by 1 (if present)

---

## Win Condition

- destroy all enemy units OR
- survive until enemy cannot act

---

## Card System

### Deck (LOCKED)

- 10 cards per faction

Structure:
- 5 Units
- 3 Orders
- 1 Special
- 1 Utility

---

## Hand

- start: 3 cards
- draw: +1 per turn
- max hand: 5

---

## Mulligan Lite

- player may replace **1 card at start**

---

# ⚔️ UNIVERSAL ARCHETYPES (GAMEPLAY, NOT THEME)

These are **mechanical identities**, not narrative.

---

# ⚡ ARCHETYPE 1 — AGGRO (Tempo)

## Playstyle

- fast damage
- early pressure

## Deck

### Units

- Runner (2/1, init 4, +1 atk if first)
- Striker (2/2, init 3)
- Glass Cannon (3/1, init 3, dies after attack)
- Flanker (1/2, init 4, +1 atk if side empty)
- Scout (1/1, init 5, reveal enemy card)

### Orders

- Full Attack (+1 atk all units)
- Rush (move + attack)
- Pierce Strike (ignore armor) ← safety tool

### Special

- Adrenaline (extra action once)

### Utility

- Quick Fix (heal 2)

---

# 🛡️ ARCHETYPE 2 — TANK (Durability)

## Playstyle

- survive
- control tempo

## Deck

### Units

- Shieldbearer (1/3, init 1, gives armor)
- Heavy (2/4, init 1)
- Guardian (1/3, init 2, intercept)
- Wall (0/5, init 0, blocks)
- Bruiser (2/3, init 1, gains atk when hit)

### Orders

- Fortify (+1 armor all)
- Stability (cannot be moved/disabled) ← safety tool
- Reinforce (heal all 1)

### Special

- Last Stand (units cannot drop below 1 HP for 1 turn)

### Utility

- Repair Kit (heal 3)

---

# 🎯 ARCHETYPE 3 — CONTROL (Manipulation)

## Playstyle

- positioning
- disruption

## Deck

### Units

- Hacker (1/2, init 3, -1 enemy init)
- Disruptor (1/2, init 2, disables effect)
- Sniper (2/1, init 4, free target)
- Controller (1/2, init 2, move enemy)
- Drone (1/1, init 3, death debuff)

### Orders

- Swap (swap positions)
- Jam Signal (-1 enemy init all)
- Pulse Wave (1 dmg all enemies) ← safety tool

### Special

- System Override (control enemy unit for 1 turn)

### Utility

- Recall (remove unit, draw 1)

---

# 🧬 ARCHETYPE 4 — SWARM (Numbers)

## Playstyle

- overwhelm with quantity
- pressure board

## Deck

### Units

- Grunt (1/1, init 2)
- Spitter (1/1, init 3, deal 1 on entry)
- Brood (1/2, init 2, spawns Grunt on death)
- Rusher (2/1, init 3)
- Alpha (2/2, init 2, buffs neighbors)

### Orders

- Spawn (add Grunt)
- Swarm Attack (+1 atk all)
- Regrow (chance to revive 1 HP) ← safety tool

### Special

- Flood (fill empty slots with 1 HP units)

### Utility

- Recycle (destroy unit → draw 2)

---

# 🖼️ FACTION SYSTEM (GENERIC)

Factions are data-driven:

```json
{
  "factionId": "aggro",
  "name": "Faction Name",
  "frameImage": "frame_default",
  "deck": []
}
```

## 🎨 THEMING RULE

gameplay is fixed  
theme is swappable

You can change:
- names
- art (.jpg)
- flavor text

WITHOUT changing mechanics.

---

## 🚫 HARD RULES

- no extra cards
- no matchup bonuses
- no hidden rules
- no overengineering

---

## 🎯 SUCCESS CRITERIA

- each faction can win against all others
- matches last 3–6 turns
- player always has at least one meaningful decision
- losses feel like player error, not matchup lock

---

## 📦 FILE USAGE

This file should be stored as:  
`/docs/battle_mvp_v1.md`

Used by:
- Codex (reference)
- Architect (task planning)
- future balancing

---

## 🤖 RULES FOR CODEX

Always read this file before implementing gameplay logic.

Do NOT invent new mechanics.
Do NOT change card counts or structure.
Do NOT add new card types.

If something is unclear → ask instead of guessing.
If implementation contradicts this spec → report it.

This file overrides assumptions.
