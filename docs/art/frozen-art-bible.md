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

The detailed crop audit, safe-zone map, and final production checklist are frozen in `docs/art/card-illustration-composition.md`. The short art-bible version is:

- Card art should not contain baked text.
- Card text remains UI-rendered.
- Compose for the mobile hand-card crop first; inspect, collection, and future board views are secondary.
- Each card should have one clear central focal point.
- The main silhouette must remain readable at small size.
- Keep the strongest focal point in the center `40%` width by center `30%` height of the `512x768` source.
- Keep the dominant silhouette, gesture, and gameplay read inside the center `60%` width by center `45%` height.
- Treat top/bottom edges and the outer `10%` horizontally as expendable atmosphere or bleed.
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

## Faction Banner Production Lessons

Faction previews are **faction posters**, not general-purpose illustrations. The player should recognize the faction within one second on a mobile screen, even after the image has been aggressively cover-cropped inside a compact banner card. A beautiful scene is not automatically a good banner if its faction read disappears at small size.

- Favor one dominant civilization symbol plus one supporting world context: a porcelain aristocrat and serum court, a solar emperor monument and dying temple processional, a jar-head signal tower and shadow-contaminated lab, a planetary organism mass and absorbed landscape, a mammoth migration silhouette and frozen route, or a final-day Y2K crowd and ruined street.
- Readability beats complexity. Large readable silhouettes, clear value separation, and iconic shapes outperform detailed multi-character scenes.
- Keep critical storytelling elements within roughly the central `50-70%` of the image so mobile crops do not remove the faction read. Treat outer edges as atmosphere, continuation, or expendable context.
- Place important focal points slightly lower than traditional key art when the banner will carry title/chip overlays and mobile poster crops. Avoid putting the only important face, symbol, or object near the top edge.
- Successful banners remain recognizable after heavy crop, compression, and scaling. Test the image as a small horizontal card, not only as full-size key art.
- Most successful banners used a dominant symbol plus supporting world context, often with a left-to-right read, but there is no rigid rule that the symbol must always sit on the left. Composition should serve instant recognition first.
- Do not bake localized faction names, gameplay rules, card stats, or UI labels into banner artwork. Text belongs to the UI unless the lettering is clearly part of the diegetic artwork.

## Faction Visual Identities

These six visual identities map onto the six current base gameplay factions. Presentation names and art direction are additive layers over the stable faction ids; they must not rename the source faction ids or imply that any current base faction is temporary. Describe faction identity first, world premise second, and gameplay feeling third so lore, banners, card art, and future flavor text all inherit the same readable core.

### aggro — Porcelain Court / Porcelanowy Dwór

**Core identity:** Immortal aristocrats transferred their consciousness into porcelain automaton bodies and spent three centuries preserving etiquette, titles, powdered beauty, and court ritual while industrializing atrocity beneath the ballroom floor. Their peasantry has been reduced to harvested serum stock: a living supply chain for perfumed chemical treatments that keep porcelain immortality elegant, animated, and socially acceptable. The horror is artificial beauty hiding organized cruelty.

**Style:** Rococo chaos, decadent immortal aristocracy, powdered court degeneracy, porcelain automata, televised ballroom violence, chemical dependence, serum extraction, ceremonial brutality, elegant insanity, Marquis de Sade / late-18th-century decadence energy, tea party massacre, aristocratic frenzy, cracked porcelain, decorative brutality, masquerade horror, noble madness, psychotic etiquette, theatrical aggression, violent rococo, decadent apocalypse.

**Visual tags:** powdered wigs, gold trim, cracked masks, lace uniforms, white gloves, rose gardens, porcelain servants, porcelain automata, tea automata, gold syringes, crystal ampoules, velvet medical rituals, serum vats disguised as court luxuries, dueling rapiers, ballroom lighting, pastel luxury, candlelit carnage.

**Color notes:** pastel cream, blush pink, powder blue, porcelain white, antique gold, candle amber, and sharp blood-red accents.

**Guardrail:** Do not portray the Court as generic dolls, generic vampires, or merely rich duelists. Their identity is maintained aristocratic consciousness, three centuries of manners, artificial beauty, and polite ritual covering life-support cruelty.

**Updated card presentation and art-direction notes:**

