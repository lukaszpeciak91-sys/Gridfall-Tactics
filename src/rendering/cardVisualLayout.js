import { getCardDisplayName, getCardTextShort } from '../localization/cardDisplay.js';
import { CARD_EFFECT_GAMEPLAY_SYMBOLS, formatCardEffectTextShort } from '../localization/cardTextFormatting.js';
import { getCardArtPositionY } from '../data/presentation/cardArtCropOverrides.js';
import { getCardIllustrationAsset, getLoadedCardIllustrationTextureKey } from './cardIllustrationAssets.js';

// Dry layout experiment: keep stat badge allocation stable while borrowing
// modest vertical space from name/rules panels for a taller shared art viewport.
export const CARD_ZONE_RATIOS = Object.freeze({
  statBadges: 0.112,
  art: 0.45,
  name: 0.126,
  text: 0.252,
});

export const CARD_CORNER_RADIUS_RATIO = 0.055;
export const CARD_DESCRIPTION_TEXT_VERTICAL_OFFSET_PX = -3;

export const BASE_CARD_SURFACE_THEME = Object.freeze({
  frameFill: 0x1f2937,
  frameSelectedFill: 0x334155,
  frameEmptyFill: 0x0f172a,
  innerPanelFill: 0x111827,
  innerPanelEdgeStroke: 0x9aa8bc,
  panelHighlightStroke: 0xe2e8f0,
  artBackdropFill: 0x0b1220,
  artInsetShadow: 0x020617,
  artInsetHighlight: 0xf8fafc,
  artUpperFill: 0x243043,
  artSilhouetteFill: 0x020617,
  artHorizonLine: 0x67e8f9,
  dividerLine: 0x7b8aa3,
  namePanelFill: 0x161f31,
  textPanelFill: 0x101a2b,
  statBackingFill: 0x0e1728,
  textIvory: '#fff7ed',
  textBody: '#dbeafe',
  textMuted: '#94a3b8',
});

export function getBaseCardSurfaceTheme() {
  return BASE_CARD_SURFACE_THEME;
}

function mergeSurfaceTheme(baseTheme, overrideTheme = {}) {
  return Object.freeze({
    ...baseTheme,
    ...(overrideTheme ?? {}),
  });
}

export const FACTION_CARD_SURFACE_OVERRIDES = Object.freeze({
  aggro: Object.freeze({
    frameFill: 0x302c34,
    frameSelectedFill: 0x443d47,
    innerPanelEdgeStroke: 0xc7ad9d,
    panelHighlightStroke: 0xe8ddce,
    dividerLine: 0xbca892,
    namePanelFill: 0x272230,
    textPanelFill: 0x201c2a,
  }),
  control: Object.freeze({
    frameFill: 0x1b2f3a,
    frameSelectedFill: 0x29434f,
    innerPanelEdgeStroke: 0x88bdc4,
    panelHighlightStroke: 0xcdebf0,
    dividerLine: 0x7bb2ba,
    namePanelFill: 0x182b36,
    textPanelFill: 0x13232e,
  }),
  swarm: Object.freeze({
    frameFill: 0x2a2d45,
    frameSelectedFill: 0x3b3f59,
    innerPanelEdgeStroke: 0x99afd0,
    panelHighlightStroke: 0xd7e1f4,
    dividerLine: 0x8fa6c7,
    namePanelFill: 0x21253a,
    textPanelFill: 0x1a2035,
  }),
  'attrition-swarm': Object.freeze({
    frameFill: 0x262638,
    frameSelectedFill: 0x3a3b50,
    innerPanelEdgeStroke: 0x9690a3,
    panelHighlightStroke: 0xdfd9e5,
    dividerLine: 0x8e889d,
    namePanelFill: 0x201f32,
    textPanelFill: 0x19172c,
  }),
  tank: Object.freeze({
    frameFill: 0x2f2c2a,
    frameSelectedFill: 0x45403b,
    innerPanelEdgeStroke: 0xb8a076,
    panelHighlightStroke: 0xe9dcc3,
    dividerLine: 0xac9264,
    namePanelFill: 0x272320,
    textPanelFill: 0x1f1c1f,
  }),
  wardens: Object.freeze({
    frameFill: 0x212932,
    frameSelectedFill: 0x343e49,
    innerPanelEdgeStroke: 0x98a4b2,
    panelHighlightStroke: 0xdce3eb,
    dividerLine: 0x8c98a6,
    namePanelFill: 0x1a242d,
    textPanelFill: 0x141e28,
  }),
});

export function resolveCardSurfaceTheme({ factionId = '', mode = 'default' } = {}) {
  const normalizedMode = String(mode ?? 'default').trim().toLowerCase();
  const normalizedFactionId = String(factionId ?? '').trim().toLowerCase();
  const override = FACTION_CARD_SURFACE_OVERRIDES[normalizedFactionId] ?? null;
  if (!override) return BASE_CARD_SURFACE_THEME;

  const modeOverrides = normalizedMode === 'inspect'
    ? { panelHighlightStroke: override.panelHighlightStroke }
    : null;

  return mergeSurfaceTheme(BASE_CARD_SURFACE_THEME, modeOverrides ? { ...override, ...modeOverrides } : override);
}

export function getFactionSurfaceTheme(factionId = '') {
  return resolveCardSurfaceTheme({ factionId, mode: 'default' });
}

export function __deprecatedGetFactionSurfaceTheme(factionId = '') {
  return getFactionSurfaceTheme(factionId);
}

export const CARD_COLORS = Object.freeze({
  frame: BASE_CARD_SURFACE_THEME.frameFill,
  frameSelected: BASE_CARD_SURFACE_THEME.frameSelectedFill,
  emptyFrame: BASE_CARD_SURFACE_THEME.frameEmptyFill,
  innerPanel: BASE_CARD_SURFACE_THEME.innerPanelFill,
  artTop: BASE_CARD_SURFACE_THEME.artUpperFill,
  artBottom: BASE_CARD_SURFACE_THEME.artBackdropFill,
  divider: BASE_CARD_SURFACE_THEME.dividerLine,
  namePanel: BASE_CARD_SURFACE_THEME.namePanelFill,
  textPanel: BASE_CARD_SURFACE_THEME.textPanelFill,
  ivoryText: BASE_CARD_SURFACE_THEME.textIvory,
  bodyText: BASE_CARD_SURFACE_THEME.textBody,
  mutedText: BASE_CARD_SURFACE_THEME.textMuted,
});

export const NON_UNIT_EFFECT_STAT_SYMBOL = '✶';
export const NON_UNIT_EFFECT_STAT_SYMBOL_COLOR = 0xfde68a;
export const NON_UNIT_EFFECT_STAT_SYMBOL_CSS_COLOR = '#fde68a';

export function getFixedHeightTextVisualCenterOriginY(fontMetrics, fixedHeight, strokeThickness = 0) {
  const measuredFontHeight = Number.isFinite(fontMetrics?.fontSize) && fontMetrics.fontSize > 0
    ? fontMetrics.fontSize
    : null;
  if (!measuredFontHeight || !Number.isFinite(fixedHeight) || fixedHeight <= 0) return 0.5;

  const safeStrokeThickness = Number.isFinite(strokeThickness) ? Math.max(0, strokeThickness) : 0;
  const measuredGlyphCenterY = safeStrokeThickness * 0.5 + measuredFontHeight * 0.5;
  return measuredGlyphCenterY / fixedHeight;
}

export const CARD_STAT_STYLES = Object.freeze({
  attack: Object.freeze({
    color: 0x24c6a7,
    glow: 0x6ee7d8,
    shadow: 0x0f766e,
    label: 'attack',
  }),
  armor: Object.freeze({
    color: 0x3d63c7,
    glow: 0x93b4ff,
    shadow: 0x1e3a8a,
    label: 'armor',
  }),
  health: Object.freeze({
    color: 0xd24b5f,
    glow: 0xffb4a8,
    shadow: 0x8f2638,
    label: 'health',
  }),
});

