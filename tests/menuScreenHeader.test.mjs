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
  const sceneSource = read('src/scenes/FactionSelectScene.js');
  const source = `${sceneSource}
${read('src/ui/factionCards.js')}`;

  assert.match(source, /const MIN_FACTION_LIST_TOP = 106;/);
  assert.match(source, /const HEADER_TO_FACTION_LIST_GAP = 24;/);
  assert.match(source, /headerBottomY: header\.bottomY/);
  assert.match(source, /const viewportTop = Math\.max\(MIN_FACTION_LIST_TOP, Math\.ceil\(headerBottomY \+ HEADER_TO_FACTION_LIST_GAP\)\);/);
  assert.match(source, /const cardHeight = 196;/);
  assert.match(source, /const posterInset = 4;/);
  assert.match(source, /const posterHeight = cardHeight - posterInset \* 2;/);
  assert.match(source, /rightX: posterX \+ posterWidth - 12/);
  assert.match(source, /const POSTER_TITLE_BOTTOM_PADDING = 18;/);
  assert.match(source, /const POSTER_TITLE_LEFT_PADDING = 18;/);
  assert.match(source, /const POSTER_TITLE_RIGHT_PADDING = 16;/);
  assert.match(source, /const POSTER_TITLE_WIDTH_RATIO = 0\.92;/);
  assert.match(source, /const POSTER_TITLE_MAX_FONT_SIZE = 29;/);
  assert.match(source, /const POSTER_TITLE_WRAP_FONT_SIZE = 24;/);
  assert.match(source, /const POSTER_TITLE_MIN_SINGLE_LINE_FONT_SIZE = 20;/);
  assert.match(source, /posterY \+ posterHeight - POSTER_TITLE_BOTTOM_PADDING/);
  assert.match(source, /posterWidth - POSTER_TITLE_LEFT_PADDING - POSTER_TITLE_RIGHT_PADDING/);
  assert.match(source, /fitFactionTitleText\(name, titleMaxWidth\)/);
  assert.match(source, /title\.setWordWrapWidth\(null\);/);
  assert.match(source, /fontSize >= POSTER_TITLE_MIN_SINGLE_LINE_FONT_SIZE/);
  assert.match(source, /title\.setWordWrapWidth\(maxWidth, true\);/);
  assert.match(source, /title\.setMaxLines\(2\);/);
  assert.match(source, /\.setOrigin\(0, 1\)/);
  assert.doesNotMatch(source, /translateActive\(`ui\.factionSelect\.descriptions\.\$\{factionKey\}`/);
  assert.match(source, /pill\.fillStyle\(0x020617, 0\.68(?: \* alpha)?\)/);
  assert.match(source, /pill\.lineStyle\(1\.5, accentColor, 0\.9(?: \* alpha)?\)/);
  assert.match(source, /fontSize: '11px'/);
  assert.match(source, /color: '#f8fafc'/);
});