- `aggro_berserker_1` display name: **Mad Countess / Obłąkana Hrabina**. Show a decadent aristocratic court lady with cracked porcelain beauty, ballroom insanity, emotional collapse under elegance, and a massive aristocratic dress/silhouette that becomes more dangerous as she psychologically and physically breaks apart. Avoid generic berserker energy, armored warrior silhouettes, or masculine noble silhouettes.
- `aggro_flanker_1` display name: **Sadistic Marquis / Sadystyczny Markiz**. Lean into a libertine aristocrat, elegant predator, ceremonial sadism, white gloves, lace, aristocratic refinement, and controlled cruelty instead of chaotic rage. Avoid generic duelist, generic berserker, or generic rogue silhouettes.
- `aggro_full_attack_1` display name: **Velvet Serum / Aksamitne Serum**. Depict aristocratic combat stimulants, decadent immortality treatments, porcelain syringes, perfumed chemical enhancement, luxurious medical horror, and elegant addiction sustaining the immortal court. Motifs include gold syringes, crystal ampoules, velvet medical aesthetics, glowing serum, candlelit injection ritual, and aristocratic bio-alchemy. Avoid generic feast scenes, generic fantasy potions, or modern sci-fi biotech.
- `aggro_rush_1` display name: **Crimson Waltz / Karmazynowy Walc**. Emphasize violent partner-swapping dance, elegant momentum, swirling ballroom motion, theatrical choreography, romanticized violence, rotational movement, and impact.
- `aggro_quick_fix_1` display name: **Mercy Etiquette / Etykieta Miłosierdzia**. Emphasize ceremonial healing through cruelty, aristocratic politeness masking violence, refined medical brutality, and elegant sadism presented as compassion.

### control — Orden der Glasköpfe

**Core identity:** Technocratic occult-totalitarian scientists tried to win a war by performing a techno-occult ritual that destroyed all life on their world and contaminated reality itself. After the catastrophe, touching any surface meant slow consumption by shadow, so the survivors preserved their heads in glass jars and moved through machinery, signal arrays, and surveillance bodies. They now search for a signal capable of retuning their universe back to normal parameters.

**Style:** Techno-occult Reich, brain-in-jar dystopia, mechanical totalitarianism, cold technocracy, neural warfare, signal control, cyber occultism, pseudo-scientific fascism, grim machinery, industrial paranoia, mechanical surveillance, authoritarian sci-fi, cerebral horror, machine theology, ritual physics catastrophe, shadow-contaminated laboratories, desperate reality calibration.

**Visual tags:** glass cylinders, preserved heads, red optics, steel walkers, spider mechs, suspension fluid, neural cables, black trench coats, laboratory machinery, surveillance towers, mechanical limbs, signal arrays, calibration pylons, occult circuitry, shadow-eaten surfaces.

**Color notes:** cold glass green, surgical white, gunmetal, black rubber, oxidized steel, warning red optics, sickly lab-fluid highlights, and contaminated shadow black.

**Guardrail:** Do not reduce the faction to generic signal hackers or ordinary cyborg scientists. Their signal warfare is an occult-technocratic survival project after a world-killing ritual accident.

### swarm — Spore Choir / Chór Zarodników

**Core identity:** A planetary superorganism absorbed its entire biosphere into one shared living consciousness. It is neither fungus, animal, nor plant; fungal shapes are only one temporary vocabulary for a body that continuously grows, collapses, digests, recombines, and blooms into new forms while every fragment remains connected to the same mind.

**Style:** Psychedelic biology, merged biosphere, beautiful bio-horror, planetary superorganism, shared consciousness, spore dreamscape, hallucinogenic ecosystem, bioluminescent horror, living planet, organic transcendence, neural ecology, symbiotic nightmare, soft apocalypse, wet organic sci-fi, continuous growth and collapse, recombining bodies.

**Visual tags:** fluorescent growths, glowing spores, wet textures, organic fibers, breathing moss, translucent flesh, psychedelic colors, bioluminescence, coral-like growths, living roots, pulsating organisms, dreamlike forests, animal-plant-fungus hybrids, merged bodies, collapse-and-regrowth forms.

**Color notes:** bioluminescent cyan, ultraviolet violet, fungal orange, wet moss green, coral pink, and luminous spore haze.

**Guardrail:** Do not make the Spore Choir merely a mushroom faction. It should read as an entire biosphere singing through many morphologies.

### attrition-swarm — Gravehearts

**Core identity:** The world ended on New Year's Eve 1999/2000 after technological failure and weapons catastrophe, but the dead never realized it. Humanity remains trapped inside the emotional wreckage of its final day: degraded bodies and fading minds continue routines whose purpose they no longer understand. Identity has decayed into instinct, repetition, half-remembered errands, dangerous habits, and melancholic echoes. Gravehearts are not primarily a necromancer faction.