export const MODIFIED_STAT_TEXT_STYLES = Object.freeze({
  attackBuff: Object.freeze({
    color: '#86efac',
    shadow: 'rgba(34, 197, 94, 0.58)',
    glowAlpha: 0.24,
    plateStroke: 0x86efac,
    plateStrokeAlpha: 0.5,
  }),
  attackDebuff: Object.freeze({
    color: '#fb923c',
    shadow: 'rgba(248, 113, 113, 0.5)',
    glowAlpha: 0.08,
    plateStroke: 0xfb923c,
    plateStrokeAlpha: 0.46,
  }),
  armorBuff: Object.freeze({
    color: '#bae6fd',
    shadow: 'rgba(56, 189, 248, 0.52)',
    glowAlpha: 0.22,
    plateStroke: 0x7dd3fc,
    plateStrokeAlpha: 0.48,
  }),
  armorDebuff: Object.freeze({
    color: '#fdba74',
    shadow: 'rgba(251, 146, 60, 0.46)',
    glowAlpha: 0.07,
    plateStroke: 0xfdba74,
    plateStrokeAlpha: 0.42,
  }),
});

const PERSISTENT_MODIFIED_STAT_KEYS = Object.freeze(['attack', 'armor']);

function getNumericStatValue(stats, key) {
  const value = stats?.[key];
  return Number.isFinite(value) ? value : null;
}

export function getModifiedStatState(key, currentStats = {}, baseStats = {}) {
  if (!PERSISTENT_MODIFIED_STAT_KEYS.includes(key)) return 'base';

  const current = getNumericStatValue(currentStats, key);
  const base = getNumericStatValue(baseStats, key);
  if (current === null || base === null || current === base) return 'base';
  return current > base ? 'buff' : 'debuff';
}

function getModifiedStatTextStyle(key, modifiedState) {
  if (modifiedState === 'buff') {
    if (key === 'attack') return MODIFIED_STAT_TEXT_STYLES.attackBuff;
    if (key === 'armor') return MODIFIED_STAT_TEXT_STYLES.armorBuff;
  }

  if (modifiedState === 'debuff') {
    if (key === 'attack') return MODIFIED_STAT_TEXT_STYLES.attackDebuff;
    if (key === 'armor') return MODIFIED_STAT_TEXT_STYLES.armorDebuff;
  }

  return null;
}

function asChangedStatSet(changedStats) {
  if (changedStats instanceof Set) return changedStats;
  if (Array.isArray(changedStats)) return new Set(changedStats);
  return new Set();
}

function pulseStatGlyph(scene, glyph) {
  if (!scene?.tweens || !glyph) return;
  scene.tweens.add({
    targets: glyph,
    scaleX: 1.12,
    scaleY: 1.12,
    duration: 110,
    yoyo: true,
    ease: 'Sine.easeOut',
  });
}

export const CARD_ACCENT_COLORS = Object.freeze({
  unit: 0x4da6ff,
  effect: 0xb06cff,
  default: 0x94a3b8,
});

export function getDefaultCardAccentColor(card) {
  if (card?.type === 'unit') return CARD_ACCENT_COLORS.unit;
  if (card?.type === 'effect') return CARD_ACCENT_COLORS.effect;
  return CARD_ACCENT_COLORS.default;
}

const CARD_STAT_SYMBOL_KEYS = Object.freeze({
  '▲': 'attack',
  '◆': 'armor',
  '●': 'health',
});

export const INLINE_EFFECT_ICON_STAT_FONT_SCALE = 1.38;
export const INLINE_EFFECT_ICON_MIN_FONT_SIZE = 15;
export const INLINE_EFFECT_ICON_BASELINE_OFFSET_RATIO = -0.16;
export const INLINE_STAT_ICON_LEADING_SPACE_SCALE = 0.4;
export const INLINE_STAT_ICON_TRAILING_SPACE_SCALE = 0.72;
export const INLINE_ATTACK_ICON_OPTICAL_OFFSET_X = -1;
export const INLINE_GAMEPLAY_ICON_BASELINE_OFFSET_RATIO = -0.06;
export const INLINE_GAMEPLAY_ICON_SPACE_SCALE = 1;

export const GAMEPLAY_SYMBOL_COLORS = Object.freeze({
  ally: '#facc15',
  enemy: '#e879f9',
});

const SINGLE_GAMEPLAY_SYMBOL_STYLE = Object.freeze({
  fontStyle: 'bold',
  icon: 'single',
  fontScale: 1.28,
  widthScale: 0.667,
});

const GROUP_GAMEPLAY_SYMBOL_STYLE = Object.freeze({
  fontStyle: 'bold',
  icon: 'group',
  fontScale: 1.22,
  widthScale: 0.951,
  count: 2,
  stroke: '#061426',
});

const CARD_GAMEPLAY_SYMBOL_STYLES = Object.freeze({
  [CARD_EFFECT_GAMEPLAY_SYMBOLS.ally]: Object.freeze({
    ...SINGLE_GAMEPLAY_SYMBOL_STYLE,
    color: GAMEPLAY_SYMBOL_COLORS.ally,
  }),
  [CARD_EFFECT_GAMEPLAY_SYMBOLS.allies]: Object.freeze({
    ...GROUP_GAMEPLAY_SYMBOL_STYLE,
    color: GAMEPLAY_SYMBOL_COLORS.ally,
    baseGlyph: CARD_EFFECT_GAMEPLAY_SYMBOLS.ally,
  }),
  [CARD_EFFECT_GAMEPLAY_SYMBOLS.enemy]: Object.freeze({
    ...SINGLE_GAMEPLAY_SYMBOL_STYLE,
    color: GAMEPLAY_SYMBOL_COLORS.enemy,
  }),
  [CARD_EFFECT_GAMEPLAY_SYMBOLS.enemies]: Object.freeze({
    ...GROUP_GAMEPLAY_SYMBOL_STYLE,
    color: GAMEPLAY_SYMBOL_COLORS.enemy,
    baseGlyph: CARD_EFFECT_GAMEPLAY_SYMBOLS.enemy,
  }),
});

function colorNumberToCss(color) {
  return `#${color.toString(16).padStart(6, '0')}`;
}

export function getInlineStatSymbolColor(symbol) {
  const statKey = CARD_STAT_SYMBOL_KEYS[symbol];
  return statKey ? colorNumberToCss(CARD_STAT_STYLES[statKey].color) : null;
}

export function getInlineGameplaySymbolStyle(symbol) {
  return CARD_GAMEPLAY_SYMBOL_STYLES[symbol] ?? null;
}

export function getInlineGameplaySymbolColor(symbol) {
  return getInlineGameplaySymbolStyle(symbol)?.color ?? null;
}

function getInlineIconFontSize(textFontSize, symbolStyle) {
  if (symbolStyle?.type !== 'statSymbol' && symbolStyle?.type !== 'gameplaySymbol') {
    return textFontSize;
  }

  return Math.max(
    INLINE_EFFECT_ICON_MIN_FONT_SIZE,
    Math.round(textFontSize * (symbolStyle.fontScale ?? 1)),
  );
}

function getInlineSymbolStyle(symbol) {
  const statColor = getInlineStatSymbolColor(symbol);
  if (statColor) {
    return {
      type: 'statSymbol',
      color: statColor,
      fontStyle: 'bold',
      fontScale: INLINE_EFFECT_ICON_STAT_FONT_SCALE,
      widthScale: 0.823,
      visualOffsetX: symbol === '▲' ? INLINE_ATTACK_ICON_OPTICAL_OFFSET_X : 0,
    };
  }

  const gameplayStyle = CARD_GAMEPLAY_SYMBOL_STYLES[symbol];
  if (gameplayStyle) {
    return { type: 'gameplaySymbol', ...gameplayStyle };
  }

  return { type: 'text', color: null, fontStyle: undefined };
}

