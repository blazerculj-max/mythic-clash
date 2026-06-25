/* ============================================================================
   MYTHIC CLASH: WARS OF PANTHEONS
   cards.js — Card database
   ----------------------------------------------------------------------------
   Vse karte so originalne interpretacije mitoloških likov iz javne domene.
   Ni uporabljenih nobenih zaščitenih trading-card izrazov.

   Tipi kart: Champion | Energy | Relic | Oracle | Realm
   Energy tipi: Sky War Wisdom Underworld Nature Trickery Fire Frost Sun Moon
   Pantheoni:  Greek Norse Roman Egyptian Slavic Celtic
   Redkosti:   Common Uncommon Rare Epic Legendary Mythic
============================================================================ */

const PANTHEONS = ["Greek", "Norse", "Roman", "Egyptian", "Slavic", "Celtic"];

const ENERGY_TYPES = [
  "Sky", "War", "Wisdom", "Underworld",
  "Nature", "Trickery", "Fire", "Frost", "Sun", "Moon"
];

// Vizualni sistem: gradient + simbol na pantheon
const PANTHEON_STYLE = {
  Greek:    { grad: ["#1b2a4a", "#3d5a8a"], symbol: "⚡", accent: "#7fb3ff" },
  Norse:    { grad: ["#142a2e", "#2f6d72"], symbol: "❄", accent: "#8fe6e0" },
  Roman:    { grad: ["#3a1414", "#7a2e2e"], symbol: "🦅", accent: "#ff9b7a" },
  Egyptian: { grad: ["#4a3a0d", "#a9842a"], symbol: "☀", accent: "#ffd97a" },
  Slavic:   { grad: ["#13361f", "#2f7a4a"], symbol: "🌲", accent: "#8fe6a8" },
  Celtic:   { grad: ["#2a1340", "#5e2f8a"], symbol: "🌙", accent: "#c89bff" },
};

// Barvni žeton za energijski tip
const ENERGY_STYLE = {
  Sky:        { color: "#7fb3ff", glyph: "☁" },
  War:        { color: "#ff6b5e", glyph: "⚔" },
  Wisdom:     { color: "#b89bff", glyph: "📜" },
  Underworld: { color: "#7a6f8f", glyph: "💀" },
  Nature:     { color: "#6fd98a", glyph: "🍃" },
  Trickery:   { color: "#ff9be0", glyph: "🎭" },
  Fire:       { color: "#ff8a3d", glyph: "🔥" },
  Frost:      { color: "#8fe6e0", glyph: "❄" },
  Sun:        { color: "#ffd24a", glyph: "🌞" },
  Moon:       { color: "#c9c2ff", glyph: "🌙" },
  Any:        { color: "#cfcfcf", glyph: "✦" },
};

const RARITY_STYLE = {
  Common:    { color: "#9aa0a6", glow: "rgba(154,160,166,0.0)" },
  Uncommon:  { color: "#5ec97a", glow: "rgba(94,201,122,0.25)" },
  Rare:      { color: "#5aa6ff", glow: "rgba(90,166,255,0.35)" },
  Epic:      { color: "#b06bff", glow: "rgba(176,107,255,0.45)" },
  Legendary: { color: "#ffcf4a", glow: "rgba(255,207,74,0.55)" },
  Mythic:    { color: "#ff7a4a", glow: "rgba(255,122,74,0.65)" },
};

/* ----------------------------------------------------------------------------
   CARD DATABASE
   Vsaka karta ima unikaten id. Champions imajo attacks, hp, weakness itd.
---------------------------------------------------------------------------- */

