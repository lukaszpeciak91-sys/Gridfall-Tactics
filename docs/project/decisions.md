---
status: HISTORY
active_state: active-log
canonical_ref: docs/rules/mvp-battle-rules.md
---

# Project Decisions

> **Doc role (2026-05-02):** Changelog/history only. Not a normative gameplay rules source.
>
> Canonical MVP battle rules live in:
> - `docs/rules/mvp-battle-rules.md`


## Asset Loading and Preload Milestone (2026-07-22)
- Completed the asset-loading milestone by replacing broad cold preloads with scene-owned preload boundaries that preserve complete first presentation, immediate audio readiness, reliable transitions, and cache reuse.
- Original problem: Collection and BattleScene carried broad card/audio/background payloads, cold entries were slow, and warm repeat visits hid the issue through cached textures/audio.
- Final decisions: StartScene owns the complete first MainMenu handoff; lightweight menu scenes use narrow menu audio ownership; Settings preserves its launching audio context; Collection intentionally preloads displayed collectible art behind its full loading panel instead of per-faction lazy loading; BattleScene loads only active battle factions, generated art for those factions, selected battleground/fallback, battle UI, and battle-owned audio; Arena resolves and verifies its selected enemy before visual-ready; Tutorial remains conservative pending a separate audit.
- Historical regressions retained as lessons: logo-only/dark MainMenu handoff, frozen-looking Collection first expansion, and Arena cold-entry enemy art readiness.
- Canonical policy: `docs/architecture/asset-loading-policy.md`.

## Initial MVP Scope
- Focus on **battle gameplay only** for the first playable milestone.
- Use a **3x3 visual board framing** to keep systems and balancing simple.
- Implement **turn-based** combat flow.
- Limit players to **1 action per turn** in MVP.
- Historical initial scope: start with **4 faction archetypes** to establish strategic variety. Current source-of-truth is **7 full base gameplay factions** (`aggro`, `tank`, `control`, `swarm`, `wardens`, `attrition-swarm`, `overclock`); `attrition-swarm` and `overclock` are permanent, not temporary variants.

## Battle UI MVP Layout (2026-04-29)
- Lock battle screen to a **mobile-first portrait 9:16** layout for MVP.
- Use fixed vertical zones: **top bar (~10%)**, **board (~45%)**, **single action area (~10%)**, **hand area (~25%)**, **bottom info (~5-10%)**.
- Keep interaction scope minimal: **tap cards only**, **single EXECUTE TURN button**, and **no drag-and-drop or extra menus**.
- Use one global frame image key (`frame_default`) from faction data with a safe runtime fallback border when the frame asset is missing.

## Game State Initialization (MVP)
- Introduce a dedicated `GameState` system to initialize battle state from a selected faction deck.
- Keep battle state minimal for now: 9-cell board, player deck/hand/discard zones, and turn flags.
- Draw a **4-card starting hand** at battle start.
- Use debug text in `BattleScene` to visualize state values before card UI/gameplay is added.

## Merge Integration Consistency (2026-04-30)
- Standardize faction selection + battle handoff on `factionKey` values (not faction display names).
- Treat `getFactionByKey` and `getFactionKeys` as the canonical faction API; avoid legacy map access in scenes.
- Normalize faction JSON imports to lowercase filenames for Linux/Vite case-sensitive resolution safety.

## Boot Isolation Diagnostic (2026-04-30)
- Use a staged boot recovery flow: first prove static HTML render, then prove Vite/JS module execution, then re-enable Phaser boot.
- Keep always-visible fallback overlays during diagnostics (`HTML OK` + `JS OK`) to prevent silent blank-screen regressions.
- Defer scene-level changes until core boot path is confirmed stable again.

