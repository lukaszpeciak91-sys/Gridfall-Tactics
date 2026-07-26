import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const sceneSource = fs.readFileSync('src/scenes/FactionSelectScene.js', 'utf8');
const cardsSource = fs.readFileSync('src/ui/factionCards.js', 'utf8');

function loadCompletedFactionLookup() {
  const match = sceneSource.match(/export function getCompletedCampaignFactionKeys\(factionKeys, stats\) \{[\s\S]*?\n\}/);
  assert.ok(match);
  return Function(`${match[0].replace('export ', '')}; return getCompletedCampaignFactionKeys;`)();
}

function numericConstant(name) {
  const match = cardsSource.match(new RegExp(`(?:export )?const ${name} = ([0-9.]+);`));
  assert.ok(match, `${name} should be declared`);
  return Number(match[1]);
}

function renderCard({ accentColor = 0xf97316, completedCampaignPresentation = false } = {}) {
  const start = cardsSource.indexOf('export function drawFactionCardVisual(');
  const functionSource = cardsSource.slice(start).replace('export function', 'function');
  const names = [
    'getFactionCardPresentation', 'drawFactionPreview', 'drawFactionTags', 'fitFactionTitleText',
    'POSTER_TITLE_SCRIM_HEIGHT', 'POSTER_TITLE_BOTTOM_PADDING', 'POSTER_TITLE_LEFT_PADDING',
    'POSTER_TITLE_RIGHT_PADDING', 'POSTER_TITLE_WIDTH_RATIO', 'POSTER_TITLE_MAX_FONT_SIZE',
    'FACTION_CARD_BORDER_LINE_WIDTH', 'FACTION_CARD_BORDER_ALPHA',
    'COMPLETED_CAMPAIGN_BORDER_LINE_WIDTH', 'COMPLETED_CAMPAIGN_GLOW_LINE_WIDTH',
    'COMPLETED_CAMPAIGN_GLOW_ALPHA',
  ];
  const values = [
    () => ({ details: { accentColor, tags: [] }, displayName: 'Faction' }),
    () => [], () => [], () => {}, 96, 18, 18, 16, 0.92, 29,
    numericConstant('FACTION_CARD_BORDER_LINE_WIDTH'), numericConstant('FACTION_CARD_BORDER_ALPHA'),
    numericConstant('COMPLETED_CAMPAIGN_BORDER_LINE_WIDTH'), numericConstant('COMPLETED_CAMPAIGN_GLOW_LINE_WIDTH'),
    numericConstant('COMPLETED_CAMPAIGN_GLOW_ALPHA'),
  ];
  const draw = Function(...names, `${functionSource}; return drawFactionCardVisual;`)(...values);
  const graphics = [];
  const makeGraphics = () => {
    const commands = [];
    const object = { commands };
    for (const method of ['fillStyle', 'fillRoundedRect', 'lineStyle', 'strokeRoundedRect', 'fillGradientStyle', 'fillRect']) {
      object[method] = (...args) => { commands.push([method, ...args]); return object; };
    }
    graphics.push(object);
    return object;
  };
  const text = { width: 100, setOrigin() { return this; }, setAlpha() { return this; } };
  const scene = { add: { graphics: makeGraphics, text: () => text } };
  const content = { children: [], add(child) { this.children.push(child); } };
  draw(scene, content, 'Faction', { y: 0, cardWidth: 380, cardHeight: 196, completedCampaignPresentation });
  return graphics.find((graphic) => graphic.commands.some(([name, x, y, width, height]) => (
    name === 'fillRoundedRect' && x === -190 && y === 0 && width === 380 && height === 196
  )));
}

test('completion qualification remains positive campaignsWon for canonical current keys', () => {
  const lookup = loadCompletedFactionLookup();
  const completed = lookup(['Aggro', 'Tank', 'Control', 'Swarm'], { factions: {
    Aggro: { campaignsWon: 0 }, Tank: { campaignsWon: 1 }, Control: { campaignsWon: 7 },
    Swarm: { campaignsWon: -1 }, Deprecated: { campaignsWon: 10 },
  } });
  assert.deepEqual([...completed], ['Tank', 'Control']);
  for (const stats of [undefined, null, {}, { factions: null }, { factions: { Aggro: { campaignsWon: '1' } } }]) {
    assert.equal(lookup(['Aggro'], stats).size, 0);
  }
});

