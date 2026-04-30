import aggro from './Aggro.json';
import tank from './Tank.json';
import control from './Control.json';
import swarm from './Swarm.json';

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