## MVP Battle Loop Lock (2026-05-02)
- Locked rules source to `docs/rules/mvp-battle-rules.md` as single source of truth for gameplay behavior.
- Confirmed auto-turn loop (no END TURN action), `PASS` action, `redeploy`, and `swap` as the implemented MVP action model.
- Historical lock at this date: hero HP (`12/12`) and hero HP zero drove battle wins; current battle-end rules also include no-progress and turn-cap HP tiebreaks in the canonical rules doc.
- Confirmed column-only combat lanes and middle row as visual-only (non-playable).


## MVP Turn Flow Lock Update (2026-05-03)
- Superseded on 2026-05-05 by temporary alternating initiative for turn order.
- Historical lock: one meaningful action maximum per player turn, then `PASS`/`RESOLVE TURN` advanced resolution.
- Historical lock: enemy action and combat triggered only during PASS/RESOLVE.
- PASS remains valid even if the player takes no meaningful action.
- Current canonical turn order and battle-end checks are documented in `docs/rules/mvp-battle-rules.md`.

## Playable UI Debug Text Guardrail (2026-05-03)
- Permanent rule: no visible debug/test labels in playable UI unless explicitly requested for a scoped task.
- Forbidden examples unless requested: `Battle Test`, debug overlays, temporary scene labels, and hidden/background debug text that appears behind gameplay UI.


## Rules/Card Parity Audit Lock (2026-05-04)
- Superseded on 2026-05-05 by temporary alternating initiative for turn order.
- Historical action economy at audit time: player could take at most one meaningful action, then PASS resolved enemy action -> combat -> player draw 1 -> enemy draw 1.
- Reconfirmed runtime typing model: only `type: unit` is deployable; all non-unit cards execute as effect cards.
- Reconfirmed deterministic MVP behavior: Sniper targets lowest-HP enemy (index tiebreak), Controller on-play swaps first two enemy units by index order.
- Reconfirmed Flood nerf is active in code: `fill_empty_slots_0_1` summons up to 2 tokens left-to-right.
- Historical note: mulligan was deferred/not active at this audit time; superseded on 2026-05-06 by the Simple Opening Mulligan MVP decision below.


## Temporary Alternating Initiative MVP (2026-05-05)
- Alternating initiative is a temporary MVP balancing aid.
- Purpose: reduce fixed second-actor reaction advantage observed in simulations.
- This is not necessarily the final long-term turn system.
- Runtime state now tracks `firstActor` as `player` or `enemy`; battle start chooses it randomly.
- After each complete turn (both sides act/pass, combat resolves, both sides draw), `firstActor` toggles for the next turn.
- Enemy-first turns execute enemy AI at turn start, then wait for the player action/PASS before combat resolves.
- Playable UI may show only a minimal initiative indicator (subtle hero-frame glow and small ▶ icon); no banners, debug text, or layout redesign.


## Turn-Cap Remaining Hero HP MVP Rule (2026-05-06)
- Added a 50-completed-turn cap resolution that compares remaining hero HP when no winner exists.
- Higher remaining player hero HP wins for the player; higher remaining enemy hero HP wins for the enemy.
- Equal remaining hero HP still produces a true draw.
- This is an MVP anti-stall/pacing solution, not the final long-term tournament or overtime system.
- Primary motivation: Swarm mirrors were producing excessive empty-board exhaustion draws under the old automatic draw-at-cap rule.
- Simulation and sanity runners must use the same shared turn-cap resolution helper as live gameplay; no special-case simulation behavior.
- Later no-progress deadlock handling replaced any repeated-PASS/3-pass stall-counter assumptions; locked outcomes are resolved from board/resource state instead of pass counts.


## Simple Opening Mulligan MVP (2026-05-06)
- Added a single opening mulligan only at battle start to improve opening-hand consistency without adding in-match redraw systems.
- Limit is up to 2 replaced cards from the 4-card starting hand; hand size, deck size, hero HP, action economy, mana/energy assumptions, and combat flow remain unchanged.
- AI-controlled sides use the shared deterministic evaluator for parity between live enemy behavior and simulation mirrors.
- The evaluator intentionally stays simple: value playable early units, penalize no-board/low-tempo effects, and replace the lowest-scoring opening cards only when they fall at or below the opening threshold.