export function tokenizeInlineStatText(text) {
  if (typeof text !== 'string' || text.length === 0) return [];
  return text
    .split(/(♙♙|♟♟|▲|◆|●|♙|♟|\n|\s+)/u)
    .filter((token) => token.length > 0)
    .map((token) => {
      if (token === '\n') return { type: 'newline', text: token };
      if (/^\s+$/u.test(token)) return { type: 'space', text: token };
      const symbolStyle = getInlineSymbolStyle(token);
      return {
        type: symbolStyle.type,
        text: token,
      };
    });
}

function isInlineSymbolToken(token) {
  return token?.type === 'statSymbol' || token?.type === 'gameplaySymbol';
}

function getInlineSpaceWidth(spaceWidth, previousToken, nextToken) {
  if (spaceWidth <= 0 || (!isInlineSymbolToken(previousToken) && !isInlineSymbolToken(nextToken))) {
    return spaceWidth;
  }

  if (previousToken?.type === 'gameplaySymbol' || nextToken?.type === 'gameplaySymbol') {
    return Math.max(1, Math.ceil(spaceWidth * INLINE_GAMEPLAY_ICON_SPACE_SCALE));
  }

  const spaceScale = previousToken?.type === 'statSymbol'
    ? INLINE_STAT_ICON_TRAILING_SPACE_SCALE
    : INLINE_STAT_ICON_LEADING_SPACE_SCALE;
  return Math.max(1, Math.ceil(spaceWidth * spaceScale));
}

function createInlineAtom(token, measureTokenWidth) {
  const width = measureTokenWidth(token.text);
  return {
    segments: [{ ...token, x: 0, width }],
    width,
    firstToken: token,
    lastToken: token,
  };
}

function appendAtomToInlineUnit(unit, atom, spaceWidth = 0) {
  const xOffset = unit.width + spaceWidth;
  unit.segments.push(...atom.segments.map((segment) => ({
    ...segment,
    x: xOffset + segment.x,
  })));
  unit.width = xOffset + atom.width;
  unit.lastToken = atom.lastToken;
}

function isNumericInlineAtom(atom) {
  return atom?.segments.length === 1 && /^[-+]?\d+$/u.test(atom.segments[0].text);
}

function isInlineUnitEndingWithNumber(unit) {
  const lastSegment = unit?.segments.at(-1);
  return lastSegment?.type === 'text' && /^[-+]?\d+$/u.test(lastSegment.text);
}

function isStatSymbolInlineAtom(atom) {
  return atom?.segments.some((segment) => segment.type === 'statSymbol');
}

function isGameplaySymbolInlineAtom(atom) {
  return atom?.segments.length === 1 && atom.segments[0].type === 'gameplaySymbol';
}

function createInlineLayoutUnits(tokens, measureTokenWidth) {
  const units = [];
  let currentAtom = null;
  let pendingSpaceWidth = 0;

  const flushAtom = () => {
    if (!currentAtom) return;

    const previousUnit = units.at(-1);
    if (isInlineUnitEndingWithNumber(previousUnit) && isStatSymbolInlineAtom(currentAtom)) {
      appendAtomToInlineUnit(
        previousUnit,
        currentAtom,
        getInlineSpaceWidth(pendingSpaceWidth, previousUnit.lastToken, currentAtom.firstToken),
      );
    } else if (isGameplaySymbolInlineAtom(previousUnit) && isNumericInlineAtom(currentAtom)) {
      appendAtomToInlineUnit(
        previousUnit,
        currentAtom,
        getInlineSpaceWidth(pendingSpaceWidth, previousUnit.lastToken, currentAtom.firstToken),
      );
    } else {
      units.push({
        ...currentAtom,
        segments: currentAtom.segments.map((segment) => ({ ...segment })),
        leadingSpaceWidth: units.length > 0 ? pendingSpaceWidth : 0,
      });
    }

    currentAtom = null;
    pendingSpaceWidth = 0;
  };

  tokens.forEach((token) => {
    if (token.type === 'space') {
      flushAtom();
      if (units.length > 0) {
        pendingSpaceWidth += measureTokenWidth(token.text);
      }
      return;
    }

    const atom = createInlineAtom(token, measureTokenWidth);
    if (!currentAtom) {
      currentAtom = atom;
      return;
    }

    appendAtomToInlineUnit(currentAtom, atom, 0);
  });

  flushAtom();
  return units;
}

export function layoutInlineStatText(text, { maxWidth, measureTokenWidth }) {
  const sourceTokens = tokenizeInlineStatText(text);
  const lines = [];
  let currentLine = [];
  let currentWidth = 0;

  const pushLine = () => {
    lines.push({ segments: currentLine, width: currentWidth });
    currentLine = [];
    currentWidth = 0;
  };

  const layoutUnits = (tokens) => {
    const units = createInlineLayoutUnits(tokens, measureTokenWidth);

    units.forEach((unit) => {
      const previousSegment = currentLine.at(-1);
      const rawSpaceWidth = currentLine.length > 0 ? unit.leadingSpaceWidth : 0;
      const inlineSpaceWidth = getInlineSpaceWidth(rawSpaceWidth, previousSegment, unit.firstToken);
      const nextX = currentWidth + inlineSpaceWidth;

      if (currentLine.length > 0 && nextX + unit.width > maxWidth) {
        pushLine();
      }

      const segmentX = currentLine.length > 0
        ? currentWidth + getInlineSpaceWidth(unit.leadingSpaceWidth, currentLine.at(-1), unit.firstToken)
        : 0;
      currentLine.push(...unit.segments.map((segment) => ({
        ...segment,
        x: segmentX + segment.x,
      })));
      currentWidth = segmentX + unit.width;
    });
  };

  let paragraphTokens = [];
  sourceTokens.forEach((token) => {
    if (token.type !== 'newline') {
      paragraphTokens.push(token);
      return;
    }

    layoutUnits(paragraphTokens);
    pushLine();
    paragraphTokens = [];
  });
  layoutUnits(paragraphTokens);

  if (currentLine.length > 0 || lines.length === 0) {
    pushLine();
  }

  return lines;
}

