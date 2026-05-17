# Frozen Art Bible: Gridfall Tactics

This document freezes the visual and naming direction for faction/card presentation. It is additive art direction only: it must not change gameplay, balance, faction ids, card ids, deck composition, AI behavior, or tests. The current game has **6 full base gameplay factions**: `aggro`, `tank`, `control`, `swarm`, `wardens`, and `attrition-swarm`. `attrition-swarm` is a full permanent base faction, not a temporary variant. Future armies may be presentation or thematic expansions based on these mechanical bases, but the current six factions are not placeholders.

## Global Visual Identity

**Core premise:** premium interdimensional entertainment broadcast where godlike civilizations televise the struggles of weird doomed worlds.

Gridfall should feel like a late-night multidimensional television spectacle: civilizations collapse inside tactical arenas while impossible hosts, off-screen producers, and cosmic audiences treat disaster as prestige programming. The tone is colorful, cruel, witty, and strange rather than generic heroic fantasy.

### Core Tags

- interdimensional game show
- absurd tactical card game
- pastel dystopia
- black comedy
- late-night multidimensional television
- grotesque worlds
- cosmic entertainment
- dark whimsical sci-fi
- weird civilization collapse
- satirical multiverse
- pulp multiverse fantasy
- broadcast arena aesthetic
- colorful apocalypse
- tactical absurdism

### Global Mood

- **Premium broadcast:** clean framing, strong iconography, elegant presentation hierarchy, and readable card silhouettes.
- **Civilization collapse as entertainment:** every faction should feel like a doomed world that has been packaged for spectators.
- **Dark whimsy:** grotesque subject matter can be funny, theatrical, and charming, but never meme-rendered.
- **Pulp multiverse:** faction worlds may clash, but the shared broadcast layer makes them feel curated rather than random.
- **Readable tactical art:** cards must remain legible at small size and support quick decision-making.

## Forbidden Aesthetics

Avoid these directions globally:

- generic cyberpunk neon
- generic dark fantasy
- anime proportions
- photorealism
- meme rendering
- Marvel superhero posing
- overcomplicated armor
- AI slop detail overload
- mobile game UI clutter
- unreadable chaotic compositions
- excessive particle spam
- grimdark monochrome

## UI and Broadcast Direction

The UI should feel like a high-end interdimensional broadcast package for a tactical death game.

- Use clean arena framing, controlled accent colors, and clear viewing hierarchy.
- Prefer broadcast graphics, lower-thirds, faction title cards, signal overlays, sponsor-like badges, and theatrical match framing over dense fantasy ornament.
- Treat menu/background art as a poster or channel bumper for doomed-world entertainment.
- Use satirical broadcast touches sparingly; comedy should come from presentation and world logic, not from meme UI.
- Keep card text UI-rendered and clear. Do not bake titles, rules, stats, or localization text into artwork.
- Do not add clutter that competes with gameplay readability.

## Card Art Rules

- Card art should not contain baked text.
- Card text remains UI-rendered.
- Each card should have one clear focal point.
- The main silhouette must remain readable at small size.
- Prefer iconic action, object, or character moments that communicate the presentation name without changing mechanics.
- Avoid excessive particles, smoke, tiny props, and texture-noise detail that collapses when scaled down.
- Faction-specific details should be visible, but the composition should not become an inventory sheet.
- Unit cards should prioritize character/creature silhouette and attitude.
- Effect cards may use ritual, broadcast, battlefield, object, or environmental imagery, but still need a single dominant read.
- No baked card borders, numbers, faction labels, or rules text in generated card art.

## Asset Format Notes

Discovered asset sizing guidance from the audit:

- **Menu/background art:** 9:16 portrait composition, recommended `1440x2560` WebP.
- **Faction preview art:** `1024x576` WebP.
- **Card art:** no baked text; UI renders all card text.
- **Composition:** one clear focal point per card.
- **Readability:** silhouette should read at small card size.

## Faction Visual Identities

These six visual identities map onto the six current base gameplay factions. Presentation names and art direction are additive layers over the stable faction ids; they must not rename the source faction ids or imply that any current base faction is temporary.

### aggro — Porcelain Court / Porcelanowy Dwór

**Style:** Rococo chaos, powdered aristocracy, porcelain automata, ballroom violence, elegant insanity, tea party massacre, aristocratic frenzy, cracked porcelain, decorative brutality, masquerade horror, noble madness, psychotic etiquette, theatrical aggression, violent rococo, decadent apocalypse.

**Visual tags:** powdered wigs, gold trim, cracked masks, lace uniforms, rose gardens, porcelain servants, tea automata, dueling rapiers, ballroom lighting, pastel luxury, candlelit carnage.

**Color notes:** pastel cream, blush pink, powder blue, porcelain white, antique gold, candle amber, and sharp blood-red accents.

### control — Orden der Glasköpfe

**Style:** Techno-occult Reich, brain-in-jar dystopia, mechanical totalitarianism, cold technocracy, neural warfare, signal control, cyber occultism, pseudo-scientific fascism, grim machinery, industrial paranoia, mechanical surveillance, authoritarian sci-fi, cerebral horror, machine theology.

**Visual tags:** glass cylinders, red optics, steel walkers, spider mechs, suspension fluid, neural cables, black trench coats, laboratory machinery, surveillance towers, mechanical limbs, signal arrays.

**Color notes:** cold glass green, surgical white, gunmetal, black rubber, oxidized steel, warning red optics, and sickly lab-fluid highlights.

### swarm — Spore Choir / Chór Zarodników

