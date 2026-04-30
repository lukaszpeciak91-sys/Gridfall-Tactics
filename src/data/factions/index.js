import aggro from './aggro.json';
import tank from './tank.json';
import control from './control.json';
import swarm from './swarm.json';

const FACTIONS = {
  Aggro: aggro,
  Tank: tank,
  Control: control,
  Swarm: swarm,
};

export function getFactionByKey(factionKey) {
  return FACTIONS[factionKey] ?? null;
}

export function getFactionKeys() {
  return Object.keys(FACTIONS);
}