export function createInlineStatText(scene, x, y, text, {
  fontFamily = 'Arial, sans-serif',
  fontSize = 12,
  minFontSize = 9,
  color = CARD_COLORS.bodyText,
  statFontStyle = 'bold',
  align = 'center',
  maxWidth = 160,
  maxHeight = null,
  lineSpacing = 0,
} = {}) {
  const container = scene.add.container(x, y);
  let fittedFontSize = fontSize;
  const measureText = scene.add.text(0, 0, '', {
    fontFamily,
    fontSize: `${fittedFontSize}px`,
    color,
  }).setVisible(false);
  const measureTokenWidth = (value, textFontSize = fittedFontSize) => {
    const symbolStyle = getInlineSymbolStyle(value);
    if (symbolStyle.type === 'gameplaySymbol') {
      return Math.ceil(getInlineIconFontSize(textFontSize, symbolStyle) * (symbolStyle.widthScale ?? 0.78));
    }
    if (symbolStyle.type === 'statSymbol') {
      return Math.ceil(getInlineIconFontSize(textFontSize, symbolStyle) * (symbolStyle.widthScale ?? 0.86));
    }

    measureText.setText(value);
    return measureText.width;
  };
  const layoutForFontSize = (size) => {
    measureText.setFontSize(size);
    const linesForSize = layoutInlineStatText(text, {
      maxWidth,
      measureTokenWidth: (value) => measureTokenWidth(value, size),
    });
    const maxIconFontSize = linesForSize.reduce((largest, line) => {
      return Math.max(
        largest,
        ...line.segments
          .filter((segment) => isInlineSymbolToken(segment))
          .map((segment) => getInlineIconFontSize(size, getInlineSymbolStyle(segment.text))),
      );
    }, size);
    const lineHeightForSize = Math.ceil(Math.max(size * 1.12, maxIconFontSize * 1.03)) + lineSpacing;
    return {
      lines: linesForSize,
      lineHeight: lineHeightForSize,
      height: Math.max(size, linesForSize.length * lineHeightForSize - lineSpacing),
    };
  };
  let fittedLayout = layoutForFontSize(fittedFontSize);

  while (Number.isFinite(maxHeight) && fittedLayout.height > maxHeight && fittedFontSize > minFontSize) {
    fittedFontSize -= 1;
    fittedLayout = layoutForFontSize(fittedFontSize);
  }

  const baseStyle = {
    fontFamily,
    fontSize: `${fittedFontSize}px`,
    color,
  };
  const { lines, lineHeight } = fittedLayout;

  lines.forEach((line, lineIndex) => {
    const startX = align === 'center' ? -line.width / 2 : 0;
    const lineTopY = lineIndex * lineHeight;
    const textY = lineTopY + Math.max(0, Math.round((lineHeight - lineSpacing - fittedFontSize) / 2));
    const iconCenterY = lineTopY + (lineHeight - lineSpacing) * 0.5;
    line.segments.forEach((segment) => {
      const symbolStyle = getInlineSymbolStyle(segment.text);
      const baselineOffsetRatio = symbolStyle.type === 'gameplaySymbol'
        ? INLINE_GAMEPLAY_ICON_BASELINE_OFFSET_RATIO
        : INLINE_EFFECT_ICON_BASELINE_OFFSET_RATIO;
      const inlineIconYOffset = Math.round(fittedFontSize * baselineOffsetRatio);
      const segmentX = startX + segment.x + (symbolStyle.visualOffsetX ?? 0);
      if (symbolStyle.type === 'gameplaySymbol' && symbolStyle.icon === 'group') {
        const group = scene.add.container(segmentX + segment.width / 2, iconCenterY + inlineIconYOffset);
        const iconFontSize = getInlineIconFontSize(fittedFontSize, symbolStyle);
        const iconPositions = [
          { x: -segment.width * 0.16, y: -iconFontSize * 0.02, alpha: 0.92 },
          { x: segment.width * 0.15, y: iconFontSize * 0.03, alpha: 1 },
        ];
        const icons = iconPositions.slice(0, symbolStyle.count).map(({ x: iconX, y: iconY, alpha }) => {
          const icon = scene.add.text(iconX, iconY, symbolStyle.baseGlyph, {
            ...baseStyle,
            fontSize: `${iconFontSize}px`,
            color: symbolStyle.color ?? color,
            fontStyle: symbolStyle.fontStyle,
            stroke: symbolStyle.stroke,
            strokeThickness: Math.max(1, Math.round(iconFontSize * 0.12)),
          }).setOrigin(0.5).setAlpha(alpha);
          safeSetTextShadow(icon, 0, 1, 'rgba(0, 0, 0, 0.55)', 1);
          return icon;
        });
        group.add(icons);
        container.add(group);
        return;
      }

      const isInlineSymbol = symbolStyle.type === 'statSymbol' || symbolStyle.type === 'gameplaySymbol';
      const iconFontSize = isInlineSymbol
        ? getInlineIconFontSize(fittedFontSize, symbolStyle)
        : fittedFontSize;
      const segmentY = isInlineSymbol ? iconCenterY + inlineIconYOffset : textY;
      const segmentText = scene.add.text(segmentX, segmentY, segment.text, {
        ...baseStyle,
        fontSize: `${iconFontSize}px`,
        color: symbolStyle.color ?? color,
        fontStyle: symbolStyle.type === 'statSymbol' ? statFontStyle : symbolStyle.fontStyle,
        stroke: isInlineSymbol ? '#061426' : undefined,
        strokeThickness: isInlineSymbol ? Math.max(1, Math.round(iconFontSize * 0.1)) : 0,
      }).setOrigin(0, isInlineSymbol ? 0.5 : 0);
      if (isInlineSymbol) {
        safeSetTextShadow(segmentText, 0, 1, 'rgba(0, 0, 0, 0.58)', 1);
      }
      container.add(segmentText);
    });
  });

  measureText.destroy();
  container.inlineTextMetrics = {
    lineCount: lines.length,
    width: Math.max(0, ...lines.map((line) => line.width)),
    height: fittedLayout.height,
    fontSize: fittedFontSize,
  };
  return container;
}

export function isCardPlaceholder(card) {
  return !card;
}

export function isCardUnit(card) {
  return !isCardPlaceholder(card)
    && (card?.type === 'unit' || (Number.isFinite(card?.attack) && Number.isFinite(card?.hp)));
}

export function isCardNonUnit(card) {
  return !isCardPlaceholder(card) && !isCardUnit(card);
}

export function getCardPreviewStatRowKind(card, { showNonUnitEffectStatSymbols = true } = {}) {
  if (isCardPlaceholder(card)) return 'empty';
  if (isCardUnit(card)) return 'unit';
  if (showNonUnitEffectStatSymbols && isCardNonUnit(card)) return 'nonUnitEffect';
  return 'empty';
}

export function getCardStatValues(card) {
  if (!isCardUnit(card)) {
    return { attack: null, armor: null, health: null };
  }

  return {
    attack: Number.isFinite(card?.attack) ? card.attack : 0,
    armor: Number.isFinite(card?.armor) ? card.armor : 0,
    health: Number.isFinite(card?.hp) ? card.hp : 0,
  };
}

export function getCardLayoutZones(width, height) {
  const pad = Math.max(4, Math.round(width * 0.055));
  const gap = Math.max(2, Math.round(height * 0.007));
  const innerWidth = Math.max(1, width - pad * 2);
  const innerHeight = Math.max(1, height - pad * 2);
  const statBadgeRowHeight = Math.round(innerHeight * CARD_ZONE_RATIOS.statBadges);
  const nameHeight = Math.round(innerHeight * CARD_ZONE_RATIOS.name);
  const textHeight = Math.round(innerHeight * CARD_ZONE_RATIOS.text);
  const artHeight = Math.max(1, innerHeight - statBadgeRowHeight - nameHeight - textHeight - gap * 3);
  const left = -width / 2 + pad;
  let top = -height / 2 + pad;

  const makeRect = (h) => {
    const rect = { x: left, y: top, width: innerWidth, height: h, centerX: left + innerWidth / 2, centerY: top + h / 2 };
    top += h + gap;
    return rect;
  };

  return {
    pad,
    gap,
    outer: { x: -width / 2, y: -height / 2, width, height, centerX: 0, centerY: 0 },
    statBadges: makeRect(statBadgeRowHeight),
    statBar: null,
    art: makeRect(artHeight),
    name: makeRect(nameHeight),
    text: makeRect(textHeight),
  };
}

export function getCardTypography(width, height) {
  return {
    stat: Math.max(10, Math.floor(width * 0.112)),
    name: Math.max(11, Math.floor(width * 0.114)),
    type: Math.max(8, Math.floor(width * 0.065)),
    body: Math.max(9, Math.floor(width * 0.088)),
  };
}


function isRenderableTextObject(text) {
  if (!text || text.active === false || text.scene == null) return false;
  if (text._destroyed || text.destroyed) return false;
  if ('texture' in text && text.texture == null) return false;
  if ('canvas' in text && text.canvas == null) return false;
  if ('context' in text && text.context == null) return false;
  return true;
}

