# Gridfall Tutorial V1 — Architecture

**Status:** Approved architecture / implementation pending.

## Goal

Create a playable Tutorial V1 for Gridfall that teaches the real BattleScene flow using real mechanics, but in a controlled scripted scenario.

The tutorial should be short, readable, mobile-first, and satisfying. It should lead the player to a real victory, not just explain rules.

## Core principle

Tutorial must teach the real game, but must not interfere with Arena, Campaign, Balance Lab, or normal card/deck randomness.

---

## 1. High-level design

Tutorial V1 is a separate playable BattleScene mode.

It is not:

- Arena,
- Campaign,
- static TutorialScene content,
- Balance Lab data,
- normal AI battle.

It reuses:

- BattleScene rendering,
- real GameState mechanics,
- real mulligan UI,
- real unit play,
- real adjacent board swap,
- real redeploy,
- real effect card play,
- real PASS,
- real combat resolution,
- standard victory/result presentation style.

It adds:

- tutorial-only battle context,
- tutorial-only card/deck data,
- deterministic opening/mulligan,
- scripted enemy action sequence,
- tutorial step controller,
- tutorial input gating,
- tutorial banner layer,
- tutorial highlight/focus layer,
- tutorial-specific result return to Game Menu.

---

## 2. Entry and routing

### Current state

The project already has a Tutorial button in Main Menu and a TutorialScene, but diagnostics showed this is currently a static/menu-style tutorial screen, not the planned BattleScene-driven tutorial.

### Target state

There must be exactly one Tutorial entry point.

Tutorial should live inside the Game menu / “Gra” menu, alongside:

- Continue,
- New Game,
- Arena,
- Tutorial.

Main Menu should not also contain a separate Tutorial button.

Expected flow:

```text
Main Menu → Gra / Game Menu → Tutorial → BattleScene tutorial mode → victory panel → return to Game Menu
```

Tutorial must not:

- start or modify Campaign,
- consume Campaign attempts,
- touch campaign runId,
- route to FactionSelectScene like Arena,
- silently fall back to Arena.

BattleScene must preserve `battleContext.mode = 'tutorial'`.
Unknown battle modes currently fall back to Arena, so tutorial mode must be explicit.

---

## 3. Tutorial battle context

Tutorial should use a distinct BattleScene context:

```text
battleContext:
- mode: tutorial
- tutorialId: tutorial_v1
- returnSceneKey: GameMenuScene
```

The exact implementation can vary, but architecturally tutorial mode must survive BattleScene normalization.

Tutorial result handling:

- On victory, show the standard victory/result feel.
- Tutorial result button returns to GameMenuScene.
- Tutorial should not show Arena EXIT/RETRY by default unless explicitly designed later.
- Tutorial should never use Campaign CONTINUE or campaign result logic.

---

## 4. Data separation

Tutorial cards and decks must be separate from normal faction data.

Do not:

- add tutorial cards to existing faction JSON decks,
- register a tutorial faction in the normal faction registry,
- let tutorial cards enter Arena,
- let tutorial cards enter Campaign,
- let tutorial cards enter Balance Lab.

Preferred data model:

```text
playerTutorialFaction:
- id: tutorial
- name: Tutorial
- deck: [...]

enemyTutorialFaction:
- id: tutorial-enemy or tutorial
- name: Tutorial Enemy
- deck: [...]
```

Card art convention:

Assets can follow existing card art path conventions, for example:

```text
public/assets/cards/tutorial/...
runtime: assets/cards/tutorial/...
```

Binary/image assets are uploaded manually by the user. Codex must not create or modify binary assets.

---

## 5. Battle length and HP

Tutorial V1 should use a reduced-HP scripted battle.

Recommended HP:

- Player HP: 7
- Enemy HP: 5

Reason:

Enemy HP 5 supports a short arc:

- small early base damage,
- another small base damage,
- final PASS triggers combat,
- open lanes deal 3 total damage,
- enemy base reaches 0 exactly at the end.

Player HP 7 gives safety margin and avoids accidental player loss.

Recommended battle length:

- 6 real battle turns after mulligan.

Reason:

Starting from an empty board and teaching all required mechanics cleanly requires six player action opportunities:

1. play first unit,
2. play second unit,
3. adjacent swap,
4. redeploy,
5. play effect,
6. final PASS.

---

## 6. Tutorial decks

### Player tutorial deck

Recommended: 10 cards.

Why 10:

- feels like a real small deck,
- supports normal 4-card starting hand,
- supports mulligan,
- supports post-combat draws,
- avoids resource exhaustion / no-progress edge cases,
- makes DECK counter meaningful,
- allows harmless filler cards.

Player required cards:

1. Unit A — first unit played.
2. Unit B — card obtained through deterministic mulligan replacement.
3. Unit C — redeploy unit.
4. Effect card — uses effectId `buff_all_atk_1`.
5. Mulligan bait card — specifically selected for replacement.
6. Filler card.
7. Filler card.
8. Filler card.
9. Filler card.
10. Filler card.

### Enemy tutorial deck

Recommended: 6 cards.

Enemy required cards:

1. Blocker A.
2. Blocker B.
3. Blocker C.
4. Blocker D.
5. Filler blocker.
6. Filler blocker/effect.

Enemy does not need full normal AI deck depth because enemy actions are scripted. Enemy PASS does not require a card.

---

## 7. Deterministic mulligan

Tutorial must teach mulligan, but only in a deterministic tutorial-only way.

Normal Arena/Campaign mulligan must remain unchanged.

Tutorial mulligan requirements:

- Player sees normal 4-card starting hand.
- Tutorial highlights exactly one card to replace.
- Only selecting the correct card progresses the tutorial.
- Player confirms MULLIGAN 1 through the real UI.
- A specific replacement card must enter the hand.
- That replacement card must be one needed later in the tutorial.

Important:

This must not be done by globally changing mulligan randomness.

Tutorial needs a mode-gated opening configuration, conceptually able to control:

- player opening deck/order,
- enemy opening deck/order,
- initial shuffle behavior,
- player mulligan replacement draw,
- enemy mulligan disabled/scripted,
- allowed/required mulligan card IDs.

Design rule:

Tutorial uses real mulligan interaction, but deterministic tutorial-only outcome.

---

## 8. Enemy behavior

Tutorial enemy does not use normal AI.

Enemy actions are a fixed scripted sequence.

Reason:

Normal AI can choose actions that break tutorial pacing, block the final hit, play unexpected cards, or surrender in contrived board states.

Tutorial enemy action system should conceptually provide explicit actions such as:

- play-unit,
- pass,
- play-effect if ever needed.

Enemy scripted actions should still use real resolution paths where possible, so battle history, discard, hand/deck counters, and combat remain coherent.

---

## 9. Tutorial input gating

Tutorial progresses only after the correct player action.

Examples:

- select the indicated mulligan card,
- confirm MULLIGAN 1,
- play the indicated unit to the indicated slot,
- swap the indicated adjacent units,
- redeploy the indicated hand unit onto the indicated board unit,
- play the indicated effect card,
- use PASS at the final moment.

Incorrect actions should not advance the tutorial.

Preferred UX:

- Highlight the correct object/action.
- Dim or ignore non-relevant choices.
- Use existing invalid/blocked feedback only lightly if needed.
- Avoid harsh punishment.
- Do not allow wrong legal actions to derail the script.

Input gating must not block core BattleScene state transitions:

- completePlayerAction,
- enemy scripted action,
- combat resolution,
- post-combat draw,
- result flow.

---

## 10. Banner and highlight architecture

Existing BattleScene banners are not enough as the tutorial step system.

Diagnostics showed current battle banners are transient, priority-based, and not a robust multi-step tutorial queue.

Tutorial needs its own step controller and tutorial banner layer.

Tutorial banners:

- appear in the same general screen area as current battle banners,
- should be larger,
- should have a distinct tutorial style,
- should be short,
- should support tap-to-continue or required-action continuation.

Tutorial highlights:

- should focus the element mentioned by the banner,
- may reuse existing board/card/slot/lane highlights,
- likely needs new tutorial focus support for:
  - DECK button,
  - battle menu / hamburger,
  - hand group,
  - base panels,
  - PASS/base action,
  - result/continue if needed.

