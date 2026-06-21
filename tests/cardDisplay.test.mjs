import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  getCardDisplayName,
  getCardTextShort,
  getCardTypeLabel,
  getStatLabel,
} from '../src/localization/cardDisplay.js';
import {
  formatBoardUnitLabel,
  formatCardDetailLines,
  formatCollectionRowLabel,
  formatDeckSummaryEntry,
  formatHandCardLabel,
} from '../src/rendering/cardRenderModes.js';
import {
  NON_UNIT_EFFECT_STAT_SYMBOL,
  NON_UNIT_EFFECT_STAT_SYMBOL_CSS_COLOR,
  getCardDisplayContent,
  getFixedHeightTextVisualCenterOriginY,
  formatCardNumberOverlay,
  getCardPreviewStatRowKind,
  getModifiedStatState,
  isCardNonUnit,
  isCardPlaceholder,
  isCardUnit,
} from '../src/rendering/cardVisualLayout.js';
import { getFactionByKey, getFactionKeys } from '../src/data/factions/index.js';

test('card display helper falls back to current card name fields when card keys are absent', () => {
  assert.equal(getCardDisplayName({ name: 'Shield Drone' }), 'Shield Drone');
  assert.equal(getCardDisplayName({ name: 'Shield Drone' }, 'pl'), 'Shield Drone');
  assert.equal(getCardDisplayName({}), undefined);
});

test('card display helper falls back to current textShort fields when card keys are absent', () => {
  assert.equal(getCardTextShort({ textShort: 'Target ally +1 ARM until combat.' }), 'Target ally +1 ARM until combat.');
  assert.equal(getCardTextShort({ textShort: 'Target ally +1 ARM until combat.' }, 'pl'), 'Target ally +1 ARM until combat.');
  assert.equal(getCardTextShort({}), undefined);
});

test('card display helper can resolve future nameKey and textKey fields through English dictionary', () => {
  const keyedCard = {
    id: 'aggro_runner_1',
    name: 'Legacy Runner Name',
    nameKey: 'cards.aggro_runner_1.name',
    textShort: 'Legacy Runner Text',
    textKey: 'cards.aggro_runner_1.textShort',
  };

  assert.equal(getCardDisplayName(keyedCard, 'en'), 'Ballroom Duelist');
  assert.equal(getCardTextShort(keyedCard, 'en'), 'Open lane: +2 ATK');
  assert.equal(getCardDisplayName(keyedCard, 'pl'), 'Balowy Pojedynkowicz');
  assert.equal(getCardTextShort(keyedCard, 'pl'), 'Pusta linia: +2 ATK');
});

test('Swarm Substrate display name resolves in English and Polish', () => {
  const { deck } = getFactionByKey('Swarm');
  const substrate = deck.find((card) => card.id === 'swarm_recycle_1');

  assert.equal(getCardDisplayName(substrate, 'en'), 'Substrate');
  assert.equal(getCardDisplayName(substrate, 'pl'), 'Pożywka');
});

test('card display helper uses existing card fields when future translation keys are missing', () => {
  const keyedCard = {
    name: 'Fallback Name',
    nameKey: 'cards.missing.name',
    textShort: 'Fallback text',
    textKey: 'cards.missing.textShort',
  };

  assert.equal(getCardDisplayName(keyedCard, 'en'), 'Fallback Name');
  assert.equal(getCardTextShort(keyedCard, 'en'), 'Fallback text');
});

test('card display helper keeps current English type and stat labels', () => {
  assert.equal(getCardTypeLabel({ type: 'effect' }), 'Effect');
  assert.equal(getCardTypeLabel({ type: 'unit' }), 'Unit');
  assert.equal(getCardTypeLabel({ type: 'order' }), 'Effect');
  assert.equal(getCardTypeLabel({}), 'Unit');
  assert.equal(getStatLabel('attack'), 'ATK');
  assert.equal(getStatLabel('hp'), 'HP');
  assert.equal(getStatLabel('armor'), 'ARM');
  assert.equal(getStatLabel('speed'), 'speed');
});

