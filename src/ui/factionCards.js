import { getFactionByKey, getFactionKeys } from '../data/factions/index.js';
import { getFactionPresentationName } from '../data/presentation/factionPresentation.js';
import { getActiveLocale, translateActive } from '../localization/localeService.js';
import { resolvePublicAssetPath } from '../rendering/backgroundArt.js';

export const FACTION_CARD_DETAILS = {
  Aggro: { description: 'Fast pressure.', tags: ['Rush', 'Burst'], accentColor: 0xf97316, fallbackTopColor: 0x7c2d12, fallbackBottomColor: 0x0f172a },
  Tank: { description: 'Armor and sustain.', tags: ['Armor', 'Sustain'], accentColor: 0x38bdf8, fallbackTopColor: 0x164e63, fallbackBottomColor: 0x0f172a },
  Control: { description: 'Disrupt and reposition.', tags: ['Disrupt', 'Move'], accentColor: 0xa78bfa, fallbackTopColor: 0x4c1d95, fallbackBottomColor: 0x0f172a },
  Swarm: { description: 'Board swarm tactics.', tags: ['Swarm', 'Growth'], accentColor: 0x84cc16, fallbackTopColor: 0x365314, fallbackBottomColor: 0x0f172a },
  Wardens: { description: 'Defensive friction and zone control.', tags: ['Support', 'Formation'], accentColor: 0xfacc15, fallbackTopColor: 0x713f12, fallbackBottomColor: 0x0f172a },
  'Attrition Swarm': { description: 'Death value and recursion.', tags: ['Attrition', 'Return'], accentColor: 0xec4899, fallbackTopColor: 0x4c0519, fallbackBottomColor: 0x0f172a },
};

const POSTER_TITLE_SCRIM_HEIGHT = 96;
const POSTER_TITLE_BOTTOM_PADDING = 18;
const POSTER_TITLE_LEFT_PADDING = 18;
const POSTER_TITLE_RIGHT_PADDING = 16;
const POSTER_TITLE_WIDTH_RATIO = 0.92;
const POSTER_TITLE_MAX_FONT_SIZE = 29;
const POSTER_TITLE_WRAP_FONT_SIZE = 24;
const POSTER_TITLE_MIN_SINGLE_LINE_FONT_SIZE = 20;

export function getFactionAssetSlug(factionKey) {
  const faction = getFactionByKey(factionKey);
  return (faction?.id ?? factionKey).toLowerCase();
}

export function getFactionPreviewPath(factionKey) {
  return resolvePublicAssetPath(`assets/factions/${getFactionAssetSlug(factionKey)}/preview.webp`);
}

export function getFactionPreviewTextureKey(factionKey) {
  return `faction-preview-${getFactionAssetSlug(factionKey)}`;
}

export function preloadFactionPreviewArt(scene) {
  getFactionKeys().forEach((factionKey) => {
    scene.load.image(getFactionPreviewTextureKey(factionKey), getFactionPreviewPath(factionKey));
  });
}

export function getFactionCardPresentation(factionKey) {
  const faction = getFactionByKey(factionKey);
  return {
    faction,
    details: FACTION_CARD_DETAILS[factionKey] ?? FACTION_CARD_DETAILS.Aggro,
    displayName: getFactionPresentationName(faction?.id, getActiveLocale(), faction?.name ?? factionKey),
  };
}

export function fitFactionTitleText(title, maxWidth) {
  title.setWordWrapWidth(null);
  title.setMaxLines(1);
  for (let fontSize = POSTER_TITLE_MAX_FONT_SIZE; fontSize >= POSTER_TITLE_MIN_SINGLE_LINE_FONT_SIZE; fontSize -= 1) {
    title.setFontSize(`${fontSize}px`);
    if (title.width <= maxWidth) return title;
  }
  title.setFontSize(`${POSTER_TITLE_WRAP_FONT_SIZE}px`);
  title.setWordWrapWidth(maxWidth, true);
  title.setMaxLines(2);
  return title;
}

export function drawFactionPreview(scene, content, factionKey, details, { x, y, width, height, alpha = 1 }) {
  const textureKey = getFactionPreviewTextureKey(factionKey);
  if (scene.textures.exists(textureKey)) {
    const texture = scene.textures.get(textureKey);
    const source = texture.getSourceImage();
    const sourceWidth = source?.width ?? width;
    const sourceHeight = source?.height ?? height;
    const targetRatio = width / height;
    const sourceRatio = sourceWidth / sourceHeight;
    const cropWidth = sourceRatio > targetRatio ? sourceHeight * targetRatio : sourceWidth;
    const cropHeight = sourceRatio > targetRatio ? sourceHeight : sourceWidth / targetRatio;
    const image = scene.add.image(x + width / 2, y + height / 2, textureKey)
      .setCrop((sourceWidth - cropWidth) / 2, (sourceHeight - cropHeight) / 2, cropWidth, cropHeight)
      .setDisplaySize(width, height)
      .setAlpha(alpha);
    content.add(image);
    const frame = scene.add.graphics();
    frame.lineStyle(1, details.accentColor, 0.48 * alpha);
    frame.strokeRoundedRect(x + 0.5, y + 0.5, width - 1, height - 1, 14);
    content.add(frame);
    return [image, frame];
  }
  const fallback = scene.add.graphics();
  fallback.fillGradientStyle(details.fallbackTopColor, details.fallbackTopColor, details.fallbackBottomColor, details.fallbackBottomColor, alpha);
  fallback.fillRoundedRect(x, y, width, height, 16);
  fallback.lineStyle(1, details.accentColor, 0.52 * alpha);
  fallback.strokeRoundedRect(x + 1, y + 1, width - 2, height - 2, 15);
  content.add(fallback);
  return [fallback];
}

