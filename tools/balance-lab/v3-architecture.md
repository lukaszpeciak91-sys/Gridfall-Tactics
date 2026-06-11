# Balance Lab v3 Experimental Effect Variants Architecture

## Purpose

Balance Lab v3 Experimental Effect Variants are a generic, card-agnostic architecture for testing temporary effect redesigns in Balance Lab simulations. The system should compose validated selectors and operations from a documented whitelist instead of introducing arbitrary JavaScript patches, production card parameters, permanent effect ids, or simulator forks.

This document is architecture and implementation planning only. It does not implement selectors, operations, gameplay logic, simulator logic, or active variant execution.

## Design goals

- Support redesign experiments across all current and future factions, including Wardens, Aggro, Tank, Control, Swarm, and Attrition Swarm.
- Keep existing repo mechanics as the source of truth for behavior.
- Preserve Balance Lab v2-lite workflows for stat patches, `replaceCard`, temp-copy execution, comparison reports, telemetry comparison, and batch mode.
- Add a third experiment mode for effect variants without making production card data dynamic.
- Execute variants only in a temporary copied repository.
- Keep the real repository unchanged during runs.
- Reuse existing targeting, existing AI action generation, existing AI action scoring, and the existing simulator.
- Reject unsupported selectors, unsupported operations, arbitrary code, and production `effectParams` before temp-copy patching.

## Non-goals

- No card-specific architecture.
- No faction-specific architecture.
- No arbitrary JavaScript execution.
- No production `effectParams`.
- No permanent experimental `effectId` values.
- No second simulator.
- No simulator logic changes for v3 orchestration.
- No gameplay logic changes in the architecture phase.
- No custom AI system.
- No custom targeting system outside the existing targeting/probe flow.
- No UI changes.

## 1. Folder structure

Recommended Balance Lab v3 documentation and data layout:

```text
tools/balance-lab/
  effect-blocks.md
  v3-architecture.md
  effect-variants/
    README.md
    queue/
    archive/
  effect-variant-reports/
    .gitkeep
```

### `tools/balance-lab/effect-blocks.md`

Responsibilities:

- Define the supported selector and operation catalog.
- Define exact owner/opponent and player base/enemy base wording.
- Document source-of-truth links between blocks and existing repo mechanics.
- Mark unsupported selectors and operations as out of scope.
- Avoid executable configuration; this file is documentation, not runtime data.

### `tools/balance-lab/v3-architecture.md`

Responsibilities:

- Describe the overall v3 architecture.
- Define the variant file format.
- Define validation, registry, execution, reporting, safety, and implementation phases.
- Act as the stable design reference for future implementation PRs.

### `tools/balance-lab/effect-variants/`

Responsibilities:

- Store authored Experimental Effect Variant JSON files.
- Keep variant files separate from v2-lite stat-patch examples to reduce accidental batch execution.
- Allow queue/archive workflows similar to existing Balance Lab experiment queues.
- Contain only declarative JSON; no JavaScript, scripts, generated runtime files, or production card data.

Suggested subfolders:

- `queue/` for manually selected variant runs.
- `archive/` for completed or superseded variant files.

### `tools/balance-lab/effect-variant-reports/`

Responsibilities:

- Store optional variant-specific report artifacts if v3 reports need to be separated from existing comparison reports.
- Store validation-only reports, registry summaries, or per-variant metadata exports.
- Remain generated-output-only; committed contents should normally be limited to `.gitkeep` or documentation.

### Existing folders retained

Existing Balance Lab folders should remain valid:

```text
tools/balance-lab/experiments/
tools/balance-lab/reports/
tools/balance-lab/temp/
```

v3 may either write reports to the existing `reports/` tree with new effect-variant sections or mirror variant metadata into `effect-variant-reports/`. The preferred MVP path is to keep the main comparison report under `tools/balance-lab/reports/` and use `effect-variant-reports/` only for optional specialized artifacts.

## 2. Variant file format

### Top-level variant file

A standalone effect variant file should describe one variant. Batch mode can run many files from `tools/balance-lab/effect-variants/`.