## Card Readability + Localization Clarity Lock (2026-05-18)
- Locked a readability-first card text direction across hand, inspect, and collection views so long effect strings stay legible on mobile portrait.
- Locked persistent modified-stat readability treatment so temporary/permanent stat changes remain visible and understandable during combat decisions.
- Locked explicit Last Stand prevention feedback in battle UI to remove hidden-rule ambiguity when lethal is prevented.
- Locked card presentation naming and Polish copy shortening/simplification as the current UX standard for Empire of the Golden Sun content.
- These are UX/content clarity decisions (not rules-engine changes) and should be treated as binding for future card text and presentation updates unless replaced by a newer documented decision.

## StartScene Input UX Parity (2026-05-19)
- Locked StartScene continue behavior to accept pointer/tap release anywhere on the scene, not only the logo hit area.
- Logo remains an explicit interactive target with the same hover/press feedback and transition path.
- Transition must remain single-fire (`isTransitioning` guarded) to prevent duplicate scene launches on rapid taps or overlapping logo/global input.

## Blocked-Lane Board Indicator Parity (2026-05-19)
- Locked blocked-lane UI feedback to render on both board sides when the corresponding per-lane block flag is active for that side.
- Marker remains a lightweight red `✕` and is shown only on empty lane slots to avoid implying combat disable or covering occupied unit readability.
- This is presentation-only parity; lane block gameplay and AI decision logic remain unchanged.

## Card Artwork Framing/Cropping Architecture (2026-05-28)
- Accepted architecture: store per-card vertical framing as normalized `artPositionY` values in the `0..1` range, not as source pixels or viewport pixels.
- The renderer remains responsible for reconstructing the concrete source crop dynamically at render time from the active artwork zone, source texture dimensions, cover scale, and normalized `artPositionY` intent. This keeps crop intent resolution-independent across device sizes and card preview sizes.
- `ArtViewportDebug` is the accepted authoring tool for vertical card-art framing. Its export is the handoff format for applying reviewed values into production override data.
- Collection and Inspect previews must continue to use the same shared renderer crop path for production card artwork so authored crop intent is previewed through the same behavior players see.
- Board-unit rendering currently remains a separate path using board-specific artwork constants; do not assume board units consume the same per-card production crop overrides until that path is explicitly redesigned.
- Rejected: pixel-based crop storage, because it couples authoring intent to one source/render size and becomes brittle across renderer/layout changes.
- Rejected: source-image viewport authoring as the primary workflow, because it asks artists/authors to reason about source rectangles instead of the actual runtime card read.
- Rejected: repeated artwork regeneration as the framing solution, because the validated workflow can preserve approved artwork and tune presentation through explicit runtime crop intent.
- Final workflow: Generate artwork → Adjust Y in `ArtViewportDebug` → Export overrides → Apply overrides to production override data.

## Generated Unit Art Identity (2026-05-30)
- Generated non-deck units now use stable faction-local card illustration metadata instead of a shared token art directory.
- Spawn/Brood Grunts resolve as `swarm/token_grunt_01`, Flood tokens resolve as `swarm/token_flood_01`, and Carrier/Grave Call Grunts resolve as `attrition_swarm/token_grunt_02` under `public/assets/cards/`.
- `factionId`, `artAssetId`, `tokenType`, `isToken`, and `collectible` are lifecycle metadata: Recall, redeploy displacement, replay from hand, discard, fallen, and revive must preserve them without changing gameplay rules.
- Binary token artwork files are a manual follow-up outside Codex scope: add `public/assets/cards/swarm/token_grunt_01.webp`, `public/assets/cards/swarm/token_flood_01.webp`, and `public/assets/cards/attrition_swarm/token_grunt_02.webp` when final art is ready.


