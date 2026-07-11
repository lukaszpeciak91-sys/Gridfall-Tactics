import { getFactionByKey, getFactionKeys } from '../data/factions/index.js';
import { tutorialEnemyFaction, tutorialPlayerFaction } from '../data/tutorial/tutorialDecks.js';
import { GENERATED_UNIT_ART_ASSETS } from '../data/generatedUnitArt.js';
import { getCardIllustrationAsset } from '../rendering/cardIllustrationAssets.js';
import { getFactionPresentationName } from '../data/presentation/factionPresentation.js';
import { getActiveLocale } from '../localization/localeService.js';
import { getCardDisplayName } from '../localization/cardDisplay.js';

function normalizeLabel(value, fallback = 'Unknown') {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized || fallback;
}

function createEntry({ card, faction, factionKey, sourceType, groupLabel, sortGroup }) {
  const asset = getCardIllustrationAsset(card, { factionId: faction?.id ?? factionKey ?? null });
  const factionId = normalizeLabel(asset?.factionId ?? faction?.id ?? factionKey, 'unknown');
  const artAssetId = normalizeLabel(asset?.artAssetId ?? card?.artAssetId ?? card?.id, 'unknown');
  const displayFaction = groupLabel
    ?? getFactionPresentationName(faction?.id ?? factionKey, getActiveLocale(), faction?.name ?? factionKey ?? factionId);
  const label = getCardDisplayName(card, getActiveLocale()) ?? card?.name ?? card?.tokenType ?? artAssetId;

  return {
    card,
    asset,
    faction,
    factionKey,
    factionId,
    artAssetId,
    sourceType,
    groupLabel,
    displayFaction: normalizeLabel(displayFaction, factionId),
    label: normalizeLabel(label, artAssetId),
    sortGroup,
    dedupeKey: `${factionId}::${artAssetId}`,
  };
}

export function buildDebugIllustrationEntries() {
  const entries = [];

  getFactionKeys().forEach((factionKey) => {
    const faction = getFactionByKey(factionKey);
    (faction?.deck ?? []).forEach((card) => {
      entries.push(createEntry({ card, faction, factionKey, sourceType: 'faction-card', sortGroup: 0 }));
    });
  });

  [
    { faction: tutorialPlayerFaction, groupLabel: 'Tutorial / Player' },
    { faction: tutorialEnemyFaction, groupLabel: 'Tutorial / Enemy' },
  ].forEach(({ faction, groupLabel }) => {
    (faction?.deck ?? []).forEach((card) => {
      entries.push(createEntry({ card, faction, factionKey: faction?.id, sourceType: 'tutorial-card', groupLabel, sortGroup: 1 }));
    });
  });

  GENERATED_UNIT_ART_ASSETS.forEach((generatedUnitArt) => {
    entries.push(createEntry({
      card: generatedUnitArt,
      factionKey: generatedUnitArt.factionId,
      sourceType: 'generated-unit',
      groupLabel: 'Generated Unit',
      sortGroup: 2,
    }));
  });

  const uniqueByAsset = new Map();
  entries.forEach((entry) => {
    if (!uniqueByAsset.has(entry.dedupeKey)) {
      uniqueByAsset.set(entry.dedupeKey, entry);
    }
  });

  return Array.from(uniqueByAsset.values()).sort((a, b) => (
    a.sortGroup - b.sortGroup
    || a.factionId.localeCompare(b.factionId)
    || a.artAssetId.localeCompare(b.artAssetId)
    || a.label.localeCompare(b.label)
  ));
}

export function summarizeDebugIllustrationEntries(entries) {
  return entries.reduce((summary, entry) => {
    summary[entry.sourceType] = (summary[entry.sourceType] ?? 0) + 1;
    return summary;
  }, { 'faction-card': 0, 'tutorial-card': 0, 'generated-unit': 0 });
}
