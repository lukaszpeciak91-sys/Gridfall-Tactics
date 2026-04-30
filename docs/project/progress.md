# Project Progress

## Current Status
- Project initialized.
- Phaser skeleton planned.
- BattleScene MVP UI skeleton implemented with locked portrait layout zones, placeholder interactions, and frame fallback support.

## Next Milestones
- Wire placeholder battle interactions into real turn/state systems.
- Implement card/unit data models and board resolution logic.
- Add faction-specific UI frame assets beyond `frame_default`.
- Basic scene flow implemented: `StartScene` → `FactionSelectScene` → `BattleScene`.
- Added initial faction data and a minimal battle `GameState` system.
- `BattleScene` now initializes deck/hand/discard state and draws a 3-card starting hand.
- Battle debug info is rendered in-scene (faction, deck remaining, hand size, hand card names).

## Next Milestones
- Implement first gameplay actions and consume the turn action flag.
- Add card UI for displaying and selecting hand cards.
- Add board interactions and unit placement rules.