**Style:** Y2K apocalypse aftermath, final-day repetition, memory decay, zombie-like confusion, instinct replacing identity, dangerous routine, melancholic degradation, post-human persistence, forgotten rituals, emotional echoes, broken domestic ceremonies, ruined streets, dead commuters, corrupted celebrations, obsolete technology, degraded bodies, tragic absurdity, routines without purpose. Keep the tone tragic, instinctive, dangerous, melancholy, and darkly absurd. The comedy should come from the dead continuing routines after meaning has vanished, not from parody, dancing skeletons, romantic necromancy, or Halloween jokes.

**Visual tags:** New Year's decorations, dead partygoers, broken clocks, ruined TVs, obsolete computers, emergency lights, cracked asphalt, deserted apartments, abandoned offices, faded identity cards, stitched bodies, mismatched replacement limbs, reconstructed faces, patchwork torsos, repeated repair seams, unreadable name tags, commuters repeating routes, celebrants frozen in countdown rituals, families following habits, dangerous crowds moving by instinct.

**Color notes:** midnight blue, dead streetlight amber, funeral black, faded party silver, bone white, old CRT green, emergency red, and washed-out winter gray.

**Art-direction emphasis:** Preserve tragedy, degradation, forgotten rituals, emotional echoes, and persistence, but remove romantic necromancy, undead lovers, gothic romance, burtonesque death fantasy, dancing skeletons, and polished undead ballroom reads. Show people caught in endless repetition: a dead worker still commuting, a family setting the same ruined table, a crowd counting down to a year that already passed, a body checking a phone that no longer works, or a dangerous zombie-like figure acting on habit rather than intent.

**Porcelain Court contrast:** Gravehearts are dead people losing themselves, not aristocratic immortals preserving perfection. Their identity is memory decay, repetition, instinctive routine, degradation, and melancholy after the final day. The Porcelain Court should own preservation, memory, refinement, etiquette, and maintained identity. Avoid making both factions feel like immortal ballroom aristocracies.

### tank — Empire of the Golden Sun / Imperium Złotego Słońca

**Core identity:** A reptilian solar empire faces extinction through prophetic certainty. A fanatical solar emperor received a divine revelation promising heavenly brides from the Sun, and the empire followed that certainty into civilization-scale self-destruction. Now its sacred gold, basalt monuments, armored legions, and imperial rites endure as the people wait for a promised miracle that never arrives. The faction should read as monumental, religious, tragic, imperial, fanatical, and doomed by prophecy, not as a single shock-lore detail.

**Style:** Solar dinosaur empire, fanatical solar imperium, prophetic extinction, reptilian empire, ancient super civilization, imperial decay, monumental warfare, obsidian dynasty, sun worship empire, prehistoric empire, armored raptors, sacred gold, basalt monuments, ancient military order, ceremonial war culture, doomed magnificence, waiting for the sun's miracle.

**Visual tags:** gold armor, sacred gold masks, obsidian weapons, basalt fortresses, giant banners, solar symbols, feathered raptors, heavy reptilian armor, ceremonial crests, volcanic stone, imperial arenas, massive shields, ancient monuments, emperor iconography, empty nurseries, processional temples, sunlit sacrificial architecture.

**Color notes:** imperial gold, obsidian black, basalt gray, volcanic red, sunlit amber, jade patina, desaturated ceremonial ivory, and blinding prophetic white.

**Guardrail:** Avoid reducing the empire to shock-lore about extinction. The banner and card art should emphasize religious certainty, imperial grandeur, sacred gold, doomed magnificence, and the terrible patience of a civilization waiting for a miracle.

### wardens — Mammoth Clans / Klany Mamutów

**Core identity:** A developed Neanderthal-descended ice-age migration civilization survives on an Earth drifting away from the Sun. The ice age never ended; *Homo sapiens* are gone; warmth is dwindling; equatorial tundra routes are becoming the last viable corridors. Domesticated mammoths carry fortresses, families, herds, and memory across the frozen world while the clans move between survivable heat and the mysterious cosmic lifeform known as Frost. This is survival through movement as much as defense.

**Style:** Eternal ice age, mammoth migration civilization, tundra fortress, prehistoric military, glacial warfare, frozen frontier, neanderthal empire, primal fortification, snowbound legion, ancient survivalism, tribal phalanx, ice bastion, dwindling warmth, cosmic Frost, migrating strongholds.

**Visual tags:** mammoth cavalry, migrating mammoth caravans, fur armor, mobile frozen fortresses, bone weapons, snow storms, glacial cliffs, heavy spears, ice shields, tundra camps, frozen banners, wool and leather, massive beasts, low sun, warmth markers, Frost auroras, equatorial tundra routes.

