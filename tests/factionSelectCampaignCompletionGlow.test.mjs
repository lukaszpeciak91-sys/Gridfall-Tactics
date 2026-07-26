import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync('src/scenes/FactionSelectScene.js', 'utf8');

function loadCompletedFactionLookup() {
  const match = source.match(/export function getCompletedCampaignFactionKeys\(factionKeys, stats\) \{[\s\S]*?\n\}/);
  assert.ok(match, 'completion lookup helper should remain directly testable');
  return Function(`${match[0].replace('export ', '')}; return getCompletedCampaignFactionKeys;`)();
}

test('completed campaign faction lookup accepts only positive counters for current faction keys', () => {
  const lookup = loadCompletedFactionLookup();
  const factionKeys = ['Aggro', 'Tank', 'Control', 'Swarm'];
  const completed = lookup(factionKeys, {
    factions: {
      Aggro: { campaignsWon: 0 },
      Tank: { campaignsWon: 1 },
      Control: { campaignsWon: 7 },
      Swarm: { campaignsWon: -1 },
      Deprecated: { campaignsWon: 10 },
    },
  });

  assert.deepEqual([...completed], ['Tank', 'Control']);
  assert.equal(completed.size, 2);
});

test('completed campaign faction lookup handles missing and malformed data safely', () => {
  const lookup = loadCompletedFactionLookup();
  const keys = ['Aggro'];

  for (const stats of [undefined, null, '', {}, { factions: null }, { factions: { Aggro: {} } }, { factions: { Aggro: { campaignsWon: '1' } } }]) {
    assert.equal(lookup(keys, stats).size, 0);
  }
  assert.equal(lookup(null, { factions: { Aggro: { campaignsWon: 1 } } }).size, 0);
});

test('Campaign creation reads player stats once while Arena creation does not read them', () => {
  const createBlock = source.slice(source.indexOf('  create() {'), source.indexOf('  createArenaHelperText'));
  assert.match(createBlock, /this\.completedCampaignFactionKeys = this\.mode === 'campaign'[\s\S]*getCompletedCampaignFactionKeys\(factionKeys, loadPlayerStats\(\)\)[\s\S]*: new Set\(\)/);
  assert.equal((createBlock.match(/loadPlayerStats\(\)/g) ?? []).length, 1);
});

test('qualifying Campaign cards create one static accent-colored Graphics glow behind banner content', () => {
  const cardBlock = source.slice(source.indexOf('  createFactionCardView('), source.indexOf('  createCampaignAccordionPanel('));
  const glowBlock = source.slice(source.indexOf('  createCompletedCampaignGlow('), source.indexOf('  createCampaignAccordionPanel('));

  assert.match(cardBlock, /accentColor: details\.accentColor/);
  assert.match(glowBlock, /this\.mode !== 'campaign'/);
  assert.match(glowBlock, /!this\.completedCampaignFactionKeys\.has\(factionKey\)/);
  assert.equal((glowBlock.match(/this\.add\.graphics\(\)/g) ?? []).length, 1);
  assert.equal((glowBlock.match(/fillRoundedRect\(/g) ?? []).length, 2);
  assert.match(glowBlock, /fillStyle\(accentColor, COMPLETED_CAMPAIGN_GLOW_OUTER_ALPHA\)/);
  assert.match(glowBlock, /fillStyle\(accentColor, COMPLETED_CAMPAIGN_GLOW_INNER_ALPHA\)/);
  assert.match(glowBlock, /root\.addAt\(glow, 0\)/);
  assert.doesNotMatch(glowBlock, /lineStyle|strokeRoundedRect|setInteractive|setTint|setAlpha|setScale|setBlendMode|tweens|time\.|update/);
});

test('completion glow geometry clears the union of the banner and offset shadow on every side', () => {
  assert.match(source, /FACTION_CARD_SHADOW_X_OFFSET = 2;/);
  assert.match(source, /FACTION_CARD_SHADOW_Y_OFFSET = 5;/);
  assert.match(source, /COMPLETED_CAMPAIGN_GLOW_OUTER_EXPANSION = 6;/);
  assert.match(source, /COMPLETED_CAMPAIGN_GLOW_OUTER_ALPHA = 0\.035;/);
  assert.match(source, /COMPLETED_CAMPAIGN_GLOW_INNER_EXPANSION = 3;/);
  assert.match(source, /COMPLETED_CAMPAIGN_GLOW_INNER_ALPHA = 0\.07;/);

  const glowBlock = source.slice(source.indexOf('  createCompletedCampaignGlow('), source.indexOf('  createCampaignAccordionPanel('));
  assert.match(glowBlock, /const unionLeft = bannerX;/);
  assert.match(glowBlock, /const unionTop = 0;/);
  assert.match(glowBlock, /const unionWidth = cardWidth \+ FACTION_CARD_SHADOW_X_OFFSET;/);
  assert.match(glowBlock, /const unionHeight = cardHeight \+ FACTION_CARD_SHADOW_Y_OFFSET;/);

  const union = { left: -191, top: 0, right: 193, bottom: 201 };
  const boundsFor = (expansion) => ({
    left: union.left - expansion,
    top: union.top - expansion,
    right: union.right + expansion,
    bottom: union.bottom + expansion,
  });
  const outer = boundsFor(6);
  const inner = boundsFor(3);
  for (const bounds of [outer, inner]) {
    assert.ok(bounds.left < union.left);
    assert.ok(bounds.top < union.top);
    assert.ok(bounds.right > union.right);
    assert.ok(bounds.bottom > union.bottom);
  }
  assert.equal(outer.right - union.right, 6);
  assert.equal(outer.bottom - union.bottom, 6);
  assert.ok(outer.right - union.right > 2);
  assert.equal(inner.right - union.right, 3);
  assert.equal(inner.bottom - union.bottom, 3);
});

test('completion glow leaves banner interaction and accordion behavior unchanged', () => {
  const cardBlock = source.slice(source.indexOf('  createFactionCardView('), source.indexOf('  createCompletedCampaignGlow('));
  assert.match(cardBlock, /\.zone\(0, cardHeight \/ 2, cardWidth, cardHeight\)/);
  assert.match(cardBlock, /pressOverlay\.setVisible\(true\)/);
  assert.match(cardBlock, /this\.handleFactionBannerTap\(factionKey\)/);
  assert.match(cardBlock, /this\.interactiveElements\.push\(button\)/);
  assert.doesNotMatch(cardBlock, /interactiveElements\.push\(completionGlow\)/);
  assert.match(source, /handleFactionBannerTap\(factionKey\) \{[\s\S]*this\.toggleCampaignAccordion\(factionKey\)/);
});

test('completion glow is owned by the card root and completion lookup resets on cleanup and restart', () => {
  assert.match(source, /completionGlow,[\s\S]*items: \[completionGlow, \.\.\.items/);
  assert.match(source, /cleanupScene\(\) \{[\s\S]*this\.factionCardViews = \[\];[\s\S]*this\.completedCampaignFactionKeys = new Set\(\)/);
  assert.match(source, /onFullscreenChanged\(\) \{[\s\S]*this\.scene\.restart\(\{ mode: this\.mode,/);
  assert.doesNotMatch(source, /completionGlowTween|completedCampaignGlowTween/);
});
