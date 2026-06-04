import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (path) => fs.readFileSync(path, 'utf8');

const MENU_SCREENS = Object.freeze([
  { path: 'src/scenes/FactionSelectScene.js', titleKey: 'ui.factionSelect.title' },
  { path: 'src/scenes/CollectionScene.js', titleKey: 'ui.collection.title' },
  { path: 'src/scenes/TutorialScene.js', titleKey: 'ui.tutorial.title' },
  { path: 'src/scenes/SettingsScene.js', titleKey: 'ui.settings.title' },
  { path: 'src/scenes/RulesPanelScene.js', titleKey: 'ui.rules.title' },
]);

test('non-battle menu screens use the shared premium broadcast screen header', () => {
  const helper = read('src/ui/screenHeader.js');

  assert.match(helper, /PREMIUM_BROADCAST_FONT_STACK/);
  assert.match(helper, /fontStyle: '700'/);
  assert.match(helper, /setShadow\(0, 2, DEFAULT_HEADER_SHADOW_COLOR, 3, true, true\)/);
  assert.match(helper, /setShadow\(0, 0, DEFAULT_HEADER_GLOW_COLOR, 10, true, true\)/);
  assert.match(helper, /isPortrait \? 66 : 70/);
  assert.match(helper, /isPortrait \? 36 : 40/);
  assert.doesNotMatch(helper, /scene\.add\.line/);
  assert.match(helper, /items: \[glow, titleObject\]/);

  MENU_SCREENS.forEach(({ path, titleKey }) => {
    const source = read(path);
    assert.match(source, /import \{ createMenuScreenHeader \} from '\.\.\/ui\/screenHeader\.js';/);
    assert.match(source, new RegExp(`createMenuScreenHeader\\(this, \\{[\\s\\S]*title: translateActive\\('${titleKey}'`));
  });
});

test('faction select list keeps breathing room below wrapped title while using full-bleed faction poster artwork', () => {
  const source = read('src/scenes/FactionSelectScene.js');

  assert.match(source, /const MIN_FACTION_LIST_TOP = 106;/);
  assert.match(source, /const HEADER_TO_FACTION_LIST_GAP = 24;/);
  assert.match(source, /headerBottomY: header\.bottomY/);
  assert.match(source, /const viewportTop = Math\.max\(MIN_FACTION_LIST_TOP, Math\.ceil\(headerBottomY \+ HEADER_TO_FACTION_LIST_GAP\)\);/);
  assert.match(source, /const cardHeight = 196;/);
  assert.match(source, /const posterInset = 4;/);
  assert.match(source, /const posterHeight = cardHeight - posterInset \* 2;/);
  assert.match(source, /rightX: posterX \+ posterWidth - 12/);
  assert.match(source, /\.text\(posterX \+ 20, titleScrimY \+ 22, displayName/);
  assert.match(source, /translateActive\(`ui\.factionSelect\.descriptions\.\$\{factionKey\}`/);
});
