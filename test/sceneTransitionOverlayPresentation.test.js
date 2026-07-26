import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const overlaySource = await readFile(new URL('../src/scenes/SceneTransitionOverlayScene.js', import.meta.url), 'utf8');
const logoLayoutSource = await readFile(new URL('../src/ui/menuLogoLayout.js', import.meta.url), 'utf8');

function calculateExpectedComposition({ height, logoHeight, diameter = 34, gap = 25 }) {
  const anchor = height * 0.39;
  const radius = diameter / 2;
  const logoY = anchor - (gap + radius) / 2;
  const spinnerY = logoY + logoHeight / 2 + gap;
  return { anchor, logoY, spinnerY, radius };
}

test('transition loader retains the shared Gridfall start-hero logo pipeline', () => {
  assert.match(overlaySource, /GRIDFALL_LOGO_ASSET\.key/);
  assert.match(overlaySource, /setStartHeroLogoDisplaySize\(this, this\.logo, width, height\)/);
  assert.match(logoLayoutSource, /setCrispLogoDisplaySize\(scene, logo, GRIDFALL_LOGO_ASSET\.key, displaySize\.width, displaySize\.height, 'start-hero'\)/);
  assert.equal((overlaySource.match(/this\.add\.image\(/g) ?? []).length, 1);
});

test('logo and spinner bounds center together on the 39 percent anchor', () => {
  const layout = calculateExpectedComposition({ height: 844, logoHeight: 317.2 });
  const compositionTop = layout.logoY - 317.2 / 2;
  const compositionBottom = layout.spinnerY + layout.radius;
  assert.equal((compositionTop + compositionBottom) / 2, layout.anchor);

  assert.match(overlaySource, /compositionCenterY = height \* STARTUP_LOADING_VISUAL_LAYOUT\.logoCenterYRatio/);
  assert.match(overlaySource, /logoY = compositionCenterY - \(logoToSpinnerGap \+ spinnerRadius\) \/ 2/);
  assert.match(overlaySource, /spinnerY = logoY \+ logoHeight \/ 2 \+ logoToSpinnerGap/);
});

test('reflow reapplies measured logo sizing and the combined composition layout', () => {
  assert.match(overlaySource, /reflow\(\) \{[\s\S]*setStartHeroLogoDisplaySize\(this, this\.logo, width, height\);[\s\S]*getLoadingCompositionLayout\(height\)[\s\S]*setPosition\(logoPosition\.x, layout\.logoY\)[\s\S]*setPosition\(width \/ 2, layout\.spinnerY\)/);
});

test('spinner geometry and rotation behavior remain canonical', () => {
  assert.match(logoLayoutSource, /ringDiameter: 34/);
  assert.match(logoLayoutSource, /logoToRingCenterGap: 25/);
  assert.match(logoLayoutSource, /outerRingDurationMs: 1450/);
  assert.match(logoLayoutSource, /innerRingDurationMs: 2100/);
  assert.match(overlaySource, /rotation: Math\.PI \* 2, duration: STARTUP_LOADING_VISUAL_LAYOUT\.outerRingDurationMs/);
  assert.match(overlaySource, /rotation: -Math\.PI \* 2, duration: STARTUP_LOADING_VISUAL_LAYOUT\.innerRingDurationMs/);
});

test('opaque gradient and static radial layers replace the flat translucent backdrop', () => {
  assert.match(overlaySource, /BACKGROUND_TOP_COLOR = 0x111827/);
  assert.match(overlaySource, /BACKGROUND_BOTTOM_COLOR = 0x0b1220/);
  assert.match(overlaySource, /BACKGROUND_RADIAL_COLOR = 0x2563eb/);
  assert.match(overlaySource, /BACKGROUND_RADIAL_ALPHA = 0\.14/);
  assert.match(overlaySource, /fillGradientStyle\([\s\S]*BACKGROUND_TOP_COLOR[\s\S]*BACKGROUND_BOTTOM_COLOR/);
  assert.match(overlaySource, /fillRect\(0, 0, width, height\)/);
  assert.doesNotMatch(overlaySource, /BACKGROUND_ALPHA|0x020617/);
  assert.doesNotMatch(overlaySource, /PostFX|postFX|preFX/);
  assert.doesNotMatch(overlaySource, /update\([^)]*\)[\s\S]*drawBackdrop|UPDATE[\s\S]*drawBackdrop/);
});

test('local logo halo is wider, static, and singular', () => {
  assert.match(overlaySource, /SCENE_TRANSITION_LOGO_GLOW_WIDTH_RATIO = 1\.28/);
  assert.match(overlaySource, /LOGO_GLOW_HEIGHT_RATIO = 0\.88/);
  assert.ok(1.28 > 0.82);
  assert.equal((overlaySource.match(/this\.createLogoGlow\(/g) ?? []).length, 1);
  assert.equal((overlaySource.match(/this\.createLoadingRing\(/g) ?? []).length, 1);
  assert.doesNotMatch(overlaySource, /targets: this\.logoGlow|targets: glow/);
});

test('loader remains prompt-free and preserves transition lifecycle and input blocking', () => {
  assert.doesNotMatch(overlaySource, /TAP ANYWHERE|tapAnywhere/);
  assert.match(overlaySource, /const DELAYED_SHOW_MS = 120/);
  assert.match(overlaySource, /const FADE_OUT_MS = 220/);
  assert.match(overlaySource, /const READY_STABLE_FRAME_MS = 32/);
  assert.match(overlaySource, /setDepth\(BLOCKER_DEPTH\)\.setInteractive\(\)/);
  assert.match(overlaySource, /destroyInputBlocker\(\)/);
  assert.match(overlaySource, /this\.root\?\.destroy\?\.\(true\)/);
  assert.match(overlaySource, /clearSceneTransitionState\(this\.game, this\.transitionId\)/);
});
