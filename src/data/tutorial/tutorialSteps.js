export const TUTORIAL_STEP_IDS = Object.freeze([
  'bases_goal',
  'hand_lanes',
  'deck_counter_open',
  'battle_history',
  'battle_menu_open',
  'battle_menu_contents',
  'mulligan_intro',
  'mulligan_select',
  'mulligan_confirm',
  'play_unit_a',
  'enemy_action',
  'combat_after_actions',
  'adjacent_swap',
  'redeploy',
  'effect_card',
  'empty_lane',
  'final_pass',
]);

export const TUTORIAL_STEPS = Object.freeze([
  { id: 'bases_goal', phase: 'ui', expected: { type: 'tap_continue' }, highlightTarget: 'enemy_base', text: { pl: 'Zbij bazę przeciwnika. Chroń swoją.', en: 'Break the enemy base. Protect yours.' } },
  { id: 'hand_lanes', phase: 'ui', expected: { type: 'tap_continue' }, highlightTarget: 'player_hand_and_lanes', text: { pl: 'Zagrywaj karty na trzy linie walki.', en: 'Play cards into three battle lanes.' } },
  { id: 'deck_counter_open', phase: 'ui', expected: { type: 'click_deck', target: 'deck_counter' }, highlightTarget: 'deck_counter', text: { pl: 'TALIA pokazuje, ile kart zostało. Kliknij ją.', en: 'DECK shows how many cards remain. Tap it.' } },
  { id: 'battle_history', phase: 'ui', expected: { type: 'close_deck', target: 'deck_info_panel' }, highlightTarget: 'battle_history', text: { pl: 'Tu zapisuje się historia walki.', en: 'Battle history is recorded here.' } },
  { id: 'battle_menu_open', phase: 'ui', expected: { type: 'click_battle_menu', target: 'battle_menu_button' }, highlightTarget: 'battle_menu_button', text: { pl: 'Otwórz menu bitwy.', en: 'Open the battle menu.' } },
  { id: 'battle_menu_contents', phase: 'ui', expected: { type: 'close_battle_menu', target: 'battle_menu_panel' }, highlightTarget: 'battle_menu_panel', text: { pl: 'Tu są zasady, ustawienia i poddanie.', en: 'Rules, settings, and surrender are here.' } },
  { id: 'mulligan_intro', phase: 'mulligan', expected: { type: 'tap_continue' }, highlightTarget: 'player_hand', text: { pl: 'Przed walką możesz wymienić do dwóch kart.', en: 'Before battle, you may replace up to two cards.' } },
  { id: 'mulligan_select', phase: 'mulligan', expected: { type: 'select_mulligan_card' }, highlightTarget: 'mulligan_card', text: { pl: 'Wybierz jedną kartę do wymiany.', en: 'Choose one card to replace.' } },
  { id: 'mulligan_confirm', phase: 'mulligan', expected: { type: 'confirm_mulligan', target: 'player_base_button' }, highlightTarget: 'player_base_button', text: { pl: 'Potwierdź wymianę.', en: 'Confirm the replacement.' } },
  { id: 'play_unit_a', phase: 'gameplay', expected: { type: 'play_card_to_slot', slotIndex: 0 }, highlightTarget: 'board_slot', text: { pl: 'Zagraj jednostkę na planszę.', en: 'Play a unit onto the board.' } },
  { id: 'enemy_action', phase: 'gameplay', expected: { type: 'wait_enemy_action' }, highlightTarget: 'enemy_hand', text: { pl: 'Przeciwnik też wykonuje jedną akcję.', en: 'The enemy also takes one action.' } },
  { id: 'combat_after_actions', phase: 'gameplay', expected: { type: 'wait_combat' }, highlightTarget: 'battle_lanes', text: { pl: 'Po akcjach obu stron linie walczą.', en: 'After both actions, the lanes fight.' } },
  { id: 'adjacent_swap', phase: 'gameplay', expected: { type: 'swap_adjacent_units', fromIndex: 0, toIndex: 1 }, highlightTarget: 'adjacent_units', text: { pl: 'Zamień sąsiednie jednostki miejscami.', en: 'Swap adjacent units.' } },
  { id: 'redeploy', phase: 'gameplay', expected: { type: 'redeploy_unit' }, highlightTarget: 'occupied_board_slot', text: { pl: 'Jednostka z ręki może zastąpić tę na planszy.', en: 'A unit from your hand can replace one on the board.' } },
  { id: 'effect_card', phase: 'gameplay', expected: { type: 'play_effect' }, highlightTarget: 'effect_card', text: { pl: 'Efekty działają od razu i znikają.', en: 'Effects resolve immediately, then disappear.' } },
  { id: 'empty_lane', phase: 'gameplay', expected: { type: 'tap_continue' }, highlightTarget: 'empty_lane', text: { pl: 'Pusta linia uderza w bazę.', en: 'An empty lane strikes the base.' } },
  { id: 'final_pass', phase: 'gameplay', expected: { type: 'pass', target: 'player_base_button' }, highlightTarget: 'player_base_button', text: { pl: 'Masz dobrą pozycję. Użyj PASS.', en: 'Your position is good. Use PASS.' } },
]);

export function getTutorialSteps() {
  return TUTORIAL_STEPS;
}