## Resource Exhaustion + 24-Turn Cap MVP Rule (2026-05-31)
- Reduced the shared turn cap from 50 completed turns to 24 completed turns based on observed simulation pacing; this supersedes only the cap value in the 2026-05-06 turn-cap decision.
- Added a simple stable-boundary `resource_exhaustion` loss: hand empty, deck empty, no owned board units, and strictly lower remaining hero HP are all required.
- Explicitly rejected hand-empty-only automatic loss because future deck draws can still exist.
- Equal-HP exhaustion does not force a winner. The existing no-progress deadlock resolver remains in place for locked parity cases.
- Live battles and simulation/report runners check base lethal first through combat resolution, then resource exhaustion, then no-progress; after both draws they check resource exhaustion and no-progress again before turn-cap resolution.
- Player hold-to-surrender remains optional and player-controlled. AI safe surrender remains available, with deterministic resource-exhaustion and no-progress checks taking priority at stable turn boundaries.

## Premium UI Typography Standard (2026-06-04)
- Adopted one global premium UI font stack for Polish, English, and future locales: `Segoe UI, Arial, sans-serif`.
- This supersedes the experimental premium broadcast font investigation and rejects locale-specific premium font stacks.
- Scope is premium UI only: premium buttons, broadcast-style UI chrome, menu screens, result screens, and premium overlays.
- Card rendering, gameplay HUD text, Rules panel text, Collection cards, Inspect cards, and localization content remain outside this decision.
- Future premium typography changes must validate Polish diacritic rendering against: `PORAŻKA`, `WYJDŹ`, `PONÓW`, `PUBLICZNOŚĆ`, `PRZEJĘCIE`, `ZAKŁÓCENIE`, `ZEWRZEĆ`.
- Canonical standard: `docs/ui/premium-typography-standard.md`.

## Battle Result Presentation Direction (2026-06-04)
- Shift battle result presentation away from modal-dialog chrome and toward an interdimensional broadcast-overlay treatment.
- Result screens should keep the battlefield visible behind fullscreen dimming, avoid framed panel backgrounds, and place the localized result title/subtitle/buttons directly over the board.
- Result-specific glows, victory fireworks, existing button assets, and end-of-battle navigation/retry behavior remain unchanged unless a later scoped UX decision supersedes them.

## Battle Result Broadcast Overlay Final Direction (2026-06-04)
- Accepted the broadcast-overlay result presentation as the MVP-final direction and rejected returning to popup-dialog/modal-window framing for battle results.
- Battle result screens should remain panel-free: no modal frames, window backgrounds, or boxed control groups over the battlefield.
- Final polish standard: place the result stack lower over the combat lanes, keep localized subtitle copy prominent with outcome-specific non-white accents, separate subtitle and controls with one thin broadcast divider, and use enlarged existing button assets for primary EXIT/RETRY controls.
- Title glow should remain animated and outcome-colored but restrained enough that battlefield art and UI remain visible beneath it.
- Victory celebrations use three staggered waves of the existing procedural fireworks/particles with slight position randomization; no new assets or reward/battle-end logic changes are part of this presentation decision.


## Menu Surrender Must Use Stable Defeat Boundary (2026-06-28)
- Problem: player menu surrender routed through `completeBattleFlow(0)` could create the battle result modal logically while the canvas remained visually frozen on the board.
- False leads ruled out by diagnostics: this was not a missing defeat condition, missing result modal, bad depth, offscreen object placement, alpha/camera/display-list issue, or a dedicated surrender-panel problem.
- Confirmed diagnostic facts: `battleResultModal` existed, `battleResultModalShown` was true, modal items were visible, on-screen, and in the display list, a separate Phaser render-test object also existed, and `BattleScene` remained active rather than paused or sleeping; despite that, the canvas still did not visually update.
- Final decision: menu surrender must not call `completeBattleFlow(0)`. It must close the surrender popup/menu, set `gameState.winner = 'enemy'` and `gameState.endingReason = 'player_menu_surrender'`, then use the normal stable defeat-style boundary: `completeBattleFlow(500)`.
- Future-work rule: do not create a dedicated surrender result panel, do not modify `showBattleResultModal()` for surrender, do not change `src/ui/imageButton.js` for this issue, and do not use the old hold-to-surrender path as evidence that menu surrender can safely use zero-delay result flow. If surrender is touched again, preserve the stable battle-flow boundary.

