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

## Notes
- These decisions are intentionally constrained to reduce implementation risk and improve iteration speed.
