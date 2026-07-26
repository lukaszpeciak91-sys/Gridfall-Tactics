import { resolveLocalizedValue } from '../../localization/localeService.js';

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
    displayName: { en: 'Porcelain Court', pl: 'Porcelanowy Dwór' },
    lore: {
      en: {
      dimension: 'Dimension C-69',
      body: 'the aristocracy discovered immortality and, as tradition demands, sent the bill to everyone below them. When even serum ran short of people, the porcelain nobles began dueling over the last scraps of life with all the grace of a class that missed its own funeral.',
    },
      pl: {
      dimension: 'Wymiar C-69',
      body: 'arystokracja odkryła nieśmiertelność i, zgodnie z tradycją, wystawiła rachunek poddanym. Gdy ludzi zabrakło nawet na serum, porcelanowi możni zaczęli pojedynkować się o resztki życia z elegancją klasy, która przegapiła własny pogrzeb.',
    },
    },
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
      aggro_runner_1: { name: { en: 'Ballroom Duelist', pl: 'Balowy Pojedynkowicz' } },
      aggro_berserker_1: { name: { en: 'Mad Countess', pl: 'Obłąkana Hrabina' } },
      aggro_glass_cannon_1: { name: { en: 'Porcelain Golem', pl: 'Porcelanowy Golem' } },
      aggro_flanker_1: { name: { en: 'Sadistic Marquis', pl: 'Sadystyczny Markiz' } },
      aggro_scout_1: { name: { en: 'Tea Courier', pl: 'Herbaciany Kurier' } },
      aggro_full_attack_1: { name: { en: 'Velvet Serum', pl: 'Aksamitne Serum' } },
      aggro_rush_1: { name: { en: 'Crimson Waltz', pl: 'Karmazynowy Walc' } },
      aggro_pierce_strike_1: { name: { en: 'Crystal Rapier', pl: 'Kryształowy Rapier' } },
      aggro_adrenaline_1: { name: { en: 'Maniacal Masquerade', pl: 'Maniakalna Maskarada' } },
      aggro_quick_fix_1: { name: { en: 'Mercy', pl: 'Miłosierdzie' } },
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
    displayName: { en: 'Orden der Glasköpfe', pl: 'Orden der Glasköpfe' },
    lore: {
      en: {
      dimension: 'Dimension G-44',
      body: 'they tried to win the last war with a signal from the bottom of reality, and knocked the world out of tune like a cheap receiver. For decades, the glass heads have tried to restore the old order, though the future master race has already gone moldy in the incubators.',
    },
      pl: {
      dimension: 'Wymiar G-44',
      body: 'chcieli wygrać ostatnią wojnę sygnałem z samego dna rzeczywistości, lecz rozstroili świat jak tani odbiornik. Od dekad szklane głowy próbują odtworzyć dawny porządek, choć przyszła rasa panów zdążyła już spleśnieć w inkubatorach.',
    },
    },
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
      control_drone_1: { name: { en: 'Relay', pl: 'Przekaźnik' } },
      control_swap_1: { name: { en: 'Signal Shift', pl: 'Przesunięcie Sygnału' } },
      control_jam_signal_1: { name: { en: 'Signal Jam', pl: 'Zakłócenie Sygnału' } },
      control_system_override_1: { name: { en: 'System Override', pl: 'Przejęcie Systemu' } },
      control_recall_1: { name: { en: 'Extraction', pl: 'Ekstrakcja' } },
    },
  },
  swarm: {
    displayName: { en: 'Spore Choir', pl: 'Chór Zarodników' },
    lore: {
      en: {
      dimension: 'Dimension M-10',
      body: 'it began with a sock no reasonable person wanted to touch. The mold took this as an invitation to adventure, ate the planet down to the crust, and then, for lack of anything better, moved on to itself.',
    },
      pl: {
      dimension: 'Wymiar M-10',
      body: 'zaczęło się od skarpety, której nikt rozsądny nie chciał dotknąć. Pleśń uznała to za zaproszenie do przygody, zjadła planetę do gołej skorupy, a potem z braku laku zabrała się za samą siebie.',
    },
    },
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
      swarm_grunt_1: { name: { en: 'Bloomling', pl: 'Rozkwitnik' } },
      swarm_spitter_1: { name: { en: 'Spore Spitter', pl: 'Zarodnikowy Plwacz' } },
      swarm_brood_1: { name: { en: 'Mycelial Brood', pl: 'Miot Grzybni' } },
      swarm_rusher_1: { name: { en: 'Lichencrawler', pl: 'Porostowy Pełzacz' } },
      swarm_alpha_1: { name: { en: 'Choir Alpha', pl: 'Alfa Chóru' } },
      swarm_spawn_1: { name: { en: 'Sudden Bloom', pl: 'Nagły Rozkwit' } },
      swarm_swarm_attack_1: { name: { en: 'Shared Frenzy', pl: 'Wspólna Gorączka' } },
      swarm_regrow_1: { name: { en: 'Regrowth Cycle', pl: 'Cykl Odrostu' } },
      swarm_flood_1: { name: { en: 'Spore Flood', pl: 'Powódź Zarodników' } },
      swarm_recycle_1: { name: { en: 'Substrate', pl: 'Pożywka' } },
    },
  },
  'attrition-swarm': {
    displayName: { en: 'Gravehearts', pl: 'Gravehearts' },
    lore: {
      en: {
      dimension: 'Dimension Y-2',
      body: 'on New Year’s Eve 2000, the computers did end the world after all. A weapon of mass destruction triggered by the failure killed humanity, though most people simply failed to notice; now it is not only their bodies that rot, but their humanity, as memory gives way to mindless mass.',
    },
      pl: {
      dimension: 'Wymiar Y-2',
      body: 'w sylwestra roku 2000 komputery jednak zakończyły świat. Uruchomiona w wyniku awarii broń masowego rażenia zabiła ludzi, choć większość z nich zwyczajnie tego nie zauważyła; dziś gniją nie tylko ich ciała, ale ich człowieczeństwo, a pamięć ustępuje miejsca bezmyślnej masie.',
    },
    },
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
      attrition_swarm_husk_1: { name: { en: 'Hollow Groom', pl: 'Pusty Pan Młody' } },
      attrition_swarm_carrier_1: { name: { en: 'Coffin Bearer', pl: 'Trumniarz' } },
      attrition_swarm_leech_1: { name: { en: 'Grave Leech', pl: 'Pijawka' } },
      attrition_swarm_rotcaller_1: { name: { en: 'Party Host', pl: 'Wodzirej' } },
      attrition_swarm_abomination_1: { name: { en: 'Mourning Giant', pl: 'Żałobny Olbrzym' } },
      attrition_swarm_funeral_pyre_1: { name: { en: 'Funeral Pyre', pl: 'Stos' } },
      attrition_swarm_infect_1: { name: { en: 'Rotten Gift', pl: 'Zgniły Upominek' } },
      attrition_swarm_feast_1: { name: { en: 'Feast', pl: 'Ostatnia Wieczerza' } },
      attrition_swarm_rise_again_1: { name: { en: 'Dance Again', pl: 'Zatańcz Raz Jeszcze' } },
      attrition_swarm_grave_call_1: { name: { en: 'Grave Call', pl: 'Wezwanie Grobu' } },
    },
  },
  overclock: {
    displayName: { en: 'Project H.E.R.D.', pl: 'Program P.A.S.Z.A.' },
    lore: {
      en: {
      dimension: 'Dimension B-80',
      body: 'the party secretary of a certain people’s republic decided that livestock was gravely underused in military affairs. Hostile Engineered Rural Directive exceeded the plan: it scrubbed Earth clean of life, then began tidying up its own ranks.',
    },
      pl: {
      dimension: 'Wymiar B-80',
      body: 'sekretarz partii pewnego demoludu uznał, że zwierzęta hodowlane są stanowczo za mało wykorzystywane militarnie. Program Adaptacyjnej Syntezy Zwierząt Agresywnych wykonał plan z nadwyżką: wyczyścił Ziemię z życia, a potem zaczął porządkować własne szeregi.',
    },
    },
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
      overclock_hot_runner_1: { name: { en: 'Decoy Hare', pl: 'Zając Wabik' } },
      overclock_pain_engine_1: { name: { en: 'Suppressor Hog', pl: 'Wieprz Tłumiący' } },
      overclock_golem_1: { name: { en: 'Single-Use Ox', pl: 'Wół Jednorazowy' } },
      overclock_gap_hunter_1: { name: { en: 'Breach Ram', pl: 'Baran Wyłomowy' } },
      overclock_mob_champion_1: { name: { en: 'Command Hen', pl: 'Kwoka Dowodząca' } },
      overclock_redline_1: { name: { en: 'Quota Exceeded', pl: 'Norma Przekroczona' } },
      overclock_forced_march_1: { name: { en: 'Stock Reassignment', pl: 'Korekta Obsady' } },
      overclock_crack_strike_1: { name: { en: 'Breach Test', pl: 'Test Przebicia' } },
      overclock_ignition_1: { name: { en: 'Conditioned Reflex', pl: 'Odruch Warunkowy' } },
      overclock_mercy_1: { name: { en: 'Temper Shift', pl: 'Korekta Temperamentu' } },
    },
    cardArtDirections: {
      overclock_hot_runner_1: 'A tagged decoy hare in a concrete state breeding corridor, wired with crude veterinary restraints and official livestock markings; biological, rural, and bureaucratic, not robotic or cyberpunk.',
      overclock_golem_1: 'A massive single-use ox bred for military labor inside an industrial livestock bay, heavy and doomed, with feed-silo colors, rubber tubing, chipped enamel, and absurd official handling equipment.',
      overclock_mercy_1: 'A veterinary temperament-correction procedure in a late-Eastern-Bloc agricultural lab: clipboards, animal tags, rubber hoses, restraint gates, and official absurdity rather than futuristic neural control.',
    },
  },
  tank: {
    displayName: { en: 'Empire of the Golden Sun', pl: 'Imperium Złotego Słońca' },
    lore: {
      en: {
      dimension: 'Dimension S-12',
      body: 'the Emperor declared that females were the source of all misfortune, and that the Sun would reward the faithful for removing them. The crusade succeeded, the promised maidens never arrived, and the long-lived empire was left alone with its gold, its orders, and the silence.',
    },
      pl: {
      dimension: 'Wymiar S-12',
      body: 'Imperator ogłosił, że źródłem wszystkich nieszczęść są samice, a Słońce wynagrodzi wiernym ich usunięcie. Krucjata zakończyła się sukcesem, obiecane dziewice nie dotarły, a długowieczne imperium zostało samo ze złotem, rozkazami i ciszą.',
    },
    },
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
      tank_shieldbearer_1: { name: { en: 'Throne Guardian', pl: 'Strażnik Tronu' } },
      tank_heavy_1: { name: { en: 'Imperial Colossus', pl: 'Imperialny Kolos' } },
      tank_guardian_1: { name: { en: 'Goldscale', pl: 'Złotołuski' } },
      tank_wall_1: { name: { en: 'Elder Tam-Tam', pl: 'Stary Tam-Tam' } },
      tank_bruiser_1: { name: { en: 'Fang Veteran', pl: 'Weteran Kła' } },
      tank_fortify_1: { name: { en: 'Solar Fortification', pl: 'Solarne Umocnienie' } },
      tank_stability_1: { name: { en: "Emperor's Will", pl: 'Wola Imperatora' } },
      tank_reinforce_1: { name: { en: 'Rite of Renewal', pl: 'Rytuał Odnowy' } },
      tank_last_stand_1: { name: { en: 'Last Legion', pl: 'Ostatni Legion' } },
      tank_repair_kit_1: { name: { en: 'Golden Carapace', pl: 'Złoty Karapaks' } },
    },
  },
  wardens: {
    displayName: { en: 'Mammoth Clans', pl: 'Klany Mamutów' },
    lore: {
      en: {
      dimension: 'Dimension N-7',
      body: 'Homo sapiens died out without making much of a historical contribution, so the Neanderthal clans inherited a freezing Earth. Now they cross the equatorial tundra, hunted by the Frost, which came down from the poles carrying something worse than cold.',
    },
      pl: {
      dimension: 'Wymiar N-7',
      body: 'Homo sapiens wymarł bez większego wkładu w historię, więc neandertalskie klany odziedziczyły zamarzającą Ziemię. Teraz idą przez równikową tundrę, ścigane przez Mróz, który z biegunów przyniósł coś gorszego niż zimno.',
    },
    },
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
      wardens_sentinel_1: { name: { en: 'Tusk Guard', pl: 'Strażnik Kłów' } },
      wardens_spearwall_1: { name: { en: 'Tundra Hunter', pl: 'Łowca Tundry' } },
      wardens_halberdier_1: { name: { en: 'Ice Pike', pl: 'Lodowa Pika' } },
      wardens_bastion_guard_1: { name: { en: 'Tururuk', pl: 'Tururuk' } },
      wardens_watch_captain_1: { name: { en: 'Tererek', pl: 'Tererek' } },
      wardens_brace_1: { name: { en: 'Bone Shields', pl: 'Kościane Tarcze' } },
      wardens_shield_push_1: { name: { en: 'Mammoth Stampede', pl: 'Mamuci Napór' } },
      wardens_stand_firm_1: { name: { en: 'Endure the Cold', pl: 'Przetrwać Mróz' } },
      wardens_reinforce_line_1: { name: { en: 'Lock the Line', pl: 'Zewrzeć Szereg' } },
      wardens_hold_the_line_1: { name: { en: 'Hold the Ice Pass', pl: 'Utrzymać Przełęcz' } },
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

  return resolveLocalizedValue(presentation.displayName, locale, safeFallback);
}

function isLoreEntry(value) {
  return value
    && typeof value === 'object'
    && isNonEmptyString(value.dimension)
    && isNonEmptyString(value.body);
}

export function getFactionPresentationLore(factionId, locale = 'en') {
  const presentation = getFactionPresentation(factionId);
  if (!presentation) {
    return null;
  }

  const lore = resolveLocalizedValue(presentation.lore, locale, null);
  return isLoreEntry(lore) ? lore : null;
}

export function getFactionPresentationLoreBlurb(factionId, locale = 'en') {
  const lore = getFactionPresentationLore(factionId, locale);
  if (!lore) {
    return '';
  }

  return `${lore.dimension}: ${lore.body}`;
}

export function getCardPresentationName(card, locale = 'en') {
  const cardId = card?.id;
  if (typeof cardId !== 'string') {
    return card?.name;
  }

  for (const faction of Object.values(factionPresentation)) {
    const override = faction.cardNameOverrides[cardId];
    if (override) {
      return resolveLocalizedValue(override.name, locale, card?.name);
    }
  }

  return card?.name;
}