```json
{
  "schemaVersion": 1,
  "variantId": "generic_variant_id_v1",
  "label": "Human-readable variant label",
  "scope": {
    "factionId": "faction-id",
    "cardId": "card_id",
    "baseEffectId": "existing_effect_id"
  },
  "timing": "afterBaseEffectBeforeDiscard",
  "sequence": [
    { "operation": "runBaseEffect" },
    {
      "operation": "operationName",
      "selector": "selectorName",
      "amount": 1
    }
  ],
  "textPatch": {
    "textShort": "Temporary test text for the variant."
  },
  "telemetryTags": ["tag-one", "tag-two"]
}
```

### Compatibility with v2-lite experiment files

Balance Lab v3 should support two input styles:

1. Existing v2-lite experiment JSON with `changes` entries for stat patch and `replaceCard` modes.
2. Standalone effect variant JSON files from `tools/balance-lab/effect-variants/`.

For mixed experiments, v3 may also allow an effect variant change inside the existing `changes` array:

```json
{
  "name": "Mixed Balance Lab experiment",
  "matchCount": 1000,
  "seed": 1337,
  "telemetry": "all",
  "changes": [
    {
      "mode": "effectVariant",
      "effectVariant": {
        "schemaVersion": 1,
        "variantId": "generic_variant_id_v1",
        "label": "Human-readable variant label",
        "scope": {
          "factionId": "faction-id",
          "cardId": "card_id",
          "baseEffectId": "existing_effect_id"
        },
        "timing": "afterBaseEffectBeforeDiscard",
        "sequence": [
          { "operation": "runBaseEffect" }
        ],
        "textPatch": {
          "textShort": "Temporary test text for the variant."
        },
        "telemetryTags": ["tag-one"]
      }
    }
  ],
  "flags": {
    "warningDeltaPp": 3,
    "dangerDeltaPp": 8
  }
}
```

The mixed format should remain optional. The cleanest long-term authoring format is one standalone variant JSON per file.

### Field definitions

#### `schemaVersion`

- Required integer.
- MVP accepted value: `1`.
- Allows future schema evolution without changing older variant meaning.
- Unsupported versions must fail validation before temp-copy patching.

#### `variantId`

- Required string.
- Globally unique enough for reports and batch summaries.
- Recommended format: lower-case letters, numbers, hyphens, and underscores.
- Must not be derived from a hard-coded card-specific execution path.
- Used in registry keys, reports, telemetry metadata, and Paste into ChatGPT summaries.

#### `label`

- Required string.
- Human-readable label for reports.
- Should describe the experimental behavior without implying permanent card data changes.

#### `scope`

Required object declaring where the variant attaches:

```json
{
  "factionId": "faction-id",
  "cardId": "card_id",
  "baseEffectId": "existing_effect_id"
}
```

Fields:

- `factionId`: production faction id from faction data, not a runtime special case.
- `cardId`: production card id in that faction.
- `baseEffectId`: existing production effect id that the card currently uses.

Validation rules:

- Faction must exist.
- Card must exist within that faction.
- Card's current production `effectId` must exactly match `baseEffectId`.
- The architecture must not create new permanent `effectId` values.

#### `timing`

Required string describing where the sequence runs relative to the base effect.

MVP supported timing:

- `afterBaseEffectBeforeDiscard`

Recognized but deferred timings:

- `beforeBaseEffect`
- `afterBaseEffect`

MVP should reject recognized-but-deferred timings with clear errors. `afterBaseEffectBeforeDiscard` is preferred first because it preserves base targeting and AI probes while allowing the variant to complete inside the same card resolution before normal discard/finalization.

#### `sequence`

Required non-empty array of operation blocks.

MVP rules:

- Must include exactly one `runBaseEffect` operation.
- For `afterBaseEffectBeforeDiscard`, `runBaseEffect` must be first.
- Every block must name a whitelisted operation.
- Every selector referenced by a block must be whitelisted.
- Operation arguments must match the operation schema.
- No block may contain JavaScript code, import paths, function bodies, script references, or arbitrary patches.

#### `textPatch`

Optional object describing temporary display text changes in the temp copy only.

MVP allowed field:

- `textShort`

Rules:

- Must not change production card files in the real repo.
- Must not add `effectParams`.
- Must not change the production `effectId` unless the experiment is explicitly using existing v2-lite `replaceCard` mode.
- Should use repo/game wording, including owner, opponent, player base, and enemy base.

#### `telemetryTags`

Optional array of strings.

Responsibilities:

- Provide report grouping metadata.
- Make batch summaries easier to filter.
- Feed Paste into ChatGPT summaries.

Rules:

- Tags are metadata only.
- Tags must not control runtime behavior.
- Tags must be strings from a safe restricted character set.

## 3. Registry design

### Authoring registry

Variant JSON files are authored in `tools/balance-lab/effect-variants/`. Balance Lab should discover files by explicit path or by folder batch mode. Folder mode should sort direct `*.json` files lexicographically, matching current batch expectations.

### Validation registry

Balance Lab should build an in-memory validated registry before creating the temp copy:

```text
variantId -> validated variant object
(factionId, cardId, baseEffectId) -> active variant object
selectorName -> selector schema metadata
operationName -> operation schema metadata
```

Responsibilities:

- Load JSON.
- Validate required fields and types.
- Validate faction and card scope.
- Validate `baseEffectId` against production card data.
- Validate timing.
- Validate sequence shape.
- Reject unsupported selectors.
- Reject unsupported operations.
- Reject unsupported operation arguments.
- Reject duplicate `variantId` values.
- Reject duplicate active variants for the same `(factionId, cardId, baseEffectId)` scope unless a future explicit layering feature exists.

### Runtime registry

After validation and temp-copy creation, Balance Lab should inject a temp-only generated runtime registry into the temp copy. Recommended generated path:

```text
src/systems/effectVariantRegistry.generated.js
```

The runtime registry should contain only validated, normalized, inert data. It should not contain functions from the experiment file and should not contain arbitrary JavaScript from authors.

Recommended runtime shape:

```js
export const EFFECT_VARIANT_REGISTRY_SCHEMA_VERSION = 1;

export const ACTIVE_EFFECT_VARIANTS = Object.freeze({
  "faction-id::card_id::existing_effect_id": Object.freeze({
    schemaVersion: 1,
    variantId: "generic_variant_id_v1",
    label: "Human-readable variant label",
    scope: Object.freeze({
      factionId: "faction-id",
      cardId: "card_id",
      baseEffectId: "existing_effect_id"
    }),
    timing: "afterBaseEffectBeforeDiscard",
    sequence: Object.freeze([
      Object.freeze({ operation: "runBaseEffect" })
    ]),
    textPatch: Object.freeze({
      textShort: "Temporary test text for the variant."
    }),
    telemetryTags: Object.freeze(["tag-one"]),
    source: Object.freeze({
      file: "tools/balance-lab/effect-variants/example.json",
      variantHash: "sha256:..."
    })
  })
});
```

Runtime lookup key:

```text
<factionId>::<cardId>::<baseEffectId>
```

The key includes card id and faction id so the architecture scales to shared effect ids across many cards without making effect behavior globally mutable.

### Unsupported selector rejection

Selector names should be validated against a static selector registry built from `effect-blocks.md` concepts. Unsupported selectors must fail with messages like:

```text
Variant generic_variant_id_v1 uses unsupported selector 'allUnits'. Supported selectors: selectedOpponentUnit, selectedOwnerUnit, firstSelectedAfterBaseEffect, secondSelectedAfterBaseEffect, bothSelectedAfterBaseEffect, enemyBase, playerBase.
```

### Unsupported operation rejection

Operation names should be validated against a static operation registry. Unsupported operations must fail with messages like:

```text
Variant generic_variant_id_v1 uses unsupported operation 'summonUnit'. This operation is out of scope for MVP.
```

## 4. Execution flow

The v3 execution flow should extend v2-lite without changing the simulator orchestration:

```text
Load experiment or variant JSON
↓
Validate schema and safety constraints
↓
Baseline run in real repo
↓
Create temp copy
↓
Inject variant behavior into temp copy
↓
Run simulation in temp copy
↓
Generate reports
↓
Destroy nothing in real repo
```

### Baseline run

- Run the existing simulator command in the real repo.
- Do not patch production files before the baseline.
- Capture baseline stdout/stderr and telemetry outputs exactly as v2-lite does.

### Create temp copy

- Copy the repo to `tools/balance-lab/temp/<run-name>-experiment/`.
- Exclude heavy/generated folders as v2-lite already does.
- All subsequent patches happen only inside the temp copy.

### Inject variant behavior

Temp-copy injection should include:

1. Temporary generated runtime registry.
2. Temporary card text patch if `textPatch` is present.
3. Optional inert hook support if implemented in a future PR.

Injection must not include:

- Production card `effectParams`.
- New permanent `effectId` values.
- Arbitrary JS from variant JSON.
- Direct simulator patches.