## Battle Result Modal Must Survive Optional Celebration Failure (2026-07-04)
- Problem: normal Arena/Campaign player victories could play victory SFX but visually remain frozen on the final board state. Tutorial victory eventually worked, surrender results worked, and clicking or focusing DevTools before SFX sometimes made the modal appear, which made the regression look like an input, render, or focus issue.
- Root cause: `showBattleResultModal()` played victory SFX before the result modal was fully assigned/shown. In normal Arena/Campaign wins, optional victory celebration work ran after SFX but before `this.battleResultModal` assignment and before `battleResultModalShown = true`; if celebration particles, tweens, or timers failed, the base result modal could be swallowed even though audio had already played.
- Final decision: optional victory celebration must be fail-soft. Particles, tweens, timers, and celebration payload construction may enhance the result screen, but failure in that flourish must never block base result modal assignment/showing; the modal should still assign and show with an empty celebration payload.
- Diagnostic rule: SFX does not prove the result modal was fully created. In this lifecycle, SFX only proves `showBattleResultModal()` started, so missing-modal investigations must inspect code after SFX and before modal assignment.
- Critical UI rule: result presentation is mandatory UI and must not depend on optional celebration, particles, tweens, timers, or other flourish.
- Pending-result input rule: before result reveal, stale BattleScene card and non-card input paths should be shut down aggressively so pointerover/out handlers, imageButton hover/down/up callbacks, utility menu, deck panel, surrender popup, base/pass controls, or stale overlays cannot mutate destroyed or detached Phaser objects.
- Image-button lifecycle rule: hover/down/up callbacks must be guarded after destroy or scene detach so lingering input cannot touch invalid objects during result resolution.
- Inspect/preview lifecycle rule: Collection inspect/back and BattleScene inspect surfaces must follow the shared preview contract from `createCardPreviewView()`. Treat returned preview objects as lifecycle-aware objects with `items`, `deactivate`, and `destroy`; call `deactivate` at close start, especially before animated teardown, and use `destroy` for final cleanup when possible. Do not directly destroy a root or overlay while listeners/interactivity remain alive.
- Surrender distinction: this decision is separate from the older menu-surrender `completeBattleFlow(0)` boundary issue. Menu surrender must still preserve the stable defeat boundary by closing surrender/menu/inspect/deck UI, setting `winner` and `endingReason`, then calling `completeBattleFlow(500)`; the hold-to-surrender `completeBattleFlow(0)` path is still not proof that zero-delay menu-result flow is safe.
- Compare result paths when diagnosing regressions: surrender worked because defeat presentation skipped victory celebration; tutorial victory worked because it avoided or recovered through a different/skipReveal path; normal Arena/Campaign victory failed because it used live victory celebration after SFX and before modal assignment.

### BattleScene result-modal safety checklist
- Set/clear pending and resolving flags deliberately.
- Disable stale card and non-card input before reveal.
- Never let optional particles/tweens/celebration block base modal assignment.
- Guard imageButton hover/down/up callbacks after destroy or scene detach.
- Use shared preview deactivate/destroy lifecycle for inspect previews.
- Confirm Tutorial, Arena, Campaign, and Surrender result paths separately.
- When SFX plays but modal is missing, inspect code after SFX and before modal assignment.