---

## 11. UI orientation sequence

The tutorial starts by showing the real BattleScene UI.

Player advances through these with tap or required click where noted.

### 1. Enemy/player bases

PL: Zbij bazę przeciwnika. Chroń swoją.
EN: Break the enemy base. Protect yours.

### 2. Hand and lanes

PL: Zagrywaj karty na trzy linie walki.
EN: Play cards into three battle lanes.

### 3. DECK / TALIA button

Required action: click DECK/TALIA.

PL: TALIA pokazuje, ile kart zostało. Kliknij ją.
EN: DECK shows how many cards remain. Tap it.

### 4. Battle history panel

PL: Tu zapisuje się historia walki.
EN: Battle history is recorded here.

### 5. Battle menu / hamburger

Required action: open battle menu.

PL: Otwórz menu bitwy.
EN: Open the battle menu.

### 6. Menu contents

PL: Tu są zasady, ustawienia i poddanie.

Możesz się poddać, jeśli jesteś leszczem.
EN: Rules, settings, and surrender are here.

You can surrender if you're lame.

Important:

Surrender is shown as a menu option only. The player is not asked to surrender.

---

## 12. Gameplay tutorial sequence

After UI orientation, the tutorial teaches real battle flow.

Banner text PL / EN:

### 7. Mulligan intro

PL: Przed walką możesz wymienić do dwóch kart.
EN: Before battle, you may replace up to two cards.

### 8. Mulligan selection

PL: Wybierz jedną kartę do wymiany.
EN: Choose one card to replace.

### 9. Mulligan confirm

PL: Potwierdź wymianę.
EN: Confirm the replacement.

### 10. Unit play

PL: Zagraj jednostkę na planszę.

Masz 1 akcję na turę albo PASS.
W następnej turze przeciwnik ruszy pierwszy.
EN: Play a unit onto the board.

You get 1 action per turn, or PASS.
Next turn, the enemy acts first.

### 11. Enemy action

PL: Przeciwnik też wykonuje jedną akcję.
EN: The enemy also takes one action.

### 12. Combat after actions

PL: Po akcjach obu stron linie walczą.
EN: After both actions, the lanes fight.

### 13. Adjacent swap

PL: Zamień sąsiednie jednostki miejscami.
EN: Swap adjacent units.

### 14. Redeploy

PL: Jednostka z ręki może zastąpić tę na planszy.
EN: A unit from your hand can replace one on the board.

### 15. Effect card

PL: Efekty działają od razu i znikają.
EN: Effects resolve immediately, then disappear.

### 16. Empty lane

PL: Pusta linia uderza w bazę.
EN: An empty lane strikes the base.

### 17. Final PASS

PL: Masz dobrą pozycję. Użyj PASS.
EN: Your position is good. Use PASS.

After PASS:

- combat resolves,
- open lanes strike enemy base,
- enemy base reaches 0,
- standard victory/result panel appears.

---

## 13. Recommended 6-turn script

### Turn 1

Player action:

- Play Unit A into a specified lane.

Enemy scripted action:

- Play Blocker A opposite Unit A.

Combat:

- Unit-vs-unit combat.
- No base damage or controlled minimal damage.

Lesson:

- Unit cards go onto board and stay there.
- Both sides get one action.

### Turn 2

Enemy scripted action:

- PASS or harmless action.

Player action:

- Play Unit B adjacent to Unit A.

Combat:

- One open lane may hit enemy base for 1.

Lesson:

- Board expands.
- Empty lanes can threaten the base.

### Turn 3

Player action:

- Swap adjacent Unit A and Unit B.

Enemy scripted action:

- Play Blocker B in a controlled lane.

Combat:

- Position matters.
- Optional small base damage.

Lesson:

- Basic board swap is adjacent-only.

### Turn 4

Enemy scripted action:

- Play Blocker C.

Player action:

- Redeploy Unit C from hand onto an occupied friendly slot.

Combat:

- Controlled blockers absorb damage.

Lesson:

- A hand unit can replace a board unit.
- The displaced unit returns to hand if hand size allows.

### Turn 5

Player action:

- Play effect card using `buff_all_atk_1`.

