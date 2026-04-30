# Project Decisions

## Initial MVP Scope
- Focus on **battle gameplay only** for the first playable milestone.
- Use a **3x3 board** to keep systems and balancing simple.
- Implement **turn-based** combat flow.
- Limit players to **1 action per turn** in MVP.
- Start with **4 faction archetypes** to establish strategic variety.

## Battle UI MVP Layout (2026-04-29)
- Lock battle screen to a **mobile-first portrait 9:16** layout for MVP.
- Use fixed vertical zones: **top bar (~10%)**, **board (~45%)**, **single action area (~10%)**, **hand area (~25%)**, **bottom info (~5-10%)**.
- Keep interaction scope minimal: **tap cards only**, **single EXECUTE TURN button**, and **no drag-and-drop or extra menus**.
- Use one global frame image key (`frame_default`) from faction data with a safe runtime fallback border when the frame asset is missing.
## Game State Initialization (MVP)
- Introduce a dedicated `GameState` system to initialize battle state from a selected faction deck.
- Keep battle state minimal for now: 9-cell board, player deck/hand/discard zones, and turn flags.
- Draw a **3-card starting hand** at battle start.
- Use debug text in `BattleScene` to visualize state values before card UI/gameplay is added.

## Notes
- These decisions are intentionally constrained to reduce implementation risk and improve iteration speed.


## Merge Integration Consistency (2026-04-30)
- Standardize faction selection + battle handoff on `factionKey` values (not faction display names).
- Treat `getFactionByKey` and `getFactionKeys` as the canonical faction API; avoid legacy map access in scenes.
- Normalize faction JSON imports to lowercase filenames for Linux/Vite case-sensitive resolution safety.
