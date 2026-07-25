export const COMBAT_BETWEEN_LANES_DELAY_MS = 320;
export const COMBAT_FINAL_LANE_CONFIRMATION_MS = 180;

const STANDARD_COMBAT_LANE_ORDER = Object.freeze([0, 1, 2]);

export function getStandardCombatLanePresentationGroups(combatEvents) {
  if (!Array.isArray(combatEvents)) return [];

  return STANDARD_COMBAT_LANE_ORDER
    .map((lane) => ({
      lane,
      events: combatEvents.filter((event) => event?.lane === lane),
    }))
    .filter(({ events }) => events.length > 0);
}

export async function playStandardCombatLanePresentation(combatEvents, { presentLane, delay }) {
  const groups = getStandardCombatLanePresentationGroups(combatEvents);

  for (const [index, group] of groups.entries()) {
    await presentLane(group.lane, group.events);
    const isFinalPresentedLane = index === groups.length - 1;
    await delay(isFinalPresentedLane
      ? COMBAT_FINAL_LANE_CONFIRMATION_MS
      : COMBAT_BETWEEN_LANES_DELAY_MS);
  }
}
