import aggro from './aggro.json' with { type: 'json' };
import tank from './tank.json' with { type: 'json' };
import control from './control.json' with { type: 'json' };
import swarm from './swarm.json' with { type: 'json' };
import wardens from './wardens.json' with { type: 'json' };

const FACTIONS = {
  Aggro: aggro,
  Tank: tank,
  Control: control,
  Swarm: swarm,
  Wardens: wardens,
};

export function getFactionByKey(factionKey) {
  return FACTIONS[factionKey] ?? null;
}

export function getFactionKeys() {
  return Object.keys(FACTIONS);
}