Enemy scripted action:

- Play Blocker D / use blocker setup to absorb buffed attack.

Combat:

- ATK increase is visible.
- Buff matters in combat.
- Buff expires after combat.

Lesson:

- Effects resolve immediately and do not stay on board.

Important:

Do not rely on this buff for final PASS victory. `buff_all_atk_1` is temporary and clears after combat.

### Turn 6

Enemy scripted action:

- PASS.

Player action:

- PASS.

Final board before PASS:

- Enemy has already acted.
- Enemy relevant lanes are open.
- Player has Unit C in an open lane with 2 ATK.
- Player has Unit A in another open lane with 1 ATK.
- Enemy HP = 3.
- Player HP safely above 0.

Combat:

- Unit C deals 2 base damage.
- Unit A deals 1 base damage.
- Enemy HP goes from 3 to 0.
- Victory panel appears.

Lesson:

- Sometimes the best move is to keep position and PASS.

---

## 14. Effect choice

Tutorial effect:

Use existing effectId:

- `buff_all_atk_1`

Reason:

- non-targeted,
- visible board stat change,
- no damage/death,
- no armor,
- no draw limit,
- no revive,
- no tokens,
- no immediate combat,
- no targeting lesson required.

Avoid in Tutorial V1:

- `draw_1`,
- `heal_1` unless pre-damaged unit is scripted,
- armor effects,
- AoE damage,
- revive,
- summon/token effects,
- quick strike,
- swap effects.

---

## 15. PASS design

PASS is taught late, near the end.

Reason:

Early PASS can feel like “skip the game” before the player understands why skipping can be useful.

Final PASS teaches:

- the board is already good,
- no more card is needed,
- PASS can preserve a winning position,
- combat resolves after both sides act.

Final banner:

PL: Masz dobrą pozycję. Użyj PASS.
EN: Your position is good. Use PASS.

PASS is not taught as surrender.

Surrender is shown only in battle menu/hamburger.

---

## 16. Risks and safeguards

Risk: tutorial mode falls back to Arena.
Safeguard: Explicitly preserve `battleContext.mode = 'tutorial'`.

Risk: tutorial result routes to FactionSelectScene.
Safeguard: Tutorial-specific result return to GameMenuScene.

Risk: campaign save/progression touched accidentally.
Safeguard: Tutorial must not call campaign creation, selection, result, save, or clear logic.

Risk: mulligan randomness breaks required hand.
Safeguard: Tutorial-only deterministic opening/mulligan config.

Risk: enemy AI breaks scenario.
Safeguard: No normal AI in tutorial. Scripted enemy actions only.

Risk: filler cards derail tutorial.
Safeguard: Tutorial input gate allows only current required action to progress.

Risk: buff expires before final hit.
Safeguard: Use buff only for its own lesson turn, not for final lethal.

Risk: redeploy blocked by hand-size limit.
Safeguard: Keep player hand size below max before redeploy.

Risk: accidental early victory.
Safeguard: Enemy HP 5, scripted blockers, controlled open-lane hits.

Risk: accidental player loss.
Safeguard: Player HP 7, low/no-attack enemy blockers.

Risk: resource exhaustion/no-progress.
Safeguard: Player deck 10 cards, enemy deck enough cards, persistent board state.

---

## 17. Acceptance criteria for Tutorial V1

Tutorial V1 is successful if:

- It launches from Game Menu only.
- There is no duplicate Tutorial button in Main Menu.
- It uses BattleScene, not a static tutorial page.
- It is separate from Arena and Campaign.
- It does not affect Balance Lab.
- It uses tutorial-only cards/decks.
- It teaches mulligan with deterministic replacement.
- It teaches unit play.
- It teaches one-action-per-side into combat.
- It teaches adjacent board swap.
- It teaches redeploy.
- It teaches effect cards using `buff_all_atk_1`.
- It teaches empty lane base damage.
- It teaches PASS as the final winning action.
- It shows battle menu and communicates surrender location.
- It ends with a standard victory/result panel.
- It returns to Game Menu after completion.
- Normal Arena/Campaign mulligan, decks, AI, results, and saves remain unchanged.
