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
- **Faction banner source generation:** create source art at `1920x1080` (`16:9`) so production has enough resolution for crop tuning and future UI variants.
- **Faction banner runtime export:** export the selected banner as `preview.webp` at `public/assets/factions/<faction-id>/preview.webp`.
- **Faction banner runtime behavior:** faction-select cards render `preview.webp` with cover-crop. Mobile cards show only a portion of the original 16:9 image, so production art must be composed for cropped readability rather than full-frame showcase value.
- **Card art:** no baked text; UI renders all card text.
- **Composition:** one clear focal point per card or banner.
- **Readability:** silhouette should read at small card or mobile-banner size.

## Faction Banner System

Faction banners are **faction posters**, not illustrations. Their purpose is to sell the civilization instantly before the player studies mechanics. A successful banner communicates civilization identity, emotional tone, world fantasy, and faction uniqueness before gameplay details.

### Poster layout and UI hierarchy

The finalized faction-select card hierarchy is:

1. Artwork
2. Faction name
3. Flavor text
4. Gameplay chips

Implementation notes:

- Artwork is the dominant visual element and should carry the first read.
- The faction name appears near the lower-left region of the card.
- Gameplay chips appear in the upper-right region.
- Chips are metadata, not primary content.
- The card should feel like a premium broadcast poster rather than a menu row.
- Do not bake faction names, flavor text, chips, or rules into the image; UI owns text.

### Banner composition rules

Freeze each banner around one dominant visual idea and one dominant civilization symbol. Avoid multiple competing focal points, battle scenes, character lineups, multiple heroes, or attempts to explain the entire faction in one image.

Preferred structure:

- **Left:** civilization icon or symbol.
- **Right:** civilization world or context.

Faction poster anchors:

- **Porcelain Court:** giant porcelain face on the left; decadent civilization beyond.
- **Empire of the Golden Sun:** colossal solar emperor on the left; empire beyond.
- **Orden der Glasköpfe:** giant head-in-jar on the left; signal infrastructure beyond.
- **Spore Choir:** biological nexus on the left; living ecosystem beyond.
- **Mammoth Clans:** mammoth fortress on the left; migration route beyond.
- **Gravehearts:** endless final celebration on the left; lost civilization beyond.

### Mobile crop rules

Mobile faction select uses an aggressive center crop. Banner readability takes priority over full-image beauty.

- Keep critical storytelling elements inside the central `60%` of the image.
- Place important elements lower than traditional key art so the mobile card crop keeps them visible.
- Avoid focal points near top edges.
- Avoid relying on distant horizon details for the primary read.
- Prefer large readable silhouettes over detailed scenes.
- Successful banners are the ones whose primary symbol remains recognizable after heavy crop.

### Production clarification: banner lessons and crop review

These notes extend the asset specs above; they do not replace the `1920x1080` source target, `preview.webp` runtime export, or current cover-crop behavior.

- Treat each banner as a crop-tested production asset, not a finished full-frame painting. Approve it only after checking the live faction-select crop and a small-size thumbnail read.
- Build the left anchor large enough that it still reads when the UI removes edge context. If the anchor only works as a full 16:9 scene, simplify or enlarge it.
- Put secondary civilization details behind or beside the anchor as atmosphere. They should enrich the poster without competing with the faction name, flavor text, or gameplay chips.
- Keep the lower-left name area and upper-right chip area free of busy high-contrast detail, faces, and must-read symbols so UI text remains legible.
- Prefer bold value grouping, clean silhouettes, and a single iconic civilization symbol over panoramic armies, lineups, or lore collages.
- When a generated source has strong full-frame storytelling but weak mobile readability, crop, extend, or repaint the composition rather than changing the faction identity.

## Faction Visual Identities

These six visual identities map onto the six current base gameplay factions. Presentation names and art direction are additive layers over the stable faction ids; they must not rename the source faction ids or imply that any current base faction is temporary.

### aggro — Porcelain Court / Porcelanowy Dwór

**Core identity:** Immortal aristocrats sealed into porcelain bodies. They preserve etiquette, memory, status, and beauty by harvesting humanity into serum. Their civilization is three centuries of manners, medical atrocities, and court ritual pretending that nothing monstrous has happened.

**Style:** Rococo chaos, decadent immortal aristocracy, powdered court degeneracy, porcelain automata, televised ballroom violence, chemical degeneration, ceremonial brutality, elegant insanity, Marquis de Sade / late-18th-century decadence energy, tea party massacre, aristocratic frenzy, cracked porcelain, decorative brutality, masquerade horror, noble madness, psychotic etiquette, theatrical aggression, violent rococo, decadent apocalypse.

