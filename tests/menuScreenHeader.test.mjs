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
  assert.match(helper, /isPortrait \? 88 : 92/);
  assert.match(helper, /isPortrait \? 34 : 38/);
  assert.doesNotMatch(helper, /scene\.add\.line/);
  assert.match(helper, /items: \[glow, titleObject\]/);

  MENU_SCREENS.forEach(({ path, titleKey }) => {
    const source = read(path);
    assert.match(source, /import \{ createMenuScreenHeader \} from '\.\.\/ui\/screenHeader\.js';/);
    assert.match(source, new RegExp(`createMenuScreenHeader\\(this, \\{[\\s\\S]*title: translateActive\\('${titleKey}'`));
  });
});