**Style:** Psychedelic biology, cosmic mycelium, beautiful bio-horror, fungal collective, shared consciousness, spore dreamscape, hallucinogenic ecosystem, bioluminescent horror, living planet, organic transcendence, neural fungus, symbiotic nightmare, soft apocalypse, wet organic sci-fi.

**Visual tags:** fluorescent fungi, glowing spores, wet textures, organic fibers, breathing moss, translucent flesh, psychedelic colors, bioluminescence, coral-like growths, living roots, pulsating organisms, dreamlike forests.

**Color notes:** bioluminescent cyan, ultraviolet violet, fungal orange, wet moss green, coral pink, and luminous spore haze.

### attrition-swarm — Gravehearts

**Style:** Gothic romance, necro-rockabilly, funeral swing, romantic necromancy, tragicomic horror, cemetery culture, undead lovers, melancholic grotesque, burtonesque death fantasy, graveyard elegance, eternal mourning, undead devotion, psychotronic horror, love beyond death.

**Visual tags:** velvet coffins, funeral roses, pale makeup, cemetery neon, graveyard suits, vintage hearses, dancing skeletons, mourning dresses, cracked tombstones, gothic hairstyles, moonlit graveyards, undead ballroom.

**Color notes:** moonlit blue, funeral black, velvet burgundy, bone white, wilted rose pink, graveyard green, and neon cemetery accents.

### tank — Empire of the Golden Sun / Imperium Złotego Słońca

**Style:** Solar dinosaur empire, fallen golden age, reptilian imperium, ancient super civilization, imperial decay, monumental warfare, obsidian dynasty, sun worship empire, prehistoric empire, armored raptors, ancient military order, ceremonial war culture, extinct glory.

**Visual tags:** gold armor, obsidian weapons, basalt fortresses, giant banners, solar symbols, feathered raptors, heavy reptilian armor, ceremonial crests, volcanic stone, imperial arenas, massive shields, ancient monuments.

**Color notes:** imperial gold, obsidian black, basalt gray, volcanic red, sunlit amber, jade patina, and desaturated ceremonial ivory.

### wardens — Mammoth Riders / Jeźdźcy Mamutów

**Style:** Ice age empire, mammoth civilization, tundra fortress, prehistoric military, glacial warfare, frozen frontier, neanderthal empire, primal fortification, snowbound legion, ancient survivalism, tribal phalanx, ice bastion.

**Visual tags:** mammoth cavalry, fur armor, frozen fortresses, bone weapons, snow storms, glacial cliffs, heavy spears, ice shields, tundra camps, frozen banners, wool and leather, massive beasts.

**Color notes:** glacier blue, snow white, mammoth brown, leather tan, bone ivory, storm gray, and cold banner red.

## Faction Gameplay Feelings

These are presentation feelings only. They describe how art should support existing gameplay identities without becoming gameplay logic.

- **aggro / Porcelain Court:** fast tempo, burst aggression, theatrical attacks, stylish violence, chaotic pressure.
- **control / Orden der Glasköpfe:** manipulation, disruption, tactical control, debuffs, forced positioning, system interference.
- **swarm / Spore Choir:** expansion, multiplication, collective growth, spreading organism, organic pressure, swarm saturation.
- **attrition-swarm / Gravehearts:** death value, recurring units, sacrificial advantage, lingering pressure, emotional attrition, undead persistence.
- **tank / Empire of the Golden Sun:** immovable defense, sustain, armored advance, imperial resilience, heavy battlefield presence, survival through attrition.
- **wardens / Mammoth Riders:** defensive line, endurance, fortified positions, holding ground, defensive friction, lane denial.

## Prompt Helper Tags

Use these as modular prompt helpers. Combine global tags with one faction set and one specific card subject.

### Global Prompt Prefix

`premium interdimensional entertainment broadcast, absurd tactical card game, pastel dystopia, black comedy, late-night multidimensional television, grotesque worlds, cosmic entertainment, dark whimsical sci-fi, weird civilization collapse, satirical multiverse, pulp multiverse fantasy, broadcast arena aesthetic, colorful apocalypse, tactical absurdism`

### Global Negative Prompt

`generic cyberpunk neon, generic dark fantasy, anime proportions, photorealism, meme rendering, Marvel superhero posing, overcomplicated armor, AI slop detail overload, mobile game UI clutter, unreadable chaotic composition, excessive particle spam, grimdark monochrome, baked text, words, letters, logos, numbers, UI frame`

### Faction Prompt Tags

- **Porcelain Court:** `rococo chaos, powdered aristocracy, porcelain automata, ballroom violence, cracked porcelain, gold trim, lace uniforms, rose garden, candlelit carnage, pastel luxury`
- **Orden der Glasköpfe:** `techno-occult Reich, brain in glass cylinder, cold technocracy, neural cables, red optics, steel walkers, surveillance towers, industrial paranoia, machine theology`
- **Spore Choir:** `psychedelic biology, cosmic mycelium, beautiful bio-horror, glowing spores, wet organic textures, bioluminescent fungi, translucent flesh, dreamlike forest`
- **Gravehearts:** `gothic romance, necro-rockabilly, funeral swing, undead lovers, velvet coffins, funeral roses, moonlit graveyard, cemetery neon, melancholic grotesque`
- **Empire of the Golden Sun:** `solar dinosaur empire, gold armor, obsidian weapons, basalt fortress, feathered raptors, sun worship symbols, ceremonial war culture, ancient monuments`
- **Mammoth Riders:** `ice age empire, mammoth cavalry, fur armor, frozen fortress, bone weapons, snow storm, heavy spears, ice shields, tundra camp, glacial cliffs`
