import aggro from './aggro.json';
import tank from './tank.json';
import control from './control.json';
import swarm from './swarm.json';

export const factions = [aggro, tank, control, swarm];

export const factionMap = Object.fromEntries(
  factions.map((faction) => [faction.name, faction])
);