**Visual tags:** powdered wigs, gold trim, cracked masks, lace uniforms, white gloves, rose gardens, porcelain servants, porcelain automata, tea automata, gold syringes, crystal ampoules, velvet medical rituals, dueling rapiers, ballroom lighting, pastel luxury, candlelit carnage.

**Color notes:** pastel cream, blush pink, powder blue, porcelain white, antique gold, candle amber, and sharp blood-red accents.

**Banner anchor:** Giant porcelain face or mask as the dominant symbol; decadent court civilization beyond.

**Production clarification:** Preserve the existing rococo cruelty, etiquette, serum-harvesting, porcelain-body, and aristocratic memory-preservation language. New art should clarify that the Court is about maintained identity and cultivated atrocity, not generic dolls, cute porcelain mascots, or simple haunted-house elegance.

**Updated card presentation and art-direction notes:**

- `aggro_berserker_1` display name: **Mad Countess / Obłąkana Hrabina**. Show a decadent aristocratic court lady with cracked porcelain beauty, ballroom insanity, emotional collapse under elegance, and a massive aristocratic dress/silhouette that becomes more dangerous as she psychologically and physically breaks apart. Avoid generic berserker energy, armored warrior silhouettes, or masculine noble silhouettes.
- `aggro_flanker_1` display name: **Sadistic Marquis / Sadystyczny Markiz**. Lean into a libertine aristocrat, elegant predator, ceremonial sadism, white gloves, lace, aristocratic refinement, and controlled cruelty instead of chaotic rage. Avoid generic duelist, generic berserker, or generic rogue silhouettes.
- `aggro_full_attack_1` display name: **Velvet Serum / Aksamitne Serum**. Depict aristocratic combat stimulants, decadent immortality treatments, porcelain syringes, perfumed chemical enhancement, luxurious medical horror, and elegant addiction sustaining the immortal court. Motifs include gold syringes, crystal ampoules, velvet medical aesthetics, glowing serum, candlelit injection ritual, and aristocratic bio-alchemy. Avoid generic feast scenes, generic fantasy potions, or modern sci-fi biotech.
- `aggro_rush_1` display name: **Crimson Waltz / Karmazynowy Walc**. Emphasize violent partner-swapping dance, elegant momentum, swirling ballroom motion, theatrical choreography, romanticized violence, rotational movement, and impact.
- `aggro_quick_fix_1` display name: **Mercy Etiquette / Etykieta Miłosierdzia**. Emphasize ceremonial healing through cruelty, aristocratic politeness masking violence, refined medical brutality, and elegant sadism presented as compassion.

### tank — Empire of the Golden Sun / Imperium Złotego Słońca

**Core identity:** A reptilian solar empire ruled by a fanatical emperor. The civilization marches toward extinction through prophecy, religious certainty, imperial discipline, and the conviction that the sun has already chosen their ending.

**Style:** Solar dinosaur empire, fallen golden age, reptilian imperium, fanatical sun cult, prophetic extinction, monumental warfare, obsidian dynasty, sun worship empire, prehistoric empire, armored raptors, ancient military order, ceremonial war culture, extinct glory.

**Visual tags:** gold armor, obsidian weapons, basalt fortresses, giant banners, solar symbols, feathered raptors, heavy reptilian armor, ceremonial crests, volcanic stone, imperial arenas, massive shields, ancient monuments.

**Color notes:** imperial gold, obsidian black, basalt gray, volcanic red, sunlit amber, jade patina, and desaturated ceremonial ivory.

**Banner anchor:** Colossal solar emperor as the dominant symbol; imperial monuments, ranks, and city-fortresses beyond.

**Latest clarification:** The Golden Sun tragedy is chosen self-extinction through prophecy: the empire interprets survival itself as disobedience to the sun. Keep prophecy, religious certainty, imperial discipline, and extinction logic in the foreground; any shocking sacrificial or body-horror detail should support that thesis rather than become the headline.

### control — Orden der Glasköpfe

**Core identity:** A techno-occult catastrophe state of preserved heads in jars. Its rulers and instruments search for a signal that can retune reality, treating bodies, cities, and enemies as receivers in a broken cosmic broadcast.

