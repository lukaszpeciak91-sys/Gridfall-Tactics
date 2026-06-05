function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }

  for (const child of Object.values(value)) {
    deepFreeze(child);
  }

  return Object.freeze(value);
}

const presentation = {
  aggro: {
    displayNameEn: 'Porcelain Court',
    displayNamePl: 'Porcelanowy Dwór',
    shortConcept: 'Immortal aristocrats transferred their consciousness into porcelain automata and preserve three centuries of etiquette by harvesting peasants into life-sustaining serum.',
    tone: 'Decadent, theatrical, elegant, sadistic, chemically dependent, artificially beautiful, and darkly comic.',
    styleTags: [
      'rococo chaos',
      'powdered aristocracy',
      'consciousness transfer',
      'three centuries of etiquette',
      'harvested serum stock',
      'artificial beauty hiding cruelty',
      'porcelain automata',
      'ballroom violence',
      'elegant insanity',
      'televised ballroom violence',
      'chemical dependence',
      'ceremonial brutality',
      'late-18th-century decadence',
      'tea party massacre',
      'aristocratic frenzy',
      'cracked porcelain',
      'decorative brutality',
      'masquerade horror',
      'noble madness',
      'psychotic etiquette',
      'theatrical aggression',
      'violent rococo',
      'decadent apocalypse',
    ],
    visualTags: [
      'powdered wigs',
      'gold trim',
      'cracked masks',
      'lace uniforms',
      'rose gardens',
      'porcelain servants',
      'porcelain automata',
      'gold syringes',
      'crystal ampoules',
      'velvet medical rituals',
      'serum vats disguised as luxuries',
      'tea automata',
      'dueling rapiers',
      'ballroom lighting',
      'pastel luxury',
      'candlelit carnage',
    ],
    gameplayFeel: 'Fast tempo, burst aggression, theatrical attacks, stylish violence, chaotic pressure.',
    colorNotes: 'Pastel cream, blush pink, powder blue, porcelain white, antique gold, candle amber, and sharp blood-red accents.',
    cardNameOverrides: {
      aggro_runner_1: { nameEn: 'Ballroom Duelist', namePl: 'Balowy Pojedynkowicz' },
      aggro_berserker_1: { nameEn: 'Mad Countess', namePl: 'Obłąkana Hrabina' },
      aggro_glass_cannon_1: { nameEn: 'Porcelain Golem', namePl: 'Porcelanowy Golem' },
      aggro_flanker_1: { nameEn: 'Sadistic Marquis', namePl: 'Sadystyczny Markiz' },
      aggro_scout_1: { nameEn: 'Tea Courier', namePl: 'Herbaciany Kurier' },
      aggro_full_attack_1: { nameEn: 'Velvet Serum', namePl: 'Aksamitne Serum' },
      aggro_rush_1: { nameEn: 'Crimson Waltz', namePl: 'Karmazynowy Walc' },
      aggro_pierce_strike_1: { nameEn: 'Crystal Rapier', namePl: 'Kryształowy Rapier' },
      aggro_adrenaline_1: { nameEn: 'Maniacal Masquerade', namePl: 'Maniakalna Maskarada' },
      aggro_quick_fix_1: { nameEn: 'Mercy', namePl: 'Miłosierdzie' },
    },
    cardArtDirections: {
      aggro_berserker_1: 'A decadent aristocratic court lady with cracked porcelain beauty and a massive ballroom dress silhouette, emotionally collapsing under elegance as her body and composure fracture into escalating danger; avoid generic berserker, armored warrior, or masculine noble reads.',
      aggro_flanker_1: 'A libertine aristocrat and elegant predator in white gloves, lace, and immaculate refinement, performing ceremonial sadism with controlled cruelty rather than chaotic rage; avoid generic duelist, berserker, or rogue silhouettes.',
      aggro_full_attack_1: 'Aristocratic combat stimulants and decadent immortality treatment: porcelain syringes, gold needles, crystal ampoules, glowing perfumed serum, candlelit velvet medical horror, and bio-alchemical addiction sustaining the immortal court; avoid feast scenes, generic fantasy potions, or modern sci-fi biotech.',
      aggro_rush_1: 'A violent partner-swapping ballroom dance with elegant rotational momentum, swirling formalwear, theatrical choreography, romanticized impact, and televised crimson spectacle.',
      aggro_quick_fix_1: 'Ceremonial healing through cruelty: aristocratic politeness masking refined medical brutality, elegant sadism presented as compassion, and mercy administered as etiquette.',
    },
  },
  control: {
    displayNameEn: 'Orden der Glasköpfe',
    displayNamePl: 'Orden der Glasköpfe',
    shortConcept: 'Techno-occult totalitarian scientists preserved their heads in jars after a ritual catastrophe destroyed their world and now hunt for a signal that can retune reality.',
    tone: 'Cold, authoritarian, cerebral, paranoid, contaminated, and occult-industrial.',
    styleTags: [
      'techno-occult Reich',
      'brain-in-jar dystopia',
      'ritual catastrophe',
      'destroyed homeworld',
      'shadow-consumption contamination',
      'reality-retuning signal search',
      'mechanical totalitarianism',
      'cold technocracy',
      'neural warfare',
      'signal control',
      'cyber occultism',
      'pseudo-scientific fascism',
      'grim machinery',
      'industrial paranoia',
      'mechanical surveillance',
      'authoritarian sci-fi',
      'cerebral horror',
      'machine theology',
    ],
    visualTags: [
      'glass cylinders',
      'red optics',
      'steel walkers',
      'spider mechs',
      'suspension fluid',
      'neural cables',
      'black trench coats',
      'laboratory machinery',
      'surveillance towers',
      'mechanical limbs',
      'signal arrays',
      'shadow-eaten surfaces',
      'calibration pylons',
    ],
    gameplayFeel: 'Manipulation, disruption, tactical control, debuffs, forced positioning, system interference, signal retuning.',
    colorNotes: 'Cold glass green, surgical white, gunmetal, black rubber, oxidized steel, warning red optics, and sickly lab-fluid highlights.',
    cardNameOverrides: {
      control_drone_1: { nameEn: 'Relay', namePl: 'Przekaźnik' },
      control_swap_1: { nameEn: 'Signal Shift', namePl: 'Przesunięcie Sygnału' },
      control_jam_signal_1: { nameEn: 'Signal Jam', namePl: 'Zakłócenie Sygnału' },
      control_system_override_1: { nameEn: 'System Override', namePl: 'Przejęcie Systemu' },
      control_recall_1: { nameEn: 'Extraction', namePl: 'Ekstrakcja' },
    },
  },
  swarm: {
    displayNameEn: 'Spore Choir',
    displayNamePl: 'Chór Zarodników',
    shortConcept: 'A planetary superorganism absorbed its biosphere into one evolving consciousness where all forms grow, collapse, and recombine as one Choir.',
    tone: 'Lush, hallucinogenic, organic, eerie, adaptive, and strangely transcendent.',
    styleTags: [
      'psychedelic biology',
      'merged biosphere',
      'beautiful bio-horror',
      'planetary superorganism',
      'neither fungus animal nor plant',
      'shared consciousness',
      'spore dreamscape',
      'hallucinogenic ecosystem',
      'bioluminescent horror',
      'living planet',
      'organic transcendence',
      'neural ecology',
      'symbiotic nightmare',
      'soft apocalypse',
      'wet organic sci-fi',
      'continuous growth and collapse',
      'recombining bodies',
    ],
    visualTags: [
      'fluorescent growths',
      'glowing spores',
      'wet textures',
      'organic fibers',
      'breathing moss',
      'translucent flesh',
      'psychedelic colors',
      'bioluminescence',
      'coral-like growths',
      'living roots',
      'pulsating organisms',
      'dreamlike forests',
      'merged bodies',
      'collapse-and-regrowth forms',
    ],
    gameplayFeel: 'Expansion, multiplication, collective growth, planetary recombination, organic pressure, swarm saturation.',
    colorNotes: 'Bioluminescent cyan, ultraviolet violet, fungal orange, wet moss green, coral pink, and luminous spore haze.',
    cardNameOverrides: {
      swarm_grunt_1: { nameEn: 'Bloomling', namePl: 'Rozkwitnik' },
      swarm_spitter_1: { nameEn: 'Spore Spitter', namePl: 'Zarodnikowy Plwacz' },
      swarm_brood_1: { nameEn: 'Mycelial Brood', namePl: 'Miot Grzybni' },
      swarm_rusher_1: { nameEn: 'Lichencrawler', namePl: 'Porostowy Pełzacz' },
      swarm_alpha_1: { nameEn: 'Choir Alpha', namePl: 'Alfa Chóru' },
      swarm_spawn_1: { nameEn: 'Sudden Bloom', namePl: 'Nagły Rozkwit' },
      swarm_swarm_attack_1: { nameEn: 'Shared Frenzy', namePl: 'Wspólna Gorączka' },
      swarm_regrow_1: { nameEn: 'Regrowth Cycle', namePl: 'Cykl Odrostu' },
      swarm_flood_1: { nameEn: 'Spore Flood', namePl: 'Powódź Zarodników' },
      swarm_recycle_1: { nameEn: 'Substrate', namePl: 'Pożywka' },
    },
  },
  'attrition-swarm': {
    displayNameEn: 'Gravehearts',
    displayNamePl: 'Gravehearts',
    shortConcept: 'The dead never realized the New Year’s Eve 1999/2000 apocalypse happened; degraded bodies repeat the final day as memory decays into dangerous routine.',
    tone: 'Melancholic, degraded, confused, instinctive, dangerous, tragic, and darkly absurd.',
    styleTags: [
      'New Year’s Eve 1999 apocalypse',
      'final-day repetition',
      'dead who never realized the world ended',
      'memory decay',
      'instinct replacing identity',
      'zombie-like confusion',
      'dangerous routine',
      'obsolete technology',
      'degraded bodies',
      'forgotten rituals',
      'emotional echoes',
      'melancholic persistence',
      'not primarily necromancers',
    ],
    visualTags: [
      'New Year decorations',
      'dead partygoers',
      'broken clocks',
      'ruined TVs',
      'obsolete computers',
      'emergency lights',
      'faded identity cards',
      'stitched bodies',
      'mismatched replacement limbs',
      'reconstructed faces',
      'commuters repeating routes',
      'dangerous crowds moving by instinct',
    ],
    gameplayFeel: 'Death value, recurring units, sacrificial advantage, lingering pressure, emotional attrition, degraded persistence, final-day repetition.',
    colorNotes: 'Midnight blue, dead streetlight amber, funeral black, faded party silver, bone white, old CRT green, emergency red, and washed-out winter gray.',
    cardNameOverrides: {
      attrition_swarm_husk_1: { nameEn: 'Hollow Groom', namePl: 'Pusty Pan Młody' },
      attrition_swarm_carrier_1: { nameEn: 'Coffin Bearer', namePl: 'Trumniarz' },
      attrition_swarm_leech_1: { nameEn: 'Grave Leech', namePl: 'Pijawka' },
      attrition_swarm_rotcaller_1: { nameEn: 'Rotcaller', namePl: 'Dyrygent' },
      attrition_swarm_abomination_1: { nameEn: 'Mourning Giant', namePl: 'Żałobny Olbrzym' },
      attrition_swarm_funeral_pyre_1: { nameEn: 'Funeral Pyre', namePl: 'Stos' },
      attrition_swarm_infect_1: { nameEn: 'Rotten Gift', namePl: 'Zgniły Upominek' },
      attrition_swarm_feast_1: { nameEn: 'Last Supper', namePl: 'Ostatnia Wieczerza' },
      attrition_swarm_rise_again_1: { nameEn: 'Dance Again', namePl: 'Zatańcz Raz Jeszcze' },
      attrition_swarm_grave_call_1: { nameEn: 'Grave Call', namePl: 'Wezwanie Grobu' },
    },
  },
  tank: {
    displayNameEn: 'Empire of the Golden Sun',
    displayNamePl: 'Imperium Złotego Słońca',
    shortConcept: 'A fanatical solar reptilian empire faces extinction through prophecy, sacred gold, and civilization-scale certainty while waiting for a promised miracle that never arrives.',
    tone: 'Monumental, religious, tragic, imperial, fanatical, patient, and doomed.',
    styleTags: [
      'solar dinosaur empire',
      'fanatical solar emperor',
      'prophetic revelation',
      'civilization-scale self-destruction',
      'religious certainty',
      'waiting for a promised miracle',
      'reptilian imperium',
      'ancient super civilization',
      'imperial decay',
      'sacred gold',
      'monumental warfare',
      'obsidian dynasty',
      'sun worship empire',
      'prehistoric empire',
      'armored raptors',
      'ancient military order',
      'ceremonial war culture',
      'doomed magnificence',
      'extinction through prophecy',
    ],
    visualTags: [
      'gold armor',
      'obsidian weapons',
      'basalt fortresses',
      'giant banners',
      'solar symbols',
      'feathered raptors',
      'heavy reptilian armor',
      'ceremonial crests',
      'volcanic stone',
      'imperial arenas',
      'massive shields',
      'ancient monuments',
      'emperor iconography',
      'processional temples',
    ],
    gameplayFeel: 'Immovable defense, sustain, armored advance, imperial resilience, heavy battlefield presence, religious certainty, survival through attrition.',
    colorNotes: 'Imperial gold, obsidian black, basalt gray, volcanic red, sunlit amber, jade patina, and desaturated ceremonial ivory.',

    cardArtDirections: {
      tank_wall_1: 'Ancient armored sauropod lying across the path as an immovable sacred barricade, with a massive old body, ceremonial gold armor, and imperial dignity; not an obsidian fortress or object.',
    },
    cardNameOverrides: {
      tank_shieldbearer_1: { nameEn: 'Throne Guardian', namePl: 'Strażnik Tronu' },
      tank_heavy_1: { nameEn: 'Imperial Colossus', namePl: 'Imperialny Kolos' },
      tank_guardian_1: { nameEn: 'Goldscale', namePl: 'Złotołuski' },
      tank_wall_1: { nameEn: 'Elder Tam-Tam', namePl: 'Stary Tam-Tam' },
      tank_bruiser_1: { nameEn: 'Broken Fang Veteran', namePl: 'Weteran Złamanego Kła' },
      tank_fortify_1: { nameEn: 'Solar Fortification', namePl: 'Solarne Umocnienie' },
      tank_stability_1: { nameEn: "Emperor's Will", namePl: 'Wola Imperatora' },
      tank_reinforce_1: { nameEn: 'Rite of Renewal', namePl: 'Rytuał Odnowy' },
      tank_last_stand_1: { nameEn: 'Last Legion', namePl: 'Ostatni Legion' },
      tank_repair_kit_1: { nameEn: 'Golden Carapace', namePl: 'Złoty Karapaks' },
    },
  },
  wardens: {
    displayNameEn: 'Mammoth Clans',
    displayNamePl: 'Klany Mamutów',
    shortConcept: 'Neanderthal descendants domesticated mammoths and migrate across equatorial tundra as Earth drifts from the Sun, warmth dwindles, and cosmic Frost closes in.',
    tone: 'Stoic, cold, grounded, prehistoric, migratory, defensive, and survivalist.',
    styleTags: [
      'Earth drifting away from the Sun',
      'eternal ice age',
      'ice age empire',
      'mammoth civilization',
      'tundra fortress',
      'prehistoric military',
      'glacial warfare',
      'frozen frontier',
      'migration civilization',
      'dwindling warmth',
      'cosmic Frost entity',
      'survival through movement',
      'neanderthal empire',
      'primal fortification',
      'snowbound legion',
      'ancient survivalism',
      'tribal phalanx',
      'ice bastion',
    ],
    visualTags: [
      'mammoth cavalry',
      'fur armor',
      'frozen fortresses',
      'bone weapons',
      'snow storms',
      'glacial cliffs',
      'heavy spears',
      'ice shields',
      'tundra camps',
      'frozen banners',
      'wool and leather',
      'massive beasts',
      'migrating mammoth caravans',
      'low sun',
      'Frost auroras',
    ],
    gameplayFeel: 'Defensive line, endurance, fortified positions, holding ground, defensive friction, line denial, migration survival.',
    colorNotes: 'Glacier blue, snow white, mammoth brown, leather tan, bone ivory, storm gray, cold banner red, and faint low-sun gold.',
    cardNameOverrides: {
      wardens_sentinel_1: { nameEn: 'Tusk Guard', namePl: 'Strażnik Kłów' },
      wardens_spearwall_1: { nameEn: 'Tundra Hunter', namePl: 'Łowca Tundry' },
      wardens_halberdier_1: { nameEn: 'Ice Pike', namePl: 'Lodowa Pika' },
      wardens_bastion_guard_1: { nameEn: 'Tururuk', namePl: 'Tururuk' },
      wardens_watch_captain_1: { nameEn: 'Tererek', namePl: 'Tererek' },
      wardens_brace_1: { nameEn: 'Bone Shields', namePl: 'Kościane Tarcze' },
      wardens_shield_push_1: { nameEn: 'Mammoth Stampede', namePl: 'Mamuci Napór' },
      wardens_stand_firm_1: { nameEn: 'Endure the Cold', namePl: 'Przetrwać Mróz' },
      wardens_reinforce_line_1: { nameEn: 'Lock the Line', namePl: 'Zewrzeć Szereg' },
      wardens_hold_the_line_1: { nameEn: 'Hold the Ice Pass', namePl: 'Utrzymać Przełęcz' },
    },
  },
};

