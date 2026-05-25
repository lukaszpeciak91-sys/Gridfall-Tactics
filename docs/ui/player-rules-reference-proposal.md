# Player Rules Reference Proposal (Final Content Polish)

## 1) Final recommended terminology policy

Use one universal terminology set across EN + PL help and UI-facing rules copy:

- **ATK**
- **HP**
- **ARM**
- **PASS**
- Ally / Allies
- Enemy / Enemies
- Base / Base HP
- Swap
- Surrender

Polish help text should **keep ATK / HP / ARM / PASS as labels** and explain meanings in Polish where needed.
Do not switch glossary/help labels to PANC or PAS in this version.

---

## 2) Final EN player-help text

### 1) Goal
Reduce the enemy Base to 0 HP before your Base reaches 0.

### 2) Your Turn
- You get 1 action.
- Then the enemy gets 1 action.
- After both actions, combat resolves automatically.
- After combat: you draw 1 card, then the enemy draws 1 card.

### 3) Cards and Actions
On your action, you can:
- Play a unit
- Play an effect
- Use a targeted effect
- Swap adjacent allied units
- PASS

### 4) Board and Positioning
- Battles use 3 lanes.
- Your units fight enemies directly opposite them.
- If no enemy is opposite, your unit hits the enemy Base.
- The middle row is visual only.

### 5) Swap
- Tap one of your units, then tap an adjacent allied unit.
- The two allied units switch places.
- You can only swap your own adjacent units.

### 6) Pass and Surrender
- PASS ends your action for this turn.
- If surrender is available, hold PASS to surrender the match.

### 7) Icon Glossary
- **ATK**: Attack damage dealt in combat.
- **HP**: Health. At 0 HP, a unit is defeated.
- **ARM**: Armor that reduces incoming combat damage.
- **Ally**: One of your units.
- **Allies**: All your units.
- **Enemy**: One enemy unit.
- **Enemies**: All enemy units.
- **Base HP**: Your Base health. If it reaches 0, you lose.

### 8) Targeting Words
- **Ally** = one of your units.
- **Allies** = all your units.
- **Enemy** = one enemy unit.
- **Enemies** = all enemy units.

---

## 3) Final PL player-help text

### 1) Cel
Obniż HP bazy wroga do 0, zanim twoja baza spadnie do 0.

### 2) Twoja tura
- Masz 1 akcję.
- Potem wróg ma 1 akcję.
- Po obu akcjach walka rozstrzyga się automatycznie.
- Po walce: dobierasz 1 kartę, potem wróg dobiera 1 kartę.

### 3) Karty i akcje
W swojej akcji możesz:
- Zagrać jednostkę
- Zagrać efekt
- Użyć efektu celowanego
- Zamienić miejscami sąsiednie sojusznicze jednostki
- PASS

### 4) Plansza i pozycjonowanie
- Bitwa toczy się na 3 liniach.
- Twoje jednostki walczą z wrogami naprzeciwko.
- Jeśli naprzeciwko nie ma wroga, jednostka atakuje bazę wroga.
- Środkowy rząd jest tylko wizualny.

### 5) Zamiana
- Dotknij swojej jednostki, potem sąsiedniej sojuszniczej jednostki.
- Obie jednostki zamieniają się miejscami.
- Możesz zamieniać tylko własne, sąsiadujące jednostki.

### 6) PASS i poddanie
- PASS kończy twoją akcję w tej turze.
- Jeśli poddanie jest dostępne, przytrzymaj PASS, aby poddać mecz.

### 7) Słownik ikon
- **ATK**: Obrażenia zadawane w walce.
- **HP**: Punkty życia. Przy 0 HP jednostka zostaje pokonana.
- **ARM**: Pancerz zmniejszający otrzymywane obrażenia w walce.
- **Sojusznik**: Jedna twoja jednostka.
- **Sojusznicy**: Wszystkie twoje jednostki.
- **Wróg**: Jedna wroga jednostka.
- **Wrogowie**: Wszystkie wrogie jednostki.
- **HP bazy**: Życie twojej bazy. Gdy spadnie do 0, przegrywasz.

### 8) Słowa celowania
- **Sojusznik** = jedna twoja jednostka.
- **Sojusznicy** = wszystkie twoje jednostki.
- **Wróg** = jedna wroga jednostka.
- **Wrogowie** = wszystkie wrogie jednostki.

---

## 4) Remaining wording risks

1. **Current PL runtime labels still mix PASS/PAS and ARM/PANC in some places.**
   - This proposal intentionally standardizes help/glossary copy to PASS + ARM only.
2. **“Swap” vs “Zamień/Zamiana” style drift may appear across prompts/effect summaries.**
   - Keep one consistent verb family per surface during implementation pass.
3. **Legacy “hero” wording can still appear in older docs/comments.**
   - Keep player-facing rules/help on “Base” only.

---

## 5) Suggested future UI structure

Recommended layout for mobile readability:

- **Primary: Accordion sections** for 1–6 (Goal, Turn, Actions, Board, Swap, Pass/Surrender)
  - Fast scan
  - Short vertical reading
  - Easy progressive disclosure
- **Pinned Glossary block** for sections 7–8 (Icon Glossary + Targeting Words)
  - Always easy to revisit
  - Reusable for card inspect/help overlays
- **Optional tabs (if needed later):**
  - Tab A: Rules
  - Tab B: Glossary
- **Tooltip reuse:**
  - Reuse exact glossary lines for ATK/HP/ARM and Ally/Enemy targeting terms
- **Loading tips:**
  - Pull one-liners from Goal, Board, and Pass/Surrender
- **Tutorial prompts:**
  - Reuse short action lines from Cards and Actions + Swap + Targeting Words

---

## 6) Confirmation

This update is content polish only.

- No gameplay rules changed.
- No gameplay systems changed.
- No card data changed.
- No UI implementation added.