**Style:** Techno-occult catastrophe, brain-in-jar dystopia, mechanical totalitarianism, cold technocracy, neural warfare, signal control, cyber occultism, pseudo-scientific fascism, grim machinery, industrial paranoia, mechanical surveillance, authoritarian sci-fi, cerebral horror, machine theology.

**Visual tags:** glass cylinders, red optics, steel walkers, spider mechs, suspension fluid, neural cables, black trench coats, laboratory machinery, surveillance towers, mechanical limbs, signal arrays.

**Color notes:** cold glass green, surgical white, gunmetal, black rubber, oxidized steel, warning red optics, and sickly lab-fluid highlights.

**Banner anchor:** Giant head-in-jar as the dominant symbol; signal towers, cables, and retuning infrastructure beyond.

**Production clarification:** Preserve the techno-occult catastrophe and authoritarian signal-control identity. The Order should read as a cold state apparatus trying to retune reality through preserved minds, machinery, surveillance, and machine theology, not as generic robots, ordinary cyberpunk hackers, or unrelated laboratory horror.

### swarm — Spore Choir / Chór Zarodników

**Core identity:** A planetary superorganism where all life has merged into one consciousness. Individual creatures are temporary expressions of a living world that mutates endlessly through fungal, animal, vegetal, and neural forms.

**Style:** Psychedelic biology, cosmic mycelium, beautiful bio-horror, fungal collective, shared consciousness, spore dreamscape, hallucinogenic ecosystem, bioluminescent horror, living planet, organic transcendence, neural fungus, symbiotic nightmare, soft apocalypse, wet organic sci-fi.

**Visual tags:** fluorescent fungi, glowing spores, wet textures, organic fibers, breathing moss, translucent flesh, psychedelic colors, bioluminescence, coral-like growths, living roots, pulsating organisms, dreamlike forests.

**Color notes:** bioluminescent cyan, ultraviolet violet, fungal orange, wet moss green, coral pink, and luminous spore haze.

**Banner anchor:** Biological nexus as the dominant symbol; living ecosystem, root networks, and merged organisms beyond.

**Production clarification:** Preserve the planetary-superorganism premise. The Choir is not just a fungus faction: fungal, animal, vegetal, neural, and cosmic forms should feel like temporary expressions of one merged consciousness, with beauty and bio-horror balanced instead of reducing the faction to gross spores alone.

### wardens — Mammoth Clans / Klany Mamutów

**Core identity:** A mammoth migration civilization surviving an eternal ice age. They are the last warmth against the cosmic Frost: disciplined, mobile, fortified, and built around routes, herds, fire, memory, and collective endurance.

**Style:** Ice age empire, mammoth civilization, tundra fortress, prehistoric military, glacial warfare, frozen frontier, neanderthal empire, primal fortification, snowbound legion, ancient survivalism, tribal phalanx, ice bastion.

**Visual tags:** mammoth cavalry, mammoth fortresses, migration routes, fur armor, frozen fortresses, bone weapons, snow storms, glacial cliffs, heavy spears, ice shields, tundra camps, frozen banners, wool and leather, massive beasts.

**Color notes:** glacier blue, snow white, mammoth brown, leather tan, bone ivory, storm gray, ember orange, and cold banner red.

**Banner anchor:** Mammoth fortress as the dominant symbol; migration route, tundra camps, and surviving warmth beyond.

**Production clarification:** Preserve the migration-civilization and last-warmth identity. The Clans should feel mobile, communal, fortified, route-based, and endurance-focused, not like a static generic barbarian tribe, a lone mammoth monster, or a simple ice-fantasy army.

### attrition-swarm — Gravehearts

**Core identity:** Humanity trapped after New Year's Eve 1999. The faction is civilization-wide confusion, memory decay, and endless repetition rather than necromancy: parties, funerals, romances, dances, processions, and civic rituals continue because nobody remembers how to stop or what they originally meant.

**Style:** Millennium gothic romance, funeral swing, civic ritual persistence, melancholic grotesque, darkly funny memory loss, cemetery culture, patched-together continuity, stitched-together devotion, absurd ceremonial repetition, graveyard elegance, emotional echoes, psychotronic confusion, love remembered only as habit. Keep the tone tragic, grotesque, absurd, melancholic, and darkly humorous. The comedy should come from persistent rituals performed by people who have forgotten their meaning, not slapstick, parody, necromancy, or Halloween-style jokes.