export const factionPresentation = deepFreeze(presentation);

export function getFactionPresentation(factionId) {
  return factionPresentation[factionId] ?? null;
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.length > 0;
}

export function getFactionPresentationName(factionId, locale = 'en', fallbackName) {
  const safeFallback = isNonEmptyString(fallbackName)
    ? fallbackName
    : isNonEmptyString(factionId)
      ? factionId
      : null;
  const presentation = getFactionPresentation(factionId);
  if (!presentation) {
    return safeFallback;
  }

  if (locale === 'pl' && isNonEmptyString(presentation.displayNamePl)) {
    return presentation.displayNamePl;
  }

  if (isNonEmptyString(presentation.displayNameEn)) {
    return presentation.displayNameEn;
  }

  return safeFallback;
}

export function getCardPresentationName(card, locale = 'en') {
  const cardId = card?.id;
  if (typeof cardId !== 'string') {
    return card?.name;
  }

  for (const faction of Object.values(factionPresentation)) {
    const override = faction.cardNameOverrides[cardId];
    if (override) {
      if (locale === 'pl' && isNonEmptyString(override.namePl)) {
        return override.namePl;
      }

      if (isNonEmptyString(override.nameEn)) {
        return override.nameEn;
      }

      return card?.name;
    }
  }

  return card?.name;
}