test('card render mode helpers keep compact and full card text separate', () => {
  const card = {
    name: 'Shield Drone',
    type: 'unit',
    attack: 1,
    hp: 4,
    armor: 2,
    textShort: 'Blocks line. This unit can’t attack.',
    description: 'A long rules description that must stay off compact board units.',
    targeting: 'ally',
    effectId: 'cannot_attack',
  };

  assert.equal(formatBoardUnitLabel(card), 'Shield Drone\nATK 1 / HP 4 / ARM 2');
  assert.doesNotMatch(formatBoardUnitLabel(card), /Blocks line|can’t attack|long rules description|textShort/);
  assert.equal(formatHandCardLabel(card), 'Shield Drone\n1/4 ARM 2\nBlocks line. This unit can’t attack.');
  assert.deepEqual(formatCollectionRowLabel(card), {
    name: 'Shield Drone',
    typeStats: 'Unit • ATK 1 / HP 4',
    textShort: 'Blocks line. This unit can’t attack.',
  });
  assert.deepEqual(formatCardDetailLines(card), [
    'Shield Drone',
    'Type: Unit',
    'ATK/HP: 1 / 4',
    'Target: ally',
    '',
    'Blocks line. This unit can’t attack.',
  ]);
});

test('hand/full formatter includes textShort and preserves unit stat line output', () => {
  const card = {
    name: 'Shield Drone',
    type: 'unit',
    attack: 1,
    hp: 4,
    armor: 2,
    textShort: ' Blocks line. This unit can’t attack. ',
  };

  assert.equal(formatHandCardLabel(card), 'Shield Drone\n1/4 ARM 2\nBlocks line. This unit can’t attack.');
});

test('Wardens vanilla units render without placeholder body text', () => {
  const { deck } = getFactionByKey('Wardens');
  const bastionGuard = deck.find((card) => card.id === 'wardens_bastion_guard_1');
  const watchCaptain = deck.find((card) => card.id === 'wardens_watch_captain_1');

  assert.equal(formatHandCardLabel(bastionGuard), 'Tururuk\n1/3 ARM 0');
  assert.equal(formatCollectionRowLabel(bastionGuard).textShort, '');
  assert.equal(formatCardDetailLines(watchCaptain).at(-1), '');
  assert.doesNotMatch(formatHandCardLabel(bastionGuard), /UNIT|NO EFFECT|No special behavior/i);
  assert.doesNotMatch(formatHandCardLabel(watchCaptain), /UNIT|NO EFFECT|No special behavior/i);
});

test('hand/full formatter includes effect card textShort without unit stats', () => {
  const card = {
    name: 'Repair Kit',
    type: 'effect',
    attack: 99,
    hp: 99,
    armor: 99,
    textShort: 'Heal 3',
  };

  assert.equal(formatHandCardLabel(card), 'Repair Kit\nHeal +3 ●');
});


test('internal card number overlay formats stable faction-local Arabic numbers only', () => {
  assert.equal(formatCardNumberOverlay({ cardNumber: 1 }), '01');
  assert.equal(formatCardNumberOverlay({ cardNumber: 10 }), '10');
  assert.equal(formatCardNumberOverlay({ cardNumber: 7, id: 'gameplay-id', artAssetId: 'asset-id' }), '07');
  assert.equal(formatCardNumberOverlay({ id: 'gameplay-id', artAssetId: 'asset-id' }), null);
  assert.equal(formatCardNumberOverlay({ cardNumber: '07' }), null);
});