## Screen Header Presentation Standard v2 (2026-06-04)
- All non-battle menu screens use the same premium broadcast header pattern: centered title text only, with the previous decorative line removed to reduce visual noise.
- Typography remains locked to the premium UI font stack (`Segoe UI, Arial, sans-serif`) with bold weight, localized uppercase text, subtle glow, and subtle shadow; this applies uniformly to Polish, English, and future localizations with no per-screen font special casing.
- Header titles use the final locked micro-adjustment: slightly larger than the lowered pass and raised back into the upper presentation zone, preserving a strong TITLE → CONTENT relationship while avoiding clipping in mobile portrait layouts.
- Header color stays neutral white / warm ivory as a global navigation element; faction-specific title colors, new title backgrounds, frames, ornaments, underlines, and decorative bars remain out of scope.
- Arena / Choose Faction, Collection, Tutorial, Settings, Rules, and future non-battle menu screens should reuse this same simplified header pattern to preserve the interdimensional prestige broadcast presentation system; future work should not revisit header styling unless a major UI redesign occurs.

## Balance Audit Phase Shift (2026-06-07)
- Accepted the June 2026 balance-audit conclusion that the project has moved beyond broad AI validation into matchup/faction tuning.
- Remaining top matchup concerns are Tank vs Swarm, Aggro vs Tank, and Control vs Swarm; they are classified as matchup structure / faction identity / card-design problems rather than major AI failures.
- Cleared major AI-suspicion bucket: Flood, Spawn, Last Stand, Stability, Feast, Funeral Pyre, and Swarm Attack.
- Safest future redesign slots, if tuning becomes necessary, are Control Recall/Swap/Controller, Tank Fortify, and Swarm Substrate; these are experiment slots, not approved redesigns.
- Campaign fairness must be evaluated separately from PvP parity; preferred low-risk mitigations are multiple attempts and curated opponent order rather than permanent progression rewards.
- Reference summary: `docs/project/balance-audit-june-2026.md`.


## Overlay / Panel Frame Standard (2026-06-21)
- Adopted `docs/ui/overlay-frame-standard.md` as the canonical source for modern Settings, Battle Menu, Rules, Deck / Deck Info, and Campaign accordion/faction-info panel chrome.
- Current panel direction is rounded, dark translucent panel bodies with a cyan / blue premium frame family, subtle glow, thin outer stroke, and restrained inner highlight.
- Older flat cyan-stroke prototype panels, decorative Rules rails, and persistent lower-left Rules scroll-helper text are historical context and should not be reintroduced without an explicit new design decision.
- Rules / How To Play is one shared panel presentation across entry points; future fixes must distinguish shared panel rendering from launch-path issues and underlying scene bleed-through.
- Translucent overlay debugging should inspect foreground panel chrome, Rules scroll affordances, underlying BattleScene/helper objects, board guide/deck info hint objects, and entry-point differences before assuming the panel itself draws an artifact.

## Tutorial V1 Architecture Approval (2026-07-02)
- Approved `docs/tutorial-v1-architecture.md` as the canonical planning source for playable Tutorial V1 implementation.
- Tutorial V1 must be a separate `BattleScene` mode (`battleContext.mode = 'tutorial'`) launched from Game Menu only, with no duplicate Main Menu Tutorial entry and no Arena fallback.
- Tutorial cards/decks must remain separate from normal faction registry, Campaign, Arena, and Balance Lab data.
- Tutorial flow uses real mechanics with tutorial-only deterministic opening/mulligan, scripted enemy actions, input gating, `buff_all_atk_1`, final PASS victory, standard result presentation, and return to `GameMenuScene`.
- Campaign save/progression functions must remain untouched by Tutorial.

