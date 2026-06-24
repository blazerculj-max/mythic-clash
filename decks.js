/* ============================================================================
   MYTHIC CLASH: WARS OF PANTHEONS
   decks.js — Starter decks
   ----------------------------------------------------------------------------
   Vsak deck = 40 kart. Sestava (cilj):
     ~16 Champion, ~14 Energy, ~6 Oracle, ~3 Relic, ~1 Realm
   "list" je polje id-jev. Ponovitve so dovoljene (npr. več kosov energije).
============================================================================ */

// pomožna: ponovi id n-krat
function rep(id, n) { return Array.from({ length: n }, () => id); }

const STARTER_DECKS = {

  /* ---------------------------------------------------------------- */
  olympus: {
    id: "olympus",
    name: "Olympus Strike",
    pantheon: "Greek",
    blurb: "Uravnotežen grški deck. Močan card draw, Sky napadi in Zeus kot zaključek.",
    style: "Balanced • Draw • Sky",
    list: [
      // 16 Champions
      "greek-zeus", "greek-athena", "greek-heracles", "greek-heracles-asc",
      "greek-medusa", "greek-pegasus", "greek-hydra", "greek-oracle",
      ...rep("greek-pegasus", 1), ...rep("greek-oracle", 1),
      ...rep("greek-heracles", 1), ...rep("greek-athena", 1),
      ...rep("greek-medusa", 1), ...rep("greek-hydra", 1),
      ...rep("greek-pegasus", 1), ...rep("greek-oracle", 1),
      // 14 Energy
      ...rep("energy-sky", 6), ...rep("energy-wisdom", 4), ...rep("energy-war", 4),
      // 6 Oracle
      "oracle-council-olympus", "oracle-council-olympus",
      "oracle-prophecy-war", "oracle-prophecy-war",
      "oracle-ritual-rebirth", "oracle-march-legion",
      // 3 Relic
      "relic-thunderbolt", "relic-shield-athena", "relic-ankh",
      // 1 Realm
      "realm-olympus",
    ],
  },

  /* ---------------------------------------------------------------- */
  ragnarok: {
    id: "ragnarok",
    name: "Ragnarok Fury",
    pantheon: "Norse",
    blurb: "Agresiven nordijski deck. Velika škoda, recoil tveganje in Thor, Storm Unleashed.",
    style: "Aggro • Burst • Risk",
    list: [
      // 16 Champions
      "norse-thor", "norse-thor-asc", "norse-odin", "norse-loki",
      "norse-freyja", "norse-fenrir", "norse-valkyrie", "norse-frostgiant",
      ...rep("norse-valkyrie", 1), ...rep("norse-frostgiant", 1),
      ...rep("norse-fenrir", 1), ...rep("norse-freyja", 1),
      ...rep("norse-valkyrie", 1), ...rep("norse-loki", 1),
      ...rep("norse-frostgiant", 1), ...rep("norse-valkyrie", 1),
      // 14 Energy
      ...rep("energy-war", 6), ...rep("energy-sky", 4), ...rep("energy-frost", 4),
      // 6 Oracle
      "oracle-valkyries", "oracle-valkyries",
      "oracle-prophecy-war", "oracle-prophecy-war",
      "oracle-tricksters-bargain", "oracle-march-legion",
      // 3 Relic
      "relic-runestone", "relic-runestone", "relic-veles-chain",
      // 1 Realm
      "realm-asgard",
    ],
  },

  /* ---------------------------------------------------------------- */
  eternity: {
    id: "eternity",
    name: "Sands of Eternity",
    pantheon: "Egyptian",
    blurb: "Egipčanski deck zdravljenja, prekletstev in vstajenj. Počasen začetek, močan late game.",
    style: "Heal • Curse • Revive",
    list: [
      // 16 Champions
      "egypt-ra", "egypt-anubis", "egypt-anubis-asc", "egypt-isis",
      "egypt-osiris", "egypt-horus", "egypt-bastet", "egypt-sphinx",
      "egypt-scarab",
      ...rep("egypt-scarab", 1), ...rep("egypt-bastet", 1),
      ...rep("egypt-horus", 1), ...rep("egypt-isis", 1),
      ...rep("egypt-scarab", 1), ...rep("egypt-sphinx", 1),
      ...rep("egypt-bastet", 1),
      // 14 Energy
      ...rep("energy-sun", 6), ...rep("energy-underworld", 5), ...rep("energy-wisdom", 3),
      // 6 Oracle
      "oracle-ritual-rebirth", "oracle-ritual-rebirth",
      "oracle-sandstorm-ra", "oracle-sandstorm-ra",
      "oracle-blessing-ancestors", "oracle-council-olympus",
      // 3 Relic
      "relic-eye-of-ra", "relic-ankh", "relic-ankh",
      // 1 Realm
      "realm-duat",
    ],
  },

  /* ---------------------------------------------------------------- */
  spirits: {
    id: "spirits",
    name: "Forest of Spirits",
    pantheon: "Slavic",
    blurb: "Slovansko-keltski deck statusov in narave. Nadzor tempa, zmrzal, prekletstva, zdravljenje.",
    style: "Status • Nature • Control",
    list: [
      // 16 Champions (mešanica Slavic + Celtic)
      "slavic-perun", "slavic-veles", "slavic-morana", "slavic-svarog",
      "slavic-vesna", "slavic-leshy", "slavic-rusalka", "slavic-babayaga",
      "celtic-cernunnos", "celtic-morrigan", "celtic-brigid",
      "celtic-druid", "celtic-banshee", "celtic-faerie",
      ...rep("celtic-druid", 1), ...rep("slavic-vesna", 1),
      // 14 Energy
      ...rep("energy-nature", 5), ...rep("energy-frost", 4),
      ...rep("energy-fire", 3), ...rep("energy-moon", 2),
      // 6 Oracle
      "oracle-tricksters-bargain", "oracle-tricksters-bargain",
      "oracle-blessing-ancestors", "oracle-blessing-ancestors",
      "oracle-prophecy-war", "oracle-sandstorm-ra",
      // 3 Relic
      "relic-veles-chain", "relic-druid-amulet", "relic-druid-amulet",
      // 1 Realm
      "realm-grove",
    ],
  },
};

/* expose */
if (typeof window !== "undefined") window.STARTER_DECKS = STARTER_DECKS;
if (typeof module !== "undefined") module.exports = { STARTER_DECKS };