test('shared visual renderer leaves empty rules areas blank instead of using type labels', () => {
  const visualSource = fs.readFileSync('src/rendering/cardVisualLayout.js', 'utf8');

  assert.doesNotMatch(visualSource, /content\.body \|\| content\.type/);
  assert.match(visualSource, /const bodyTextY = zones\.text\.y \+ bodyTopPadding \+ CARD_DESCRIPTION_TEXT_VERTICAL_OFFSET_PX;/);
  assert.match(visualSource, /createInlineStatText\(scene, zones\.text\.centerX, bodyTextY, content\.body,/);
});


test('card number overlay is limited to hand, hand inspect, and collection previews', () => {
  const visualSource = fs.readFileSync('src/rendering/cardVisualLayout.js', 'utf8');
  const battleSource = fs.readFileSync('src/scenes/BattleScene.js', 'utf8');
  const collectionSource = fs.readFileSync('src/scenes/CollectionScene.js', 'utf8');
  const drawHand = battleSource.slice(battleSource.indexOf('  drawHand()'), battleSource.indexOf('  createHandCardView({'));
  const inspectRequest = battleSource.slice(battleSource.indexOf('  getCurrentInspectCardRequest()'), battleSource.indexOf('  showSelectedHandCardZoom()'));
  const inspectZoom = battleSource.slice(battleSource.indexOf('  showSelectedHandCardZoom()'), battleSource.indexOf('  applyInspectDimming('));
  const boardUnitView = battleSource.slice(battleSource.indexOf('  createBoardUnitView(cell, unit) {'), battleSource.indexOf('  refreshBoardLabels()'));
  const collectionPreview = collectionSource.slice(collectionSource.indexOf('  drawCardPreview('), collectionSource.indexOf('  openDetailPanel('));

  assert.match(visualSource, /showCardNumber = false/);
  assert.match(visualSource, /createCardNumberOverlay\(scene, zones, card, \{ width, height, typographyScale \}\)/);
  assert.match(drawHand, /showCardNumber: true/);
  assert.match(inspectRequest, /sourceY: cardView\.baseY,[\s\S]*showCardNumber: true/);
  assert.match(inspectRequest, /sourceY: cell\.background\.y,[\s\S]*showCardNumber: false/);
  assert.match(inspectZoom, /showCardNumber: inspectRequest\.showCardNumber/);
  assert.match(collectionPreview, /showCardNumber: true/);
  assert.doesNotMatch(boardUnitView, /showCardNumber|createCardNumberOverlay|cardNumber/);
});

test('battle hand renders presentation-only back cards in visible empty slots while cards remain in the deck', () => {
  const battleSource = fs.readFileSync('src/scenes/BattleScene.js', 'utf8');
  const visualSource = fs.readFileSync('src/rendering/cardVisualLayout.js', 'utf8');
  const drawHandSource = battleSource.slice(battleSource.indexOf('  drawHand() {'), battleSource.indexOf('  createHandCardView({'));
  const backCardRenderSource = battleSource.slice(battleSource.indexOf('  createHandBackCardView({ x, y, width, height, depth })'), battleSource.indexOf('  createHandCardView({'));

  assert.match(battleSource, /key: 'ui\.card\.back'/);
  assert.match(battleSource, /path: resolvePublicAssetPath\('assets\/ui\/card_back\.webp'\)/);
  assert.match(battleSource, /preloadImageAsset\(this, HAND_BACK_CARD_ASSET/);
  assert.match(drawHandSource, /const handCount = this\.gameState\.player\.hand\.length;/);
  assert.match(drawHandSource, /const deckCount = this\.gameState\.player\.deck\.length;/);
  assert.match(drawHandSource, /const maxHandSize = this\.gameState\.player\.maxHandSize;/);
  assert.match(drawHandSource, /shouldRenderHandBackCard\(\{ handCount, maxHandSize, deckCount, index \}\)/);
  assert.match(drawHandSource, /const backCard = this\.createHandBackCardView\(\{/);
  assert.match(drawHandSource, /backCard\.slotIndex = index;\s*this\.handBackCards\.push\(backCard\);/);
  assert.match(backCardRenderSource, /const root = this\.add\.container\(x, y\)\.setDepth\(depth\)/);
  assert.doesNotMatch(backCardRenderSource, /setInteractive/);
  assert.doesNotMatch(visualSource, /HAND_BACK_CARD|card_back|ui\.card\.back/);
});

test('battle hand cards route content through card visual layout helpers and preserve formatter output', () => {
  const source = fs.readFileSync('src/scenes/BattleScene.js', 'utf8');
  const unitCard = {
    name: 'Shield Drone',
    type: 'unit',
    attack: 1,
    hp: 4,
    armor: 2,
    textShort: ' Blocks line. This unit can’t attack. ',
  };
  const effectCard = {
    name: 'Repair Kit',
    type: 'effect',
    textShort: 'Heal 3',
  };

  assert.match(source, /import \{ formatDeckSummaryEntry \} from '\.\.\/rendering\/cardRenderModes\.js';/);
  assert.match(source, /createCardPreviewView\(this, \{/);
  const visualSource = fs.readFileSync('src/rendering/cardVisualLayout.js', 'utf8');
  assert.match(visualSource, /getCardDisplayContent\(card, locale\)/);
  assert.match(visualSource, /getCardStatValues\(card\)/);
  assert.doesNotMatch(source, /card\.textShort/);
  assert.doesNotMatch(source, /`\$\{atk\}\/\$\{hp\} ARM \$\{armor\}`/);
  assert.equal(formatHandCardLabel(unitCard), 'Shield Drone\n1/4 ARM 2\nBlocks line. This unit can’t attack.');
  assert.equal(formatHandCardLabel(effectCard), 'Repair Kit\nHeal +3 ●');
  assert.equal(formatHandCardLabel(null), 'Empty');
});

test('hand and inspect card previews render non-unit effect stars without touching board stat rows', () => {
  const visualSource = fs.readFileSync('src/rendering/cardVisualLayout.js', 'utf8');
  const battleSource = fs.readFileSync('src/scenes/BattleScene.js', 'utf8');
  const collectionSource = fs.readFileSync('src/scenes/CollectionScene.js', 'utf8');
  const createHandCardViewSource = battleSource.slice(battleSource.indexOf('  createHandCardView({'), battleSource.indexOf('  getHandCardAccentColor(card) {'));
  const boardUnitViewSource = battleSource.slice(battleSource.indexOf('  createBoardUnitView(cell, unit) {'), battleSource.indexOf('  refreshBoardLabels() {'));
  const collectionInspectSource = collectionSource.slice(collectionSource.indexOf('  showInspectPreview('), collectionSource.indexOf('  destroyInspectPreview('));
  const collectionGridPreviewSource = collectionSource.slice(collectionSource.indexOf('  drawCardPreview('), collectionSource.indexOf('  onCardPointerDown('));

  assert.equal(NON_UNIT_EFFECT_STAT_SYMBOL, '✶');
  assert.equal(NON_UNIT_EFFECT_STAT_SYMBOL_CSS_COLOR, '#fde68a');
  assert.equal(getFixedHeightTextVisualCenterOriginY({ fontSize: 20 }, 20, 0), 0.5);
  assert.equal(getFixedHeightTextVisualCenterOriginY({ fontSize: 20 }, 10, 2), 1.1);
  assert.match(visualSource, /const statRowKind = getCardPreviewStatRowKind\(card, \{ showNonUnitEffectStatSymbols \}\);/);
  assert.match(visualSource, /if \(statRowKind === 'nonUnitEffect'\)/);
  assert.match(visualSource, /if \(statRowKind === 'unit'\)/);
  assert.match(visualSource, /return createEmptyStatRow\(/);
  assert.match(visualSource, /createNonUnitEffectStatSymbols\(/);
  assert.match(visualSource, /const metrics = getStatRowMetrics\(height, width, \{ sizeScale, fontScale, spacingScale, maxGroupWidthRatio \}\);/);
  assert.match(visualSource, /scene\.add\.container\(x, y\)\.setDepth\(depth\)/);
  assert.match(visualSource, /drawNonUnitEffectStarIcon\(scene, slotCenterX, 0, starSize\)/);
  assert.match(visualSource, /scene\.add\.graphics\(\{ x, y \}\)/);
  assert.doesNotMatch(visualSource, /scene\.add\.text\(slotCenterX, 0, NON_UNIT_EFFECT_STAT_SYMBOL/);
  assert.match(createHandCardViewSource, /showNonUnitEffectStatSymbols: true/);
  assert.match(collectionInspectSource, /showNonUnitEffectStatSymbols: true/);
  assert.match(collectionGridPreviewSource, /showNonUnitEffectStatSymbols: true/);
  assert.doesNotMatch(boardUnitViewSource, /showNonUnitEffectStatSymbols|createNonUnitEffectStatSymbols/);
});



test('shared card preview stat row classification separates units, non-units, and placeholders', () => {
  const unitCard = { name: 'Shield Drone', type: 'unit', attack: 1, hp: 4, armor: 2 };
  const statOnlyUnitCard = { name: 'Generated Unit', attack: 1, hp: 1 };
  const effectCard = { name: 'Repair Kit', type: 'effect', textShort: 'Heal +3 HP.' };

  assert.equal(isCardPlaceholder(null), true);
  assert.equal(isCardUnit(unitCard), true);
  assert.equal(isCardUnit(statOnlyUnitCard), true);
  assert.equal(isCardNonUnit(effectCard), true);
  assert.equal(isCardNonUnit(null), false);
  assert.equal(getCardPreviewStatRowKind(unitCard), 'unit');
  assert.equal(getCardPreviewStatRowKind(effectCard), 'nonUnitEffect');
  assert.equal(getCardPreviewStatRowKind(effectCard, { showNonUnitEffectStatSymbols: false }), 'empty');
  assert.equal(getCardPreviewStatRowKind(null), 'empty');
});

test('card render mode helpers preserve English fallback behavior for future locales', () => {
  const card = { name: 'Shield Drone', type: 'effect', textShort: 'Target ally +1 ARM until combat.' };

  assert.equal(formatHandCardLabel(card, 'pl'), 'Shield Drone\nTarget ally +1 ◆ until combat.');
  assert.deepEqual(formatDeckSummaryEntry(card, 'pl'), { name: 'Shield Drone', typeLabel: 'Efekt', count: 1 });
  assert.deepEqual(formatDeckSummaryEntry({}, 'pl'), { name: 'Nieznana karta', typeLabel: 'Jednostka', count: 1 });
});

test('deck info panel renders battle recap instead of raw card summary lists', () => {
  const source = fs.readFileSync('src/scenes/BattleScene.js', 'utf8');

  assert.match(source, /getDeckSummaryHeaderText\(\)/);
  assert.match(source, /formatBattleHistoryEntry\(entry\)/);
  assert.match(source, /No battle history yet\./);
  assert.doesNotMatch(source, /return groups\.map\(\(\[heading, cards\]\) => this\.formatDeckInfoGroup\(heading, cards\)\)\.join\('\\n\\n'\);/);
});

test('deck summary entry output remains unchanged', () => {
  const entry = formatDeckSummaryEntry({ name: 'Shield Drone', type: 'unit' });

  assert.equal(`• ${entry.name} — ${entry.typeLabel} ×${entry.count}`, '• Shield Drone — Unit ×1');
});

test('deck info panel battle recap output covers actions and resolutions', () => {
  const source = fs.readFileSync('src/scenes/BattleScene.js', 'utf8');

  assert.match(source, /plays unit/);
  assert.match(source, /plays effect/);
  assert.match(source, /formatBattleHistoryActionTokens\(entry\)/);
  assert.match(source, /ui\.battle\.deckInfo\.history\.replaces/);
  assert.match(source, /killed each other/);
  assert.match(source, /ui\.battle\.deckInfo\.history\.dealtDamageTo/);
});


test('deck info battle history groups one logical cycle into one chronological turn block', () => {
  const source = fs.readFileSync('src/scenes/BattleScene.js', 'utf8');
  const queueBlock = source.slice(source.indexOf('  queueBattleHistoryAction(side, action) {'), source.indexOf('  buildResolutionFromCombatEvents(combatEvents, snapshot) {'));
  const commitBlock = source.slice(source.indexOf('  commitBattleHistoryTurn(combatEvents, snapshot) {'), source.indexOf('  openDeckInfoPanel() {'));
  const renderBlock = source.slice(source.indexOf('  renderDeckInfoHistoryContent(container, x, y, width, panelHeight) {'), source.indexOf('  getBattleHistorySideLabel(side) {'));

  assert.match(queueBlock, /pendingBattleHistoryEntries\.push\(\{\s*actingSide: side,\s*action,\s*\}\);/);
  assert.doesNotMatch(queueBlock, /turnNumber:/);
  assert.match(commitBlock, /const turnEntry = \{\s*turnNumber: \(this\.gameState\?\.turnsCompleted \?\? 0\) \+ 1,\s*actions,\s*resolution,/);
  assert.match(commitBlock, /this\.battleHistory = \[\.\.\.\(this\.battleHistory \?\? \[\]\), turnEntry\];/);
  assert.match(renderBlock, /this\.getBattleHistoryActions\(entry\)\.forEach\(\(actionEntry\) => \{/);
  assert.doesNotMatch(renderBlock, /\.reverse\(\)/);
});


test('battle history is initialized only for a new battle and is not reset at turn start', () => {
  const source = fs.readFileSync('src/scenes/BattleScene.js', 'utf8');
  const initializeBlock = source.slice(source.indexOf('  initializeBattleInfoPanelState() {'), source.indexOf('  getDeckSummaryCounters() {'));
  const startTurnBlock = source.slice(source.indexOf('  startTurn() {'), source.indexOf('  updateActionableSideVisualState() {'));

  assert.match(initializeBlock, /this\.battleHistory = \[\];/);
  assert.match(initializeBlock, /this\.pendingBattleHistoryEntries = \[\];/);
  assert.doesNotMatch(startTurnBlock, /this\.battleHistory = \[\];/);
  assert.doesNotMatch(startTurnBlock, /this\.pendingBattleHistoryEntries = \[\];/);
  assert.doesNotMatch(startTurnBlock, /this\.playerInitialDeckTypeCounts = null;/);
});

test('visible UI surfaces route names through active-locale presentation helpers', () => {
  const battleSource = fs.readFileSync('src/scenes/BattleScene.js', 'utf8');
  const collectionSource = fs.readFileSync('src/scenes/CollectionScene.js', 'utf8');
  const factionSelectSource = fs.readFileSync('src/ui/factionCards.js', 'utf8');
  const boardUnitViewSource = battleSource.slice(battleSource.indexOf('  createBoardUnitView(cell, unit) {'), battleSource.indexOf('  refreshBoardLabels() {'));
  const enemyActionMessageSource = battleSource.slice(battleSource.indexOf('  getEnemyActionMessage(action, card) {'), battleSource.indexOf('  getEnemyEffectSummary(card) {'));
  const createHandCardViewSource = battleSource.slice(battleSource.indexOf('  createHandCardView({'), battleSource.indexOf('  getHandCardAccentColor(card) {'));
  const inspectZoomSource = battleSource.slice(battleSource.indexOf('  showSelectedHandCardZoom() {'), battleSource.indexOf('  applyInspectDimming(activeCardId) {'));

  assert.match(enemyActionMessageSource, /const cardName = getCardDisplayName\(card, getActiveLocale\(\)\) \?\? translateActive\('ui\.common\.unknownCard', 'Unknown Card'\);/);
  assert.match(boardUnitViewSource, /const unitStats = this\.currentBoardRenderStats\?\.\[cell\.index\] \?\? this\.getBoardUnitStats\(unit\);/);
  assert.match(boardUnitViewSource, /baseStats: this\.getBoardUnitBaseStats\(unit\),/);
  assert.doesNotMatch(battleSource, /getBoardUnitLabel\(unit\)/);
  assert.match(createHandCardViewSource, /createCardPreviewView\(this, \{/);
  assert.match(inspectZoomSource, /this\.createHandCardView\(\{/);
  assert.match(collectionSource, /createCardPreviewView\(this, \{/);
  assert.doesNotMatch(collectionSource, /formatCollectionRowLabel\(card, getActiveLocale\(\)\)/);
  assert.doesNotMatch(collectionSource, /formatCardDetailLines\(card, getActiveLocale\(\)\)/);
  assert.doesNotMatch(collectionSource, /openDetailPanel\(/);
  assert.match(collectionSource, /showInspectPreview\(pressedCard\)/);
  assert.match(collectionSource, /getFactionPresentationName\(faction\?\.id, getActiveLocale\(\), faction\?\.name \?\? factionKey\)/);
  assert.match(factionSelectSource, /getFactionPresentationName\(faction\?\.id, getActiveLocale\(\), faction\?\.name \?\? factionKey\)/);
});


test('modified stat state compares displayed ATK and ARM against base values without changing HP', () => {
  assert.equal(getModifiedStatState('attack', { attack: 3 }, { attack: 1 }), 'buff');
  assert.equal(getModifiedStatState('attack', { attack: 0 }, { attack: 2 }), 'debuff');
  assert.equal(getModifiedStatState('armor', { armor: 2 }, { armor: 0 }), 'buff');
  assert.equal(getModifiedStatState('armor', { armor: 0 }, { armor: 1 }), 'debuff');
  assert.equal(getModifiedStatState('health', { health: 1 }, { health: 3 }), 'base');
});

test('collection cards use the hand-card visual contract instead of collection-only styling', () => {
  const source = fs.readFileSync('src/scenes/CollectionScene.js', 'utf8');
  const previewSource = source.slice(source.indexOf('  drawCardPreview('), source.indexOf('  onCardPointerDown('));
  const inspectSource = source.slice(source.indexOf('  getInspectCardTransform('), source.indexOf('  createBackButton('));

  assert.match(source, /import \{ HAND_CARD_ASPECT_RATIO \} from '\.\.\/ui\/handLayout\.js';/);
  assert.match(source, /const cardHeight = Math\.round\(cardWidth \* HAND_CARD_ASPECT_RATIO\);/);
  assert.match(previewSource, /statBadgeScale: HAND_CARD_STAT_BADGE_SCALE,/);
  assert.match(previewSource, /typographyScale: HAND_CARD_TYPOGRAPHY_SCALE,/);
  assert.match(previewSource, /titleTypographyScale: HAND_CARD_TITLE_TYPOGRAPHY_SCALE,/);
  assert.match(previewSource, /bodyLineSpacing: HAND_CARD_BODY_LINE_SPACING,/);
  assert.match(source, /this\.time\.delayedCall\(HAND_CARD_LONG_PRESS_MS,/);
  assert.match(inspectSource, /statBadgeScale: INSPECT_CARD_STAT_BADGE_SCALE,/);
  assert.match(inspectSource, /typographyScale: INSPECT_CARD_TYPOGRAPHY_SCALE,/);
  assert.doesNotMatch(source, /COLLECTION_CARD_ASPECT_RATIO|COLLECTION_INSPECT_CARD_|openDetailPanel\(/);
});

test('board unit compact view removes names, expands artwork, and mirrors stat placement by owner', () => {
  const source = fs.readFileSync('src/scenes/BattleScene.js', 'utf8');
  const start = source.indexOf('  createBoardUnitView(cell, unit) {');
  const end = source.indexOf('  refreshBoardLabels() {');
  const boardUnitViewSource = source.slice(start, end);

  assert.match(boardUnitViewSource, /const statHeight = Math\.max\(18, Math\.min\(26, Math\.round\(unitHeight \* 0\.145\)\)\);/);
  assert.match(boardUnitViewSource, /const artHeight = Math\.max\(1, unitHeight - verticalPad \* 2 - statHeight - statGap - statEdgeInset \* 2\);/);
  assert.match(boardUnitViewSource, /const isEnemyUnit = unit\.owner === 'enemy';/);
  assert.match(boardUnitViewSource, /const finalArtY = isEnemyUnit \? topArtY : bottomArtY;/);
  assert.match(boardUnitViewSource, /const finalStatY = isEnemyUnit \? bottomStatY : topStatY;/);
  assert.match(boardUnitViewSource, /const unitStats = this\.currentBoardRenderStats\?\.\[cell\.index\] \?\? this\.getBoardUnitStats\(unit\);/);
  assert.match(boardUnitViewSource, /const stats = createStatBadges\(this, 0, finalStatY, artWidth, statHeight, unitStats, 0, \{/);
  assert.match(boardUnitViewSource, /baseStats: this\.getBoardUnitBaseStats\(unit\),/);
  assert.match(boardUnitViewSource, /const artLocalContrast = this\.add\.rectangle\(0, finalArtY, artRect\.width, artRect\.height, 0x000000, 0\.03\);/);
  assert.match(boardUnitViewSource, /const artShade = this\.add\.rectangle\(0, finalArtY - artRect\.height \* 0\.17, artRect\.width, artRect\.height \* 0\.52, CARD_COLORS\.artTop, 0\.18\);/);
  assert.match(boardUnitViewSource, /const artBottomDim = this\.add\.rectangle\(0, finalArtY \+ artRect\.height \* 0\.29, artRect\.width, artRect\.height \* 0\.42, BASE_CARD_SURFACE_THEME\.artBackdropFill, 0\.14\);/);
  assert.match(boardUnitViewSource, /return \[cardBack, inner, artBackdrop, art, artStroke, artLocalContrast, artShade, artBottomDim, stats\];/);
  assert.doesNotMatch(boardUnitViewSource, /createBoardUnitNameText|namePanel|nameText|displayName|getCardDisplayName\(unit, getActiveLocale\(\)\)/);
  assert.doesNotMatch(boardUnitViewSource, /getCardTextShort|getCardDisplayContent|createInlineStatText|bodyText|textPanel/);
});

test('current faction card display names use locale presentation overrides without mutating gameplay card names', () => {
  for (const factionKey of getFactionKeys()) {
    const faction = getFactionByKey(factionKey);
    for (const card of faction.deck) {
      const before = JSON.stringify(card);
      const displayNameEn = getCardDisplayName(card, 'en');
      const displayNamePl = getCardDisplayName(card, 'pl');
      assert.equal(typeof displayNameEn, 'string');
      assert.notEqual(displayNameEn.length, 0);
      assert.notEqual(displayNamePl.length, 0);
      assert.equal(card.id, JSON.parse(before).id);
      assert.equal(card.name, JSON.parse(before).name);
      assert.equal(JSON.stringify(card), before);
      assert.equal(typeof getCardTextShort(card, 'en'), 'string');
      assert.equal(typeof getCardTextShort(card, 'pl'), 'string');
    }
  }
});

test('localized Control names resolve in Collection, Inspect, Hand, and Battle labels', () => {
  const faction = getFactionByKey('Control');
  const expectedNames = {
    control_hacker_1: 'Signalegel',
    control_disruptor_1: 'Störführer',
    control_sniper_1: 'Rotes Auge',
    control_controller_1: 'Kommandant',
    control_pulse_wave_1: 'Wunderwaffe',
  };

  for (const [cardId, name] of Object.entries(expectedNames)) {
    const card = faction.deck.find((item) => item.id === cardId);
    assert.equal(getCardDisplayName(card, 'en'), name, `English display name for ${cardId}`);
    assert.equal(getCardDisplayName(card, 'pl'), name, `Polish display name for ${cardId}`);
    assert.equal(formatCollectionRowLabel(card, 'pl').name, name, `Collection title for ${cardId}`);
    assert.equal(formatCardDetailLines(card, 'pl')[0], name, `Inspect title for ${cardId}`);
    assert.equal(formatHandCardLabel(card, 'pl').split('\n')[0], name, `Hand title for ${cardId}`);
    assert.equal(formatDeckSummaryEntry(card, 'pl').name, name, `Battle title for ${cardId}`);
  }
});

test('Tank Last Legion display name resolves in all card presentation surfaces', () => {
  const faction = getFactionByKey('Tank');
  const card = faction.deck.find((item) => item.id === 'tank_last_stand_1');
  const expectedNames = { en: 'Last Legion', pl: 'Ostatni Legion' };

  for (const [locale, name] of Object.entries(expectedNames)) {
    assert.equal(getCardDisplayName(card, locale), name, `${locale} display name`);
    assert.equal(formatCollectionRowLabel(card, locale).name, name, `${locale} Collection title`);
    assert.equal(formatCardDetailLines(card, locale)[0], name, `${locale} Inspect title`);
    assert.equal(formatHandCardLabel(card, locale).split('\n')[0], name, `${locale} Battle Hand title`);
    assert.equal(formatDeckSummaryEntry(card, locale).name, name, `${locale} Battle label`);
    assert.equal(getCardDisplayContent(card, locale).name, name, `${locale} Battle Card View title`);
  }
});

test('Relay production name resolves in player-facing views without changing its stable card id', () => {
  const faction = getFactionByKey('Control');
  const relay = faction.deck.find((card) => card.id === 'control_drone_1');
  const before = JSON.stringify(relay);

  assert.equal(relay.name, 'Drone');
  assert.equal(getCardDisplayName(relay, 'en'), 'Relay');
  assert.equal(formatHandCardLabel(relay, 'en').split('\n')[0], 'Relay');
  assert.equal(formatCollectionRowLabel(relay, 'en').name, 'Relay');
  assert.equal(formatCardDetailLines(relay, 'en')[0], 'Relay');
  assert.equal(formatDeckSummaryEntry(relay, 'en').name, 'Relay');
  assert.equal(getCardDisplayName(relay, 'pl'), 'Przekaźnik');
  assert.equal(formatHandCardLabel(relay, 'pl').split('\n')[0], 'Przekaźnik');
  assert.equal(formatCollectionRowLabel(relay, 'pl').name, 'Przekaźnik');
  assert.equal(formatCardDetailLines(relay, 'pl')[0], 'Przekaźnik');
  assert.equal(formatDeckSummaryEntry(relay, 'pl').name, 'Przekaźnik');
  assert.equal(relay.id, 'control_drone_1');
  assert.equal(relay.name, 'Drone');
  assert.equal(JSON.stringify(relay), before);
});

test('presentation overrides resolve through render modes and preserve gameplay ids', () => {
  const faction = getFactionByKey('Aggro');
  const runner = faction.deck.find((card) => card.id === 'aggro_runner_1');
  const before = JSON.stringify(runner);

  assert.equal(runner.name, 'Runner');
  assert.equal(getCardDisplayName(runner, 'en'), 'Ballroom Duelist');
  assert.equal(formatHandCardLabel(runner, 'en').split('\n')[0], 'Ballroom Duelist');
  assert.equal(formatBoardUnitLabel(runner, 'en').split('\n')[0], 'Ballroom Duelist');
  assert.deepEqual(formatCollectionRowLabel(runner, 'en'), {
    name: 'Ballroom Duelist',
    typeStats: 'Unit • ATK 2 / HP 1',
    textShort: 'Open lane: +2 ▲',
  });
  assert.equal(formatDeckSummaryEntry(runner, 'en').name, 'Ballroom Duelist');
  assert.equal(getCardDisplayName(runner, 'pl'), 'Balowy Pojedynkowicz');
  assert.equal(formatHandCardLabel(runner, 'pl').split('\n')[0], 'Balowy Pojedynkowicz');
  assert.equal(formatBoardUnitLabel(runner, 'pl').split('\n')[0], 'Balowy Pojedynkowicz');
  assert.deepEqual(formatCollectionRowLabel(runner, 'pl'), {
    name: 'Balowy Pojedynkowicz',
    typeStats: 'Jednostka • ATK 2 / HP 1',
    textShort: 'Pusta linia: +2 ▲',
  });
  assert.equal(formatDeckSummaryEntry(runner, 'pl').name, 'Balowy Pojedynkowicz');
  assert.equal(runner.id, 'aggro_runner_1');
  assert.equal(runner.name, 'Runner');
  assert.equal(JSON.stringify(runner), before);
});