**Visual tags:** New Year's Eve 1999 remnants, party hats, confetti, champagne glasses, frozen countdown clocks, velvet coffins, funeral roses, cemetery neon, graveyard suits, vintage hearses, mourning dresses, cracked tombstones, gothic hairstyles, faded identity tokens, stitched bodies, mismatched replacement limbs, reconstructed faces, patchwork torsos, repeated repair seams, dancers following corrupted choreography, coffin bearers carrying forgotten contents, hollow wedding attire.

**Color notes:** millennium neon, moonlit blue, funeral black, velvet burgundy, bone white, wilted rose pink, graveyard green, and cemetery accents.

**Banner anchor:** Endless final celebration as the dominant symbol; lost civilization, forgotten streets, and repeated rituals beyond.

**Latest clarification:** Gravehearts are Y2K final-day memory decay: a civilization stuck after New Year's Eve 1999, repeating parties, funerals, romances, processions, dances, and civic rituals after their meanings have corroded. Keep melancholy, funeral culture, civic ritual, gothic romance, and dark humor, but guard against framing them primarily as romantic necromancers, elegant vampire aristocrats, or a standard undead army.

**Art-direction emphasis:** Keep coffins, roses, cemetery motifs, mourning attire, gothic romance, and resurrection-adjacent imagery as residues of a civilization stuck after the turn of the millennium, but do not present the faction as polished necromancers or a standard undead army. Show memory decay and ritual confusion: a groom searching for a bride he may never have had, coffin bearers protecting a coffin whose occupant nobody remembers, dancers continuing a ceremony without understanding it, partygoers repeating a midnight countdown forever, and performers repeating traditions from corrupted memories.

**Porcelain Court contrast:** Gravehearts are people and institutions losing themselves, not aristocratic immortals preserving perfection. Their identity is decay, forgetting, repetition, instinctive ritual, and fragmentation. The Porcelain Court should own preservation, memory, refinement, etiquette, and maintained identity. Avoid making both factions feel like immortal ballroom aristocracies.

## Faction Gameplay Feelings

These are presentation feelings only. They describe how art should support existing gameplay identities without becoming gameplay logic.

- **aggro / Porcelain Court:** fast tempo, burst aggression, theatrical attacks, stylish violence, chaotic pressure.
- **control / Orden der Glasköpfe:** manipulation, disruption, tactical control, debuffs, forced positioning, system interference.
- **swarm / Spore Choir:** expansion, multiplication, collective growth, spreading organism, organic pressure, swarm saturation.
- **attrition-swarm / Gravehearts:** death value, recurring units, sacrificial advantage, lingering pressure, emotional attrition, memory decay, and instinctive ritual without remembered meaning.
- **tank / Empire of the Golden Sun:** immovable defense, sustain, armored advance, imperial resilience, heavy battlefield presence, survival through attrition.
- **wardens / Mammoth Clans:** defensive line, endurance, fortified positions, holding ground, defensive friction, lane denial.

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

- **Porcelain Court:** `immortal aristocrats in porcelain bodies, humanity harvested into serum, three centuries of etiquette and atrocities, rococo chaos, porcelain automata, cracked porcelain, gold trim, lace uniforms, white gloves, gold syringes, crystal ampoules, velvet medical rituals, rose garden, candlelit carnage, pastel luxury`
- **Empire of the Golden Sun:** `reptilian solar empire, fanatical emperor, extinction through prophecy, religious certainty, gold armor, obsidian weapons, basalt fortress, feathered raptors, sun worship symbols, ceremonial war culture, ancient monuments`
- **Orden der Glasköpfe:** `techno-occult catastrophe, heads preserved in jars, signal to retune reality, brain in glass cylinder, cold technocracy, neural cables, red optics, steel walkers, surveillance towers, industrial paranoia, machine theology`
- **Spore Choir:** `planetary superorganism, all life merged into one consciousness, endless biological mutation, psychedelic biology, cosmic mycelium, beautiful bio-horror, glowing spores, wet organic textures, bioluminescent fungi, translucent flesh, dreamlike forest`
- **Mammoth Clans:** `eternal ice age, mammoth migration civilization, last warmth against cosmic Frost, mammoth fortress, migration route, prehistoric military, glacial warfare, frozen frontier, neanderthal empire, primal fortification, snowbound legion, ice bastion`
- **Gravehearts:** `humanity trapped after New Year's Eve 1999, memory decay, endless repetition, civilization-wide confusion, millennium gothic romance, funeral swing, ritualized mourning, velvet coffins, funeral roses, frozen countdown clocks, cemetery neon, melancholic grotesque, darkly humorous memory loss`