### Run simulation

- Run the same existing simulator command in the temp copy.
- Do not fork or duplicate simulator logic.
- Variant behavior should be observed only through normal game resolution paths.

### Generate reports

Reports should include all v2-lite comparison content plus effect-variant metadata:

- active `variantId`
- variant label
- scope
- timing
- sequence summary
- text patch summary
- telemetry tags
- patched temp files
- validation warnings
- AI compatibility limitations
- Paste into ChatGPT block additions

### Destroy nothing in real repo

- The real repo remains unchanged by the experiment run.
- Temp folders may be retained for debugging, matching current Balance Lab behavior.
- Reports are generated artifacts; production source and production card data are not mutated.

## 5. Selector architecture

Selectors should be represented as declarative names plus optional validated arguments. They should not be functions in JSON.

### Selector block representation

Simple selector reference:

```json
{
  "selector": "selectedOpponentUnit"
}
```

Optional future selector with arguments:

```json
{
  "selector": "futureSelectorName",
  "args": {
    "limit": 1
  }
}
```

MVP should prefer string selectors for simplicity:

```json
"selector": "selectedOpponentUnit"
```

### Internal selector registry entry

Conceptual shape:

```js
{
  name: "selectedOpponentUnit",
  targetKind: "unit",
  cardinality: "one",
  allowedTimings: ["afterBaseEffectBeforeDiscard"],
  requiresBaseSelection: true,
  validateArgs(args) {},
  resolve(context, args) {}
}
```

This shape is design-only. Implementation should keep resolver functions in source code, not in variant JSON.

### Selector resolution context

The resolver should receive a context that contains enough information to resolve generic selected targets without card-specific code:

```js
{
  state,
  owner,
  card,
  factionId,
  cardId,
  baseEffectId,
  targetIndexes,
  selectedBeforeBaseEffect,
  selectedAfterBaseEffect,
  timing
}
```

Responsibilities:

- Preserve selected target order.
- Preserve selected target identity across base-effect movement when possible.
- Distinguish owner units from opponent units.
- Distinguish player base from enemy base.
- Return typed targets, not raw arbitrary objects.

### MVP selector categories

MVP selector categories should include:

- Selected unit selectors.
- Post-base selected unit selectors.
- Absolute base selectors.

Examples of selector names from the catalog:

- `selectedOpponentUnit`
- `selectedOwnerUnit`
- `firstSelectedAfterBaseEffect`
- `secondSelectedAfterBaseEffect`
- `bothSelectedAfterBaseEffect`
- `enemyBase`
- `playerBase`

The architecture should not infer undocumented selectors from text strings.

## 6. Operation architecture

Operations should be represented as declarative operation blocks with whitelisted names and validated arguments. Operations should not contain executable code.

### Operation block representation

```json
{
  "operation": "damageUnit",
  "selector": "selectedOpponentUnit",
  "amount": 1,
  "cleanup": "nonCombat"
}
```

### Internal operation registry entry

Conceptual shape:

```js
{
  name: "damageUnit",
  targetKind: "unit",
  requiredArgs: ["selector", "amount", "cleanup"],
  optionalArgs: [],
  allowedSelectors: ["selectedOpponentUnit", "selectedOwnerUnit", "firstSelectedAfterBaseEffect"],
  allowedTimings: ["afterBaseEffectBeforeDiscard"],
  validateArgs(args) {},
  execute(context, resolvedTargets, args) {}
}
```

This shape is design-only. Implementation should keep operation executor functions in source code, not in variant JSON.

### Operation execution context

The operation executor should receive:

```js
{
  state,
  owner,
  card,
  variant,
  timing,
  baseEffectResult,
  operationIndex,
  telemetry
}
```

Responsibilities:

- Apply behavior using existing repo mechanics.
- Produce structured telemetry.
- Avoid card-specific branches.
- Fail clearly when a validated operation cannot resolve its target at runtime.

### MVP operation categories

MVP operation categories should include:

- Base-effect delegation: `runBaseEffect`.
- Unit changes: damage, attack buff/debuff, armor buff/debuff.
- Absolute base damage.
- Immediate owner draw only if safe.

Examples of operation names from the catalog:

- `runBaseEffect`
- `damageUnit`
- `damageEnemyBase`
- `damagePlayerBase`
- `debuffAttack`
- `debuffArmor`
- `buffAttack`
- `buffArmor`
- `drawOne`

