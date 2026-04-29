# Project Decisions

## Initial MVP Scope
- Focus on **battle gameplay only** for the first playable milestone.
- Use a **3x3 board** to keep systems and balancing simple.
- Implement **turn-based** combat flow.
- Limit players to **1 action per turn** in MVP.
- Start with **4 faction archetypes** to establish strategic variety.

## Game State Initialization (MVP)
- Introduce a dedicated `GameState` system to initialize battle state from a selected faction deck.
- Keep battle state minimal for now: 9-cell board, player deck/hand/discard zones, and turn flags.
- Draw a **3-card starting hand** at battle start.
- Use debug text in `BattleScene` to visualize state values before card UI/gameplay is added.

## Notes
- These decisions are intentionally constrained to reduce implementation risk and improve iteration speed.