function safeSetTextShadow(text, ...args) {
  if (!isRenderableTextObject(text) || typeof text.setShadow !== 'function') return text;
  return text.setShadow(...args);
}

function deactivateCardPreviewView(view) {
  if (!view || view.isActive === false) return;
  view.isActive = false;
  view.items?.forEach((item) => {
    item?.disableInteractive?.();
    item?.removeAllListeners?.();
  });
}

export function drawStatSymbol(scene, x, y, size, statKey, color, alpha = 1) {
  if (statKey === 'attack') {
    const symbol = scene.add.graphics({ x, y });
    symbol.fillStyle(color, alpha);
    symbol.fillTriangle(0, -size * 0.5, size * 0.52, size * 0.43, -size * 0.52, size * 0.43);
    return symbol;
  }

  if (statKey === 'armor') {
    return scene.add.rectangle(x, y, size * 0.75, size * 0.75, color, alpha)
      .setRotation(Math.PI / 4);
  }

  return scene.add.circle(x, y, size * 0.43, color, alpha);
}

function getStatBadgeSize(height, width, scale = 1) {
  const baseSize = Math.max(18, Math.min(24, height * 0.9, width * 0.2));
  return baseSize * scale;
}

function getStatRowMetrics(height, width, {
  sizeScale = 1,
  fontScale = 1,
  spacingScale = 1,
  maxGroupWidthRatio = 0.86,
} = {}) {
  const symbolSize = getStatBadgeSize(height, width, sizeScale);
  const fontSize = Math.max(11, Math.floor(symbolSize * 0.63 * fontScale));
  const groupWidth = Math.min(width * maxGroupWidthRatio, symbolSize * 4.45 * spacingScale);
  const slotWidth = groupWidth / 3;

  return {
    symbolSize,
    fontSize,
    groupWidth,
    slotWidth,
    topMargin: Math.max(4, Math.round(height * 0.09)),
  };
}

function createStatGlyph(scene, x, y, size, key, value, style, isKnown, fontSize, modifiedState = 'base') {
  const glyph = scene.add.container(x, y);
  const valueText = isKnown ? String(value) : '–';
  const symbolAlpha = isKnown ? 0.98 : 0.26;
  const outlineAlpha = isKnown ? 0.16 : 0.06;
  const glow = drawStatSymbol(scene, 0, 0, size * 1.12, key, style.glow, isKnown ? 0.12 : 0.03);
  const outline = drawStatSymbol(scene, 0, 0, size * 1.05, key, 0xfff7ed, outlineAlpha);
  const symbol = drawStatSymbol(scene, 0, 0, size, key, style.color, symbolAlpha);
  const glass = drawStatSymbol(scene, -size * 0.08, -size * 0.14, size * 0.46, key, 0xffffff, isKnown ? 0.1 : 0.025);
  const textOffsetY = key === 'attack' ? size * 0.09 : 0;
  const modifiedStyle = isKnown ? getModifiedStatTextStyle(key, modifiedState) : null;
  if (modifiedStyle) {
    glow.setAlpha(modifiedStyle.glowAlpha);
    outline.setAlpha(0.24);
  }
  const numberPlate = scene.add.circle(0, textOffsetY, size * 0.31, 0x020817, isKnown ? 0.42 : 0.1)
    .setStrokeStyle(Math.max(1, Math.round(size * 0.045)), 0xfff1d6, isKnown ? 0.22 : 0.06);
  const text = scene.add.text(0, textOffsetY, valueText, {
    fontFamily: 'Arial, sans-serif',
    fontSize: `${fontSize}px`,
    color: modifiedStyle?.color ?? (isKnown ? '#fff7ed' : '#94a3b8'),
    fontStyle: 'bold',
    align: 'center',
    stroke: isKnown ? '#020817' : '#0f172a',
    strokeThickness: isKnown ? Math.max(2, Math.round(size * 0.115)) : 1,
    fixedWidth: Math.ceil(size * 1.02),
    fixedHeight: Math.ceil(size * 0.84),
  }).setOrigin(0.5);
  if (isKnown) {
    safeSetTextShadow(text, 0, 1, modifiedStyle?.shadow ?? 'rgba(0, 0, 0, 0.68)', modifiedStyle ? 4 : 2);
  }
  if (modifiedStyle) {
    numberPlate.setStrokeStyle(Math.max(1, Math.round(size * 0.05)), modifiedStyle.plateStroke, modifiedStyle.plateStrokeAlpha);
  }

  glyph.add([glow, outline, symbol, glass, numberPlate, text]);
  glyph.statFeedback = {
    key,
    baseColor: style.color,
    glow,
    outline,
    symbol,
    glass,
    numberPlate,
    valueText: text,
    modifiedState,
    setDimmed(dimmed = true) {
      glyph.setAlpha(dimmed ? 0.48 : 1);
    },
  };

  return glyph;
}

export function createStatBadges(scene, x, y, width, height, stats, depth = 0, options = {}) {
  const container = scene.add.container(x, y).setDepth(depth);
  const keys = ['attack', 'armor', 'health'];
  const {
    sizeScale = 1,
    fontScale = 1,
    spacingScale = 1,
    maxGroupWidthRatio = 0.86,
    baseStats = stats,
    changedStats = [],
    pulseChangedStats = false,
  } = options;
  const metrics = getStatRowMetrics(height, width, { sizeScale, fontScale, spacingScale, maxGroupWidthRatio });
  const { symbolSize, fontSize, groupWidth, slotWidth } = metrics;
  const statGlyphs = {};
  const changedStatSet = asChangedStatSet(changedStats);

  keys.forEach((key, index) => {
    const slotCenterX = -groupWidth / 2 + slotWidth * (index + 0.5);
    const statStyle = CARD_STAT_STYLES[key];
    const value = stats[key];
    const isKnown = value !== null && value !== undefined;
    const modifiedState = getModifiedStatState(key, stats, baseStats);
    const glyph = createStatGlyph(scene, slotCenterX, 0, symbolSize, key, value, statStyle, isKnown, fontSize, modifiedState);

    if (pulseChangedStats && changedStatSet.has(key)) pulseStatGlyph(scene, glyph);

    statGlyphs[key] = glyph.statFeedback;
    container.add(glyph);
  });

  container.statFeedback = statGlyphs;
  container.badgeMetrics = {
    size: symbolSize,
    groupWidth,
    slotWidth,
    topMargin: metrics.topMargin,
  };

  return container;
}

function getNonUnitEffectStarPoints(size, offsetX = 0, offsetY = 0) {
  const outerRadius = size * 0.46;
  const innerRadius = outerRadius * 0.43;
  const pointCount = 6;
  const points = [];

  for (let index = 0; index < pointCount * 2; index += 1) {
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const angle = -Math.PI / 2 + (Math.PI / pointCount) * index;
    points.push({
      x: offsetX + Math.cos(angle) * radius,
      y: offsetY + Math.sin(angle) * radius,
    });
  }

  return points;
}

export function drawNonUnitEffectStarIcon(scene, x, y, size) {
  const shadowOffsetY = Math.max(1, Math.round(size * 0.035));
  const star = scene.add.graphics({ x, y });
  const points = getNonUnitEffectStarPoints(size);

  star.fillStyle(0xf59e0b, 0.22);
  star.fillPoints(getNonUnitEffectStarPoints(size, 0, shadowOffsetY), true);
  star.fillStyle(NON_UNIT_EFFECT_STAT_SYMBOL_COLOR, 1);
  star.fillPoints(points, true);

  return star;
}