## Tutorial V1 Stabilization Closeout (2026-07-08)
- Tutorial V1 stabilization is considered closed enough for current project needs; remaining notes are historical/debugging guidance, not new rules authority.
- Result UI safety: mandatory result modal assignment/showing must survive optional celebration failure, and pending result state must survive fullscreen/resize/rebuild when a winner already exists.
- Tutorial lifecycle safety: recover presentation from canonical tutorial/game state, resolve focus only to live display objects, distinguish informational highlights from actionable gates, and prevent effect-cast visual interruption from orphaning gameplay/tutorial continuation.
- Known non-blocking issue: aggressive fullscreen/blur/DevTools stress near the later redeploy step may leave stale action-window state; revisit only with runtime fields listed in `docs/tutorial-v1-architecture.md`.
- Final polish state: Lost Fan / Zagubiony Kibic has 4 HP in tutorial-only data, no required enemy inspect gate was added, and the open-lane informational highlight targets enemy-row board slot index 1.

## Achievements V1 Architecture Closeout (2026-07-10)
- Player Stats, Achievement State, and achievement presentation queue are three separate persistent layers.
- Achievement unlocks are monotonic: once unlocked, an achievement is never relocked.
- `AchievementsScene` is read-only and does not evaluate or persist unlocks.
- Runtime evaluation happens only at safe checkpoints/backfill paths, not after every card play.
- Achievement popups are presentation-only and must never block result navigation.
- Unfinished or unshown popups remain in the persistent presentation queue.
- At most 3 popups are presented per eligible result panel.
- Faction achievements are generated from runtime faction registry/templates, so new factions automatically receive the default faction achievement set.
- Campaign-completion achievements are shown on the interactive Campaign completion summary panel.
- Popup presentation must remain safe across sleep/wake/fullscreen/result-modal rebuilds.
- Missing or stale achievement audio must not crash `BattleScene` or block popup presentation.
- Binary audio assets are uploaded manually; Codex only wires registry/path references.
- Full Achievements access is intentionally not added to the in-battle hamburger menu.
- Future V1 work is limited to scoped content additions, thresholds, copy/localization, minor polish, and future mode/faction support.

## Achievement-Derived Progression V1 (2026-07-17)
- Player Stats and Achievement State remain separate persistent layers; Achievement presentation state is presentation-only and does not determine unlock truth.
- Achievement unlocks are monotonic: once an achievement ID is unlocked, it must not be relocked by runtime evaluation or panel presentation.
- Player points, level, progress ratio, and max-level state are derived from current achievement definitions plus unlocked achievement IDs; no XP, points, level, progress ratio, or max-level state is separately persisted.
- V1 point mapping is fixed: 1★ = 25, 2★ = 50, 3★ = 100, and 4★ = 200.
- Level thresholds are explicit and manually versioned; maximum V1 level is 15, Level 15 begins at 2875 points, the current catalogue total is 3825 points, and maximum level intentionally does not require 100% completion.
- Catalogue additions/removals or difficulty changes may change derived points and must trigger a progression-economy review before merge.
- Achievement IDs and persistence keys must not be renamed without a migration; unknown or stale achievement IDs remain harmless in persisted state and contribute 0 derived points.
- Current project-owned persistent keys are `gridfall:tactics:campaign:v1`, `gridfall:tactics:player-stats:v1`, `gridfall:tactics:achievements:v1`, `gridfall:tactics:achievement-presentation:v1`, and `gridfall:tactics:settings:v1`.
- Same exact browser origin preserves these values across refresh, browser restart, device restart, and same-origin redeploy; different browser, device, private/incognito session, domain/subdomain, scheme, or port uses separate storage, and clearing site data removes persistence.
- AchievementsScene remains read-only: it loads definitions, Player Stats, and Achievement State for display but does not evaluate or persist unlocks.
- Compact achievement unlock popups remain celebratory and do not display point values; no level-up popup or gameplay rewards exist in V1.
- Campaign completion achievement popups are shown only above the interactive completion summary, not during the trophy/tap-anywhere phase.
- New Campaign resets Campaign state only; it must not reset Player Stats, Achievement State, achievement-derived points, or achievement-derived level.

