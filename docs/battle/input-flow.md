# Battle Input Flow (Canonical)

## 1) Purpose / Scope

This document is the authoritative reference for **battle input routing and interaction UX behavior** in `BattleScene`.

- It defines how taps, long-presses, targeting, implicit swap, cancellation, and PASS/surrender interactions are arbitrated at runtime.
- It does **not** redefine gameplay/balance rules or card rules text.
- Core gameplay/rules authority remains in [`docs/rules/mvp-battle-rules.md`](../rules/mvp-battle-rules.md).

For project process and documentation conventions, also see:
- [`docs/project/workflow.md`](../project/workflow.md)
- [`docs/README.md`](../README.md)

---

## 2) Input Priority Model

Battle input is resolved by state priority, not raw tap location alone. Effective precedence is:

1. **Global blockers / modal-like blockers**
   - Navigation transitions, utility/deck panels, result modal, flow/effect resolution guards, and opening mulligan gates short-circuit normal board interactions.
2. **Targeting / effect-cast flow**
   - Active `targetingState` / `effectCastState` owns board taps for target selection or effect progression.
3. **Long-press inspect path**
   - Long-press on board cell or hand card may open inspect/preview and suppress the release tap action.
4. **Implicit board swap path**
   - Idle own-unit board interactions enter/commit/cancel swap selection through `pendingSwapIndex`.
5. **Idle board taps**
   - With no selected card, no targeting, no effect cast, and no pending swap, board taps evaluate as swap-source selection on own units.
6. **PASS / hold-to-surrender button flow**
   - PASS remains the action button behavior; hold gesture is layered for surrender where allowed.

---

## 3) Board Interaction Model

### Quick tap behavior
- Quick tap on a **player-owned unit** in idle mode starts implicit swap selection.
- Quick tap on a **legal adjacent player unit** while swap source is active commits swap.
- Quick tap during active targeting routes to targeting logic, not swap logic.

### Long-press behavior
- Long-press on a board unit opens inspect (when state allows).
- If long-press triggered, the corresponding pointer-up does not also perform tap action.

### Idle board interaction
- Idle mode means: no selected hand card, no `targetingState`, no `effectCastState`, no active swap selection.
- In idle mode, own-unit board tap is interpreted as swap-source intent.

### Own unit vs enemy unit vs empty cell
- **Own unit**: can become swap source (idle) or swap destination (when source is active).
- **Enemy unit / empty cell** while swap source is active: cancels swap selection.
- Enemy/empty cells are never valid implicit swap destinations.

### Outside/UI taps
- UI-reserved pointer-up areas do not fall through to board action handling.
- Outside taps can clear inspect/selection state depending on active context.
- Interrupted hand-card and board-cell gestures cancel their pending long-press timers and pressed-state bookkeeping without running tap behavior.

---

## 4) Long-Press Inspect

- Inspect is **long-press driven** for board and hand interactions.
- Quick tap does **not** open inspect.
- Long-press marks the interaction as consumed so the release event does not fire a second ghost tap action.
- Hand-card pointer-down may provisionally select a card to keep quick taps responsive, but a completed long-press clears that gameplay selection and any provisional targeting before opening the inspect preview.
- If long-press inspect triggers on the same unit that was just selected as swap source on pointer-down, pending swap is cleared to avoid dual-mode ambiguity.

---

## 5) Implicit Swap UX (Authoritative)

### Idle start
1. Player taps own board unit.
2. `pendingSwapIndex` is set immediately to that source index.
3. Prompt/banner shows: **“SWAP: select adjacent unit”**.
4. Legal adjacent allied destinations are highlighted.

### Commit
1. Player taps legal adjacent allied destination.
2. Runtime calls `performSwap(...)`.
3. On success, runtime finalizes via `completePlayerAction(...)` with swap feedback/action record.

### Cancel
Any non-commit input (e.g., enemy cell, empty cell, UI/outside interaction paths that cancel selection context) clears swap selection:
- `pendingSwapIndex = null`
- swap prompt/label cleared
- highlights reset

### Explicit authority
- There is **no standalone SWAP button** in this model.
- PASS remains PASS (separate action button behavior).
- `pendingSwapIndex` is the authoritative player swap-selection state.
- `actionMode='swap'` is deprecated/removed for player board-swap flow ownership.

---

## 6) Targeting / Effect Precedence

- `targetingState` and `effectCastState` override implicit swap routing.
- Card/effect targeting always has precedence over board-swap selection.
- Swap-source selection cannot begin while targeting/effect resolution state is active.
- Board taps during targeting are validated against target constraints before any action can resolve.

---

## 7) Hold-to-Surrender

- Primary button behavior remains **PASS** when pass is legal and player action economy permits it.
- In concedable contexts, UI presents informational guidance (e.g., hold PASS to surrender).
- Surrender requires hold-threshold completion and valid activation constraints.
- There is no automatic player surrender trigger from simple tap/cancel flows.

---

## 8) Cancel / Reset Rules

Authoritative reset sources include:

- Outside taps (context-sensitive clear of inspect/selection/preview).
- Explicit targeting cancel paths.
- Turn/action transitions and post-resolution cleanup.
- Successful action completion (`completePlayerAction(...)`) resetting transient input context.
- Inspect transitions where long-press consumed pointer-up and/or inspect state replacement requires clearing prior transient selection.

Typical transient state cleared by these paths includes:
- `pendingSwapIndex`
- `selectedCardId`
- `targetingState`
- `effectCastState`
- inspect preview indices/ids and corresponding prompts/highlights where relevant.

---

## 9) Implementation Notes

Runtime ownership is split deliberately:

- **`onScenePointerUp(...)`**
  - Top-level arbitration and guard checks.
  - Routes to board tap handling only when event is not UI-reserved and not consumed by higher-priority contexts.
- **`onBoardCellTap(...)`**
  - Owns board-cell semantic outcomes (swap start/commit/cancel, targeting selection, unit play/redeploy placement attempts).
- **Pointer-down responsibilities**
  - Early swap-source intent capture (`trySelectImplicitSwapSourceOnPointerDown(...)`).
  - Start long-press timers.
- **Pointer-up responsibilities**
  - Commit/cancel semantics for taps after arbitration.
  - Suppress tap execution if long-press already consumed the interaction.
- **Long-press suppression model**
  - Press state tracks whether long-press fired; corresponding release path exits without duplicate tap action.
- **Interrupted-gesture cleanup**
  - Hand-card and board-cell `pointerout` handlers clear only their gesture-local pressed state and delayed long-press event.
  - Phaser 3.90 exposes `pointerupoutside` on the Scene Input Plugin rather than on individual Game Objects, so `onScenePointerUpOutside(...)` clears both gesture paths.
  - Phaser routes mobile `touchcancel` through its pointer-up pipeline with `pointer.wasCanceled = true`; Game Object and scene-level pointer-up handlers detect that flag and clean gesture state before tap arbitration.

---

## 10) Testing Notes

For input systems, prefer **runtime/state-flow tests** that execute real interaction sequences:
- pointerdown -> hold -> pointerup
- pointerdown -> pointerup tap
- swap start -> cancel paths
- targeting active -> board tap precedence validation

Source/regex/static checks are useful for guardrails, but insufficient alone for interaction regressions.

Any change to input arbitration should be validated with flow-level tests that confirm final state fields (`pendingSwapIndex`, targeting/effect state, inspect state, and action usage) under real sequencing.

---

## Optional Back-References

If older diagnostics/reference notes discuss swap/surrender interaction edge-cases, add a short pointer to this file so this remains the single canonical input-flow authority.