**Color notes:** glacier blue, snow white, mammoth brown, leather tan, bone ivory, storm gray, cold banner red, and faint low-sun gold.

**Guardrail:** This is not caveman comedy, generic barbarians, or fantasy Vikings. The clans are disciplined Neanderthal descendants, mammoth domesticators, and migrating survivors of a dying warmth cycle.

## Faction Gameplay Feelings

These are presentation feelings only. They describe how art should support existing gameplay identities without becoming gameplay logic.

- **aggro / Porcelain Court:** fast tempo, burst aggression, theatrical attacks, stylish violence, chaotic pressure.
- **control / Orden der Glasköpfe:** manipulation, disruption, tactical control, debuffs, forced positioning, system interference, signal retuning, and occult-technocratic survival after reality contamination.
- **swarm / Spore Choir:** expansion, multiplication, collective growth, planetary recombination, organic pressure, swarm saturation, and shared-consciousness adaptation.
- **attrition-swarm / Gravehearts:** death value, recurring units, sacrificial advantage, lingering pressure, emotional attrition, degraded persistence, final-day repetition, and instinctive routine without remembered meaning.
- **tank / Empire of the Golden Sun:** immovable defense, sustain, armored advance, imperial resilience, heavy battlefield presence, religious certainty, and survival through attrition while waiting for prophecy.
- **wardens / Mammoth Clans:** defensive line, endurance, fortified positions, holding ground, defensive friction, lane denial, migration survival, and movement between dwindling warmth corridors.

## Prompt Helper Tags

Use these as modular prompt helpers. Combine global tags with one faction set and one specific card subject.

### Global Prompt Prefix

`premium interdimensional entertainment broadcast, absurd tactical card game, pastel dystopia, black comedy, late-night multidimensional television, grotesque worlds, cosmic entertainment, dark whimsical sci-fi, weird civilization collapse, satirical multiverse, pulp multiverse fantasy, broadcast arena aesthetic, colorful apocalypse, tactical absurdism`

Add readability direction to the active prompt body (or style suffix) for gameplay-facing card art:

`strong focal separation, clean readable silhouette, higher midtone readability, clear value hierarchy, mobile TCG readability, gameplay-first composition, readable at small size, subject separation from background`

### Global Negative Prompt

`generic cyberpunk neon, generic dark fantasy, anime proportions, photorealism, meme rendering, Marvel superhero posing, overcomplicated armor, AI slop detail overload, mobile game UI clutter, unreadable chaotic composition, excessive particle spam, grimdark monochrome, baked text, words, letters, logos, numbers, UI frame`

Also avoid:

`muddy midtones, fully dark subject on equally dark background, low-separation composition, overly uniform tonal range, flat global contrast, forced universal glow focal points, oversaturation for fake readability, faction style homogenization`

### Faction Prompt Tags

- **Porcelain Court:** `rococo chaos, immortal aristocratic consciousness in porcelain automata, three centuries of etiquette and atrocities, harvested serum stock, televised ballroom violence, chemical dependence, ceremonial brutality, cracked porcelain, gold trim, lace uniforms, white gloves, gold syringes, crystal ampoules, velvet medical rituals, rose garden, candlelit carnage, pastel luxury`
- **Orden der Glasköpfe:** `techno-occult Reich, preserved heads in glass cylinders, ritual catastrophe, shadow-consumption contamination, reality-retuning signal search, cold technocracy, neural cables, red optics, steel walkers, surveillance towers, industrial paranoia, machine theology`
- **Spore Choir:** `planetary superorganism, merged biosphere, neither fungus animal nor plant, shared evolving consciousness, continuous growth collapse and recombination, psychedelic biology, beautiful bio-horror, glowing spores, wet organic textures, bioluminescence, translucent flesh, dreamlike forest`
- **Gravehearts:** `New Year's Eve 1999 apocalypse, final-day repetition, dead who never realized the world ended, memory decay, instinct replacing identity, zombie-like confusion, dangerous routine, obsolete technology, degraded bodies, emotional echoes, forgotten rituals, melancholic persistence`
- **Empire of the Golden Sun:** `fanatical solar reptilian empire, prophetic revelation, civilization-scale self-destruction, waiting for a promised miracle, sacred gold, obsidian weapons, basalt fortress, feathered raptors, sun worship symbols, ceremonial war culture, doomed magnificence, ancient monuments`
- **Mammoth Clans:** `Earth drifting away from the Sun, eternal ice age, Neanderthal mammoth migration civilization, dwindling warmth, cosmic Frost entity, tundra fortress, prehistoric military, glacial warfare, frozen frontier, primal fortification, snowbound legion, tribal phalanx, ice bastion`