The architecture should reject operations that imply unimplemented systems, such as summon, revive, fallen manipulation, custom targeting, custom AI, or arbitrary code.

## 7. AI compatibility

Experimental Effect Variants should reuse existing AI systems instead of adding new AI systems.

### Existing targeting reuse

The base card keeps its existing production `effectId`. Existing targeting rules continue to decide whether the card is playable and which targets can be selected. Variants add behavior after the base effect rather than replacing base target selection.

Rules:

- Do not introduce variant-specific target prompts.
- Do not add custom target generation for MVP.
- Do not change simulator action types.
- Do not change hand, board, or targeting schemas for variant-specific data.

### Existing AI action generation reuse

The AI should continue enumerating candidate actions based on existing cards and existing effect ids. If a base effect already has AI candidate generation, the variant should piggyback on that candidate generation.

This means a variant may change the value of an action but should not require a new action type.

### Existing action scoring reuse

AI probes and action scoring should see the variant outcome through the normal resolver path once runtime support exists. This allows the existing scoring system to account for changed board state, base HP, draw results, and pressure changes where those are already measured.

### AI limitations to report

Reports should explicitly state when:

- Base targeting was reused.
- Base AI candidate generation was reused.
- Base heuristic labels were reused.
- Resolver probes included variant behavior.
- Candidate enumeration may miss targets that are valuable only because of the variant.

Recommended report note:

```text
AI compatibility note: This effect variant reused existing base targeting and existing AI candidate generation. Action scoring observed the resolver outcome, but candidate enumeration may not include targets that are valuable only because of the variant behavior.
```

## 8. Safety model

### Temp-copy only

Effect variants must execute only in Balance Lab temp copies. The real repo baseline must run unmodified, and the real repo must not receive variant registry files, variant text patches, or generated effect behavior during a run.

### No production card changes

Variant runs must not permanently modify production faction JSON. Temporary text patches are allowed only inside the temp copy.

Production faction data must not gain:

- `effectParams`
- `effectBlocks`
- `effectVariant`
- `script`
- `code`
- `resolver`
- custom runtime paths

### No production effect changes

Variant architecture must not require permanent experimental `effectId` values. The base card keeps its current `baseEffectId`; v3 composes around that behavior in the temp copy.

### No arbitrary JavaScript execution

Variant JSON must be declarative data only. Balance Lab must reject fields that attempt to express code or import behavior.

Blocked examples:

- `code`
- `script`
- `function`
- `eval`
- `import`
- `require`
- `module`
- `patch`
- `filePath`

### Whitelist-only blocks

Only selectors and operations present in the supported registry may validate. Unknown blocks fail closed. Recognized future blocks remain out of scope until implemented and tested.

### Validation before temp-copy patching

All schema and safety validation should happen before creating or patching the temp copy whenever possible. If validation fails, Balance Lab should not generate a runtime registry, patch text, or run the experiment simulation.

## 9. MVP implementation order

### Phase 1: Variant loader

Scope:

- Add standalone variant JSON loading from `tools/balance-lab/effect-variants/`.
- Add schema validation for required fields.
- Add faction/card/baseEffectId validation.
- Add duplicate `variantId` and duplicate scope validation.
- Add safety rejection for arbitrary code fields and production `effectParams`.
- Add validation-only report output.
- Do not execute variants.

Difficulty: Medium.

Risk: Low to medium.

Primary risk:

- Accidentally accepting ambiguous or unsafe variant JSON. Mitigate with fail-closed validation and tests.

### Phase 2: Selector registry

Scope:

- Add a static selector registry definition.
- Validate selector names and selector argument shapes.
- Normalize selector references into internal metadata.
- Do not resolve selectors at runtime yet.

Difficulty: Medium.

Risk: Medium.

Primary risk:

- Selector semantics can become unclear if identity, order, owner, opponent, player base, and enemy base are not documented precisely. Mitigate with explicit selector docs and validation errors.

### Phase 3: Operation registry

Scope:

- Add a static operation registry definition.
- Validate operation names and operation argument shapes.
- Validate selector/operation compatibility.
- Validate timing/operation compatibility.
- Do not execute operations yet.

Difficulty: Medium.

Risk: Medium.

Primary risk:

- Operation args may accidentally imply behavior not yet implemented. Mitigate with narrow MVP schemas and recognized-but-rejected future operations.