export function drawFactionTags(scene, content, tags, { rightX, y, accentColor, alpha = 1 }) {
  const chipGap = 6;
  const chipHeight = 24;
  const chips = tags.map((tag) => {
    const text = scene.add.text(0, y + 5, translateActive(`ui.factionSelect.tags.${tag}`, tag), {
      fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#f8fafc', stroke: '#020617', strokeThickness: 3,
    }).setOrigin(0, 0).setAlpha(alpha);
    return { text, width: Math.ceil(text.width + 18) };
  });
  const totalWidth = chips.reduce((sum, chip) => sum + chip.width, 0) + Math.max(0, chips.length - 1) * chipGap;
  let currentX = rightX - totalWidth;
  const items = [];
  chips.forEach(({ text, width: pillWidth }) => {
    const pill = scene.add.graphics();
    pill.fillStyle(0x020617, 0.68 * alpha);
    pill.fillRoundedRect(currentX, y, pillWidth, chipHeight, 12);
    pill.lineStyle(1.5, accentColor, 0.9 * alpha);
    pill.strokeRoundedRect(currentX + 0.75, y + 0.75, pillWidth - 1.5, chipHeight - 1.5, 11);
    text.setPosition(currentX + 9, y + 5);
    content.add(pill); content.add(text); items.push(pill, text);
    currentX += pillWidth + chipGap;
  });
  return items;
}

export function drawFactionCardVisual(scene, content, factionKey, { y, cardWidth, cardHeight, alpha = 1, completed = false } = {}) {
  const { details, displayName } = getFactionCardPresentation(factionKey);
  const x = -cardWidth / 2;
  const posterInset = 4;
  const posterWidth = cardWidth - posterInset * 2;
  const posterHeight = cardHeight - posterInset * 2;
  const posterX = x + posterInset;
  const posterY = y + posterInset;
  const items = [];
  const shadow = scene.add.graphics();
  shadow.fillStyle(0x020617, 0.42 * alpha); shadow.fillRoundedRect(x + 2, y + 5, cardWidth, cardHeight, 20); content.add(shadow); items.push(shadow);
  const card = scene.add.graphics();
  card.fillStyle(completed ? 0x111827 : 0x020617, (completed ? 0.72 : 0.94) * alpha); card.fillRoundedRect(x, y, cardWidth, cardHeight, 20);
  card.lineStyle(1, completed ? 0x94a3b8 : details.accentColor, (completed ? 0.5 : 0.72) * alpha); card.strokeRoundedRect(x + 1, y + 1, cardWidth - 2, cardHeight - 2, 19); content.add(card); items.push(card);
  items.push(...drawFactionPreview(scene, content, factionKey, details, { x: posterX, y: posterY, width: posterWidth, height: posterHeight, alpha: completed ? alpha * 0.45 : alpha }));
  const titleScrimHeight = Math.min(POSTER_TITLE_SCRIM_HEIGHT, posterHeight - 24);
  const titleScrimY = posterY + posterHeight - titleScrimHeight;
  const titleScrim = scene.add.graphics(); titleScrim.fillGradientStyle(0x020617, 0x020617, 0x020617, 0x020617, 0, 0, 0.78 * alpha, 0.58 * alpha); titleScrim.fillRect(posterX, titleScrimY, posterWidth, titleScrimHeight); content.add(titleScrim); items.push(titleScrim);
  items.push(...drawFactionTags(scene, content, details.tags, { rightX: posterX + posterWidth - 12, y: posterY + 12, accentColor: details.accentColor, alpha: completed ? alpha * 0.6 : alpha }));
  const titleMaxWidth = Math.min(posterWidth - POSTER_TITLE_LEFT_PADDING - POSTER_TITLE_RIGHT_PADDING, Math.max(190, posterWidth * POSTER_TITLE_WIDTH_RATIO));
  const name = scene.add.text(posterX + POSTER_TITLE_LEFT_PADDING, posterY + posterHeight - POSTER_TITLE_BOTTOM_PADDING, displayName, {
    fontFamily: 'Arial, sans-serif', fontSize: `${POSTER_TITLE_MAX_FONT_SIZE}px`, color: completed ? '#cbd5e1' : '#f8fafc', fontStyle: 'bold', stroke: '#020617', strokeThickness: 4,
  }).setOrigin(0, 1).setAlpha(alpha);
  fitFactionTitleText(name, titleMaxWidth); content.add(name); items.push(name);
  return { items, details, displayName, x };
}