export function createNonUnitEffectStatSymbols(scene, x, y, width, height, depth = 0, options = {}) {
  const container = scene.add.container(x, y).setDepth(depth);
  const {
    sizeScale = 1,
    fontScale = 1,
    spacingScale = 1,
    maxGroupWidthRatio = 0.86,
  } = options;
  const metrics = getStatRowMetrics(height, width, { sizeScale, fontScale, spacingScale, maxGroupWidthRatio });
  const starSize = metrics.symbolSize * Math.max(0.01, fontScale * 0.96);

  for (let index = 0; index < 3; index += 1) {
    const slotCenterX = -metrics.groupWidth / 2 + metrics.slotWidth * (index + 0.5);
    container.add(drawNonUnitEffectStarIcon(scene, slotCenterX, 0, starSize));
  }

  container.statFeedback = {};
  container.badgeMetrics = {
    size: metrics.symbolSize,
    groupWidth: metrics.groupWidth,
    slotWidth: metrics.slotWidth,
    topMargin: metrics.topMargin,
  };

  return container;
}


function createEmptyStatRow(scene, x, y, width, height, depth = 0, options = {}) {
  const container = scene.add.container(x, y).setDepth(depth);
  const {
    sizeScale = 1,
    fontScale = 1,
    spacingScale = 1,
    maxGroupWidthRatio = 0.86,
  } = options;
  const metrics = getStatRowMetrics(height, width, { sizeScale, fontScale, spacingScale, maxGroupWidthRatio });

  container.statFeedback = {};
  container.badgeMetrics = {
    size: metrics.symbolSize,
    groupWidth: metrics.groupWidth,
    slotWidth: metrics.slotWidth,
    topMargin: metrics.topMargin,
  };

  return container;
}

export function createStatBar(...args) {
  return createStatBadges(...args);
}

export function createArtPlaceholder(scene, zone) {
  const container = scene.add.container(zone.centerX, zone.centerY);
  const back = scene.add.rectangle(0, 0, zone.width, zone.height, CARD_COLORS.artBottom, 0.92)
    .setStrokeStyle(1, 0x38bdf8, 0.16);
  const upper = scene.add.rectangle(0, -zone.height * 0.22, zone.width, zone.height * 0.56, CARD_COLORS.artTop, 0.66);
  const silhouette = scene.add.rectangle(0, zone.height * 0.04, zone.width * 0.48, zone.height * 0.62, 0x020617, 0.22)
    .setRotation(-0.08);
  const horizon = scene.add.rectangle(0, zone.height * 0.26, zone.width * 0.82, 1, 0x67e8f9, 0.18);
  container.add([back, upper, silhouette, horizon]);
  return container;
}

function getCardArtTextureKey(scene, card, { enableCardIllustration = false } = {}) {
  const explicitTextureKey = card?.artTextureKey ?? card?.artKey ?? card?.art?.textureKey ?? null;
  if (explicitTextureKey) return explicitTextureKey;

  return enableCardIllustration ? getLoadedCardIllustrationTextureKey(scene, card) : null;
}

export function calculateCardArtworkCoverPosition(zone, sourceWidth = 512, sourceHeight = 768, options = {}) {
  const safeSourceWidth = Math.max(1, Math.floor(sourceWidth));
  const safeSourceHeight = Math.max(1, Math.floor(sourceHeight));
  const scale = Math.max(zone.width / safeSourceWidth, zone.height / safeSourceHeight);
  const rawCropWidth = Math.min(safeSourceWidth, zone.width / scale);
  const rawCropHeight = Math.min(safeSourceHeight, zone.height / scale);
  const cropWidth = Math.min(safeSourceWidth, Math.max(1, Math.ceil(rawCropWidth)));
  const cropHeight = Math.min(safeSourceHeight, Math.max(1, Math.ceil(rawCropHeight)));
  const cropX = Math.min(Math.max(0, safeSourceWidth - cropWidth), Math.max(0, Math.round((safeSourceWidth - cropWidth) / 2)));
  const maxCropY = Math.max(0, safeSourceHeight - cropHeight);
  const normalizedArtPositionY = Number.isFinite(options.artPositionY)
    ? Math.min(1, Math.max(0, options.artPositionY))
    : 0.5;
  const cropY = Math.min(maxCropY, Math.max(0, Math.round(normalizedArtPositionY * maxCropY)));

  return {
    scale,
    displayWidth: safeSourceWidth * scale,
    displayHeight: safeSourceHeight * scale,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    maxCropY,
    artPositionY: maxCropY > 0 ? (cropY / maxCropY) : 0.5,
    visibleSourceWidthPercent: (cropWidth / safeSourceWidth) * 100,
    visibleSourceHeightPercent: (cropHeight / safeSourceHeight) * 100,
    visibleSourceAreaPercent: (cropWidth * cropHeight) / (safeSourceWidth * safeSourceHeight) * 100,
    lostTopPercent: (cropY / safeSourceHeight) * 100,
    lostBottomPercent: ((safeSourceHeight - cropY - cropHeight) / safeSourceHeight) * 100,
    lostLeftPercent: (cropX / safeSourceWidth) * 100,
    lostRightPercent: ((safeSourceWidth - cropX - cropWidth) / safeSourceWidth) * 100,
  };
}

export function createCardArtwork(scene, zone, card, options = {}) {
  const textureKey = getCardArtTextureKey(scene, card, options);
  const hasExplicitArtRect = options.artRect
    && Number.isFinite(options.artRect.x)
    && Number.isFinite(options.artRect.y)
    && Number.isFinite(options.artRect.width)
    && Number.isFinite(options.artRect.height);
  const artRect = hasExplicitArtRect ? options.artRect : null;
  const effectiveArtRect = artRect;
  const canCreateGeometryMask = typeof scene.make?.graphics === 'function';
  if (textureKey && scene.textures?.exists?.(textureKey)) {
    const image = scene.add.image(zone.centerX, zone.centerY, textureKey);
    const texture = image.texture?.getSourceImage?.();
    const sourceWidth = texture?.width ?? image.width;
    const sourceHeight = texture?.height ?? image.height;
    const crop = calculateCardArtworkCoverPosition(zone, sourceWidth, sourceHeight, options);
    image.setDisplaySize(crop.displayWidth, crop.displayHeight);
    if (typeof image.setOrigin === 'function') {
      const safeSourceWidth = Math.max(1, sourceWidth);
      const safeSourceHeight = Math.max(1, sourceHeight);
      image.setOrigin(
        (crop.cropX + crop.cropWidth / 2) / safeSourceWidth,
        (crop.cropY + crop.cropHeight / 2) / safeSourceHeight,
      );
    }
    image.setCrop(crop.cropX, crop.cropY, crop.cropWidth, crop.cropHeight);
    if (options.lockDisplayToZone) {
      // Preserve cover behavior with uniform scaling only.
      // Geometry masking handles viewport clipping for custom board art rects.
      image.setDisplaySize(crop.displayWidth, crop.displayHeight);
    }
    if (effectiveArtRect && canCreateGeometryMask) {
      const artMaskShape = scene.make.graphics({ x: 0, y: 0, add: false });
      artMaskShape.fillStyle(0xffffff, 1);
      artMaskShape.fillRect(effectiveArtRect.x, effectiveArtRect.y, effectiveArtRect.width, effectiveArtRect.height);
      const artMask = artMaskShape.createGeometryMask();
      image.setMask(artMask);
      image.artMaskShape = artMaskShape;
      image.artMask = artMask;
    }
    image.cropDebugMetrics = crop;
    return image;
  }

  if (!(effectiveArtRect && canCreateGeometryMask)) {
    return createArtPlaceholder(scene, zone);
  }

  const placeholder = createArtPlaceholder(scene, zone);
  const artMaskShape = scene.make.graphics({ x: 0, y: 0, add: false });
  artMaskShape.fillStyle(0xffffff, 1);
  artMaskShape.fillRect(effectiveArtRect.x, effectiveArtRect.y, effectiveArtRect.width, effectiveArtRect.height);
  const artMask = artMaskShape.createGeometryMask();
  placeholder.setMask(artMask);
  placeholder.artMaskShape = artMaskShape;
  placeholder.artMask = artMask;
  return placeholder;
}