### Phase 4: Single-card variant support

Scope:

- Generate temp-only runtime registry for one active variant.
- Add inert resolver hook in gameplay source in a dedicated implementation PR.
- Initially support only `runBaseEffect` pass-through to prove no behavior drift.
- Keep simulator logic unchanged.
- Keep selector and operation execution minimal or disabled until tests are ready.

Difficulty: High.

Risk: High.

Primary risks:

- Gameplay behavior drift.
- Resolver hook placement errors.
- AI probes seeing different behavior from live simulation.

Mitigation:

- Start with `runBaseEffect` only.
- Add no-op equivalence tests.
- Keep all active behavior behind empty/default registry checks.

### Phase 5: Report integration

Scope:

- Add effect variant metadata to patch summary, run summary, comparison report, batch summary, and Paste into ChatGPT output.
- Include sequence summaries, telemetry tags, patched files, validation warnings, and AI compatibility notes.

Difficulty: Medium.

Risk: Low to medium.

Primary risk:

- Reports may imply more precision than the MVP provides. Mitigate by clearly labeling AI limitations and unsupported operations.

## 10. Future expansion: out of scope

The following are future possibilities, but they are explicitly out of scope for MVP and should be rejected until deliberately designed, implemented, and tested.

### Summon

Out of scope because summoning requires slot selection, token/source identity, generated art handling, board capacity rules, and AI candidate generation implications.

### Revive

Out of scope because revive depends on fallen-list ordering, ownership, unit restoration state, empty slot selection, and death-history semantics.

### Fallen manipulation

Out of scope because fallen data affects revive behavior, death triggers, telemetry, and campaign interpretation. Variants must not directly add, remove, or reorder fallen entries.

### Custom AI

Out of scope because v3 should first prove variants can reuse existing targeting, probes, and action scoring. Custom AI would need separate validation, reporting, and parity tests.

### Custom targeting

Out of scope because custom targeting can change simulator action generation, UI assumptions, AI candidate enumeration, and card legality. MVP variants should attach to existing base targeting.

### Custom JavaScript

Out of scope permanently for Balance Lab variant files. Any new gameplay primitive must be implemented as a reviewed repo operation and added to the whitelist, not embedded in experiment JSON.

## Architecture summary

Balance Lab v3 should add Experimental Effect Variants as a third experiment family alongside stat patches and `replaceCard`. Variants are authored as declarative JSON files, validated against a strict schema, normalized into an in-memory registry, injected into a temp-only runtime registry, and reported alongside existing comparison outputs.

The architecture is generic because variants attach by `(factionId, cardId, baseEffectId)` but execute through whitelisted selector and operation names rather than card-specific branches. It scales across factions because the runtime does not encode faction-specific or card-specific behavior; all variable behavior comes from validated composition of documented blocks.

The safest MVP path is validation and reporting first, then registry generation, then a no-op `runBaseEffect` resolver hook, and only later real selector/operation execution.

## Implementation phases summary

| Phase | Name | Difficulty | Risk | Runtime behavior? |
|---:|---|---|---|---|
| 1 | Variant loader | Medium | Low-Medium | No |
| 2 | Selector registry | Medium | Medium | No |
| 3 | Operation registry | Medium | Medium | No |
| 4 | Single-card variant support | High | High | `runBaseEffect` only first |
| 5 | Report integration | Medium | Low-Medium | Metadata/reporting only |

## Key risks

- Validation gaps could allow unsafe or ambiguous variants.
- Resolver hook placement could change base gameplay behavior.
- Selector identity semantics could be wrong after movement or removal.
- AI candidate generation may miss variant-only valuable targets.
- Reports could overstate AI quality if limitations are not explicit.
- Runtime registry injection could accidentally affect the real repo if temp-copy boundaries are not preserved.
- Shared base effect ids could accidentally become globally modified if registry keys are not scoped by faction and card.

## Estimated complexity

Overall complexity: High.

Rationale:

- Schema validation and reporting are moderate, isolated tasks.
- Runtime support is more complex because it touches effect resolution, temporary copied files, AI probe behavior, and deterministic reporting.
- Selector and operation execution must reuse existing mechanics precisely to avoid building a second simulator.

Recommended first implementation task:

> Implement Phase 1 only: variant loader, strict validation, safety checks, and validation-only reports. Do not execute variants and do not modify gameplay or simulator logic in that phase.
