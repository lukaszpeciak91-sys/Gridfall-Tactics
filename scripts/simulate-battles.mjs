import {
  createInitialBattleState,
  drawCards,
  performOpeningMulligan,
  STARTING_HAND_SIZE,
  playOrRedeployUnit,
  performSwap,
  playEffectCard,
  resolveTargetedEffectCard,
  resolveTargetedUnitOnPlayEffect,
  resolveCombat,
  toggleFirstActor,
  resolveTurnCapWinner,
  resolveImmediateResourceExhaustionWinner,
  resolveImmediateNoProgressWinner,
  recordPassAction,
  completeActionOpportunity,
  MAX_TURNS,
} from '../src/systems/GameState.js';
import { readFileSync } from 'node:fs';
import { getFactionByKey, getFactionKeys } from '../src/data/factions/index.js';
import { buildActionCandidates, chooseBattleAction, recordBattleActionUse, selectOpeningMulliganCardIds } from '../src/systems/enemyDecision.js';

const DEFAULT_MATCH_COUNT = 100;
const DEFAULT_BASE_SEED = 1337;
const SHUFFLE_DECKS = true;
const FIRST_ACTOR_POLICY = 'random-initial-then-alternating';
const TIE_BREAK_POLICY = 'seeded-random';


function cloneCardData(value) {
  return JSON.parse(JSON.stringify(value));
}

function findCard(factions, factionKey, cardId) {
  return factions?.[factionKey]?.deck?.find((card) => card.id === cardId) ?? null;
}

function applyCrawlerIgnoreArmorBalanceLab(factions) {
  const lichencrawler = findCard(factions, 'Swarm', 'swarm_rusher_1');
  if (lichencrawler) {
    lichencrawler.attack = 2;
    lichencrawler.hp = 1;
    lichencrawler.armor = 0;
    lichencrawler.combatKeywords = ['ignoreArmor'];
    lichencrawler.textShort = 'This unit ignores [ARM].';
  }
}

function applyWardensMoveLockBalanceLab(factions) {
  const wardensBrace = findCard(factions, 'Wardens', 'wardens_brace_1');
  if (wardensBrace) {
    wardensBrace.targeting = 'none';
    wardensBrace.effectId = 'grave_call';
    wardensBrace.effectVariant = {
      baseEffectId: 'grave_call',
      timing: 'afterBaseEffectBeforeDiscard',
      sequence: [
        { operation: 'skipBaseEffect' },
        {
          operation: 'summonToken',
          selector: 'firstEmptyOwnerSlot',
          token: 'bone_shields',
          temporary: true,
          tokenStats: { atk: 0, arm: 0, hp: 1 },
        },
      ],
    };
  }

  const reinforceLine = findCard(factions, 'Wardens', 'wardens_reinforce_line_1');
  if (reinforceLine) {
    reinforceLine.targeting = 'none';
    reinforceLine.effectId = 'friendly_immovable_this_turn';
    reinforceLine.textShort = 'Allied units cannot move until combat.';
  }

  const lichencrawler = findCard(factions, 'Swarm', 'swarm_rusher_1');
  if (lichencrawler) {
    lichencrawler.attack = 2;
    lichencrawler.hp = 1;
    lichencrawler.armor = 0;
    lichencrawler.combatKeywords = ['ignoreArmor'];
    lichencrawler.textShort = 'This unit ignores [ARM].';
  }

  const grunt = findCard(factions, 'Swarm', 'swarm_grunt_1');
  if (grunt) grunt.hp = 2;
}


function loadProductionFactions() {
  return Object.fromEntries(getFactionKeys().map((factionKey) => [factionKey, cloneCardData(getFactionByKey(factionKey))]));
}

function createValidationContext(productionFactions) {
  const productionIds = new Set();
  const cardIds = new Set();
  const effectIds = new Set([null, 'decay_attack_after_combat', 'atk_plus_per_other_ally', 'swap_any_two_friendly_units_buff_both_atk_1', 'swap_any_two_friendly_units', 'lane_empty_bonus_damage_1']);
  const targetingValues = new Set();
  const combatKeywords = new Set();
  const implementedConcreteEffectIds = new Set(['enemy_atk_to_0_until_combat']);
  Object.entries(productionFactions).forEach(([factionKey, faction]) => {
    productionIds.add(factionKey);
    productionIds.add(faction.id);
    faction.deck?.forEach((card) => {
      cardIds.add(card.id);
      if ('effectId' in card) effectIds.add(card.effectId ?? null);
      if (typeof card.targeting === 'string') targetingValues.add(card.targeting);
      card.combatKeywords?.forEach((keyword) => combatKeywords.add(keyword));
    });
  });
  implementedConcreteEffectIds.forEach((effectId) => effectIds.add(effectId));
  return { productionIds, cardIds, effectIds, targetingValues, combatKeywords };
}

function validationError(message) {
  return new Error(`Invalid customFactions experiment: ${message}`);
}

function validateRequiredString(value, path) {
  if (typeof value !== 'string' || value.trim() === '') throw validationError(`${path} is required and must be a non-empty string`);
}

function validateCustomFactionCard(card, faction, index, context, seenCardIds, seenCardNumbers) {
  const path = `customFactions[${faction.id}].deck[${index}]`;
  if (!card || typeof card !== 'object' || Array.isArray(card)) throw validationError(`${path} must be an object`);
  validateRequiredString(card.id, `${path}.id`);
  if (context.cardIds.has(card.id) || seenCardIds.has(card.id)) throw validationError(`${path}.id '${card.id}' must be globally unique`);
  seenCardIds.add(card.id);
  validateRequiredString(card.name, `${path}.name`);
  validateRequiredString(card.type, `${path}.type`);
  if (!Number.isInteger(card.cardNumber)) throw validationError(`${path}.cardNumber is required and must be an integer`);
  if (card.cardNumber < 1 || card.cardNumber > 10) throw validationError(`${path}.cardNumber must be in the range 1-10`);
  if (seenCardNumbers.has(card.cardNumber)) throw validationError(`${path}.cardNumber ${card.cardNumber} is duplicated`);
  seenCardNumbers.add(card.cardNumber);
  if (typeof card.targeting !== 'string' || !context.targetingValues.has(card.targeting)) throw validationError(`${path}.targeting '${card.targeting}' is unsupported`);
  if (!('effectId' in card)) throw validationError(`${path}.effectId is required (use null for no effect)`);
  if (!context.effectIds.has(card.effectId ?? null)) throw validationError(`${path}.effectId '${card.effectId}' is unsupported`);
  if (card.type === 'unit') {
    for (const stat of ['attack', 'hp', 'armor']) {
      if (!Number.isFinite(card[stat])) throw validationError(`${path}.${stat} is required for unit cards`);
    }
  }
  if (card.combatKeywords !== undefined) {
    if (!Array.isArray(card.combatKeywords)) throw validationError(`${path}.combatKeywords must be an array when present`);
    card.combatKeywords.forEach((keyword) => {
      if (typeof keyword !== 'string' || !context.combatKeywords.has(keyword)) throw validationError(`${path}.combatKeywords '${keyword}' is unsupported`);
    });
  }
}

function validateAndAppendCustomFactions(factions, customFactions = []) {
  if (customFactions === undefined) return [];
  if (!Array.isArray(customFactions)) throw validationError('customFactions must be an array');
  const context = createValidationContext(factions);
  const customIds = new Set();
  const appended = [];
  customFactions.forEach((faction, index) => {
    if (!faction || typeof faction !== 'object' || Array.isArray(faction)) throw validationError(`customFactions[${index}] must be an object`);
    validateRequiredString(faction.id, `customFactions[${index}].id`);
    validateRequiredString(faction.name, `customFactions[${index}].name`);
    if (context.productionIds.has(faction.id)) throw validationError(`custom faction id '${faction.id}' collides with a production faction id`);
    if (customIds.has(faction.id)) throw validationError(`duplicate custom faction id '${faction.id}'`);
    customIds.add(faction.id);
    if (!Array.isArray(faction.deck) || faction.deck.length !== 10) throw validationError(`custom faction '${faction.id}' deck must contain exactly 10 cards`);
    const seenCardIds = new Set();
    const seenCardNumbers = new Set();
    faction.deck.forEach((card, cardIndex) => validateCustomFactionCard(card, faction, cardIndex, context, seenCardIds, seenCardNumbers));
    for (let cardNumber = 1; cardNumber <= 10; cardNumber += 1) {
      if (!seenCardNumbers.has(cardNumber)) throw validationError(`custom faction '${faction.id}' cardNumber values must cover 1-10`);
    }
    const key = faction.id;
    factions[key] = cloneCardData({ frameImage: 'frame_default', ...faction });
    appended.push({ key, id: faction.id, name: faction.name, deck: faction.deck.map((card) => ({ id: card.id, name: card.name })) });
  });
  return appended;
}

function loadExperiment(path) {
  if (!path) return null;
  const experiment = JSON.parse(readFileSync(path, 'utf8'));
  if (!experiment || typeof experiment !== 'object' || Array.isArray(experiment)) throw validationError('experiment JSON root must be an object');
  return experiment;
}

function applyExperimentChanges(factions, experiment) {
  const changes = experiment?.changes;
  if (!Array.isArray(changes)) return;
  changes.forEach((change, index) => {
    if (change?.type !== 'replaceCard') throw validationError(`changes[${index}].type '${change?.type}' is unsupported by the simulator runner`);
    const factionKey = change.factionKey ?? change.faction ?? change.factionId;
    const cardId = change.cardId ?? change.replaceCardId;
    const replacement = change.card ?? change.replacement;
    const deck = factions[factionKey]?.deck;
    if (!deck) throw validationError(`changes[${index}] faction '${factionKey}' was not found`);
    const cardIndex = deck.findIndex((card) => card.id === cardId);
    if (cardIndex < 0) throw validationError(`changes[${index}] card '${cardId}' was not found in '${factionKey}'`);
    deck[cardIndex] = cloneCardData(replacement);
  });
}

function loadFactions(balanceLabId = null, experiment = null) {
  const factions = loadProductionFactions();
  if (balanceLabId === 'crawler-ignorearmor') applyCrawlerIgnoreArmorBalanceLab(factions);
  if (balanceLabId === 'wardens-movelock') applyWardensMoveLockBalanceLab(factions);
  applyExperimentChanges(factions, experiment);
  const customFactions = validateAndAppendCustomFactions(factions, experiment?.customFactions);
  return { factions, customFactions, productionFactionCount: getFactionKeys().length };
}


function buildEffectVariantRegistryForFactions(factions, balanceLabId = null) {
  const registry = {};
  Object.values(factions).forEach((faction) => {
    faction.deck?.forEach((card) => {
      if (!card.effectVariant) return;
      const effectId = card.effectId;
      const registryKey = `${faction.id}::${card.id}::${effectId}`;
      registry[registryKey] = {
        variantId: `${balanceLabId ?? 'sim'}::${card.id}`,
        registryKey,
        baseEffectId: card.effectVariant.baseEffectId ?? effectId,
        timing: card.effectVariant.timing ?? 'afterBaseEffectBeforeDiscard',
        sequence: card.effectVariant.sequence,
      };
    });
  });
  return registry;
}