## Overclock v14 Production Acceptance (2026-07-12)
- Accepted Overclock v14 as the seventh base gameplay faction under stable internal id `overclock` and runtime key `Overclock`; player-facing presentation is Project H.E.R.D. / Program P.A.S.Z.A., not the internal id.
- Project H.E.R.D. / Program P.A.S.Z.A. is a late-1980s unattended state agricultural/military breeding program that weaponizes biological livestock; it is explicitly not cyberpunk, robotic, religious, or a civilization faction.
- Accepted checkpoint: global non-draw WR 49.3%, worst matchup vs Aggro 31.6%, best matchup vs Swarm 64.5%, campaign estimate 37.3%, crashes 0, invalid actions 0.
- Rationale: the deck sits within the existing faction spread; worst matchup is comparable to existing Swarm vs Wardens 30.5%, best matchup remains below 65%, and attempts to force the Aggro matchup upward either overbuffed the deck or created dead tech cards.

## AI-vs-AI Balance Lab Interpretation Lock (2026-07-15)
- Keep AI Competent v1 as the current simulator/runtime AI baseline after combat-swing scoring work, focused AI audits, all-faction smoke, campaign smoke, campaign variants, and manual sanity checks.
- Balance Lab is AI-vs-AI smoke coverage, not absolute human-balance truth. Use it to find risks and regressions, then interpret setup-heavy faction results with manual sanity.
- Do not add broad deck-awareness now. If more AI work is needed, prefer a narrow held-card/setup threshold improvement over a larger planning system.
- Do not change player campaign attempts from 3 to 4 based only on AI campaign smoke. Four-attempt campaign simulations improved AI-only completion and remain useful as a diagnostic variant, but they are not a production campaign rule.
- Manual sanity can override panic from AI-only campaign failures: Swarm cleared campaign on the first full human run under current 3-attempt rules; Tank vs Aggro was won manually on the third attempt after two close losses; Aggro vs Control was won manually on the second attempt after a close, decision-affected first loss.
- Do not rebalance Swarm or Attrition Swarm purely from AI-vs-AI campaign/smoke results without manual sanity, because the current AI may underplay setup-heavy hold/sequencing patterns.

## Shared Scene Transition Overlay Failsafe Fix (2026-07-16)
- Confirmed production issue: the shared transition overlay could disappear during slow destination creation because the old failsafe treated elapsed time as readiness. It faded and stopped the overlay while registry readiness was still false, exposing a plain dark gap until the destination scene finished rendering.
- Final decision: `SceneTransitionOverlayScene` completion must require real matching destination readiness: matching transition ID, matching destination key, and registry/event reconciliation. A timeout is not destination readiness.
- Failsafe behavior now warns and keeps the overlay active/visible while waiting for readiness. The hard emergency timeout is separate from normal readiness and must not fabricate `ready: true` or use the normal completion path.
- Render-order protection is production behavior: queued Phaser scene operations and destination startup can alter scene order, so the visible pending overlay reasserts top ordering with a bounded waiting-frame guard that is removed before fade-out.
- Current shared-overlay destinations are `CollectionScene`, `FactionSelectScene`, `CampaignEnemySelectScene`, and `GameMenuScene`. Future destinations must finish initial UI setup, wait for the render boundary, emit matching readiness, and avoid timeout-based readiness.
- Maintenance rule: if the loader flashes/disappears before destination UI, inspect matching readiness, registry readiness, failsafe/emergency timeout state, overlay active/visible state, and scene order before adding delays or extra `bringToTop` calls.

## Combat Engine v2 Universal HP-Death Copy Alignment (2026-07-23)
- Combat Engine v2 Stage 3A finalized universal HP-death semantics: HP-reaching-0 deaths use valid death and allied-death effects regardless of damage source; Stage 3B aligned active card copy and canonical rules documentation, removing combat-only death wording from active Husk, Carrier, and Abomination text.
- Explicit destroy and non-death removals remain outside this alignment scope; canonical behavior is maintained in `docs/rules/mvp-battle-rules.md`.