export function formatCardNumberOverlay(card) {
  if (!Number.isInteger(card?.cardNumber) || card.cardNumber <= 0) return null;
  return String(card.cardNumber).padStart(2, '0');
}

export function createCardNumberOverlay(scene, zones, card, { width, height, typographyScale = 1 } = {}) {
  const cardNumberLabel = formatCardNumberOverlay(card);
  if (!cardNumberLabel) return null;

  const fontSize = Math.max(9, Math.min(14, Math.round(width * 0.066 * typographyScale)));
  const insetX = Math.max(4, Math.round(zones.pad * 0.48));
  const insetY = Math.max(3, Math.round(zones.pad * 0.38));
  const marker = scene.add.text(width / 2 - insetX, height / 2 - insetY, cardNumberLabel, {
    fontFamily: 'Arial, sans-serif',
    fontSize: `${fontSize}px`,
    color: '#dbeafe',
    fontStyle: 'normal',
    align: 'right',
    letterSpacing: Math.max(0.2, fontSize * 0.035),
    stroke: '#020617',
    strokeThickness: Math.max(1, Math.round(fontSize * 0.12)),
  }).setOrigin(1, 1).setAlpha(0.46);
  safeSetTextShadow(marker, 0, 1, 'rgba(0, 0, 0, 0.42)', 1);
  return marker;
}

export function getCardDisplayContent(card, locale = 'en') {
  if (!card) {
    return { name: '', body: '', type: '' };
  }

  return {
    name: getCardDisplayName(card, locale) ?? '',
    body: typeof getCardTextShort(card, locale) === 'string' ? formatCardEffectTextShort(getCardTextShort(card, locale), locale).trim() : '',
    type: card?.type ? String(card.type).toUpperCase() : '',
  };
}

function getCardBodyTextException(card, locale = 'en') {
  if (locale === 'en' && card?.id === 'attrition_swarm_funeral_pyre_1') {
    // Surgical one-card EN exception so the three-line rules text fits the
    // existing panel without changing card or modal dimensions.
    return { fontSizeDelta: -2, lineSpacingDelta: -8 };
  }

  if (locale !== 'pl') return { fontSizeDelta: 0, lineSpacingDelta: 0 };
  if ((getCardDisplayName(card, locale) ?? '').trim() !== 'Miłosierdzie') {
    return { fontSizeDelta: 0, lineSpacingDelta: 0 };
  }

  // Surgical one-card PL exception to avoid minor overflow.
  return { fontSizeDelta: 0, lineSpacingDelta: -1 };
}