test('ordinary and completed presentations use one border path with runtime stroke geometry', () => {
  const ordinary = renderCard();
  const completed = renderCard({ completedCampaignPresentation: true });
  const ordinaryStrokes = ordinary.commands.filter(([name]) => name === 'strokeRoundedRect');
  const completedStrokes = completed.commands.filter(([name]) => name === 'strokeRoundedRect');
  assert.equal(ordinaryStrokes.length, 1);
  assert.equal(completedStrokes.length, 2, 'one glow stroke and one crisp stroke');
  assert.deepEqual(completedStrokes[0], ordinaryStrokes[0]);
  assert.deepEqual(completedStrokes[1], ordinaryStrokes[0]);
  assert.deepEqual(ordinaryStrokes[0].slice(1), [-189, 1, 378, 194, 19]);

  const ordinaryLines = ordinary.commands.filter(([name]) => name === 'lineStyle');
  const completedLines = completed.commands.filter(([name]) => name === 'lineStyle');
  assert.deepEqual(ordinaryLines, [['lineStyle', 1, 0xf97316, 0.72]]);
  assert.deepEqual(completedLines, [
    ['lineStyle', 6, 0xf97316, 0.12],
    ['lineStyle', 2, 0xf97316, 0.72],
  ]);
  assert.equal(completed.commands.filter(([name]) => name === 'fillRoundedRect').length, 1, 'no glow fill overlays artwork');
  assert.ok(completed.commands.indexOf(completedLines[0]) < completed.commands.indexOf(completedLines[1]));
});

test('completed strokes retain each faction accent color', () => {
  for (const color of [0xf97316, 0x38bdf8, 0xa78bfa, 0x84cc16, 0xfacc15, 0xec4899, 0xf59e0b]) {
    const lines = renderCard({ accentColor: color, completedCampaignPresentation: true }).commands.filter(([name]) => name === 'lineStyle');
    assert.ok(lines.every(([, , lineColor]) => lineColor === color));
  }
});

test('Campaign-only card qualification does not reuse generic completed dimming', () => {
  const cardBlock = sceneSource.slice(sceneSource.indexOf('  createFactionCardView('), sceneSource.indexOf('  createCampaignAccordionPanel('));
  assert.match(cardBlock, /this\.mode === 'campaign'[\s\S]*this\.completedCampaignFactionKeys\.has\(factionKey\)/);
  assert.match(cardBlock, /completedCampaignPresentation,/);
  assert.doesNotMatch(cardBlock, /completed:/);
  assert.match(cardBlock, /\.zone\(0, cardHeight \/ 2, cardWidth, cardHeight\)/);
  assert.match(cardBlock, /pressOverlay\.fillRoundedRect\(-cardWidth \/ 2, 0, cardWidth, cardHeight, 20\)/);
  assert.doesNotMatch(cardBlock, /interactiveElements\.push\(completedCampaignPresentation\)/);
});

test('treatment is static, root-owned, restart-safe, and absent from enemy selection', () => {
  assert.doesNotMatch(cardsSource, /setInteractive|setTint|setBlendMode|postFX|tweens|time\.|update/);
  assert.doesNotMatch(sceneSource, /createCompletedCampaignGlow|COMPLETED_CAMPAIGN_GLOW_(?:OUTER|INNER)|completionGlow/);
  assert.match(sceneSource, /items: \[\.\.\.items, \.\.\.panel\.items, pressOverlay, button\]/);
  assert.match(sceneSource, /cleanupScene\(\) \{[\s\S]*this\.factionCardViews = \[\];[\s\S]*this\.completedCampaignFactionKeys = new Set\(\)/);
  assert.match(sceneSource, /onFullscreenChanged\(\) \{[\s\S]*this\.scene\.restart\(\{ mode: this\.mode,/);
  const enemySource = fs.readFileSync('src/scenes/CampaignEnemySelectScene.js', 'utf8');
  assert.doesNotMatch(enemySource, /completedCampaignPresentation|COMPLETED_CAMPAIGN_GLOW/);
});
