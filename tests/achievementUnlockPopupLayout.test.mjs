import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { getAchievementDefinitions } from '../src/systems/achievements.js';
import {
  calculateAchievementUnlockPopupLayout,
  getAchievementUnlockPopupTitleLayout,
} from '../src/ui/achievementUnlockPopup.js';

const popupSource = fs.readFileSync('src/ui/achievementUnlockPopup.js', 'utf8');
const achievementsSceneSource = fs.readFileSync('src/scenes/AchievementsScene.js', 'utf8');

function mobileLayout() {
  return calculateAchievementUnlockPopupLayout({ scale: { gameSize: { width: 360, height: 640 } } }, { buttons: [] });
}

function definitionByTitle(locale, title) {
  return getAchievementDefinitions().find((definition) => definition.display?.title?.[locale] === title);
}

test('compact popup titles support bounded two-line mode for long localized titles', () => {
  const layout = mobileLayout();
  const titles = [
    ['pl', 'Pozytywny Wynik Kontroli'],
    ['pl', 'Zgodnie z Procedurą'],
    ['pl', 'Wszystko dla oglądalności!'],
    ['pl', 'Publiczności się podobało'],
    ['pl', 'Ulubieniec publiczności'],
    ['en', 'Experiment Successful'],
    ['en', 'The Crowd Liked That'],
    ['en', 'Anything for Ratings!'],
    ['en', 'The House Knows You'],
  ];

  for (const [locale, title] of titles) {
    assert.ok(definitionByTitle(locale, title), `${locale} title should remain defined: ${title}`);
    const titleLayout = getAchievementUnlockPopupTitleLayout(title, layout);
    assert.equal(titleLayout.mode, 'two-line', `${title} should use two-line compact popup mode`);
    assert.equal(titleLayout.maxLines, 2, `${title} should allow two title lines`);
    assert.match(titleLayout.fontSize, /^1[56]px$/, `${title} should use reduced bounded title size`);
    assert.ok(titleLayout.titleWidth <= layout.width - 122, `${title} should stay out of the star lane`);
  }
});

test('compact popup keeps short titles visually strong in one-line mode', () => {
  const layout = mobileLayout();
  const titleLayout = getAchievementUnlockPopupTitleLayout('Old Hand', layout);

  assert.equal(titleLayout.mode, 'one-line');
  assert.equal(titleLayout.maxLines, 1);
  assert.equal(titleLayout.fontSize, '17px');
  assert.equal(titleLayout.separatorY, 38);
  assert.equal(titleLayout.descriptionY, 44);
});

test('two-line compact title mode moves separator and description below title', () => {
  const layout = mobileLayout();
  const oneLine = getAchievementUnlockPopupTitleLayout('Old Hand', layout);
  const twoLine = getAchievementUnlockPopupTitleLayout('Pozytywny Wynik Kontroli', layout);

  assert.equal(twoLine.mode, 'two-line');
  assert.ok(twoLine.separatorY > oneLine.separatorY);
  assert.ok(twoLine.descriptionY > oneLine.descriptionY);
  assert.ok(twoLine.separatorY >= 50);
  assert.ok(twoLine.descriptionY > twoLine.separatorY);
});

test('compact popup height safely contains two-line title, description, badge, and counter lanes', () => {
  const layout = mobileLayout();
  const titleLayout = getAchievementUnlockPopupTitleLayout('Wszystko dla oglądalności!', layout);

  const titleTop = 12;
  const titleLineHeight = Number.parseInt(titleLayout.fontSize, 10);
  const titleBottom = titleTop + titleLineHeight * titleLayout.maxLines;
  const descriptionTop = titleLayout.descriptionY;
  const descriptionBottom = descriptionTop + 13 * 2;
  const badgeTop = layout.height - 27;
  const badgeBottom = badgeTop + 22;
  const counterCenterY = layout.height - 43;

  assert.equal(layout.height, 94);
  assert.ok(titleBottom < titleLayout.separatorY, 'title should end above separator');
  assert.ok(titleLayout.separatorY < descriptionTop, 'separator should stay above description');
  assert.ok(descriptionBottom <= layout.height - 8, 'description should fit inside popup height');
  assert.ok(badgeBottom <= layout.height - 5, 'badge should fit inside popup height');
  assert.ok(counterCenterY > titleLayout.separatorY, 'counter should remain in the lower-right lane');
});

test('4-star compact popup titles stay clear of the fixed star lane', () => {
  const layout = mobileLayout();
  const titleLayout = getAchievementUnlockPopupTitleLayout('The House Knows You', layout);
  const titleLeft = 15;
  const titleRight = titleLeft + titleLayout.titleWidth;
  const starLaneLeft = layout.width - 15 - 68;

  assert.equal(definitionByTitle('en', 'The House Knows You')?.difficulty, 4);
  assert.ok(titleRight < starLaneLeft, 'title bounds should not enter fixed 4-star lane');
});

test('Achievements panel title rendering remains isolated and unchanged', () => {
  assert.match(achievementsSceneSource, /maxLines: 2/);
  assert.match(achievementsSceneSource, /getAchievementTitleFontSize\(title, layout\)/);
  assert.doesNotMatch(achievementsSceneSource, /getAchievementUnlockPopupTitleLayout|ACHIEVEMENT_UNLOCK_POPUP_HEIGHT/);
});

test('localized achievement title strings remain unchanged', () => {
  const expected = [
    ['pl', 'Pozytywny Wynik Kontroli'],
    ['pl', 'Zgodnie z Procedurą'],
    ['pl', 'Wszystko dla oglądalności!'],
    ['pl', 'Publiczności się podobało'],
    ['pl', 'Ulubieniec publiczności'],
    ['en', 'Experiment Successful'],
    ['en', 'The Crowd Liked That'],
    ['en', 'Anything for Ratings!'],
    ['en', 'The House Knows You'],
  ];

  for (const [locale, title] of expected) {
    assert.ok(definitionByTitle(locale, title), `${locale} title should be preserved: ${title}`);
  }
  assert.doesNotMatch(popupSource, /Pozytywny Wynik Kontroli|The House Knows You/, 'popup should not hard-code achievement copy');
});
