# Battle System MVP v1.0 (Historical Spec)

> **Status (2026-05-02):** This document is retained for history only and is **not** the canonical rules source.
>
> Canonical MVP rules now live in:
> - `docs/rules/mvp-battle-rules.md`

## Why this file changed status

This file previously mixed frozen and exploratory assumptions (including older win/combat assumptions).
To avoid contradictory implementation guidance, it has been demoted to historical reference.

## Outdated assumptions in prior versions of this file

The following assumptions are obsolete for MVP implementation and replaced by the canonical rules doc:

- Win condition based on "destroy all enemy units" or "enemy cannot act".
- Any implied middle-row gameplay usage beyond visual/effects support.
- Older combat framing not aligned to locked MVP column-only attack flow.
- END TURN-driven flow assumptions (MVP now uses auto-turn).
- Any terminology drifting from locked action names: `PASS`, `redeploy`, `swap`.

## Historical notes

Earlier versions described archetype identity and card concept examples (Aggro/Tank/Control/Swarm).
Faction flavor remains useful for thematic reference, but gameplay implementation must follow the canonical rules doc.


## Additional stale assumptions removed (2026-05-04)

- Any implication of END TURN sequencing or multi-action turns.
- Any implication that non-unit card types (order/special/utility) use distinct runtime pipelines. In MVP code, non-unit cards are all effect cards.
- Any implication that mulligan is active in MVP.
- Any implication that Flood fills all 3 lanes; code currently caps Flood at up to 2 tokens.