const CARDS = {

  /* ====================== GREEK ====================== */
  "greek-zeus": {
    id: "greek-zeus", name: "Zeus, Lord of Thunder", type: "Champion",
    pantheon: "Greek", rarity: "Legendary", stage: "basic", hp: 140,
    attacks: [
      { name: "Sky Bolt", cost: ["Sky", "Any"], damage: 40, effect: null,
        text: "A warning strike from the heavens." },
      { name: "Thunder Judgment", cost: ["Sky", "Sky", "Any"], damage: 80, effect: "stunOmen",
        text: "Omen Roll. On a Favorable Omen, the Defending Champion is Stunned." }
    ],
    ability: { name: "Storm Authority", text: "Sky attacks from your Greek Champions deal +10 damage." },
    weakness: "Frost", resistance: "Sky", retreatCost: 2,
    flavorText: "The sky bends before his will.",
    deckTags: ["Olympus"]
  },
  "greek-athena": {
    id: "greek-athena", name: "Athena, Shield of Wisdom", type: "Champion",
    pantheon: "Greek", rarity: "Epic", stage: "basic", hp: 110,
    attacks: [
      { name: "Spear Tactics", cost: ["Wisdom"], damage: 30, effect: null,
        text: "Calculated and precise." },
      { name: "Aegis Strike", cost: ["Wisdom", "War"], damage: 60, effect: "selfShield",
        text: "This Champion gains Shield." }
    ],
    ability: { name: "Strategic Mind", text: "When you attach Energy to Athena, draw a card (once per turn)." },
    weakness: "Fire", resistance: "Wisdom", retreatCost: 1,
    flavorText: "Victory favors the prepared mind.",
    deckTags: ["Olympus"]
  },
  "greek-heracles": {
    id: "greek-heracles", name: "Heracles, Mortal Champion", type: "Champion",
    pantheon: "Greek", rarity: "Rare", stage: "basic", hp: 100,
    attacks: [
      { name: "Club Smash", cost: ["War"], damage: 30, effect: null, text: "Raw strength." },
      { name: "Lion's Grip", cost: ["War", "War"], damage: 60, effect: null, text: "He crushes all resistance." }
    ],
    ability: { name: "Heroic Resolve", text: "Heracles takes -10 damage from attacks while he has any Energy attached." },
    weakness: "Sky", resistance: "War", retreatCost: 2,
    flavorText: "Half man, half legend.",
    deckTags: ["Olympus"]
  },
  "greek-heracles-asc": {
    id: "greek-heracles-asc", name: "Heracles, Twelve Trials", type: "Champion",
    pantheon: "Greek", rarity: "Legendary", stage: "ascended", ascendsFrom: "greek-heracles", hp: 180,
    attacks: [
      { name: "Labor of Strength", cost: ["War", "War"], damage: 70, effect: null, text: "Each trial made him stronger." },
      { name: "Final Trial", cost: ["War", "War", "Any"], damage: 120, effect: "selfDamage20",
        text: "Deals 120 damage. This Champion takes 20 recoil damage." }
    ],
    ability: { name: "Undying Hero", text: "Heracles takes -20 damage from all attacks." },
    weakness: "Sky", resistance: "War", retreatCost: 3,
    flavorText: "Twelve impossible labors, twelve victories.",
    deckTags: ["Olympus"]
  },
  "greek-medusa": {
    id: "greek-medusa", name: "Medusa, Gorgon of Stone", type: "Champion",
    pantheon: "Greek", rarity: "Rare", stage: "basic", hp: 90,
    attacks: [
      { name: "Petrifying Gaze", cost: ["Trickery"], damage: 20, effect: "stunOmen",
        text: "Omen Roll. On a Favorable Omen, the Defender is Stunned." },
      { name: "Serpent Lash", cost: ["Trickery", "War"], damage: 50, effect: null, text: "Her hair strikes like vipers." }
    ],
    ability: { name: "Stone Curse", text: "When Medusa is attacked, Omen Roll: on Favorable Omen the attacker becomes Cursed." },
    weakness: "Sun", resistance: "Trickery", retreatCost: 1,
    flavorText: "Meet her eyes and become eternal.",
    deckTags: ["Olympus"]
  },
  "greek-pegasus": {
    id: "greek-pegasus", name: "Pegasus, Winged Steed", type: "Champion",
    pantheon: "Greek", rarity: "Uncommon", stage: "basic", hp: 80,
    attacks: [
      { name: "Sky Dash", cost: ["Sky"], damage: 30, effect: null, text: "Swift as the wind." },
      { name: "Hoof Storm", cost: ["Sky", "Any"], damage: 50, effect: null, text: "A flurry from above." }
    ],
    ability: { name: "Free Flight", text: "Pegasus has no retreat cost." },
    weakness: "Frost", resistance: "Sky", retreatCost: 0,
    flavorText: "Born of sea foam and lightning.",
    deckTags: ["Olympus"]
  },
  "greek-hydra": {
    id: "greek-hydra", name: "Hydra, Many-Headed Terror", type: "Champion",
    pantheon: "Greek", rarity: "Epic", stage: "basic", hp: 130,
    attacks: [
      { name: "Venom Bite", cost: ["Nature"], damage: 20, effect: "poison", text: "The Defender is Poisoned." },
      { name: "Regrow Heads", cost: ["Nature", "Any"], damage: 40, effect: "heal20", text: "Hydra heals 20 HP." }
    ],
    ability: { name: "Endless Heads", text: "At the end of your turn, Hydra heals 10 HP if it is your Active Champion." },
    weakness: "Fire", resistance: "Nature", retreatCost: 2,
    flavorText: "Cut one head, two more arise.",
    deckTags: ["Olympus"]
  },
  "greek-oracle": {
    id: "greek-oracle", name: "Oracle of Delphi", type: "Champion",
    pantheon: "Greek", rarity: "Uncommon", stage: "basic", hp: 70,
    attacks: [
      { name: "Prophetic Whisper", cost: ["Wisdom"], damage: 10, effect: "draw1", text: "Draw a card." }
    ],
    ability: { name: "Foresight", text: "When you play the Oracle of Delphi into reserve, draw a card." },
    weakness: "Trickery", resistance: "Wisdom", retreatCost: 1,
    flavorText: "She speaks the will of fate.",
    deckTags: ["Olympus"]
  },

  /* ====================== NORSE ====================== */
  "norse-thor": {
    id: "norse-thor", name: "Thor, Hammer Bearer", type: "Champion",
    pantheon: "Norse", rarity: "Legendary", stage: "basic", hp: 130,
    attacks: [
      { name: "Hammer Throw", cost: ["War"], damage: 40, effect: null, text: "Mjolnir always returns." },
      { name: "Thunderclap", cost: ["Sky", "War"], damage: 70, effect: "stunOmen",
        text: "Omen Roll. On a Favorable Omen, the Defender is Stunned." }
    ],
    ability: { name: "God of Strength", text: "Thor's War attacks deal +10 damage." },
    weakness: "Frost", resistance: "War", retreatCost: 2,
    flavorText: "The mountains tremble at his step.",
    deckTags: ["Ragnarok"]
  },
  "norse-thor-asc": {
    id: "norse-thor-asc", name: "Thor, Storm Unleashed", type: "Champion",
    pantheon: "Norse", rarity: "Mythic", stage: "ascended", ascendsFrom: "norse-thor", hp: 200,
    attacks: [
      { name: "Storm Crush", cost: ["Sky", "War"], damage: 80, effect: null, text: "The heavens roar." },
      { name: "Ragnarok Strike", cost: ["Sky", "War", "War"], damage: 150, effect: "selfDamage30",
        text: "Deals 150 damage. This Champion takes 30 recoil damage." }
    ],
    ability: { name: "Tempest Lord", text: "Thor's attacks deal +20 damage." },
    weakness: "Frost", resistance: "War", retreatCost: 3,
    flavorText: "The storm has a name, and it is wrath.",
    deckTags: ["Ragnarok"]
  },
  "norse-odin": {
    id: "norse-odin", name: "Odin, One-Eyed Wanderer", type: "Champion",
    pantheon: "Norse", rarity: "Legendary", stage: "basic", hp: 120,
    attacks: [
      { name: "Gungnir Cast", cost: ["Sky", "Wisdom"], damage: 60, effect: null, text: "His spear never misses." },
      { name: "Raven's Knowledge", cost: ["Wisdom"], damage: 20, effect: "draw2", text: "Draw 2 cards." }
    ],
    ability: { name: "All-Father", text: "Once per turn, you may pay 1 HP (10 damage to Odin) to draw a card." },
    weakness: "Fire", resistance: "Wisdom", retreatCost: 2,
    flavorText: "He gave an eye for the secrets of the worlds.",
    deckTags: ["Ragnarok"]
  },
  "norse-loki": {
    id: "norse-loki", name: "Loki, Shape of Lies", type: "Champion",
    pantheon: "Norse", rarity: "Epic", stage: "basic", hp: 90,
    attacks: [
      { name: "Trickster Jab", cost: ["Trickery"], damage: 20, effect: "curse", text: "The Defender is Cursed." },
      { name: "Mirror Deceit", cost: ["Trickery", "Any"], damage: 50, effect: null, text: "Nothing he shows is true." }
    ],
    ability: { name: "Shapeshifter", text: "Loki has no weakness." },
    weakness: null, resistance: "Trickery", retreatCost: 1,
    flavorText: "His smile is the last warning you'll get.",
    deckTags: ["Ragnarok"]
  },
  "norse-freya": {
    id: "norse-freya", name: "Freyja, Keeper of Fallen", type: "Champion",
    pantheon: "Norse", rarity: "Rare", stage: "basic", hp: 100,
    attacks: [
      { name: "Falcon Cloak", cost: ["Sky"], damage: 30, effect: null, text: "She flies between worlds." },
      { name: "Valkyrie Call", cost: ["War", "Any"], damage: 50, effect: "heal20", text: "Freyja heals 20 HP." }
    ],
    ability: { name: "Chooser of Slain", text: "When a Norse Champion you control is defeated, draw a card." },
    weakness: "Fire", resistance: "Frost", retreatCost: 1,
    flavorText: "Half the fallen are hers by right.",
    deckTags: ["Ragnarok"]
  },
  "norse-fenrir": {
    id: "norse-fenrir", name: "Fenrir, Bound Devourer", type: "Champion",
    pantheon: "Norse", rarity: "Epic", stage: "basic", hp: 120,
    attacks: [
      { name: "Savage Bite", cost: ["War"], damage: 40, effect: null, text: "The chains will not hold forever." },
      { name: "Devour", cost: ["War", "War"], damage: 90, effect: "selfDamage20",
        text: "Deals 90 damage. Fenrir takes 20 recoil damage." }
    ],
    ability: { name: "Unleashed", text: "If Fenrir has 60 or less HP, its attacks deal +20 damage." },
    weakness: "Sky", resistance: "War", retreatCost: 3,
    flavorText: "When the chains break, the world ends.",
    deckTags: ["Ragnarok"]
  },
  "norse-valkyrie": {
    id: "norse-valkyrie", name: "Valkyrie Spear-Sister", type: "Champion",
    pantheon: "Norse", rarity: "Uncommon", stage: "basic", hp: 80,
    attacks: [
      { name: "Spear Dive", cost: ["War"], damage: 30, effect: null, text: "From the sky she descends." },
      { name: "Carry the Fallen", cost: ["Sky", "War"], damage: 50, effect: null, text: "For Valhalla." }
    ],
    ability: { name: "Battle Hymn", text: "Your other Norse Champions take -10 damage from attacks." },
    weakness: "Frost", resistance: "Sky", retreatCost: 1,
    flavorText: "She decides who feasts in Valhalla.",
    deckTags: ["Ragnarok"]
  },
  "norse-frostgiant": {
    id: "norse-frostgiant", name: "Frost Giant", type: "Champion",
    pantheon: "Norse", rarity: "Rare", stage: "basic", hp: 110,
    attacks: [
      { name: "Glacier Fist", cost: ["Frost"], damage: 30, effect: "freeze", text: "The Defender is Frozen." },
      { name: "Avalanche", cost: ["Frost", "Frost"], damage: 70, effect: null, text: "The mountain falls." }
    ],
    ability: { name: "Jotun Hide", text: "Frost Giant takes -10 damage from War attacks." },
    weakness: "Fire", resistance: "Frost", retreatCost: 3,
    flavorText: "Older than the gods themselves.",
    deckTags: ["Ragnarok"]
  },

  /* ====================== ROMAN ====================== */
  "roman-mars": {
    id: "roman-mars", name: "Mars, Father of War", type: "Champion",
    pantheon: "Roman", rarity: "Legendary", stage: "basic", hp: 130,
    attacks: [
      { name: "Legion Charge", cost: ["War"], damage: 40, effect: null, text: "Discipline made deadly." },
      { name: "March of Conquest", cost: ["War", "War"], damage: 60, effect: "reserveBuff",
        text: "Deals 60 damage, +10 for each Champion in your reserve." }
    ],
    ability: { name: "War Standard", text: "Your Roman Champions take -10 damage while you have 2+ Champions in reserve." },
    weakness: "Wisdom", resistance: "War", retreatCost: 2,
    flavorText: "Rome marches behind him.",
    deckTags: ["Legion"]
  },
  "roman-minerva": {
    id: "roman-minerva", name: "Minerva, Tactical Mind", type: "Champion",
    pantheon: "Roman", rarity: "Epic", stage: "basic", hp: 100,
    attacks: [
      { name: "Calculated Strike", cost: ["Wisdom"], damage: 30, effect: null, text: "Every move is planned." },
      { name: "Battle Doctrine", cost: ["Wisdom", "War"], damage: 50, effect: "draw1", text: "Draw a card." }
    ],
    ability: { name: "Strategist", text: "Your Relic cards cost no Energy to use." },
    weakness: "Fire", resistance: "Wisdom", retreatCost: 1,
    flavorText: "Wisdom is the sharpest blade.",
    deckTags: ["Legion"]
  },
  "roman-romulus": {
    id: "roman-romulus", name: "Romulus, Founder-King", type: "Champion",
    pantheon: "Roman", rarity: "Rare", stage: "basic", hp: 110,
    attacks: [
      { name: "Founder's Blade", cost: ["War"], damage: 30, effect: null, text: "From him, an empire." },
      { name: "Eternal City", cost: ["War", "Wisdom"], damage: 60, effect: "selfShield", text: "This Champion gains Shield." }
    ],
    ability: { name: "Rally", text: "When Romulus enters play, your reserve Champions heal 10 HP each." },
    weakness: "Trickery", resistance: "War", retreatCost: 2,
    flavorText: "He drew the walls of a thousand years.",
    deckTags: ["Legion"]
  },
  "roman-legionnaire": {
    id: "roman-legionnaire", name: "Legionnaire Cohort", type: "Champion",
    pantheon: "Roman", rarity: "Common", stage: "basic", hp: 80,
    attacks: [
      { name: "Shield Wall", cost: ["War"], damage: 20, effect: "selfShield", text: "Gains Shield." },
      { name: "Pila Volley", cost: ["War", "Any"], damage: 50, effect: null, text: "A storm of javelins." }
    ],
    ability: { name: "Formation", text: "Takes -10 damage for each other Roman Champion in your reserve (max -20)." },
    weakness: "Fire", resistance: "War", retreatCost: 1,
    flavorText: "One shield is weak. A wall is unbreakable.",
    deckTags: ["Legion"]
  },
  "roman-augur": {
    id: "roman-augur", name: "Imperial Augur", type: "Champion",
    pantheon: "Roman", rarity: "Uncommon", stage: "basic", hp: 70,
    attacks: [
      { name: "Read the Omens", cost: ["Wisdom"], damage: 10, effect: "draw1", text: "Draw a card." }
    ],
    ability: { name: "Divination", text: "When you Ascend a Champion, draw a card." },
    weakness: "Underworld", resistance: "Wisdom", retreatCost: 1,
    flavorText: "The birds tell him what the gods intend.",
    deckTags: ["Legion"]
  },
  "roman-janus": {
    id: "roman-janus", name: "Janus, Keeper of Gates", type: "Champion",
    pantheon: "Roman", rarity: "Rare", stage: "basic", hp: 90,
    attacks: [
      { name: "Twin Faces", cost: ["Wisdom", "Any"], damage: 40, effect: "swapHint", text: "You may switch your Active with a reserve Champion." }
    ],
    ability: { name: "Threshold", text: "Retreating one of your Champions costs 1 less Energy." },
    weakness: "Fire", resistance: "Wisdom", retreatCost: 1,
    flavorText: "He looks to where you came from, and where you go.",
    deckTags: ["Legion"]
  },
  "roman-vulcan": {
    id: "roman-vulcan", name: "Vulcan, Forge Master", type: "Champion",
    pantheon: "Roman", rarity: "Rare", stage: "basic", hp: 100,
    attacks: [
      { name: "Hammer of the Forge", cost: ["Fire"], damage: 40, effect: null, text: "Struck on the anvil of war." },
      { name: "Molten Burst", cost: ["Fire", "War"], damage: 60, effect: "burn", text: "The Defender is Burned." }
    ],
    ability: { name: "Master Smith", text: "Relics attached to your Champions give +10 damage." },
    weakness: "Frost", resistance: "Fire", retreatCost: 2,
    flavorText: "He forged the weapons of the gods.",
    deckTags: ["Legion"]
  },
  "roman-wolf": {
    id: "roman-wolf", name: "Capitoline Wolf", type: "Champion",
    pantheon: "Roman", rarity: "Uncommon", stage: "basic", hp: 70,
    attacks: [
      { name: "Guardian Bite", cost: ["Nature"], damage: 30, effect: null, text: "She protects the founders." },
      { name: "Nurturing Howl", cost: ["Nature", "Any"], damage: 30, effect: "healReserve", text: "Your reserve Champions heal 20 HP each." }
    ],
    ability: { name: "She-Wolf", text: "Your Roman Champions in reserve heal 10 HP at the end of your turn." },
    weakness: "Fire", resistance: "Nature", retreatCost: 1,
    flavorText: "She raised an empire's first kings.",
    deckTags: ["Legion"]
  },

  /* ====================== EGYPTIAN ====================== */
  "egypt-ra": {
    id: "egypt-ra", name: "Ra, Solar Sovereign", type: "Champion",
    pantheon: "Egyptian", rarity: "Legendary", stage: "basic", hp: 130,
    attacks: [
      { name: "Sun Flare", cost: ["Sun"], damage: 40, effect: null, text: "The desert burns at noon." },
      { name: "Solar Wrath", cost: ["Sun", "Sun", "Any"], damage: 100, effect: "burn", text: "The Defender is Burned." }
    ],
    ability: { name: "Dawn's Authority", text: "Your Egyptian Champions' Sun attacks deal +10 damage." },
    weakness: "Underworld", resistance: "Sun", retreatCost: 2,
    flavorText: "He sails the sky in his solar barge.",
    deckTags: ["Eternity"]
  },
  "egypt-anubis": {
    id: "egypt-anubis", name: "Anubis, Weigher of Hearts", type: "Champion",
    pantheon: "Egyptian", rarity: "Epic", stage: "basic", hp: 110,
    attacks: [
      { name: "Jackal Strike", cost: ["Underworld"], damage: 30, effect: null, text: "He guides the dead." },
      { name: "Weigh the Soul", cost: ["Underworld", "Any"], damage: 50, effect: "curse", text: "The Defender is Cursed." }
    ],
    ability: { name: "Guardian of the Dead", text: "When Anubis is defeated, draw 2 cards." },
    weakness: "Sun", resistance: "Underworld", retreatCost: 2,
    flavorText: "Your heart is weighed against a feather.",
    deckTags: ["Eternity"]
  },
  "egypt-anubis-asc": {
    id: "egypt-anubis-asc", name: "Anubis, Judge of Souls", type: "Champion",
    pantheon: "Egyptian", rarity: "Legendary", stage: "ascended", ascendsFrom: "egypt-anubis", hp: 170,
    attacks: [
      { name: "Underworld Verdict", cost: ["Underworld", "Any"], damage: 70, effect: "curse", text: "The Defender is Cursed." },
      { name: "Final Judgment", cost: ["Underworld", "Underworld", "Any"], damage: 110, effect: null, text: "None escape the scales." }
    ],
    ability: { name: "Lord of the Scales", text: "Cursed enemies take an additional -10 damage on their attacks." },
    weakness: "Sun", resistance: "Underworld", retreatCost: 2,
    flavorText: "He holds the scales between worlds.",
    deckTags: ["Eternity"]
  },
  "egypt-isis": {
    id: "egypt-isis", name: "Isis, Mother of Renewal", type: "Champion",
    pantheon: "Egyptian", rarity: "Epic", stage: "basic", hp: 100,
    attacks: [
      { name: "Healing Wind", cost: ["Sun"], damage: 20, effect: "healReserve", text: "Your Champions heal 20 HP each." },
      { name: "Wings of Magic", cost: ["Sun", "Wisdom"], damage: 50, effect: null, text: "Her wings shelter the worthy." }
    ],
    ability: { name: "Renewal", text: "At the end of your turn, your Active Champion heals 10 HP." },
    weakness: "Underworld", resistance: "Sun", retreatCost: 1,
    flavorText: "She gathered the scattered and made them whole.",
    deckTags: ["Eternity"]
  },
  "egypt-osiris": {
    id: "egypt-osiris", name: "Osiris, Returned King", type: "Champion",
    pantheon: "Egyptian", rarity: "Legendary", stage: "basic", hp: 120,
    attacks: [
      { name: "Crook and Flail", cost: ["Underworld", "Sun"], damage: 60, effect: null, text: "The king of the afterlife judges all." }
    ],
    ability: { name: "Rebirth", text: "Once per game, when Osiris is defeated, return him to your reserve with 60 HP instead." },
    weakness: "Fire", resistance: "Underworld", retreatCost: 2,
    flavorText: "Death could not keep its king.",
    deckTags: ["Eternity"]
  },
  "egypt-horus": {
    id: "egypt-horus", name: "Horus, Falcon Avenger", type: "Champion",
    pantheon: "Egyptian", rarity: "Rare", stage: "basic", hp: 100,
    attacks: [
      { name: "Talon Dive", cost: ["Sky"], damage: 40, effect: null, text: "From the sun he strikes." },
      { name: "Eye of Vengeance", cost: ["Sky", "Sun"], damage: 70, effect: null, text: "He avenges his father." }
    ],
    ability: { name: "Sky Falcon", text: "Horus takes -10 damage from Underworld attacks." },
    weakness: "Frost", resistance: "Sky", retreatCost: 1,
    flavorText: "His eyes are the sun and the moon.",
    deckTags: ["Eternity"]
  },
  "egypt-bastet": {
    id: "egypt-bastet", name: "Bastet, Silent Protector", type: "Champion",
    pantheon: "Egyptian", rarity: "Uncommon", stage: "basic", hp: 80,
    attacks: [
      { name: "Claw Swipe", cost: ["Moon"], damage: 30, effect: null, text: "Soft paws, sharp claws." },
      { name: "Night Pounce", cost: ["Moon", "Any"], damage: 50, effect: "selfShield", text: "Gains Shield." }
    ],
    ability: { name: "Feline Grace", text: "Bastet's retreat cost is 0." },
    weakness: "Underworld", resistance: "Moon", retreatCost: 0,
    flavorText: "Guardian of home and hearth.",
    deckTags: ["Eternity"]
  },
  "egypt-sphinx": {
    id: "egypt-sphinx", name: "Sphinx, Keeper of Riddles", type: "Champion",
    pantheon: "Egyptian", rarity: "Rare", stage: "basic", hp: 110,
    attacks: [
      { name: "Riddle's Toll", cost: ["Wisdom"], damage: 20, effect: "draw1", text: "Draw a card." },
      { name: "Desert Guardian", cost: ["Wisdom", "Sun"], damage: 60, effect: null, text: "Answer wrongly and perish." }
    ],
    ability: { name: "Ancient Wisdom", text: "Your Oracle cards cost nothing extra and you may play one more per turn." },
    weakness: "Underworld", resistance: "Wisdom", retreatCost: 2,
    flavorText: "What walks on four legs, then two, then three?",
    deckTags: ["Eternity"]
  },
  "egypt-scarab": {
    id: "egypt-scarab", name: "Scarab Guardian", type: "Champion",
    pantheon: "Egyptian", rarity: "Common", stage: "basic", hp: 60,
    attacks: [
      { name: "Carapace Ram", cost: ["Sun"], damage: 20, effect: null, text: "Roll of the sacred beetle." }
    ],
    ability: { name: "Eternal Cycle", text: "When Scarab Guardian is defeated, draw a card." },
    weakness: "Underworld", resistance: "Sun", retreatCost: 1,
    flavorText: "It rolls the sun across the sky.",
    deckTags: ["Eternity"]
  },

  /* ====================== SLAVIC ====================== */
  "slavic-perun": {
    id: "slavic-perun", name: "Perun, Thunder Oak", type: "Champion",
    pantheon: "Slavic", rarity: "Legendary", stage: "basic", hp: 130,
    attacks: [
      { name: "Axe of Storms", cost: ["Sky"], damage: 40, effect: null, text: "Lightning splits the oak." },
      { name: "Thunder Oak", cost: ["Sky", "War"], damage: 70, effect: "stunOmen",
        text: "Omen Roll. On a Favorable Omen, the Defender is Stunned." }
    ],
    ability: { name: "Sky Father", text: "Perun's Sky attacks deal +10 damage." },
    weakness: "Underworld", resistance: "Sky", retreatCost: 2,
    flavorText: "His axe carves the heavens.",
    deckTags: ["Spirits"]
  },
  "slavic-veles": {
    id: "slavic-veles", name: "Veles, Serpent of the Deep", type: "Champion",
    pantheon: "Slavic", rarity: "Epic", stage: "basic", hp: 120,
    attacks: [
      { name: "Coil Crush", cost: ["Underworld"], damage: 30, effect: null, text: "He drags you down." },
      { name: "Cattle of the Dead", cost: ["Underworld", "Nature"], damage: 60, effect: "curse", text: "The Defender is Cursed." }
    ],
    ability: { name: "Underworld Lord", text: "Veles takes -10 damage from Sky attacks." },
    weakness: "Sky", resistance: "Underworld", retreatCost: 2,
    flavorText: "Eternal rival of the thunder god.",
    deckTags: ["Spirits"]
  },
  "slavic-morana": {
    id: "slavic-morana", name: "Morana, Winter's Veil", type: "Champion",
    pantheon: "Slavic", rarity: "Epic", stage: "basic", hp: 100,
    attacks: [
      { name: "Frost Touch", cost: ["Frost"], damage: 30, effect: "freeze", text: "The Defender is Frozen." },
      { name: "Death's Winter", cost: ["Frost", "Underworld"], damage: 60, effect: "poison", text: "The Defender is Poisoned." }
    ],
    ability: { name: "Withering Cold", text: "Frozen enemies take 10 extra damage from Morana's attacks." },
    weakness: "Fire", resistance: "Frost", retreatCost: 1,
    flavorText: "Where she walks, the harvest dies.",
    deckTags: ["Spirits"]
  },
  "slavic-svarog": {
    id: "slavic-svarog", name: "Svarog, Fire Smith", type: "Champion",
    pantheon: "Slavic", rarity: "Rare", stage: "basic", hp: 110,
    attacks: [
      { name: "Forge Strike", cost: ["Fire"], damage: 40, effect: null, text: "He hammered the sun into being." },
      { name: "Heaven's Fire", cost: ["Fire", "Fire"], damage: 70, effect: "burn", text: "The Defender is Burned." }
    ],
    ability: { name: "Celestial Smith", text: "Svarog's Fire attacks deal +10 damage." },
    weakness: "Frost", resistance: "Fire", retreatCost: 2,
    flavorText: "The first flame was struck on his anvil.",
    deckTags: ["Spirits"]
  },
  "slavic-vesna": {
    id: "slavic-vesna", name: "Vesna, Spring Bringer", type: "Champion",
    pantheon: "Slavic", rarity: "Uncommon", stage: "basic", hp: 80,
    attacks: [
      { name: "Bloom", cost: ["Nature"], damage: 20, effect: "healReserve", text: "Your Champions heal 20 HP each." },
      { name: "Renewing Gale", cost: ["Nature", "Any"], damage: 40, effect: null, text: "Life returns to the land." }
    ],
    ability: { name: "Spring's Promise", text: "At the end of your turn, your Active Champion heals 10 HP." },
    weakness: "Fire", resistance: "Nature", retreatCost: 1,
    flavorText: "She melts the grip of winter.",
    deckTags: ["Spirits"]
  },
  "slavic-leshy": {
    id: "slavic-leshy", name: "Leshy, Forest Watcher", type: "Champion",
    pantheon: "Slavic", rarity: "Rare", stage: "basic", hp: 100,
    attacks: [
      { name: "Tangling Roots", cost: ["Nature"], damage: 30, effect: "freeze", text: "The Defender is Frozen (rooted)." },
      { name: "Wild Maze", cost: ["Nature", "Trickery"], damage: 50, effect: null, text: "You will wander forever." }
    ],
    ability: { name: "Master of the Wood", text: "While a Nature Realm is active, Leshy takes -10 damage." },
    weakness: "Fire", resistance: "Nature", retreatCost: 2,
    flavorText: "He is as tall as the trees, or as small as a blade of grass.",
    deckTags: ["Spirits"]
  },
  "slavic-rusalka": {
    id: "slavic-rusalka", name: "Rusalka, River Spirit", type: "Champion",
    pantheon: "Slavic", rarity: "Uncommon", stage: "basic", hp: 80,
    attacks: [
      { name: "Luring Song", cost: ["Moon"], damage: 20, effect: "curse", text: "The Defender is Cursed." },
      { name: "Drowning Embrace", cost: ["Moon", "Frost"], damage: 50, effect: null, text: "Down into the cold water." }
    ],
    ability: { name: "Water's Call", text: "Cursed enemies take 10 extra damage from Rusalka." },
    weakness: "Sun", resistance: "Moon", retreatCost: 1,
    flavorText: "Her song is the last sound the drowned hear.",
    deckTags: ["Spirits"]
  },
  "slavic-babayaga": {
    id: "slavic-babayaga", name: "Baba Yaga, Bone-Hut Witch", type: "Champion",
    pantheon: "Slavic", rarity: "Epic", stage: "basic", hp: 100,
    attacks: [
      { name: "Hex", cost: ["Trickery"], damage: 20, effect: "curse", text: "The Defender is Cursed." },
      { name: "Cauldron Brew", cost: ["Trickery", "Nature"], damage: 50, effect: "poison", text: "The Defender is Poisoned." }
    ],
    ability: { name: "Bone Hut", text: "When Baba Yaga is your Active Champion, your Oracle cards draw an extra card." },
    weakness: "Sun", resistance: "Trickery", retreatCost: 1,
    flavorText: "Her hut runs on chicken legs.",
    deckTags: ["Spirits"]
  },

  /* ====================== CELTIC ====================== */
  "celtic-cernunnos": {
    id: "celtic-cernunnos", name: "Cernunnos, Horned Guardian", type: "Champion",
    pantheon: "Celtic", rarity: "Legendary", stage: "basic", hp: 120,
    attacks: [
      { name: "Antler Charge", cost: ["Nature"], damage: 40, effect: null, text: "Lord of wild things." },
      { name: "Wild Growth", cost: ["Nature", "Any"], damage: 60, effect: "healReserve", text: "Your Champions heal 20 HP each." }
    ],
    ability: { name: "Lord of Beasts", text: "Your Nature attacks deal +10 damage." },
    weakness: "Fire", resistance: "Nature", retreatCost: 2,
    flavorText: "Between the worlds of man and beast.",
    deckTags: ["Spirits"]
  },
  "celtic-morrigan": {
    id: "celtic-morrigan", name: "The Morrigan, Crow of Battle", type: "Champion",
    pantheon: "Celtic", rarity: "Epic", stage: "basic", hp: 100,
    attacks: [
      { name: "Crow's Omen", cost: ["Trickery"], damage: 20, effect: "curse", text: "The Defender is Cursed." },
      { name: "Phantom Flight", cost: ["Trickery", "Moon"], damage: 50, effect: "swapHint", text: "You may switch your Active with a reserve Champion." }
    ],
    ability: { name: "Foreteller of Doom", text: "When a Champion is defeated (yours or the enemy's), draw a card." },
    weakness: "Sun", resistance: "Trickery", retreatCost: 1,
    flavorText: "She decides who lives and who falls.",
    deckTags: ["Spirits"]
  },
  "celtic-brigid": {
    id: "celtic-brigid", name: "Brigid, Flame of Inspiration", type: "Champion",
    pantheon: "Celtic", rarity: "Rare", stage: "basic", hp: 90,
    attacks: [
      { name: "Sacred Fire", cost: ["Fire"], damage: 30, effect: null, text: "Flame of the hearth and forge." },
      { name: "Healing Flame", cost: ["Fire", "Nature"], damage: 40, effect: "heal20", text: "This Champion heals 20 HP." }
    ],
    ability: { name: "Triple Flame", text: "At the end of your turn, your Active Champion heals 10 HP." },
    weakness: "Frost", resistance: "Fire", retreatCost: 1,
    flavorText: "Poetry, healing, and the forge are hers.",
    deckTags: ["Spirits"]
  },
  "celtic-lugh": {
    id: "celtic-lugh", name: "Lugh, Many-Skilled", type: "Champion",
    pantheon: "Celtic", rarity: "Epic", stage: "basic", hp: 100,
    attacks: [
      { name: "Spear of Light", cost: ["Sun"], damage: 40, effect: null, text: "His spear cannot be defeated." },
      { name: "Master of All Arts", cost: ["Sun", "Any"], damage: 60, effect: "draw1", text: "Draw a card." }
    ],
    ability: { name: "Samildanach", text: "Lugh's attacks may use any Energy type as Sun." },
    weakness: "Underworld", resistance: "Sun", retreatCost: 1,
    flavorText: "He has mastered every craft and skill.",
    deckTags: ["Spirits"]
  },
  "celtic-cuchulainn": {
    id: "celtic-cuchulainn", name: "Cu Chulainn, Hound of Ulster", type: "Champion",
    pantheon: "Celtic", rarity: "Epic", stage: "basic", hp: 110,
    attacks: [
      { name: "Spear Gae Bolg", cost: ["War"], damage: 40, effect: null, text: "The barbed spear never misses." },
      { name: "Warp Spasm", cost: ["War", "War"], damage: 80, effect: "selfDamage20",
        text: "Deals 80 damage. This Champion takes 20 recoil damage." }
    ],
    ability: { name: "Battle Fury", text: "If Cu Chulainn has 50 or less HP, its attacks deal +20 damage." },
    weakness: "Trickery", resistance: "War", retreatCost: 2,
    flavorText: "In battle frenzy, friend and foe both fear him.",
    deckTags: ["Spirits"]
  },
  "celtic-druid": {
    id: "celtic-druid", name: "Druid of the Grove", type: "Champion",
    pantheon: "Celtic", rarity: "Common", stage: "basic", hp: 70,
    attacks: [
      { name: "Staff Strike", cost: ["Nature"], damage: 20, effect: null, text: "Keeper of old knowledge." },
      { name: "Nature's Gift", cost: ["Nature", "Any"], damage: 20, effect: "draw2", text: "Draw 2 cards." }
    ],
    ability: { name: "Grove Keeper", text: "When the Druid enters reserve, search is easier — draw a card." },
    weakness: "Fire", resistance: "Nature", retreatCost: 1,
    flavorText: "He reads the will of oak and stone.",
    deckTags: ["Spirits"]
  },
  "celtic-banshee": {
    id: "celtic-banshee", name: "Banshee Wailer", type: "Champion",
    pantheon: "Celtic", rarity: "Uncommon", stage: "basic", hp: 70,
    attacks: [
      { name: "Mourning Cry", cost: ["Moon"], damage: 20, effect: "curse", text: "The Defender is Cursed." },
      { name: "Death Wail", cost: ["Moon", "Underworld"], damage: 50, effect: null, text: "Her scream foretells the grave." }
    ],
    ability: { name: "Harbinger", text: "Cursed enemies take 10 extra damage from the Banshee." },
    weakness: "Sun", resistance: "Moon", retreatCost: 1,
    flavorText: "Hear her cry and someone will die tonight.",
    deckTags: ["Spirits"]
  },
  "celtic-faerie": {
    id: "celtic-faerie", name: "Faerie Trickster", type: "Champion",
    pantheon: "Celtic", rarity: "Common", stage: "basic", hp: 60,
    attacks: [
      { name: "Pixie Dust", cost: ["Trickery"], damage: 20, effect: "stunOmen",
        text: "Omen Roll. On a Favorable Omen, the Defender is Stunned." }
    ],
    ability: { name: "Glamour", text: "Faerie Trickster has no retreat cost." },
    weakness: "Sun", resistance: "Trickery", retreatCost: 0,
    flavorText: "Never accept a faerie's bargain.",
    deckTags: ["Spirits"]
  },

  /* ====================== DIVINE ENERGY ====================== */
  "energy-sky":        { id: "energy-sky",        name: "Sky Energy",        type: "Energy", pantheon: null, rarity: "Common", energyType: "Sky",        flavorText: "The breath of the heavens." },
  "energy-war":        { id: "energy-war",        name: "War Energy",        type: "Energy", pantheon: null, rarity: "Common", energyType: "War",        flavorText: "The drumbeat of battle." },
  "energy-wisdom":     { id: "energy-wisdom",     name: "Wisdom Energy",     type: "Energy", pantheon: null, rarity: "Common", energyType: "Wisdom",     flavorText: "Knowledge is power." },
  "energy-underworld": { id: "energy-underworld", name: "Underworld Energy", type: "Energy", pantheon: null, rarity: "Common", energyType: "Underworld", flavorText: "The cold breath of the grave." },
  "energy-nature":     { id: "energy-nature",     name: "Nature Energy",     type: "Energy", pantheon: null, rarity: "Common", energyType: "Nature",     flavorText: "The pulse of the living world." },
  "energy-trickery":   { id: "energy-trickery",   name: "Trickery Energy",   type: "Energy", pantheon: null, rarity: "Common", energyType: "Trickery",   flavorText: "Nothing is as it seems." },
  "energy-fire":       { id: "energy-fire",       name: "Fire Energy",       type: "Energy", pantheon: null, rarity: "Common", energyType: "Fire",       flavorText: "The first and final flame." },
  "energy-frost":      { id: "energy-frost",      name: "Frost Energy",      type: "Energy", pantheon: null, rarity: "Common", energyType: "Frost",      flavorText: "Silence of the deep winter." },
  "energy-sun":        { id: "energy-sun",        name: "Sun Energy",        type: "Energy", pantheon: null, rarity: "Common", energyType: "Sun",        flavorText: "The eye of the day." },
  "energy-moon":       { id: "energy-moon",       name: "Moon Energy",       type: "Energy", pantheon: null, rarity: "Common", energyType: "Moon",        flavorText: "The lantern of the night." },

  /* ====================== RELIC ====================== */
  "relic-thunderbolt": {
    id: "relic-thunderbolt", name: "Thunderbolt Shard", type: "Relic", pantheon: "Greek", rarity: "Rare",
    relicMode: "attach", effect: "dmgPlus20",
    text: "Attach to one of your Champions. Its attacks deal +20 damage.",
    flavorText: "A splinter of Zeus's own bolt."
  },
  "relic-runestone": {
    id: "relic-runestone", name: "Rune Stone", type: "Relic", pantheon: "Norse", rarity: "Uncommon",
    relicMode: "instant", effect: "draw2",
    text: "Draw 2 cards.",
    flavorText: "Carved with the secrets of the elder futhark."
  },
  "relic-shield-athena": {
    id: "relic-shield-athena", name: "Shield of Athena", type: "Relic", pantheon: "Greek", rarity: "Rare",
    relicMode: "attach", effect: "dmgReduce20",
    text: "Attach to one of your Champions. It takes -20 damage from attacks.",
    flavorText: "The Aegis turns aside all blows."
  },
  "relic-eye-of-ra": {
    id: "relic-eye-of-ra", name: "Eye of Ra", type: "Relic", pantheon: "Egyptian", rarity: "Epic",
    relicMode: "instant", effect: "burnEnemy",
    text: "The Defending Champion is Burned.",
    flavorText: "It sees all, and it burns all."
  },
  "relic-spear-mars": {
    id: "relic-spear-mars", name: "Spear of Mars", type: "Relic", pantheon: "Roman", rarity: "Rare",
    relicMode: "attach", effect: "dmgPlus20",
    text: "Attach to one of your Champions. Its attacks deal +20 damage.",
    flavorText: "Forged for the god of war himself."
  },
  "relic-ankh": {
    id: "relic-ankh", name: "Ankh of Renewal", type: "Relic", pantheon: "Egyptian", rarity: "Uncommon",
    relicMode: "instant", effect: "healActive40",
    text: "Your Active Champion heals 40 HP.",
    flavorText: "The key of life itself."
  },
  "relic-druid-amulet": {
    id: "relic-druid-amulet", name: "Druidic Amulet", type: "Relic", pantheon: "Celtic", rarity: "Uncommon",
    relicMode: "attach", effect: "healEndTurn10",
    text: "Attach to one of your Champions. It heals 10 HP at the end of your turn.",
    flavorText: "Woven from oak, mistletoe, and old words."
  },
  "relic-veles-chain": {
    id: "relic-veles-chain", name: "Chain of Veles", type: "Relic", pantheon: "Slavic", rarity: "Rare",
    relicMode: "instant", effect: "freezeEnemy",
    text: "The Defending Champion is Frozen.",
    flavorText: "Chains forged in the underworld's depths."
  },

  /* ====================== ORACLE ====================== */
  "oracle-prophecy-war": {
    id: "oracle-prophecy-war", name: "Prophecy of War", type: "Oracle", pantheon: "Greek", rarity: "Uncommon",
    effect: "blessActive",
    text: "Your Active Champion gains Blessing (+10 damage for 2 turns).",
    flavorText: "The seers foretell a season of blood."
  },
  "oracle-blessing-ancestors": {
    id: "oracle-blessing-ancestors", name: "Blessing of the Ancestors", type: "Oracle", pantheon: "Slavic", rarity: "Uncommon",
    effect: "healReserve30",
    text: "Each of your Champions heals 30 HP.",
    flavorText: "The forefathers watch over their kin."
  },
  "oracle-valkyries": {
    id: "oracle-valkyries", name: "Call of the Valkyries", type: "Oracle", pantheon: "Norse", rarity: "Rare",
    effect: "draw3",
    text: "Draw 3 cards.",
    flavorText: "They descend to carry the worthy."
  },
  "oracle-tricksters-bargain": {
    id: "oracle-tricksters-bargain", name: "Trickster's Bargain", type: "Oracle", pantheon: "Celtic", rarity: "Rare",
    effect: "curseEnemy",
    text: "The Defending Champion is Cursed.",
    flavorText: "Every gift has a hidden price."
  },
  "oracle-ritual-rebirth": {
    id: "oracle-ritual-rebirth", name: "Ritual of Rebirth", type: "Oracle", pantheon: "Egyptian", rarity: "Epic",
    effect: "healActive60",
    text: "Your Active Champion heals 60 HP.",
    flavorText: "From the ashes, the king returns."
  },
  "oracle-council-olympus": {
    id: "oracle-council-olympus", name: "Council of Olympus", type: "Oracle", pantheon: "Greek", rarity: "Rare",
    effect: "draw2attach",
    text: "Draw 2 cards.",
    flavorText: "The gods convene to decide your fate."
  },
  "oracle-sandstorm-ra": {
    id: "oracle-sandstorm-ra", name: "Sandstorm of Ra", type: "Oracle", pantheon: "Egyptian", rarity: "Rare",
    effect: "dmgEnemy30",
    text: "Deal 30 damage to the Defending Champion (ignores Weakness/Resistance).",
    flavorText: "The desert rises to swallow all."
  },
  "oracle-march-legion": {
    id: "oracle-march-legion", name: "March of the Legion", type: "Oracle", pantheon: "Roman", rarity: "Uncommon",
    effect: "shieldAll",
    text: "Each of your Champions gains Shield.",
    flavorText: "Shields up. Forward, as one."
  },

  /* ====================== REALM ====================== */
  "realm-olympus": {
    id: "realm-olympus", name: "Mount Olympus", type: "Realm", pantheon: "Greek", rarity: "Rare",
    realmEffect: "greekSkyPlus10",
    text: "Sky attacks from Greek Champions deal +10 damage.",
    flavorText: "Home of the gods, above the clouds."
  },
  "realm-asgard": {
    id: "realm-asgard", name: "Asgard", type: "Realm", pantheon: "Norse", rarity: "Rare",
    realmEffect: "norseWarPlus10",
    text: "War attacks from Norse Champions deal +10 damage.",
    flavorText: "The golden hall of the slain."
  },
  "realm-forum": {
    id: "realm-forum", name: "Roman Forum", type: "Realm", pantheon: "Roman", rarity: "Rare",
    realmEffect: "reserveReduce10",
    text: "Champions take -10 damage while their controller has 2+ Champions in reserve.",
    flavorText: "The beating heart of the empire."
  },
  "realm-duat": {
    id: "realm-duat", name: "Duat", type: "Realm", pantheon: "Egyptian", rarity: "Rare",
    realmEffect: "underworldPlus10",
    text: "Underworld and Sun attacks deal +10 damage.",
    flavorText: "The river of the dead winds through the dark."
  },
  "realm-grove": {
    id: "realm-grove", name: "Sacred Grove", type: "Realm", pantheon: "Slavic", rarity: "Rare",
    realmEffect: "natureHeal10",
    text: "At the end of each turn, that player's Active Champion heals 10 HP.",
    flavorText: "Ancient trees remember the old gods."
  },
  "realm-frozen": {
    id: "realm-frozen", name: "Frozen Battlefield", type: "Realm", pantheon: "Norse", rarity: "Rare",
    realmEffect: "nonNorseRetreatPlus1",
    text: "Non-Norse Champions have +1 retreat cost.",
    flavorText: "A wasteland of ice and frozen blood."
  },
};

/* expose */
if (typeof window !== "undefined") {
  window.CARDS = CARDS;
  window.PANTHEONS = PANTHEONS;
  window.ENERGY_TYPES = ENERGY_TYPES;
  window.PANTHEON_STYLE = PANTHEON_STYLE;
  window.ENERGY_STYLE = ENERGY_STYLE;
  window.RARITY_STYLE = RARITY_STYLE;
}
if (typeof module !== "undefined") {
  module.exports = { CARDS, PANTHEONS, ENERGY_TYPES, PANTHEON_STYLE, ENERGY_STYLE, RARITY_STYLE };
}
