import { getFactionKeys } from '../data/factions/index.js';
import { isValidCampaignState } from './campaignState.js';

export function getCampaignEnemyFactionKeys(campaign) {
  if (!isValidCampaignState(campaign)) return [];
  return getFactionKeys().filter((factionKey) => factionKey !== campaign.playerFactionKey);
}

export function getCampaignEnemyViewModels(campaign) {
  return getCampaignEnemyFactionKeys(campaign).map((factionKey) => {
    const enemy = campaign.enemies[factionKey];
    return {
      factionKey,
      attemptsRemaining: enemy.attemptsRemaining,
      defeated: enemy.defeated,
      selectable: !enemy.defeated && enemy.attemptsRemaining > 0 && campaign.status === 'active',
      indicator: enemy.defeated ? '✓' : `${'●'.repeat(enemy.attemptsRemaining)}${'○'.repeat(Math.max(0, 3 - enemy.attemptsRemaining))}`,
    };
  });
}