export function createCardPreviewView(scene, {
  card,
  cardId = null,
  x,
  y,
  width,
  height,
  accentColor = getDefaultCardAccentColor(card),
  depth = 0,
  locale = 'en',
  statBadgeScale = 1.1,
  typographyScale = 1,
  titleTypographyScale = typographyScale,
  bodyLineSpacing = 2,
  frameAlpha = card ? 0.84 : 0.48,
  enableCardIllustration = false,
  showCardNumber = false,
  statValues = null,
  baseStatValues = null,
  changedStats = [],
  pulseChangedStats = false,
  temporaryArtCropY01 = null,
  temporaryArtCropYOffset = 0,
  clipArtToViewport = false,
  surfaceTheme = BASE_CARD_SURFACE_THEME,
  showNonUnitEffectStatSymbols = true,
} = {}) {
  const resolvedSurfaceTheme = surfaceTheme ?? BASE_CARD_SURFACE_THEME;
  const zones = getCardLayoutZones(width, height);
  const baseTypography = getCardTypography(width, height);
  const bodyTextException = getCardBodyTextException(card, locale);
  const typography = {
    stat: Math.round(baseTypography.stat * typographyScale),
    name: Math.round(baseTypography.name * titleTypographyScale),
    type: Math.round(baseTypography.type * typographyScale),
    body: Math.round(baseTypography.body * typographyScale) + bodyTextException.fontSizeDelta,
  };
  const content = getCardDisplayContent(card, locale);
  const stats = statValues ?? getCardStatValues(card);
  const baseStats = baseStatValues ?? stats;
  const root = scene.add.container(x, y).setDepth(depth);
  const glow = scene.add.rectangle(0, 0, width + 8, height + 8, 0xfacc15, 0)
    .setStrokeStyle(5, 0xfacc15, 0);
  const background = scene.add.rectangle(0, 0, width, height, resolvedSurfaceTheme.frameFill, frameAlpha)
    .setStrokeStyle(3, accentColor, card ? 0.82 : 0.7);
  const inner = scene.add.rectangle(0, 0, width - zones.pad * 0.9, height - zones.pad * 0.9, resolvedSurfaceTheme.innerPanelFill, 0.4)
    .setStrokeStyle(1, resolvedSurfaceTheme.innerPanelEdgeStroke, 0.2);
  const statPanel = scene.add.rectangle(
    zones.statBadges.centerX,
    zones.statBadges.centerY,
    zones.statBadges.width,
    zones.statBadges.height,
    resolvedSurfaceTheme.statBackingFill,
    0.74,
  ).setStrokeStyle(1, resolvedSurfaceTheme.dividerLine, typographyScale > 1 ? 0.38 : 0.33);
  const statPanelTopEdge = scene.add.rectangle(
    zones.statBadges.centerX,
    zones.statBadges.y - zones.statBadges.height * 0.5 + 1,
    zones.statBadges.width - 2,
    1,
    resolvedSurfaceTheme.panelHighlightStroke,
    0.14,
  );
  const artRecessShadowOffsetY = Math.max(1, Math.round(zones.gap * 0.11));
  const artRecessShadowVerticalInset = Math.max(2, Math.round(zones.gap * 0.6));
  const artRecessShadowHeight = Math.max(1, zones.art.height - artRecessShadowVerticalInset * 2);
  const artRecessShadow = scene.add.rectangle(
    zones.art.centerX,
    zones.art.centerY + artRecessShadowOffsetY,
    zones.art.width - 2,
    artRecessShadowHeight,
    resolvedSurfaceTheme.artInsetShadow,
    0.16,
  ).setStrokeStyle(1, resolvedSurfaceTheme.artInsetShadow, 0.18);
  const statRowOptions = {
    sizeScale: statBadgeScale,
    fontScale: typographyScale > 1 ? 1.06 : 1.1,
    maxGroupWidthRatio: 0.9,
    spacingScale: typographyScale > 1 ? 1.16 : 1.12,
  };
  const statRowKind = getCardPreviewStatRowKind(card, { showNonUnitEffectStatSymbols });
  const statBadges = (() => {
    if (statRowKind === 'nonUnitEffect') {
      return createNonUnitEffectStatSymbols(
        scene,
        zones.statBadges.centerX,
        zones.statBadges.centerY,
        zones.statBadges.width,
        zones.statBadges.height,
        0,
        statRowOptions,
      );
    }

    if (statRowKind === 'unit') {
      return createStatBadges(
        scene,
        zones.statBadges.centerX,
        zones.statBadges.centerY,
        zones.statBadges.width,
        zones.statBadges.height,
        stats,
        0,
        {
          ...statRowOptions,
          baseStats,
          changedStats,
          pulseChangedStats,
        },
      );
    }

    return createEmptyStatRow(
      scene,
      zones.statBadges.centerX,
      zones.statBadges.centerY,
      zones.statBadges.width,
      zones.statBadges.height,
      0,
      statRowOptions,
    );
  })();
  const persistentArtPositionY = getCardArtPositionY(cardId ?? card);
  const hasTemporaryArtPositionY = Number.isFinite(temporaryArtCropY01);
  const effectiveArtPositionY = hasTemporaryArtPositionY
    ? Math.min(1, Math.max(0, temporaryArtCropY01))
    : (Number.isFinite(persistentArtPositionY) ? Math.min(1, Math.max(0, persistentArtPositionY)) : 0.5);
  const artProofAsset = getCardIllustrationAsset(card);
  const artProofTextureKey = getLoadedCardIllustrationTextureKey(scene, card, { enableCardIllustration });
  const artPositionSource = hasTemporaryArtPositionY
    ? 'temporary'
    : (Number.isFinite(persistentArtPositionY) ? 'persistent_override' : 'default_fallback');
  if (card?.id) {
    console.info('[ART_VIEWPORT_PROOF]', {
      scene: scene?.scene?.key ?? scene?.sys?.settings?.key ?? 'unknown',
      cardId: card.id,
      factionId: artProofAsset?.factionId ?? null,
      artAssetId: artProofAsset?.artAssetId ?? null,
      textureKey: artProofTextureKey,
      artPositionY: Number(effectiveArtPositionY.toFixed(3)),
      source: artPositionSource,
      enableCardIllustration,
    });
  }
  const art = createCardArtwork(scene, zones.art, card, {
    enableCardIllustration,
    artPositionY: effectiveArtPositionY,
  });
  const namePanel = scene.add.rectangle(zones.name.centerX, zones.name.centerY, zones.name.width, zones.name.height, resolvedSurfaceTheme.namePanelFill, 0.95)
    .setStrokeStyle(1, accentColor, card ? (typographyScale > 1 ? 0.46 : 0.4) : 0.14);
  const namePanelHighlight = scene.add.rectangle(
    zones.name.centerX,
    zones.name.y + 1,
    zones.name.width - 2,
    1,
    resolvedSurfaceTheme.panelHighlightStroke,
    0.14,
  );
  const nameHorizontalInset = Math.max(10, zones.pad * (typographyScale > 1 ? 1.45 : 1.32));
  const nameText = scene.add.text(zones.name.centerX, zones.name.centerY, content.name || '—', {
    fontFamily: 'Arial, sans-serif',
    fontSize: `${typography.name}px`,
    color: card ? resolvedSurfaceTheme.textIvory : resolvedSurfaceTheme.textMuted,
    fontStyle: 'bold',
    align: 'center',
    lineSpacing: Math.max(1, Math.round(typography.name * 0.08)),
    wordWrap: { width: zones.name.width - nameHorizontalInset },
  }).setOrigin(0.5);
  const minNameFontSize = Math.max(9, typography.name - (typographyScale > 1 ? 4 : 3));
  const maxNameHeight = zones.name.height - Math.max(4, zones.gap * 1.5);
  while (nameText.height > maxNameHeight && Number.parseFloat(nameText.style.fontSize) > minNameFontSize) {
    nameText.setFontSize(Number.parseFloat(nameText.style.fontSize) - 1);
  }
  const textPanel = scene.add.rectangle(zones.text.centerX, zones.text.centerY, zones.text.width, zones.text.height, resolvedSurfaceTheme.textPanelFill, 0.93)
    .setStrokeStyle(1, resolvedSurfaceTheme.dividerLine, typographyScale > 1 ? 0.37 : 0.33);
  const textPanelHighlight = scene.add.rectangle(
    zones.text.centerX,
    zones.text.y - zones.text.height * 0.5 + 1,
    zones.text.width - 2,
    1,
    resolvedSurfaceTheme.panelHighlightStroke,
    0.12,
  );
  const bodyTopPadding = Math.max(5, zones.text.height * (typographyScale > 1 ? 0.11 : 0.1));
  const bodyBottomPadding = Math.max(5, zones.text.height * (typographyScale > 1 ? 0.1 : 0.09));
  const bodyTextY = zones.text.y + bodyTopPadding + CARD_DESCRIPTION_TEXT_VERTICAL_OFFSET_PX;
  const bodyText = createInlineStatText(scene, zones.text.centerX, bodyTextY, content.body, {
    fontFamily: 'Arial, sans-serif',
    fontSize: typography.body,
    minFontSize: Math.max(8, typography.body - 2),
    color: card ? resolvedSurfaceTheme.textBody : resolvedSurfaceTheme.textMuted,
    align: 'center',
    lineSpacing: bodyLineSpacing + bodyTextException.lineSpacingDelta,
    // Keep wrapping tied to the actual rules panel width. The panel already
    // sits inside the card padding, so only a small optical inset is needed.
    maxWidth: zones.text.width - Math.max(8, zones.pad * (typographyScale > 1 ? 1.15 : 1.05)),
    maxHeight: zones.text.height - bodyTopPadding - bodyBottomPadding,
  });
  const dividers = [zones.art.y - zones.gap / 2, zones.name.y - zones.gap / 2, zones.text.y - zones.gap / 2]
    .map((dividerY) => scene.add.rectangle(0, dividerY, zones.outer.width - zones.pad * 2.15, 1, resolvedSurfaceTheme.dividerLine, typographyScale > 1 ? 0.48 : 0.43));
  const cardNumberOverlay = showCardNumber
    ? createCardNumberOverlay(scene, zones, card, { width, height, typographyScale })
    : null;
  const selectionOutline = scene.add.rectangle(0, 0, width + 3, height + 3, 0xfacc15, 0)
    .setStrokeStyle(0, 0xfacc15, 0);

  root.add([
    glow,
    background,
    inner,
    statPanel,
    statPanelTopEdge,
    artRecessShadow,
    art,
    statBadges,
    namePanel,
    namePanelHighlight,
    nameText,
    textPanel,
    textPanelHighlight,
    bodyText,
    ...dividers,
    cardNumberOverlay,
    selectionOutline,
  ].filter(Boolean));

  if (clipArtToViewport && typeof scene.add?.graphics === 'function') {
    const artViewportMaskShape = scene.add.graphics();
    artViewportMaskShape.fillStyle(0xffffff, 1);
    artViewportMaskShape.fillRect(
      zones.art.x,
      zones.art.y,
      zones.art.width,
      zones.art.height,
    );
    artViewportMaskShape.visible = false;
    root.add(artViewportMaskShape);
    const artViewportMask = artViewportMaskShape.createGeometryMask();
    art.setMask(artViewportMask);
    art.artMaskShape = artViewportMaskShape;
    art.artMask = artViewportMask;
  }

  const previewView = {
    cardId,
    root,
    glow,
    background,
    label: nameText,
    nameText,
    bodyText,
    cardNumberOverlay,
    selectionOutline,
    statBar: statBadges,
    statBadges,
    art,
    baseX: x,
    baseY: y,
    labelBaseX: x,
    labelBaseY: y,
    baseDepth: depth,
    baseFontSize: typography.name,
    surfaceTheme: resolvedSurfaceTheme,
    isActive: true,
  };
  previewView.items = [
    root,
    glow,
    background,
    inner,
    statPanel,
    statPanelTopEdge,
    artRecessShadow,
    art,
    statBadges,
    namePanel,
    namePanelHighlight,
    nameText,
    textPanel,
    textPanelHighlight,
    bodyText,
    ...dividers,
    cardNumberOverlay,
    selectionOutline,
  ].filter(Boolean);
  const originalRootDestroy = root.destroy?.bind(root);
  previewView.destroy = () => {
    deactivateCardPreviewView(previewView);
    originalRootDestroy?.();
  };
  root.once?.('destroy', () => deactivateCardPreviewView(previewView));
  return previewView;
}