function createSeededRng(seedInput) {
  let state = (Number(seedInput) >>> 0) || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function buildGameSeed(baseSeed, playerKey, enemyKey, gameIndex) {
  return (baseSeed ^ hashString(playerKey) ^ Math.imul(hashString(enemyKey), 31) ^ Math.imul(gameIndex + 1, 2654435761)) >>> 0;
}

function shuffleDeck(deck, rng) {
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

function parseTelemetryModes(value) {
  if (!value) return new Set();
  const requested = value.split(',').map((entry) => entry.trim().toLowerCase()).filter(Boolean);
  const modes = new Set();
  requested.forEach((mode) => {
    if (mode === 'all') {
      modes.add('basic');
      modes.add('cards');
      modes.add('ai');
      modes.add('effectvariants');
      return;
    }
    if (mode === 'basic' || mode === 'cards' || mode === 'ai') modes.add(mode);
    if (mode === 'effectvariants') modes.add('effectvariants');
  });
  return modes;
}

function hasTelemetryMode(modes, mode) {
  return modes?.has?.(mode) ?? false;
}

function createSimulatorTelemetry() {
  return {
    factions: {},
    cards: {},
    effectVariantOperations: {},
    endings: {
      heroDefeated: 0,
      draw: 0,
      noProgress: 0,
      resourceExhaustion: 0,
      turnCap: 0,
      surrender: 0,
      other: 0,
    },
  };
}


function numberMetric(value) {
  return Number.isFinite(value) ? value : 0;
}

function skippedTargetCount(value) {
  if (Array.isArray(value)) return value.length;
  return numberMetric(value);
}

function getEffectVariantOperationTelemetryKey(entry) {
  return [
    entry?.variantId ?? 'unknown',
    entry?.registryKey ?? 'unknown',
    entry?.baseEffectControl ?? 'runBaseEffect',
    entry?.triggerType ?? 'afterBaseEffectBeforeDiscard',
    entry?.operation ?? 'unknown',
    entry?.selector ?? '',
    entry?.token ?? '',
    entry?.temporary === true ? 'temporary' : 'permanent',
    entry?.status ?? 'unknown',
  ].join('|');
}

function ensureEffectVariantOperationTelemetry(simTelemetry, entry) {
  const key = getEffectVariantOperationTelemetryKey(entry);
  simTelemetry.effectVariantOperations[key] ??= {
    variantId: entry?.variantId ?? 'unknown',
    registryKey: entry?.registryKey ?? 'unknown',
    baseEffectControl: entry?.baseEffectControl ?? 'runBaseEffect',
    triggerType: entry?.triggerType ?? 'afterBaseEffectBeforeDiscard',
    operation: entry?.operation ?? 'unknown',
    selector: entry?.selector ?? '',
    status: entry?.status ?? 'unknown',
    executions: 0,
    resolvedTargets: 0,
    skippedTargets: 0,
    damageDealt: 0,
    kills: 0,
    attackAdded: 0,
    attackReduced: 0,
    armorAdded: 0,
    armorReduced: 0,
    hpAdded: 0,
    baseDamageDealt: 0,
    enemyBaseDamage: 0,
    playerBaseDamage: 0,
    cardsDrawn: 0,
    failedDraws: 0,
    skippedDraws: 0,
    tokensSummoned: 0,
    skippedSummons: 0,
    token: entry?.token ?? '',
    temporary: entry?.temporary === true,
    summonedTokenStats: entry?.summonedTokenStats ?? null,
  };
  return simTelemetry.effectVariantOperations[key];
}

function recordEffectVariantOperationTelemetry(simTelemetry, entries) {
  if (!simTelemetry || !Array.isArray(entries)) return;
  entries.forEach((entry) => {
    if (!entry) return;
    const row = ensureEffectVariantOperationTelemetry(simTelemetry, entry);
    const damageDealt = numberMetric(entry.damageDealt);
    row.executions += 1;
    row.resolvedTargets += numberMetric(entry.targetsResolved);
    row.skippedTargets += skippedTargetCount(entry.skippedTargets);
    row.damageDealt += damageDealt;
    row.kills += numberMetric(entry.kills);
    row.attackAdded += numberMetric(entry.totalAttackAdded);
    row.attackReduced += numberMetric(entry.totalAttackReduced);
    row.armorAdded += numberMetric(entry.totalArmorAdded);
    row.armorReduced += numberMetric(entry.totalArmorReduced);
    row.hpAdded += numberMetric(entry.totalHpAdded);
    row.cardsDrawn += numberMetric(entry.cardsDrawn);
    row.failedDraws += numberMetric(entry.failedDraws);
    row.skippedDraws += numberMetric(entry.skippedDraws);
    row.tokensSummoned += numberMetric(entry.tokensSummoned);
    row.skippedSummons += numberMetric(entry.skippedSummons);
    if (entry.token) row.token = entry.token;
    if (entry.temporary === true) row.temporary = true;
    if (entry.summonedTokenStats) row.summonedTokenStats = entry.summonedTokenStats;
    if (entry.operation === 'damageEnemyBase' || entry.operation === 'damagePlayerBase') {
      row.baseDamageDealt += damageDealt;
      if (entry.baseDamaged === 'enemyHP') row.enemyBaseDamage += damageDealt;
      if (entry.baseDamaged === 'playerHP') row.playerBaseDamage += damageDealt;
    }
  });
}

function ensureFactionTelemetry(simTelemetry, faction) {
  simTelemetry.factions[faction] ??= {
    games: 0,
    wins: 0,
    draws: 0,
    turns: 0,
    passes: 0,
    actions: 0,
    actionMix: { unit: 0, effect: 0, targeted: 0, swap: 0, pass: 0 },
    defeats: 0,
    handAtDefeat: 0,
  };
  return simTelemetry.factions[faction];
}

function getCardTelemetryKey(faction, card) {
  return `${faction}|${card?.id ?? 'unknown'}`;
}

function ensureCardTelemetry(simTelemetry, faction, card) {
  const key = getCardTelemetryKey(faction, card);
  simTelemetry.cards[key] ??= {
    faction,
    cardId: card?.id ?? 'unknown',
    cardName: card?.name ?? card?.id ?? 'Unknown',
    isToken: card?.isToken === true,
    collectible: card?.collectible,
    tokenType: card?.tokenType,
    drawn: 0,
    played: 0,
    heldAtDefeat: 0,
    deathsTotal: 0,
    deathsInCombat: 0,
    deathsNonCombat: 0,
    turnPlayedTotal: 0,
    drawnGames: 0,
    drawnWins: 0,
    drawnLosses: 0,
    notDrawnGames: 0,
    notDrawnWins: 0,
    notDrawnLosses: 0,
    playedGames: 0,
    playedWins: 0,
    playedLosses: 0,
    notPlayedGames: 0,
    notPlayedWins: 0,
    notPlayedLosses: 0,
  };
  return simTelemetry.cards[key];
}

function createCardGameTelemetrySide(factionName, cards) {
  const side = { faction: factionName ?? 'Unknown', cards: new Map(), drawn: new Set(), played: new Set() };
  cards.forEach((card) => {
    const key = card?.id ?? 'unknown';
    side.cards.set(key, card);
  });
  return side;
}

function createCardGameTelemetry(state) {
  return {
    player: createCardGameTelemetrySide(state.player.factionName, state.player.deck),
    enemy: createCardGameTelemetrySide(state.enemy.factionName, state.enemy.deck),
  };
}

function rememberGameCard(gameCardTelemetry, side, card, status) {
  if (!gameCardTelemetry || !side || !card) return;
  const key = card?.id ?? 'unknown';
  gameCardTelemetry.cards.set(key, card);
  gameCardTelemetry[status]?.add(key);
}

function countCards(cards) {
  const counts = new Map();
  cards.forEach((card) => {
    const key = card?.id ?? 'unknown';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return counts;
}

function recordDrawTelemetry(simTelemetry, side, beforeDeck, gameCardTelemetry = null) {
  if (!simTelemetry || !side) return;
  const beforeCards = beforeDeck ?? [];
  const afterCounts = countCards(side.deck ?? []);
  beforeCards.forEach((card) => {
    const key = card?.id ?? 'unknown';
    const remaining = afterCounts.get(key) ?? 0;
    if (remaining > 0) {
      afterCounts.set(key, remaining - 1);
      return;
    }
    ensureCardTelemetry(simTelemetry, side.factionName ?? 'Unknown', card).drawn += 1;
    rememberGameCard(gameCardTelemetry, side, card, 'drawn');
  });
}

function recordActionTelemetry(simTelemetry, state, owner, action, result = null, gameCardTelemetry = null) {
  if (!simTelemetry || !state || !action) return;
  const faction = state?.[owner]?.factionName ?? owner;
  const row = ensureFactionTelemetry(simTelemetry, faction);
  row.actions += 1;
  if (action.type === 'pass') {
    row.passes += 1;
    row.actionMix.pass += 1;
    return;
  }
  if (action.type === 'play-unit') row.actionMix.unit += 1;
  else if (action.type === 'play-effect') row.actionMix.effect += 1;
  else if (action.type === 'play-targeted-effect') row.actionMix.targeted += 1;
  else if (action.type === 'swap-units') row.actionMix.swap += 1;

  if (result?.ok && result.card) {
    const cardRow = ensureCardTelemetry(simTelemetry, faction, result.card);
    cardRow.played += 1;
    cardRow.turnPlayedTotal += (state.turnsCompleted ?? 0) + 1;
    rememberGameCard(gameCardTelemetry, state?.[owner], result.card, 'played');
  }
}

function recordCardOutcomeTelemetryForSide(simTelemetry, sideGameTelemetry, winner, sideOwner) {
  if (!simTelemetry || !sideGameTelemetry) return;
  const won = winner === sideOwner;
  const lost = winner !== 'draw' && winner !== sideOwner;
  sideGameTelemetry.cards.forEach((card, cardId) => {
    const row = ensureCardTelemetry(simTelemetry, sideGameTelemetry.faction, card);
    const wasDrawn = sideGameTelemetry.drawn.has(cardId);
    const wasPlayed = sideGameTelemetry.played.has(cardId);
    const drawPrefix = wasDrawn ? 'drawn' : 'notDrawn';
    const playPrefix = wasPlayed ? 'played' : 'notPlayed';
    row[`${drawPrefix}Games`] += 1;
    row[`${playPrefix}Games`] += 1;
    if (won) {
      row[`${drawPrefix}Wins`] += 1;
      row[`${playPrefix}Wins`] += 1;
    }
    if (lost) {
      row[`${drawPrefix}Losses`] += 1;
      row[`${playPrefix}Losses`] += 1;
    }
  });
}


function recordDeathTelemetryForSide(simTelemetry, faction, fallen) {
  if (!simTelemetry || !Array.isArray(fallen)) return;
  fallen.forEach((entry) => {
    const card = entry?.card;
    if (!card) return;
    const row = ensureCardTelemetry(simTelemetry, faction, card);
    row.deathsTotal += 1;
    if (entry.reason === 'combat-death' || entry.combat === true) row.deathsInCombat += 1;
    else if (entry.reason === 'damage-death' || entry.reason === 'destroy') row.deathsNonCombat += 1;
  });
}

function classifyEnding(result) {
  if (result.endingReason === 'turn-cap') return 'turnCap';
  if (result.endingReason === 'resource_exhaustion') return 'resourceExhaustion';
  if (result.endingReason === 'no-progress-deadlock') return 'noProgress';
  if (result.endingReason === 'ai_safe_surrender' || result.endingReason === 'player_hold_surrender') return 'surrender';
  if (result.winner === 'draw') return 'draw';
  if (result.heroDeathResolution) return 'heroDefeated';
  return 'other';
}

function recordGameEndTelemetry(simTelemetry, result) {
  if (!simTelemetry || !result) return;
  const playerRow = ensureFactionTelemetry(simTelemetry, result.playerFaction);
  const enemyRow = ensureFactionTelemetry(simTelemetry, result.enemyFaction);
  playerRow.games += 1;
  enemyRow.games += 1;
  playerRow.turns += result.turns;
  enemyRow.turns += result.turns;
  if (result.winner === 'player') playerRow.wins += 1;
  if (result.winner === 'enemy') enemyRow.wins += 1;
  if (result.winner === 'draw') {
    playerRow.draws += 1;
    enemyRow.draws += 1;
  }

  recordCardOutcomeTelemetryForSide(simTelemetry, result.cardGameTelemetry?.player, result.winner, 'player');
  recordCardOutcomeTelemetryForSide(simTelemetry, result.cardGameTelemetry?.enemy, result.winner, 'enemy');
  recordDeathTelemetryForSide(simTelemetry, result.playerFaction, result.playerFallenAtEnd);
  recordDeathTelemetryForSide(simTelemetry, result.enemyFaction, result.enemyFallenAtEnd);

  const ending = classifyEnding(result);
  simTelemetry.endings[ending] = (simTelemetry.endings[ending] ?? 0) + 1;

  const defeatedOwner = result.winner === 'player' ? 'enemy' : (result.winner === 'enemy' ? 'player' : null);
  if (!defeatedOwner) return;
  const defeatedFaction = defeatedOwner === 'player' ? result.playerFaction : result.enemyFaction;
  const defeatedHand = defeatedOwner === 'player' ? result.playerHandAtEnd : result.enemyHandAtEnd;
  const defeatedRow = ensureFactionTelemetry(simTelemetry, defeatedFaction);
  defeatedRow.defeats += 1;
  defeatedRow.handAtDefeat += defeatedHand.length;
  defeatedHand.forEach((card) => {
    ensureCardTelemetry(simTelemetry, defeatedFaction, card).heldAtDefeat += 1;
  });
}

function recordMulliganTelemetry(telemetry, factionName, replaced) {
  telemetry.mulliganByFaction ??= {};
  telemetry.mulliganByFaction[factionName] ??= { games: 0, used: 0, cardsReplaced: 0 };
  const row = telemetry.mulliganByFaction[factionName];
  row.games += 1;
  if (replaced > 0) row.used += 1;
  row.cardsReplaced += replaced;
}

function createHandLockAnalysis() {
  return {
    opportunities: { player: 0, enemy: 0, total: 0 },
    fullHand: { player: 0, enemy: 0, total: 0 },
    burnEligible: { player: 0, enemy: 0, total: 0, deckTotal: 0, deckMin: Infinity, deckMax: 0 },
    trueLocks: { player: 0, enemy: 0, total: 0 },
    factions: {},
    cards: {},
    examples: [],
    streaks: {
      player: { current: 0, total: 0, count: 0, longest: 0 },
      enemy: { current: 0, total: 0, count: 0, longest: 0 },
    },
  };
}

function ensureHandLockFactionRow(analysis, faction) {
  analysis.factions[faction] ??= {
    faction,
    opportunities: 0,
    fullHand: 0,
    burnEligible: 0,
    trueLocks: 0,
  };
  return analysis.factions[faction];
}

function finishHandLockStreak(streak) {
  if (!streak || streak.current <= 0) return;
  streak.total += streak.current;
  streak.count += 1;
  streak.longest = Math.max(streak.longest, streak.current);
  streak.current = 0;
}

function recordHandLockStreak(analysis, owner, isTrueLock) {
  const streak = analysis?.streaks?.[owner];
  if (!streak) return;
  if (isTrueLock) {
    streak.current += 1;
    streak.longest = Math.max(streak.longest, streak.current);
    return;
  }
  finishHandLockStreak(streak);
}

function getHandLockActionSummary(actions) {
  const nonPassActions = actions.filter((action) => action?.type !== 'pass');
  return {
    canPlay: nonPassActions.some((action) => action.type === 'play-unit' && action.placementType !== 'redeploy')
      || nonPassActions.some((action) => action.type === 'play-effect' || action.type === 'play-targeted-effect'),
    canRedeploy: nonPassActions.some((action) => action.type === 'play-unit' && action.placementType === 'redeploy'),
    canSwap: nonPassActions.some((action) => action.type === 'swap-units'),
    canPass: actions.some((action) => action?.type === 'pass'),
    nonPassActions,
  };
}

function getHandLockCardKey(faction, card) {
  return `${faction}|${card?.id ?? 'unknown'}`;
}

function recordTrueLockCards(analysis, faction, hand) {
  hand.forEach((card) => {
    const key = getHandLockCardKey(faction, card);
    analysis.cards[key] ??= {
      faction,
      cardId: card?.id ?? 'unknown',
      cardName: card?.name ?? card?.id ?? 'Unknown',
      count: 0,
    };
    analysis.cards[key].count += 1;
  });
}

function recordHandLockExample(analysis, state, owner, context, actionSummary, burnEligible) {
  if (analysis.examples.length >= 5) return;
  const side = state?.[owner];
  analysis.examples.push({
    turn: context?.turn ?? ((state?.turnsCompleted ?? 0) + 1),
    side: owner,
    faction: side?.factionName ?? owner,
    matchup: `${context?.playerFaction ?? state?.player?.factionName ?? 'player'} vs ${context?.enemyFaction ?? state?.enemy?.factionName ?? 'enemy'}`,
    hand: side?.hand?.length ?? 0,
    deck: side?.deck?.length ?? 0,
    canPlay: actionSummary.canPlay,
    canRedeploy: actionSummary.canRedeploy,
    canSwap: actionSummary.canSwap,
    canPass: actionSummary.canPass,
    burnEligible,
  });
}

function recordHandLockOpportunity(analysis, state, owner, context = null) {
  if (!analysis || !state || state.winner || (owner !== 'player' && owner !== 'enemy')) return;
  const side = state[owner];
  if (!side) return;
  const faction = side.factionName ?? owner;
  const handLength = side.hand?.length ?? 0;
  const maxHandSize = Number.isFinite(side.maxHandSize) ? side.maxHandSize : 5;
  const deckLength = side.deck?.length ?? 0;
  const isFullHand = handLength === maxHandSize;
  const isBurnEligible = isFullHand && deckLength > 0 && !state.winner;
  const actions = buildActionCandidates(state, owner, side.hand ?? [], null);
  const actionSummary = getHandLockActionSummary(actions);
  const isTrueLock = isBurnEligible && actionSummary.canPass && actionSummary.nonPassActions.length === 0;
  const factionRow = ensureHandLockFactionRow(analysis, faction);

  analysis.opportunities[owner] += 1;
  analysis.opportunities.total += 1;
  factionRow.opportunities += 1;

  if (isFullHand) {
    analysis.fullHand[owner] += 1;
    analysis.fullHand.total += 1;
    factionRow.fullHand += 1;
  }

  if (isBurnEligible) {
    analysis.burnEligible[owner] += 1;
    analysis.burnEligible.total += 1;
    analysis.burnEligible.deckTotal += deckLength;
    analysis.burnEligible.deckMin = Math.min(analysis.burnEligible.deckMin, deckLength);
    analysis.burnEligible.deckMax = Math.max(analysis.burnEligible.deckMax, deckLength);
    factionRow.burnEligible += 1;
  }

  if (isTrueLock) {
    analysis.trueLocks[owner] += 1;
    analysis.trueLocks.total += 1;
    factionRow.trueLocks += 1;
    recordTrueLockCards(analysis, faction, side.hand ?? []);
    recordHandLockExample(analysis, state, owner, context, actionSummary, isBurnEligible);
  }

  recordHandLockStreak(analysis, owner, isTrueLock);
}

function applyAiOpeningMulligan(state, owner, randomFn, telemetry, simTelemetry = null, gameCardTelemetry = null) {
  const side = owner === 'player' ? state.player : state.enemy;
  const selectedIds = selectOpeningMulliganCardIds(side);
  const deckBeforeMulligan = [...(side.deck ?? [])];
  const result = performOpeningMulligan(state, owner, selectedIds, randomFn);
  if (!result.ok) {
    telemetry.invalidActions = (telemetry.invalidActions ?? 0) + 1;
    return;
  }
  recordDrawTelemetry(simTelemetry, side, deckBeforeMulligan, gameCardTelemetry?.[owner]);
  recordMulliganTelemetry(telemetry, side.factionName ?? 'Unknown', result.replaced);
}

function applyAction(state, owner, passStats, decisionOptions, telemetry, simTelemetry, gameCardTelemetry = null, handLockAnalysis = null, opportunityContext = null) {
  recordHandLockOpportunity(handLockAnalysis, state, owner, opportunityContext);
  const action = chooseBattleAction(state, owner, { ...decisionOptions, telemetry });
  const cancelKey = owner === 'enemy' ? 'player' : 'enemy';
  const nonUnit = action.type === 'play-effect' || action.type === 'play-targeted-effect';
  if (action.type === 'pass') {
    passStats.pass = (passStats.pass ?? 0) + 1;
    const factionName = state?.[owner]?.factionName ?? owner;
    passStats.byFaction ??= {};
    passStats.byFaction[factionName] = (passStats.byFaction[factionName] ?? 0) + 1;
    recordPassAction(state, owner);
    recordActionTelemetry(simTelemetry, state, owner, action);
    return;
  }
  if (state.cancelEnemyOrderThisTurn?.[cancelKey] && nonUnit) {
    state.cancelEnemyOrderThisTurn[cancelKey] = false;
    completeActionOpportunity(state, owner);
    passStats.cancelled = (passStats.cancelled ?? 0) + 1;
    return;
  }
  const deckBeforeAction = [...(state?.[owner]?.deck ?? [])];
  let result = { ok: true };
  if (action.type === 'play-unit') {
    result = playOrRedeployUnit(state, owner, action.cardId, action.slotIndex);
    if (result.ok && Array.isArray(action.targetIndexes) && action.effectId === 'swap_two_enemy_units') {
      const playResult = result;
      result = resolveTargetedUnitOnPlayEffect(state, owner, action.slotIndex, action.targetIndexes);
      if (result.ok && !result.card) result.card = playResult.card;
    }
  }
  if (action.type === 'swap-units') result = performSwap(state, owner, action.fromIndex, action.toIndex);
  if (action.type === 'play-effect') {
    result = playEffectCard(state, owner, action.cardId);
    if (state.cancelEnemyOrderThisTurn) state.cancelEnemyOrderThisTurn[cancelKey] = false;
  }
  if (action.type === 'play-targeted-effect') {
    result = resolveTargetedEffectCard(
      state,
      owner,
      action.cardId,
      action.targetIndex,
      action.targetIndexes ?? [action.targetIndex],
    );
    if (state.cancelEnemyOrderThisTurn) state.cancelEnemyOrderThisTurn[cancelKey] = false;
  }
  if (!result.ok) {
    telemetry.invalidActions = (telemetry.invalidActions ?? 0) + 1;
    return;
  }
  recordDrawTelemetry(simTelemetry, state?.[owner], deckBeforeAction, gameCardTelemetry?.[owner]);
  recordActionTelemetry(simTelemetry, state, owner, action, result, gameCardTelemetry?.[owner]);
  if (result.card?.id === 'aggro_quick_fix_1') {
    telemetry.quickFixUses = (telemetry.quickFixUses ?? 0) + 1;
  }
  if (result.card?.id === 'aggro_berserker_1') {
    telemetry.berserkerUses = (telemetry.berserkerUses ?? 0) + 1;
  }
  if (result.card?.id === 'attrition_swarm_funeral_pyre_1') {
    telemetry.funeralPyreUses = (telemetry.funeralPyreUses ?? 0) + 1;
  }
  if (result.card?.id === 'control_system_override_1') {
    telemetry.systemOverrideUses = (telemetry.systemOverrideUses ?? 0) + 1;
  }
  if (result.card?.id === 'wardens_reinforce_line_1') {
    telemetry.reinforceLineUses = (telemetry.reinforceLineUses ?? 0) + 1;
  }
  if (result.card?.effectId === 'friendly_immovable_this_turn') {
    telemetry.friendlyImmovableUses = (telemetry.friendlyImmovableUses ?? 0) + 1;
  }
  recordBattleActionUse(state, owner, action, telemetry);
}


function runSingleGame(playerFaction, enemyFaction, passStats, telemetry, simTelemetry, gameSeed, gameIndex, playerKey, enemyKey, effectVariantRegistry = null, handLockAnalysis = null) {
  const gameRng = createSeededRng(gameSeed);
  const state = createInitialBattleState(playerFaction, enemyFaction, { randomFn: gameRng });
  if (effectVariantRegistry) state.effectVariantRegistry = effectVariantRegistry;

  if (SHUFFLE_DECKS) {
    shuffleDeck(state.player.deck, gameRng);
    shuffleDeck(state.enemy.deck, gameRng);
  }

  const cardGameTelemetry = createCardGameTelemetry(state);

  const initialPlayerDeck = [...state.player.deck];
  const initialEnemyDeck = [...state.enemy.deck];
  drawCards(state.player, STARTING_HAND_SIZE);
  drawCards(state.enemy, STARTING_HAND_SIZE);
  recordDrawTelemetry(simTelemetry, state.player, initialPlayerDeck, cardGameTelemetry.player);
  recordDrawTelemetry(simTelemetry, state.enemy, initialEnemyDeck, cardGameTelemetry.enemy);
  applyAiOpeningMulligan(state, 'player', gameRng, telemetry, simTelemetry, cardGameTelemetry);
  applyAiOpeningMulligan(state, 'enemy', gameRng, telemetry, simTelemetry, cardGameTelemetry);
  let turns = 0;

  const initialFirstActor = state.firstActor;

  while (!state.winner && turns < MAX_TURNS) {
    resolveImmediateResourceExhaustionWinner(state);
    resolveImmediateNoProgressWinner(state);
    if (state.winner) break;

    const decisionContext = `${playerKey}|${enemyKey}|${gameIndex}|${turns}`;
    const decisionSeed = buildGameSeed(gameSeed, decisionContext, state.firstActor, turns + 7);
    const turnRng = createSeededRng(decisionSeed);
    const firstDecisionOptions = { randomFn: turnRng, tieBreakPolicy: TIE_BREAK_POLICY };
    const secondDecisionOptions = { randomFn: turnRng, tieBreakPolicy: TIE_BREAK_POLICY };

    const firstActor = state.firstActor;
    const secondActor = firstActor === 'player' ? 'enemy' : 'player';

    applyAction(state, firstActor, passStats, firstDecisionOptions, telemetry, simTelemetry, cardGameTelemetry, handLockAnalysis, { turn: turns + 1, actingOrder: 'first', playerFaction: playerKey, enemyFaction: enemyKey, gameIndex });
    applyAction(state, secondActor, passStats, secondDecisionOptions, telemetry, simTelemetry, cardGameTelemetry, handLockAnalysis, { turn: turns + 1, actingOrder: 'second', playerFaction: playerKey, enemyFaction: enemyKey, gameIndex });
    const playerDeckBeforeCombat = [...state.player.deck];
    const enemyDeckBeforeCombat = [...state.enemy.deck];
    resolveCombat(state);
    recordDrawTelemetry(simTelemetry, state.player, playerDeckBeforeCombat, cardGameTelemetry.player);
    recordDrawTelemetry(simTelemetry, state.enemy, enemyDeckBeforeCombat, cardGameTelemetry.enemy);
    turns += 1;
    state.turnsCompleted = turns;
    resolveImmediateResourceExhaustionWinner(state);
    resolveImmediateNoProgressWinner(state);
    if (state.winner) break;
    const playerDeckBeforeTurnDraw = [...state.player.deck];
    const enemyDeckBeforeTurnDraw = [...state.enemy.deck];
    drawCards(state.player, 1);
    drawCards(state.enemy, 1);
    resolveImmediateResourceExhaustionWinner(state);
    resolveImmediateNoProgressWinner(state);
    resolveTurnCapWinner(state, turns);
    recordDrawTelemetry(simTelemetry, state.player, playerDeckBeforeTurnDraw, cardGameTelemetry.player);
    recordDrawTelemetry(simTelemetry, state.enemy, enemyDeckBeforeTurnDraw, cardGameTelemetry.enemy);
    if (!state.winner) toggleFirstActor(state);
  }
  return {
    winner: state.winner ?? 'draw',
    playerFaction: playerKey,
    enemyFaction: enemyKey,
    turns,
    playerHP: state.playerHP,
    enemyHP: state.enemyHP,
    firstActor: initialFirstActor,
    endingReason: state.endingReason,
    turnCapResolvedBy: state.turnCapResolvedBy,
    heroDeathResolution: state.heroDeathResolution,
    playerHandAtEnd: [...state.player.hand],
    enemyHandAtEnd: [...state.enemy.hand],
    playerFallenAtEnd: [...state.player.fallen],
    enemyFallenAtEnd: [...state.enemy.fallen],
    quickFixTempoDraws: state.quickFixTempoDraws ?? 0,
    defensiveFrictionApplications: state.wardenDefensiveFrictionApplications ?? 0,
    funeralPyreCombatTriggers: state.funeralPyreCombatTriggers ?? 0,
    funeralPyreLaneDamageTriggers: state.funeralPyreLaneDamageTriggers ?? 0,
    combatOnlyDeathHeroTriggers: state.combatOnlyDeathHeroTriggers ?? 0,
    combatOnlyDeathLaneDamageTriggers: state.combatOnlyDeathLaneDamageTriggers ?? 0,
    combatOnlyDeathSummons: state.combatOnlyDeathSummons ?? 0,
    leechCombatHeals: state.leechCombatHeals ?? 0,
    rotcallerCombatTriggers: state.rotcallerCombatTriggers ?? 0,
    overflowCombatTriggers: state.overflowCombatTriggers ?? 0,
    overflowCombatDamage: state.overflowCombatDamage ?? 0,
    overflowCombatTriggersByCardId: { ...(state.overflowCombatTriggersByCardId ?? {}) },
    overflowCombatDamageByCardId: { ...(state.overflowCombatDamageByCardId ?? {}) },
    effectVariantOperationTelemetry: [...(state.effectVariantOperationTelemetry ?? [])],
    cardGameTelemetry,
  };
}

const percentValue = (count, total) => (total > 0 ? (count / total) * 100 : 0);
const percent = (count, total) => percentValue(count, total).toFixed(1);
const avgValue = (value, count) => (count > 0 ? value / count : 0);
const avg = (value, count) => avgValue(value, count).toFixed(2);
const pct = (value) => `${value.toFixed(1)}%`;
const percentagePoints = (value) => `${value >= 0 ? '+' : ''}${value.toFixed(1)} pp`;

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function isGeneratedCardTelemetryRow(row) {
  const id = row?.cardId ?? '';
  return row?.isToken === true
    || row?.collectible === false
    || typeof row?.tokenType === 'string'
    || /(?:^|_)(?:grave_call_grunt|combat_death_grunt|summoned_grunt|effect_variant_grunt|flood_token)(?:_|$)/.test(id);
}

function cardImpactRow(row, factionBaselines = {}) {
  const wrWhenDrawn = percentValue(row.drawnWins, row.drawnGames);
  const wrWhenNotDrawn = percentValue(row.notDrawnWins, row.notDrawnGames);
  const wrWhenPlayed = percentValue(row.playedWins, row.playedGames);
  const wrWhenNotPlayed = percentValue(row.notPlayedWins, row.notPlayedGames);
  const playRate = row.drawn > 0 ? row.played / row.drawn : 0;
  const heldRate = row.drawn > 0 ? row.heldAtDefeat / row.drawn : 0;
  const drawFrequency = row.drawnGames > 0 ? Math.min(1, row.drawn / row.drawnGames) : 0;
  const factionBaseline = factionBaselines[row.faction] ?? 50;
  const drawImpact = wrWhenDrawn - wrWhenNotDrawn;
  const playImpact = wrWhenPlayed - wrWhenNotPlayed;
  const isDeckCard = row.drawnGames > 0 || row.notDrawnGames > 0 || row.drawn > 0;
  const deadCardScore = isDeckCard
    ? clampScore((drawFrequency * 25) + ((1 - playRate) * 35) + (heldRate * 30) + Math.max(0, factionBaseline - wrWhenDrawn) * 0.4 + Math.max(0, -playImpact) * 0.3)
    : 0;
  const playedWinShare = row.played > 0 ? row.playedWins / row.played : 0;
  const carryScore = isDeckCard
    ? clampScore((playRate * 25) + (playedWinShare * 25) + Math.max(0, wrWhenPlayed - factionBaseline) * 0.8 + Math.max(0, playImpact) * 0.5)
    : 0;
  return {
    ...row,
    wrWhenDrawn,
    wrWhenNotDrawn,
    wrWhenPlayed,
    wrWhenNotPlayed,
    drawImpact,
    playImpact,
    deadCardScore,
    carryScore,
    factionBaseline,
    isDeckCard,
  };
}

function createStats() {
  return {
    games: 0,
    wins: 0,
    draws: 0,
    turnCaps: 0,
    totalTurns: 0,
    totalRemainingHP: 0,
  };
}

function addFactionGame(stats, won, wasDraw, wasTurnCap, turns, remainingHP) {
  stats.games += 1;
  if (won) stats.wins += 1;
  if (wasDraw) stats.draws += 1;
  if (wasTurnCap) stats.turnCaps += 1;
  stats.totalTurns += turns;
  stats.totalRemainingHP += remainingHP;
}

function getPairKey(factionA, factionB, factionOrder) {
  const indexA = factionOrder.get(factionA);
  const indexB = factionOrder.get(factionB);
  return indexA <= indexB ? `${factionA}|${factionB}` : `${factionB}|${factionA}`;
}

function ensurePairStats(pairStats, factionA, factionB) {
  const key = `${factionA}|${factionB}`;
  if (!pairStats.has(key)) {
    pairStats.set(key, {
      factionA,
      factionB,
      games: 0,
      factionAWins: 0,
      factionBWins: 0,
      draws: 0,
      turnCaps: 0,
      totalTurns: 0,
    });
  }
  return pairStats.get(key);
}


function printBasicSimulatorTelemetry(simTelemetry, factionKeys, totalGames) {
  console.log('\nSimulator telemetry: per-faction summary');
  console.table(factionKeys.map((key) => {
    const row = simTelemetry.factions[key] ?? ensureFactionTelemetry(simTelemetry, key);
    return {
      faction: key,
      games: row.games,
      WR: percent(row.wins, row.games),
      'non-draw WR': percent(row.wins, row.games - row.draws),
      'avg turns': avg(row.turns, row.games),
      'PASS count': row.passes,
      'PASS rate': `${percent(row.passes, row.actions)}%`,
      unit: row.actionMix.unit,
      effect: row.actionMix.effect,
      targeted: row.actionMix.targeted,
      swap: row.actionMix.swap,
      pass: row.actionMix.pass,
      'avg hand at defeat': avg(row.handAtDefeat, row.defeats),
    };
  }));

  console.log('\nSimulator telemetry: game-end summary');
  console.table([
    { ending: 'hero defeated', count: simTelemetry.endings.heroDefeated, rate: `${percent(simTelemetry.endings.heroDefeated, totalGames)}%` },
    { ending: 'draw', count: simTelemetry.endings.draw, rate: `${percent(simTelemetry.endings.draw, totalGames)}%` },
    { ending: 'no-progress', count: simTelemetry.endings.noProgress, rate: `${percent(simTelemetry.endings.noProgress, totalGames)}%` },
    { ending: 'resource exhaustion', count: simTelemetry.endings.resourceExhaustion, rate: `${percent(simTelemetry.endings.resourceExhaustion, totalGames)}%` },
    { ending: 'turn cap', count: simTelemetry.endings.turnCap, rate: `${percent(simTelemetry.endings.turnCap, totalGames)}%` },
    { ending: 'surrender', count: simTelemetry.endings.surrender, rate: `${percent(simTelemetry.endings.surrender, totalGames)}%` },
    { ending: 'other', count: simTelemetry.endings.other, rate: `${percent(simTelemetry.endings.other, totalGames)}%` },
  ]);
}

function printCardSimulatorTelemetry(simTelemetry) {
  console.log('\nSimulator telemetry: per-card summary');
  const factionBaselines = Object.fromEntries(Object.entries(simTelemetry.factions ?? {}).map(([faction, row]) => [faction, percentValue(row.wins, row.games - row.draws)]));
  const rows = Object.values(simTelemetry.cards)
    .sort((a, b) => a.faction.localeCompare(b.faction) || a.cardName.localeCompare(b.cardName))
    .map((row) => cardImpactRow(row, factionBaselines));
  console.table(rows.map((row) => ({
      faction: row.faction,
      card: row.cardName,
      id: row.cardId,
      drawn: row.drawn,
      played: row.played,
      'held at defeat': row.heldAtDefeat,
      deathsTotal: row.deathsTotal,
      deathsInCombat: row.deathsInCombat,
      deathsNonCombat: row.deathsNonCombat,
      'avg turn played': avg(row.turnPlayedTotal, row.played),
      drawnGames: row.drawnGames,
      drawnWins: row.drawnWins,
      drawnLosses: row.drawnLosses,
      'WR When Drawn': `${percent(row.drawnWins, row.drawnGames)}%`,
      notDrawnGames: row.notDrawnGames,
      notDrawnWins: row.notDrawnWins,
      notDrawnLosses: row.notDrawnLosses,
      'WR When Not Drawn': `${percent(row.notDrawnWins, row.notDrawnGames)}%`,
      playedGames: row.playedGames,
      playedWins: row.playedWins,
      playedLosses: row.playedLosses,
      'WR When Played': `${percent(row.playedWins, row.playedGames)}%`,
      notPlayedGames: row.notPlayedGames,
      notPlayedWins: row.notPlayedWins,
      notPlayedLosses: row.notPlayedLosses,
      'WR When Not Played': `${percent(row.notPlayedWins, row.notPlayedGames)}%`,
      'Draw Impact': percentagePoints(row.drawImpact),
      'Play Impact': percentagePoints(row.playImpact),
      'Dead Card Score': row.deadCardScore,
      'Carry Score': row.carryScore,
    })));

  const rank = (label, values) => {
    console.log(`\n${label}`);
    console.table(values.map((row) => ({
      faction: row.faction,
      card: row.cardName,
      id: row.cardId,
      'Draw Impact': percentagePoints(row.drawImpact),
      'Play Impact': percentagePoints(row.playImpact),
      'WR When Drawn': `${pct(row.wrWhenDrawn)}`,
      'WR When Played': `${pct(row.wrWhenPlayed)}`,
    })));
  };
  const cardRankingRows = rows.filter((row) => !isGeneratedCardTelemetryRow(row));
  rank('Top 10 Draw Impact', [...cardRankingRows].sort((a, b) => b.drawImpact - a.drawImpact).slice(0, 10));
  rank('Worst 10 Draw Impact', [...cardRankingRows].sort((a, b) => a.drawImpact - b.drawImpact).slice(0, 10));
  rank('Top 10 Play Impact', [...cardRankingRows].sort((a, b) => b.playImpact - a.playImpact).slice(0, 10));
  rank('Worst 10 Play Impact', [...cardRankingRows].sort((a, b) => a.playImpact - b.playImpact).slice(0, 10));

  console.log('\nMost Dead Cards');
  console.table([...cardRankingRows].sort((a, b) => b.deadCardScore - a.deadCardScore || b.heldAtDefeat - a.heldAtDefeat).slice(0, 10).map((row) => ({
    Card: row.cardName,
    Drawn: row.drawn,
    Played: row.played,
    'Held At Defeat': row.heldAtDefeat,
    'Dead Card Score': row.deadCardScore,
  })));

  console.log('\nCarry Cards');
  console.table([...cardRankingRows].sort((a, b) => b.carryScore - a.carryScore || b.playedWins - a.playedWins).slice(0, 10).map((row) => ({
    Card: row.cardName,
    'Win Rate When Played': row.playedGames > 0 ? `${pct(row.wrWhenPlayed)}` : 'N/A',
    Played: row.played,
    'Carry Score': row.carryScore,
  })));

  console.log('\nCampaign Intelligence (estimate based on the current simulated faction set, not a true campaign simulator)');
  console.table(Object.entries(factionBaselines).sort(([a], [b]) => a.localeCompare(b)).map(([faction, campaignEstimate]) => {
    const factionRows = rows.filter((row) => row.faction === faction && row.isDeckCard);
    const avgDead = factionRows.length > 0 ? factionRows.reduce((sum, row) => sum + row.deadCardScore, 0) / factionRows.length : 0;
    return {
      Faction: faction,
      Campaign: `${pct(campaignEstimate)}`,
      'Average Dead Card Score': avgDead.toFixed(1),
      'Dead Cards >80': factionRows.filter((row) => row.deadCardScore > 80).length,
    };
  }));
}


function printEffectVariantOperationSimulatorTelemetry(simTelemetry) {
  console.log('\nSimulator telemetry: effectVariant operations');
  const rows = Object.values(simTelemetry.effectVariantOperations ?? {})
    .sort((a, b) => a.variantId.localeCompare(b.variantId)
      || a.registryKey.localeCompare(b.registryKey)
      || a.triggerType.localeCompare(b.triggerType)
      || a.operation.localeCompare(b.operation)
      || a.selector.localeCompare(b.selector)
      || a.status.localeCompare(b.status));
  if (rows.length === 0) {
    console.log('No effectVariant operation telemetry recorded.');
    return;
  }
  console.table(rows.map((row) => ({
    variantId: row.variantId,
    baseEffectControl: row.baseEffectControl,
    triggerType: row.triggerType,
    operation: row.operation,
    selector: row.selector,
    executions: row.executions,
    'resolved targets': row.resolvedTargets,
    'skipped targets': row.skippedTargets,
    'damage dealt': row.damageDealt,
    kills: row.kills,
    'atk added': row.attackAdded,
    'atk reduced': row.attackReduced,
    'arm added': row.armorAdded,
    'arm reduced': row.armorReduced,
    'hp added': row.hpAdded,
    'base damage': row.baseDamageDealt,
    'enemy base damage': row.enemyBaseDamage,
    'player base damage': row.playerBaseDamage,
    'cards drawn': row.cardsDrawn,
    'failed draws': row.failedDraws,
    'skipped draws': row.skippedDraws,
    'tokens summoned': row.tokensSummoned,
    'skipped summons': row.skippedSummons,
    token: row.token,
    temporary: row.temporary,
    'summoned token stats': row.summonedTokenStats
      ? `${row.summonedTokenStats.atk}/${row.summonedTokenStats.arm}/${row.summonedTokenStats.hp}`
      : '',
    status: row.status,
  })));
}

function printAiSimulatorTelemetry(telemetry, simTelemetry, totalGames) {
  console.log('\nSimulator telemetry: AI health');
  console.table([
    { metric: 'invalid actions', count: telemetry.invalidActions, rate: `${avg(telemetry.invalidActions, totalGames)} per game` },
    { metric: 'crashes', count: telemetry.crashes, rate: `${percent(telemetry.crashes, totalGames)}%` },
    { metric: 'turn-cap rate', count: simTelemetry.endings.turnCap, rate: `${percent(simTelemetry.endings.turnCap, totalGames)}%` },
    { metric: 'no-progress rate', count: simTelemetry.endings.noProgress, rate: `${percent(simTelemetry.endings.noProgress, totalGames)}%` },
  ]);
}

function yesNo(value) {
  return value ? '✅' : '❌';
}

function printHandLockAnalysis(analysis) {
  Object.values(analysis.streaks).forEach(finishHandLockStreak);
  const totalOpportunities = analysis.opportunities.total;
  const burnEligible = analysis.burnEligible;
  const burnEligibleDeckCount = burnEligible.total;

  console.log('\n====================================');
  console.log('HAND LOCK ANALYSIS');
  console.log('====================================');

  console.log('\nFull hand events:');
  console.table([
    { side: 'player', events: analysis.fullHand.player, opportunities: analysis.opportunities.player, percentage: `${percent(analysis.fullHand.player, analysis.opportunities.player)}%` },
    { side: 'enemy', events: analysis.fullHand.enemy, opportunities: analysis.opportunities.enemy, percentage: `${percent(analysis.fullHand.enemy, analysis.opportunities.enemy)}%` },
    { side: 'total', events: analysis.fullHand.total, opportunities: totalOpportunities, percentage: `${percent(analysis.fullHand.total, totalOpportunities)}%` },
  ]);

  console.log('\nBurn-eligible opportunities:');
  console.table([
    { side: 'player', events: burnEligible.player, opportunities: analysis.opportunities.player, percentage: `${percent(burnEligible.player, analysis.opportunities.player)}%` },
    { side: 'enemy', events: burnEligible.enemy, opportunities: analysis.opportunities.enemy, percentage: `${percent(burnEligible.enemy, analysis.opportunities.enemy)}%` },
    { side: 'total', events: burnEligible.total, opportunities: totalOpportunities, percentage: `${percent(burnEligible.total, totalOpportunities)}%` },
  ]);

  console.log('\nTrue hand-lock events:');
  console.table([
    { side: 'player', events: analysis.trueLocks.player, opportunities: analysis.opportunities.player, percentage: `${percent(analysis.trueLocks.player, analysis.opportunities.player)}%` },
    { side: 'enemy', events: analysis.trueLocks.enemy, opportunities: analysis.opportunities.enemy, percentage: `${percent(analysis.trueLocks.enemy, analysis.opportunities.enemy)}%` },
    { side: 'total', events: analysis.trueLocks.total, opportunities: totalOpportunities, percentage: `${percent(analysis.trueLocks.total, totalOpportunities)}%` },
  ]);

  console.log('\nLock streaks:');
  console.table(['player', 'enemy'].map((side) => {
    const row = analysis.streaks[side];
    return {
      side,
      streaks: row.count,
      'average streak': avg(row.total, row.count),
      'longest streak': row.longest,
    };
  }));

  console.log('\nRemaining deck during burn-eligible states:');
  console.table([{
    samples: burnEligibleDeckCount,
    average: avg(burnEligible.deckTotal, burnEligibleDeckCount),
    minimum: burnEligibleDeckCount > 0 ? burnEligible.deckMin : 0,
    maximum: burnEligibleDeckCount > 0 ? burnEligible.deckMax : 0,
  }]);

  console.log('\nFaction hand-lock statistics:');
  console.table(Object.values(analysis.factions)
    .sort((a, b) => percentValue(b.trueLocks, b.opportunities) - percentValue(a.trueLocks, a.opportunities)
      || percentValue(b.burnEligible, b.opportunities) - percentValue(a.burnEligible, a.opportunities)
      || a.faction.localeCompare(b.faction))
    .map((row) => ({
      faction: row.faction,
      opportunities: row.opportunities,
      'full hand rate': `${percent(row.fullHand, row.opportunities)}%`,
      'burn eligible rate': `${percent(row.burnEligible, row.opportunities)}%`,
      'true hand lock rate': `${percent(row.trueLocks, row.opportunities)}%`,
      'true locks': row.trueLocks,
    })));

  console.log('\nCards most frequently present during true hand-lock states:');
  const cardRows = Object.values(analysis.cards)
    .sort((a, b) => b.count - a.count || a.faction.localeCompare(b.faction) || a.cardName.localeCompare(b.cardName))
    .slice(0, 10);
  if (cardRows.length === 0) {
    console.log('No true hand-lock card samples recorded.');
  } else {
    console.table(cardRows.map((row) => ({
      faction: row.faction,
      card: row.cardName,
      id: row.cardId,
      'true-lock hand appearances': row.count,
    })));
  }

  console.log('\nExample traces:');
  if (analysis.examples.length === 0) {
    console.log('No true hand-lock examples recorded.');
  } else {
    analysis.examples.forEach((example, index) => {
      console.log(`\nExample ${index + 1}: ${example.matchup}, ${example.faction} ${example.side}, Turn ${example.turn}`);
      console.log(`Hand: ${example.hand}`);
      console.log(`Deck: ${example.deck}`);
      console.log('Legal actions');
      console.log(`Play ${yesNo(example.canPlay)}`);
      console.log(`Redeploy ${yesNo(example.canRedeploy)}`);
      console.log(`Swap ${yesNo(example.canSwap)}`);
      console.log(`PASS ${yesNo(example.canPass)}`);
      console.log(example.burnEligible ? 'This would have been Burn eligible.' : 'This would not have been Burn eligible.');
    });
  }

  console.log('\nRecommendation');
  const trueLockRate = percentValue(analysis.trueLocks.total, totalOpportunities);
  const burnEligibleRate = percentValue(burnEligible.total, totalOpportunities);
  if (analysis.trueLocks.total === 0) {
    console.log(`No true hand-lock situations were observed across ${totalOpportunities} action opportunities. Burn mechanic appears unnecessary in this sample.`);
  } else {
    const factionRows = Object.values(analysis.factions)
      .filter((row) => row.trueLocks > 0)
      .sort((a, b) => percentValue(b.trueLocks, b.opportunities) - percentValue(a.trueLocks, a.opportunities))
      .slice(0, 3)
      .map((row) => row.faction);
    console.log(`True hand-lock situations were observed ${analysis.trueLocks.total} time(s) across ${totalOpportunities} action opportunities (${pct(trueLockRate)}). Burn-eligible states occurred ${burnEligible.total} time(s) (${pct(burnEligibleRate)}).`);
    if (factionRows.length > 0) {
      console.log(`Observed true locks were most concentrated in: ${factionRows.join(', ')}.`);
    }
    console.log('Use these measured rates to decide whether a Burn mechanic is worth prototyping.');
  }
}

function createOrderedStats(playerFaction, enemyFaction) {
  return {
    playerFaction,
    enemyFaction,
    games: 0,
    playerWins: 0,
    enemyWins: 0,
    draws: 0,
    turnCaps: 0,
    totalTurns: 0,
    totalPlayerHP: 0,
    totalEnemyHP: 0,
  };
}

function addOrderedResult(stats, result) {
  stats.games += 1;
  stats.totalTurns += result.turns;
  stats.totalPlayerHP += result.playerHP;
  stats.totalEnemyHP += result.enemyHP;
  if (result.winner === 'player') stats.playerWins += 1;
  else if (result.winner === 'enemy') stats.enemyWins += 1;
  else stats.draws += 1;
  if (result.endingReason === 'turn-cap') stats.turnCaps += 1;
}

function nonDrawWinPercent(wins, games, draws) {
  return percentValue(wins, games - draws);
}

function sortedClasses(classes) {
  if (classes.size === 0) return 'healthy';
  return [...classes].sort().join(', ');
}

function warnIf(condition, warnings, message) {
  if (condition) warnings.push(`WARN ${message}`);
}

function getMatchupCount(playerIndex, enemyIndex, factionCount, requestedTotal) {
  if (!requestedTotal) return null;
  const matchupCount = factionCount * factionCount;
  const ordinal = playerIndex * factionCount + enemyIndex;
  const base = Math.floor(requestedTotal / matchupCount);
  const remainder = requestedTotal % matchupCount;
  return base + (ordinal < remainder ? 1 : 0);
}

function main() {
  const experimentArg = process.argv.find((arg) => arg.startsWith('--experiment='));
  const experiment = loadExperiment(experimentArg?.split('=')[1] ?? null);
  const totalArg = process.argv.find((arg) => arg.startsWith('--total='));
  const requestedTotal = totalArg ? Number.parseInt(totalArg.split('=')[1], 10) : null;
  const telemetryArg = process.argv.find((arg) => arg.startsWith('--telemetry='));
  const telemetryModes = parseTelemetryModes(telemetryArg?.split('=')[1] ?? experiment?.telemetry ?? '');
  const simTelemetry = telemetryModes.size > 0 ? createSimulatorTelemetry() : null;
  const onlyArg = process.argv.find((arg) => arg.startsWith('--only='));
  const onlyOrderedMatchups = onlyArg
    ? new Set(onlyArg.split('=')[1]
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => entry.replace(':', '|')))
    : null;
  const positionalArgs = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
  const parsedCount = Number.parseInt(positionalArgs[0] ?? `${DEFAULT_MATCH_COUNT}`, 10);
  const matchCount = Number.isInteger(parsedCount) && parsedCount > 0 ? parsedCount : DEFAULT_MATCH_COUNT;
  const seedArg = requestedTotal ? positionalArgs[0] : positionalArgs[1];
  const parsedSeed = Number.parseInt(seedArg ?? `${DEFAULT_BASE_SEED}`, 10);
  const baseSeed = Number.isInteger(parsedSeed) ? parsedSeed >>> 0 : DEFAULT_BASE_SEED;

  const balanceLabArg = process.argv.find((arg) => arg.startsWith('--balance-lab='));
  const balanceLabId = balanceLabArg?.split('=')[1] ?? null;
  const { factions, customFactions, productionFactionCount } = loadFactions(balanceLabId, experiment);
  const effectiveMatchCount = Number.isInteger(experiment?.matchCount) && experiment.matchCount > 0 ? experiment.matchCount : matchCount;
  const effectiveBaseSeed = Number.isInteger(experiment?.seed) ? experiment.seed >>> 0 : baseSeed;
  const effectVariantRegistry = buildEffectVariantRegistryForFactions(factions, balanceLabId);
  const factionKeys = Object.keys(factions);
  const factionOrder = new Map(factionKeys.map((key, index) => [key, index]));
  const aggregate = new Map(factionKeys.map((key) => [key, createStats()]));
  const combinedPairs = new Map();
  const orderedMatchups = new Map();
  const passStats = { pass: 0, cancelled: 0 };
  const telemetry = { replaceUsed: 0, repositionUsed: 0, meaningfulGameplayActions: 0, pointlessGameplayActions: 0, openLaneImprovements: 0, repeatedLoopPreventions: 0, invalidActions: 0, crashes: 0, quickFixUses: 0, quickFixTriggers: 0, shieldPushUses: 0, defensiveFrictionApplications: 0, funeralPyreUses: 0, systemOverrideUses: 0, funeralPyreTriggers: 0, funeralPyreLaneDamageTriggers: 0, combatOnlyDeathHeroTriggers: 0, combatOnlyDeathLaneDamageTriggers: 0, combatOnlyDeathSummons: 0, leechCombatHeals: 0, rotcallerCombatTriggers: 0, overflowCombatTriggers: 0, overflowCombatDamage: 0, overflowCombatTriggersByCardId: {}, overflowCombatDamageByCardId: {}, mulliganByFaction: {} };
  const audit = { games: 0, draws: 0, turnCaps: 0, aggroTurnCapWins: 0, aggroGames: 0, nonSwarmGames: 0, nonSwarmDraws: 0, nonSwarmTurnCaps: 0, swarmMirrorGames: 0, swarmMirrorDraws: 0, simultaneousLethals: 0, simultaneousLethalDrawsAfter: 0 };
  const handLockAnalysis = createHandLockAnalysis();

  for (let playerIndex = 0; playerIndex < factionKeys.length; playerIndex += 1) for (let enemyIndex = 0; enemyIndex < factionKeys.length; enemyIndex += 1) {
    const playerKey = factionKeys[playerIndex];
    const enemyKey = factionKeys[enemyIndex];
    if (onlyOrderedMatchups && !onlyOrderedMatchups.has(`${playerKey}|${enemyKey}`)) continue;
    const gamesForMatchup = getMatchupCount(playerIndex, enemyIndex, factionKeys.length, requestedTotal) ?? effectiveMatchCount;
    if (gamesForMatchup <= 0) continue;
    const orderedKey = `${playerKey}|${enemyKey}`;
    const orderedStats = createOrderedStats(playerKey, enemyKey);
    orderedMatchups.set(orderedKey, orderedStats);

    for (let i = 0; i < gamesForMatchup; i += 1) {
      const gameSeed = buildGameSeed(effectiveBaseSeed, playerKey, enemyKey, i);
      const result = runSingleGame(factions[playerKey], factions[enemyKey], passStats, telemetry, simTelemetry, gameSeed, i, playerKey, enemyKey, effectVariantRegistry, handLockAnalysis);
      recordGameEndTelemetry(simTelemetry, result);
      recordEffectVariantOperationTelemetry(simTelemetry, result.effectVariantOperationTelemetry);
      telemetry.quickFixTriggers += result.quickFixTempoDraws ?? 0;
      telemetry.defensiveFrictionApplications += result.defensiveFrictionApplications ?? 0;
      telemetry.funeralPyreTriggers += result.funeralPyreCombatTriggers ?? 0;
      telemetry.funeralPyreLaneDamageTriggers += result.funeralPyreLaneDamageTriggers ?? 0;
      telemetry.combatOnlyDeathHeroTriggers += result.combatOnlyDeathHeroTriggers ?? 0;
      telemetry.combatOnlyDeathLaneDamageTriggers += result.combatOnlyDeathLaneDamageTriggers ?? 0;
      telemetry.combatOnlyDeathSummons += result.combatOnlyDeathSummons ?? 0;
      telemetry.leechCombatHeals += result.leechCombatHeals ?? 0;
      telemetry.rotcallerCombatTriggers += result.rotcallerCombatTriggers ?? 0;
      telemetry.overflowCombatTriggers += result.overflowCombatTriggers ?? 0;
      telemetry.overflowCombatDamage += result.overflowCombatDamage ?? 0;
      Object.entries(result.overflowCombatTriggersByCardId ?? {}).forEach(([cardId, count]) => {
        telemetry.overflowCombatTriggersByCardId[cardId] = (telemetry.overflowCombatTriggersByCardId[cardId] ?? 0) + count;
      });
      Object.entries(result.overflowCombatDamageByCardId ?? {}).forEach(([cardId, damage]) => {
        telemetry.overflowCombatDamageByCardId[cardId] = (telemetry.overflowCombatDamageByCardId[cardId] ?? 0) + damage;
      });
      const wasDraw = result.winner === 'draw';
      const wasTurnCap = result.endingReason === 'turn-cap';
      addOrderedResult(orderedStats, result);
      addFactionGame(aggregate.get(playerKey), result.winner === 'player', wasDraw, wasTurnCap, result.turns, result.playerHP);
      addFactionGame(aggregate.get(enemyKey), result.winner === 'enemy', wasDraw, wasTurnCap, result.turns, result.enemyHP);

      if (playerKey !== enemyKey) {
        const pairKey = getPairKey(playerKey, enemyKey, factionOrder);
        const [factionA, factionB] = pairKey.split('|');
        const pair = ensurePairStats(combinedPairs, factionA, factionB);
        pair.games += 1;
        pair.totalTurns += result.turns;
        if (wasDraw) pair.draws += 1;
        if (wasTurnCap) pair.turnCaps += 1;
        if (result.winner === 'player' && playerKey === factionA) pair.factionAWins += 1;
        if (result.winner === 'enemy' && enemyKey === factionA) pair.factionAWins += 1;
        if (result.winner === 'player' && playerKey === factionB) pair.factionBWins += 1;
        if (result.winner === 'enemy' && enemyKey === factionB) pair.factionBWins += 1;
      }

      audit.games += 1;
      if (wasDraw) audit.draws += 1;
      if (wasTurnCap) audit.turnCaps += 1;
      if (result.heroDeathResolution?.simultaneousLethal) {
        audit.simultaneousLethals += 1;
        if (wasDraw) audit.simultaneousLethalDrawsAfter += 1;
      }
      if (playerKey === 'Aggro') audit.aggroGames += 1;
      if (enemyKey === 'Aggro') audit.aggroGames += 1;
      if (playerKey !== 'Swarm' && enemyKey !== 'Swarm') {
        audit.nonSwarmGames += 1;
        if (wasDraw) audit.nonSwarmDraws += 1;
        if (wasTurnCap) audit.nonSwarmTurnCaps += 1;
      }
      if (playerKey === 'Swarm' && enemyKey === 'Swarm') {
        audit.swarmMirrorGames += 1;
        if (wasDraw) audit.swarmMirrorDraws += 1;
      }
      if (wasTurnCap && result.winner === 'player' && playerKey === 'Aggro') audit.aggroTurnCapWins += 1;
      if (wasTurnCap && result.winner === 'enemy' && enemyKey === 'Aggro') audit.aggroTurnCapWins += 1;
    }
  }

  const aggregateRows = factionKeys.map((key) => {
    const row = aggregate.get(key);
    return {
      faction: key,
      games: row.games,
      'win %': percent(row.wins, row.games),
      'non-draw win %': percent(row.wins, row.games - row.draws),
      'draw %': percent(row.draws, row.games),
      'turn-cap %': percent(row.turnCaps, row.games),
      'avg turns': avg(row.totalTurns, row.games),
      'avg remaining hero HP': avg(row.totalRemainingHP, row.games),
    };
  });

  const combinedRows = [...combinedPairs.values()].map((row) => ({
    'faction A': row.factionA,
    'faction B': row.factionB,
    games: row.games,
    'faction A wins': row.factionAWins,
    'faction B wins': row.factionBWins,
    draws: row.draws,
    'faction A all-games WR': percent(row.factionAWins, row.games),
    'faction A non-draw WR': percent(row.factionAWins, row.games - row.draws),
    'draw %': percent(row.draws, row.games),
    'turn-cap %': percent(row.turnCaps, row.games),
    'avg turns': avg(row.totalTurns, row.games),
  }));

  const seatRows = [...orderedMatchups.values()].map((row) => ({
    'player faction': row.playerFaction,
    'enemy faction': row.enemyFaction,
    games: row.games,
    'player win %': percent(row.playerWins, row.games),
    'enemy win %': percent(row.enemyWins, row.games),
    'draw %': percent(row.draws, row.games),
    'average turns': avg(row.totalTurns, row.games),
  }));

  const mirrorRows = factionKeys.map((key) => {
    const row = orderedMatchups.get(`${key}|${key}`) ?? createOrderedStats(key, key);
    return {
      mirror: `${key} vs ${key}`,
      games: row.games,
      'draw %': percent(row.draws, row.games),
      'turn-cap %': percent(row.turnCaps, row.games),
      'average turns': avg(row.totalTurns, row.games),
      'average remaining HP': avg(row.totalPlayerHP + row.totalEnemyHP, row.games * 2),
    };
  });

  const warnings = [];
  const recommendations = new Map();
  const mark = (subject, classification) => {
    if (!recommendations.has(subject)) recommendations.set(subject, new Set());
    recommendations.get(subject).add(classification);
  };

  factionKeys.forEach((key) => {
    const row = aggregate.get(key);
    const winRate = percentValue(row.wins, row.games);
    const drawRate = percentValue(row.draws, row.games);
    const turnCapRate = percentValue(row.turnCaps, row.games);
    warnIf(winRate < 40, warnings, `${key} aggregate WR ${pct(winRate)} below 40.0%`);
    warnIf(winRate > 56, warnings, `${key} aggregate WR ${pct(winRate)} above 56.0%`);
    warnIf(drawRate > 10, warnings, `${key} aggregate draw rate ${pct(drawRate)} above 10.0%`);
    warnIf(turnCapRate > 10, warnings, `${key} aggregate turn-cap rate ${pct(turnCapRate)} above 10.0%`);
    if (winRate < 40) mark(key, 'underperforming');
    if (winRate > 56) mark(key, 'overperforming');
    if (drawRate > 10) mark(key, 'draw risk');
    if (turnCapRate > 10) mark(key, 'pacing risk');
  });

  [...combinedPairs.values()].forEach((row) => {
    const factionANonDrawWR = nonDrawWinPercent(row.factionAWins, row.games, row.draws);
    const drawRate = percentValue(row.draws, row.games);
    const turnCapRate = percentValue(row.turnCaps, row.games);
    const subject = `${row.factionA} vs ${row.factionB}`;
    warnIf(factionANonDrawWR < 30, warnings, `${subject} ${row.factionA} non-draw matchup WR ${pct(factionANonDrawWR)} below 30.0%`);
    warnIf(factionANonDrawWR > 70, warnings, `${subject} ${row.factionA} non-draw matchup WR ${pct(factionANonDrawWR)} above 70.0%`);
    warnIf(drawRate > 10, warnings, `${subject} draw rate ${pct(drawRate)} above 10.0%`);
    warnIf(turnCapRate > 10, warnings, `${subject} turn-cap rate ${pct(turnCapRate)} above 10.0%`);
    if (factionANonDrawWR < 30) mark(subject, 'underperforming');
    if (factionANonDrawWR > 70) mark(subject, 'overperforming');
    if (drawRate > 10) mark(subject, 'draw risk');
    if (turnCapRate > 10) mark(subject, 'pacing risk');
  });

  factionKeys.forEach((key) => {
    const row = orderedMatchups.get(`${key}|${key}`);
    if (!row) return;
    const drawRate = percentValue(row.draws, row.games);
    const turnCapRate = percentValue(row.turnCaps, row.games);
    const averageTurns = avgValue(row.totalTurns, row.games);
    const subject = `${key} mirror`;
    warnIf(drawRate > 10, warnings, `${subject} draw rate ${pct(drawRate)} above 10.0%`);
    warnIf(turnCapRate > 10, warnings, `${subject} turn-cap rate ${pct(turnCapRate)} above 10.0%`);
    warnIf(averageTurns < 4, warnings, `${subject} average turns ${averageTurns.toFixed(2)} below 4.00`);
    warnIf(averageTurns > 25, warnings, `${subject} average turns ${averageTurns.toFixed(2)} above 25.00`);
    if (drawRate > 10) mark(subject, 'draw risk');
    if (turnCapRate > 10 || averageTurns < 4 || averageTurns > 25) mark(subject, 'pacing risk');
  });

  [...combinedPairs.values()].forEach((row) => {
    const forward = orderedMatchups.get(`${row.factionA}|${row.factionB}`);
    const reverse = orderedMatchups.get(`${row.factionB}|${row.factionA}`);
    if (!forward || !reverse) return;
    const factionAPlayerWR = percentValue(forward.playerWins, forward.games);
    const factionAEnemyWR = percentValue(reverse.enemyWins, reverse.games);
    const spread = Math.abs(factionAPlayerWR - factionAEnemyWR);
    const subject = `${row.factionA} vs ${row.factionB}`;
    warnIf(spread > 15, warnings, `${subject} seat spread ${spread.toFixed(1)} percentage points above 15.0`);
    if (spread > 15) mark(subject, 'seat-bias risk');
  });

  const recommendationRows = [
    ...factionKeys.map((key) => ({ subject: key, classification: sortedClasses(recommendations.get(key) ?? new Set()) })),
    ...[...combinedPairs.values()].map((row) => {
      const subject = `${row.factionA} vs ${row.factionB}`;
      return { subject, classification: sortedClasses(recommendations.get(subject) ?? new Set()) };
    }),
    ...factionKeys.map((key) => {
      const subject = `${key} mirror`;
      return { subject, classification: sortedClasses(recommendations.get(subject) ?? new Set()) };
    }),
  ];

  const filterSummary = onlyOrderedMatchups ? `, filtered to ${onlyOrderedMatchups.size} ordered matchup(s)` : '';
  console.log(requestedTotal ? `
Battle simulation complete (${audit.games} total games${filterSummary}, max ${MAX_TURNS} turns).` : `
Battle simulation complete (${effectiveMatchCount} games per matchup${filterSummary}, max ${MAX_TURNS} turns).`);
  console.log(`Base seed: ${effectiveBaseSeed}`);
  console.log(`Simulated faction matrix: ${factionKeys.length} factions, ${factionKeys.length * factionKeys.length} ordered matchups.`);
  if (customFactions.length > 0) {
    console.log('\nBalance Lab temporary custom factions enabled.');
    console.log(`Production factions: ${productionFactionCount}`);
    console.log(`Custom factions: ${customFactions.length}`);
    console.log(`Total simulated factions: ${factionKeys.length}`);
    console.log('Custom faction deck summary:');
    customFactions.forEach((faction) => {
      console.log(`- ${faction.id} (${faction.name})`);
      faction.deck.forEach((card) => console.log(`  - ${card.id}: ${card.name}`));
    });
  }
  console.log('\nBalance audit: aggregate faction table');
  console.table(aggregateRows);
  console.log('\nBalance audit: combined matchup table across both seats');
  console.table(combinedRows);
  console.log('\nBalance audit: seat bias table');
  console.table(seatRows);
  console.log('\nBalance audit: mirror pacing table');
  console.table(mirrorRows);
  console.log('\nBalance audit: health flags');
  if (warnings.length === 0) console.log('No WARN flags.');
  else warnings.forEach((warning) => console.log(warning));
  console.log('\nFinal recommendation summary:');
  console.table(recommendationRows);
  console.log('\nAudit pacing summary:');
  console.table([
    { metric: 'total draw %', value: percent(audit.draws, audit.games), count: `${audit.draws}/${audit.games}` },
    { metric: 'Swarm vs Swarm draw %', value: percent(audit.swarmMirrorDraws, audit.swarmMirrorGames), count: `${audit.swarmMirrorDraws}/${audit.swarmMirrorGames}` },
    { metric: 'turn-cap %', value: percent(audit.turnCaps, audit.games), count: `${audit.turnCaps}/${audit.games}` },
    { metric: 'non-Swarm draw %', value: percent(audit.nonSwarmDraws, audit.nonSwarmGames), count: `${audit.nonSwarmDraws}/${audit.nonSwarmGames}` },
    { metric: 'non-Swarm turn-cap %', value: percent(audit.nonSwarmTurnCaps, audit.nonSwarmGames), count: `${audit.nonSwarmTurnCaps}/${audit.nonSwarmGames}` },
    { metric: 'Aggro chip timeout win %', value: percent(audit.aggroTurnCapWins, audit.aggroGames), count: `${audit.aggroTurnCapWins}/${audit.aggroGames}` },
    { metric: 'simultaneous lethal count', value: audit.simultaneousLethals, count: `${audit.simultaneousLethals}/${audit.games}` },
    { metric: 'simultaneous lethal draws before rule', value: audit.simultaneousLethals, count: `${audit.simultaneousLethals}/${audit.simultaneousLethals}` },
    { metric: 'simultaneous lethal draws after rule', value: audit.simultaneousLethalDrawsAfter, count: `${audit.simultaneousLethalDrawsAfter}/${audit.simultaneousLethals}` },
  ]);
  printHandLockAnalysis(handLockAnalysis);

  console.log('\nOpening mulligan usage by faction:');
  console.table(factionKeys.map((key) => {
    const row = telemetry.mulliganByFaction[key] ?? { games: 0, used: 0, cardsReplaced: 0 };
    return {
      faction: key,
      games: row.games,
      'usage %': percent(row.used, row.games),
      'avg cards replaced': avg(row.cardsReplaced, row.games),
    };
  }));

  console.log('\nAI gameplay-action telemetry:');
  console.table([
    { metric: 'replace actions used', count: telemetry.replaceUsed },
    { metric: 'reposition actions used', count: telemetry.repositionUsed },
    { metric: 'meaningful replace/reposition uses', count: telemetry.meaningfulGameplayActions },
    { metric: 'pointless replace/reposition uses', count: telemetry.pointlessGameplayActions },
    { metric: 'open-lane improvements', count: telemetry.openLaneImprovements },
    { metric: 'repeated-loop preventions', count: telemetry.repeatedLoopPreventions },
    { metric: 'invalid actions', count: telemetry.invalidActions },
    { metric: 'crashes', count: telemetry.crashes },
    { metric: 'Quick Fix uses', count: telemetry.quickFixUses },
    { metric: 'Berserker uses', count: telemetry.berserkerUses },
    { metric: 'Berserker usage frequency', count: `${percent(telemetry.berserkerUses, audit.aggroGames)}% of Aggro seats` },
    { metric: 'Quick Fix triggered draws', count: telemetry.quickFixTriggers },
    { metric: 'Quick Fix trigger rate', count: `${percent(telemetry.quickFixTriggers, telemetry.quickFixUses)}%` },
    { metric: 'Shield Push uses', count: telemetry.shieldPushUses },
    { metric: 'Reinforce Line uses', count: telemetry.reinforceLineUses },
    { metric: 'friendly immovable uses', count: telemetry.friendlyImmovableUses },
    { metric: 'Jam Signal uses', count: telemetry.jamSignalUses },
    { metric: 'Controller uses', count: telemetry.controllerUses },
    { metric: 'defensive friction applications', count: telemetry.defensiveFrictionApplications },
    { metric: 'Funeral Pyre uses', count: telemetry.funeralPyreUses },
    { metric: 'System Override uses', count: telemetry.systemOverrideUses },
    { metric: 'Funeral Pyre combat triggers', count: telemetry.funeralPyreTriggers },
    { metric: 'Funeral Pyre trigger rate', count: `${percent(telemetry.funeralPyreTriggers, telemetry.funeralPyreUses)}%` },
    { metric: 'Funeral Pyre lane-damage triggers', count: telemetry.funeralPyreLaneDamageTriggers },
    { metric: 'combat-only death hero triggers', count: telemetry.combatOnlyDeathHeroTriggers },
    { metric: 'combat-only death lane-damage triggers', count: telemetry.combatOnlyDeathLaneDamageTriggers },
    { metric: 'combat-only death summons', count: telemetry.combatOnlyDeathSummons },
    { metric: 'Leech combat heals', count: telemetry.leechCombatHeals },
    { metric: 'Rotcaller combat triggers', count: telemetry.rotcallerCombatTriggers },
    { metric: 'overflow combat triggers', count: telemetry.overflowCombatTriggers },
    { metric: 'overflow base damage total', count: telemetry.overflowCombatDamage },
  ]);
  console.log('\nOverflow combat telemetry by card id:');
  const overflowCardIds = [...new Set([
    ...Object.keys(telemetry.overflowCombatTriggersByCardId ?? {}),
    ...Object.keys(telemetry.overflowCombatDamageByCardId ?? {}),
  ])].sort();
  if (overflowCardIds.length === 0) {
    console.log('No overflow combat telemetry recorded.');
  } else {
    console.table(overflowCardIds.map((cardId) => ({
      cardId,
      triggers: telemetry.overflowCombatTriggersByCardId[cardId] ?? 0,
      baseDamage: telemetry.overflowCombatDamageByCardId[cardId] ?? 0,
    })));
  }

  console.log('\nPASS reason counts:');
  console.table(Object.entries(passStats)
    .filter(([, count]) => typeof count === 'number')
    .map(([reason, count]) => ({ reason, count })));
  console.log('\nPASS counts by faction:');
  console.table(Object.entries(passStats.byFaction ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([faction, count]) => ({ faction, count })));
  if (simTelemetry && hasTelemetryMode(telemetryModes, 'basic')) {
    printBasicSimulatorTelemetry(simTelemetry, factionKeys, audit.games);
  }
  if (simTelemetry && hasTelemetryMode(telemetryModes, 'cards')) {
    printCardSimulatorTelemetry(simTelemetry);
  }
  if (simTelemetry && hasTelemetryMode(telemetryModes, 'ai')) {
    printAiSimulatorTelemetry(telemetry, simTelemetry, audit.games);
  }
  if (simTelemetry && hasTelemetryMode(telemetryModes, 'effectvariants')) {
    printEffectVariantOperationSimulatorTelemetry(simTelemetry);
  }

  console.log('\nSimulation parity and validity notes:');
  console.log(`- baseSeed: ${effectiveBaseSeed}`);
  console.log(`- decks shuffled: ${SHUFFLE_DECKS ? 'yes (seeded Fisher-Yates per game)' : 'no'}`);
  console.log(`- first actor policy: ${FIRST_ACTOR_POLICY} (seeded random at battle start, toggles after each full turn)`);
  console.log(`- tie-break policy: ${TIE_BREAK_POLICY}`);
  console.log('- previous deterministic reports are invalid because fixed deck order and fixed first actor introduced structural bias.');
}
main();
