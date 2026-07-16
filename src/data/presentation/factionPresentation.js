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
    loreBlurbEn: 'Dimension C-69: the aristocracy discovered immortality and, as tradition demands, sent the bill to everyone below them. When even serum ran short of people, the porcelain nobles began dueling over the last scraps of life with all the grace of a class that missed its own funeral.',
    loreBlurbPl: 'Wymiar C-69: arystokracja odkryła nieśmiertelność i, zgodnie z tradycją, wystawiła rachunek poddanym. Gdy ludzi zabrakło nawet na serum, porcelanowi możni zaczęli pojedynkować się o resztki życia z elegancją klasy, która przegapiła własny pogrzeb.',
    shortConcept: 'A decadent immortal aristocracy of cracked porcelain automata sustains itself through televised ballroom violence, perfumed chemicals, and ceremonial brutality.',
    tone: 'Decadent, theatrical, elegant, sadistic, chemically unstable, and darkly comic.',
    styleTags: [
      'rococo chaos',
      'powdered aristocracy',
      'porcelain automata',
      'ballroom violence',
      'elegant insanity',
      'televised ballroom violence',
      'chemical degeneration',
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
    loreBlurbEn: 'Dimension G-44: they tried to win the last war with a signal from the bottom of reality, and knocked the world out of tune like a cheap receiver. For decades, the glass heads have tried to restore the old order, though the future master race has already gone moldy in the incubators.',
    loreBlurbPl: 'Wymiar G-44: chcieli wygrać ostatnią wojnę sygnałem z samego dna rzeczywistości, lecz rozstroili świat jak tani odbiornik. Od dekad szklane głowy próbują odtworzyć dawny porządek, choć przyszła rasa panów zdążyła już spleśnieć w inkubatorach.',
    shortConcept: 'A techno-occult order of glass-brained commanders, signal machinery, and neural warfare turns free will into a broadcast variable.',
    tone: 'Cold, authoritarian, cerebral, paranoid, and occult-industrial.',
    styleTags: [
      'techno-occult Reich',
      'brain-in-jar dystopia',
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
    ],
    gameplayFeel: 'Manipulation, disruption, tactical control, debuffs, forced positioning, system interference.',
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
    loreBlurbEn: 'Dimension M-10: it began with a sock no reasonable person wanted to touch. The mold took this as an invitation to adventure, ate the planet down to the crust, and then, for lack of a world, moved on to itself.',
    loreBlurbPl: 'Wymiar M-10: zaczęło się od skarpety, której nikt rozsądny nie chciał dotknąć. Pleśń uznała to za zaproszenie do przygody, zjadła planetę do gołej skorupy, a potem z braku świata zabrała się za samą siebie.',
    shortConcept: 'A psychedelic mycelial collective blooms into beautiful bio-horror as one organism learns to sing through many doomed bodies.',
    tone: 'Lush, hallucinogenic, organic, eerie, and strangely transcendent.',
    styleTags: [
      'psychedelic biology',
      'cosmic mycelium',
      'beautiful bio-horror',
      'fungal collective',
      'shared consciousness',
      'spore dreamscape',
      'hallucinogenic ecosystem',
      'bioluminescent horror',
      'living planet',
      'organic transcendence',
      'neural fungus',
      'symbiotic nightmare',
      'soft apocalypse',
      'wet organic sci-fi',
    ],
    visualTags: [
      'fluorescent fungi',
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
    ],
    gameplayFeel: 'Expansion, multiplication, collective growth, spreading organism, organic pressure, swarm saturation.',
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
    loreBlurbEn: 'Dimension Y-2: on New Year’s Eve 2000, the computers finally kept their promise and ended the world. The pathogen and the radiation killed humanity, though most people simply failed to notice; now they rot through the old rituals of daily life, as memory gives way to mindless mass.',
    loreBlurbPl: 'Wymiar Y-2: w sylwestra roku 2000 komputery wreszcie spełniły obietnicę i zakończyły świat. Patogen i promieniowanie zabiły ludzi, choć większość z nich zwyczajnie tego nie zauważyła; dziś gniją w dawnych rytuałach codzienności, a pamięć ustępuje miejsca bezmyślnej masie.',
    shortConcept: 'A tragicomic funerary society of undead lovers, coffin bearers, and graveyard dancers turns mourning into repeatable value.',
    tone: 'Romantic, melancholic, gothic, funny-sad, and grotesquely devoted.',
    styleTags: [
      'gothic romance',
      'necro-rockabilly',
      'funeral swing',
      'romantic necromancy',
      'tragicomic horror',
      'cemetery culture',
      'undead lovers',
      'melancholic grotesque',
      'burtonesque death fantasy',
      'graveyard elegance',
      'eternal mourning',
      'undead devotion',
      'psychotronic horror',
      'love beyond death',
    ],
    visualTags: [
      'velvet coffins',
      'funeral roses',
      'pale makeup',
      'cemetery neon',
      'graveyard suits',
      'vintage hearses',
      'dancing skeletons',
      'mourning dresses',
      'cracked tombstones',
      'gothic hairstyles',
      'moonlit graveyards',
      'undead ballroom',
    ],
    gameplayFeel: 'Death value, recurring units, sacrificial advantage, lingering pressure, emotional attrition, undead persistence.',
    colorNotes: 'Moonlit blue, funeral black, velvet burgundy, bone white, wilted rose pink, graveyard green, and neon cemetery accents.',
    cardNameOverrides: {
      attrition_swarm_husk_1: { nameEn: 'Hollow Groom', namePl: 'Pusty Pan Młody' },
      attrition_swarm_carrier_1: { nameEn: 'Coffin Bearer', namePl: 'Trumniarz' },
      attrition_swarm_leech_1: { nameEn: 'Grave Leech', namePl: 'Pijawka' },
      attrition_swarm_rotcaller_1: { nameEn: 'Party Host', namePl: 'Wodzirej' },
      attrition_swarm_abomination_1: { nameEn: 'Mourning Giant', namePl: 'Żałobny Olbrzym' },
      attrition_swarm_funeral_pyre_1: { nameEn: 'Funeral Pyre', namePl: 'Stos' },
      attrition_swarm_infect_1: { nameEn: 'Rotten Gift', namePl: 'Zgniły Upominek' },
      attrition_swarm_feast_1: { nameEn: 'Feast', namePl: 'Ostatnia Wieczerza' },
      attrition_swarm_rise_again_1: { nameEn: 'Dance Again', namePl: 'Zatańcz Raz Jeszcze' },
      attrition_swarm_grave_call_1: { nameEn: 'Grave Call', namePl: 'Wezwanie Grobu' },
    },
  },
  overclock: {
    displayNameEn: 'Project H.E.R.D.',
    displayNamePl: 'Program P.A.S.Z.A.',
    loreBlurbEn: 'Dimension B-80: the government of a certain Eastern European people’s republic decided that livestock was gravely underused in military affairs. Project H.E.R.D. exceeded the plan: it scrubbed Earth clean of life, then began tidying up its own ranks.',
    loreBlurbPl: 'Wymiar B-80: rząd pewnego wschodnioeuropejskiego demoludu uznał, że zwierzęta hodowlane są stanowczo za mało wykorzystywane militarnie. Program P.A.S.Z.A. wykonał plan z nadwyżką: wyczyścił Ziemię z życia, a potem zaczął porządkować własne szeregi.',
    shortConcept: 'An unattended late-1980s state agricultural and military breeding program keeps producing hostile engineered livestock after humanity disappears.',
    tone: 'Bureaucratic, agricultural, absurd, official, dirty, conditioned, and quietly horrific.',
    styleTags: [
      'late Eastern Bloc agriculture',
      'state breeding program',
      'military livestock',
      'government veterinary labs',
      'industrial farms',
      'bureaucratic animal weaponization',
      'conditioned aggression',
      'feed-silo horror',
      'official absurdity',
      'rural military directive',
      'biological specialization',
      'expendable livestock',
    ],
    visualTags: [
      'concrete barns',
      'feed silos',
      'animal tags',
      'rubber tubing',
      'industrial enamel',
      'veterinary stalls',
      'state forms',
      'livestock chutes',
      'feed yellow paint',
      'dirty cream walls',
      'straw bedding',
      'industrial orange markings',
    ],
    gameplayFeel: 'Tempo disruption, forced engagements, conditioned bursts, temporary advantage, unstable specialization, and expendable biological pressure.',
    colorNotes: 'Feed yellow, warm milk white, dirty cream, straw, industrial orange, weathered concrete, black rubber, and chipped enamel; avoid cyberpunk neon, cold blue glow, glass, and signal-tech colors.',
    cardNameOverrides: {
      overclock_hot_runner_1: { nameEn: 'Decoy Hare', namePl: 'Zając Wabik' },
      overclock_pain_engine_1: { nameEn: 'Suppressor Hog', namePl: 'Wieprz Tłumiący' },
      overclock_golem_1: { nameEn: 'Single-Use Ox', namePl: 'Wół Jednorazowy' },
      overclock_gap_hunter_1: { nameEn: 'Breach Ram', namePl: 'Baran Wyłomowy' },
      overclock_mob_champion_1: { nameEn: 'Command Hen', namePl: 'Kwoka Dowodząca' },
      overclock_redline_1: { nameEn: 'Quota Exceeded', namePl: 'Norma Przekroczona' },
      overclock_forced_march_1: { nameEn: 'Stock Reassignment', namePl: 'Korekta Obsady' },
      overclock_crack_strike_1: { nameEn: 'Breach Test', namePl: 'Test Przebicia' },
      overclock_ignition_1: { nameEn: 'Conditioned Reflex', namePl: 'Odruch Warunkowy' },
      overclock_mercy_1: { nameEn: 'Temper Shift', namePl: 'Korekta Temperamentu' },
    },
    cardArtDirections: {
      overclock_hot_runner_1: 'A tagged decoy hare in a concrete state breeding corridor, wired with crude veterinary restraints and official livestock markings; biological, rural, and bureaucratic, not robotic or cyberpunk.',
      overclock_golem_1: 'A massive single-use ox bred for military labor inside an industrial livestock bay, heavy and doomed, with feed-silo colors, rubber tubing, chipped enamel, and absurd official handling equipment.',
      overclock_mercy_1: 'A veterinary temperament-correction procedure in a late-Eastern-Bloc agricultural lab: clipboards, animal tags, rubber hoses, restraint gates, and official absurdity rather than futuristic neural control.',
    },
  },
  tank: {
    displayNameEn: 'Empire of the Golden Sun',
    displayNamePl: 'Imperium Złotego Słońca',
    loreBlurbEn: 'Dimension S-12: the Emperor declared that females were the source of all misfortune, and that the Sun would reward the faithful for removing them. The crusade succeeded, the promised maidens never arrived, and the long-lived empire was left alone with its gold, its orders, and the silence.',
    loreBlurbPl: 'Wymiar S-12: Imperator ogłosił, że źródłem wszystkich nieszczęść są samice, a Słońce wynagrodzi wiernym ich usunięcie. Krucjata zakończyła się sukcesem, obiecane dziewice nie dotarły, a długowieczne imperium zostało samo ze złotem, rozkazami i ciszą.',
    shortConcept: 'A solar reptilian imperium in decline advances under gold armor, obsidian weapons, and the unbearable weight of extinct glory.',
    tone: 'Monumental, ceremonial, ancient, proud, heavy, and doomed.',
    styleTags: [
      'solar dinosaur empire',
      'fallen golden age',
      'reptilian imperium',
      'ancient super civilization',
      'imperial decay',
      'monumental warfare',
      'obsidian dynasty',
      'sun worship empire',
      'prehistoric empire',
      'armored raptors',
      'ancient military order',
      'ceremonial war culture',
      'extinct glory',
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
    ],
    gameplayFeel: 'Immovable defense, sustain, armored advance, imperial resilience, heavy battlefield presence, survival through attrition.',
    colorNotes: 'Imperial gold, obsidian black, basalt gray, volcanic red, sunlit amber, jade patina, and desaturated ceremonial ivory.',

    cardArtDirections: {
      tank_wall_1: 'Ancient armored sauropod lying across the path as an immovable sacred barricade, with a massive old body, ceremonial gold armor, and imperial dignity; not an obsidian fortress or object.',
    },
    cardNameOverrides: {
      tank_shieldbearer_1: { nameEn: 'Throne Guardian', namePl: 'Strażnik Tronu' },
      tank_heavy_1: { nameEn: 'Imperial Colossus', namePl: 'Imperialny Kolos' },
      tank_guardian_1: { nameEn: 'Goldscale', namePl: 'Złotołuski' },
      tank_wall_1: { nameEn: 'Elder Tam-Tam', namePl: 'Stary Tam-Tam' },
      tank_bruiser_1: { nameEn: 'Fang Veteran', namePl: 'Weteran Kła' },
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
    loreBlurbEn: 'Dimension N-7: Homo sapiens died out without making much of a historical contribution, so the Neanderthal clans inherited a freezing Earth. Now they cross the equatorial tundra, hunted by the Frost, which came down from the poles carrying something worse than cold.',
    loreBlurbPl: 'Wymiar N-7: Homo sapiens wymarł bez większego wkładu w historię, więc neandertalskie klany odziedziczyły zamarzającą Ziemię. Teraz idą przez równikową tundrę, ścigane przez Mróz, który z biegunów przyniósł coś gorszego niż zimno.',
    shortConcept: 'A snowbound mammoth civilization holds glacial passes with fur-armored phalanxes, heavy spears, and primal fortifications.',
    tone: 'Stoic, cold, grounded, prehistoric, defensive, and survivalist.',
    styleTags: [
      'ice age empire',
      'mammoth civilization',
      'tundra fortress',
      'prehistoric military',
      'glacial warfare',
      'frozen frontier',
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
    ],
    gameplayFeel: 'Defensive line, endurance, fortified positions, holding ground, defensive friction, line denial.',
    colorNotes: 'Glacier blue, snow white, mammoth brown, leather tan, bone ivory, storm gray, and cold banner red.',
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

export function getFactionPresentationLoreBlurb(factionId, locale = 'en') {
  const presentation = getFactionPresentation(factionId);
  if (!presentation) {
    return '';
  }

  if (locale === 'pl' && isNonEmptyString(presentation.loreBlurbPl)) {
    return presentation.loreBlurbPl;
  }

  if (isNonEmptyString(presentation.loreBlurbEn)) {
    return presentation.loreBlurbEn;
  }

  return '';
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
