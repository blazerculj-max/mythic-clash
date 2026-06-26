/* ============================================================================
   MYTHIC CLASH: WARS OF PANTHEONS
   decks.js — Starter decks (uravnoteženo)
   ----------------------------------------------------------------------------
   Vsak deck = 40 kart. Sestava:
     16 Champion, 14 Energy, 6 Oracle, 3 Relic, 1 Realm
   Energije so usklajene z dejanskimi potrebami napadov championov,
   championi pa so osredotočeni na 1–2 energijska tipa za konsistentnost.
============================================================================ */

// pomožna: ponovi id n-krat
function rep(id, n) { return Array.from({ length: n }, () => id); }

const STARTER_DECKS = {

  /* ---------------------------------------------------------------- */
  /* OLYMPUS — Sky/Wisdom jedro. Pegasus + Oracle pritisk, Zeus finale. */
  olympus: {
    id: "olympus",
    name: "Olympus Strike",
    pantheon: "Greek",
    blurb: "Uravnotežen grški deck. Hiter Sky pritisk, card draw in Zeus kot zaključek.",
    style: "Balanced • Sky • Draw",
    list: [
      // 16 Champions — jedro Sky (Pegasus, Zeus) + Wisdom (Athena, Oracle)
      ...rep("greek-pegasus", 4),   // Sky, poceni, cost 0 retreat
      ...rep("greek-oracle", 3),    // Wisdom, draw engine
      ...rep("greek-athena", 3),    // Wisdom/War
      ...rep("greek-hydra", 2),     // Nature splash (cheap)
      ...rep("greek-zeus", 2),      // Sky finisher
      ...rep("greek-heracles", 1),  // War body
      "greek-heracles-asc",         // ascension
      // 14 Energy — Sky težišče
      ...rep("energy-sky", 8), ...rep("energy-wisdom", 4), ...rep("energy-war", 2),
      // 6 Oracle
      ...rep("oracle-council-olympus", 2), // draw + attach
      ...rep("oracle-prophecy-war", 2),    // blessing
      "oracle-ritual-rebirth", "oracle-march-legion",
      // 3 Relic
      "relic-thunderbolt", "relic-shield-athena", "relic-ankh",
      // 1 Realm
      "realm-olympus",
    ],
  },

  /* ---------------------------------------------------------------- */
  /* RAGNAROK — War jedro, agresija. Veliko War teles + Thor finale.   */
  ragnarok: {
    id: "ragnarok",
    name: "Ragnarok Fury",
    pantheon: "Norse",
    blurb: "Agresiven nordijski deck. Veliko War napadov, hitri pritisk in Thor, Storm Unleashed.",
    style: "Aggro • War • Burst",
    list: [
      // 16 Champions — jedro War (Valkyrie, Fenrir) + Frost splash
      ...rep("norse-valkyrie", 4),   // War, poceni agresija
      ...rep("norse-fenrir", 3),     // War, velik damage
      ...rep("norse-frostgiant", 2), // Frost body
      ...rep("norse-freya", 2),      // Sky/War utility
      ...rep("norse-thor", 2),       // War/Sky
      ...rep("norse-loki", 1),       // Trickery splash
      "norse-odin",                  // Wisdom/Sky
      "norse-thor-asc",              // ascension
      // 14 Energy — War težišče + nekaj Sky/Frost
      ...rep("energy-war", 8), ...rep("energy-sky", 3), ...rep("energy-frost", 3),
      // 6 Oracle
      ...rep("oracle-valkyries", 2),     // draw3
      ...rep("oracle-prophecy-war", 2),  // blessing
      "oracle-tricksters-bargain", "oracle-march-legion",
      // 3 Relic
      ...rep("relic-runestone", 2), "relic-spear-mars",
      // 1 Realm
      "realm-asgard",
    ],
  },

  /* ---------------------------------------------------------------- */
  /* SANDS — Sun jedro, heal/revive. Scarab+Isis začetek, Ra finale.   */
  eternity: {
    id: "eternity",
    name: "Sands of Eternity",
    pantheon: "Egyptian",
    blurb: "Egipčanski deck zdravljenja in vstajenj. Sončno težišče, vztrajen tempo, močan late game.",
    style: "Sun • Heal • Revive",
    list: [
      // 16 Champions — jedro Sun (Scarab, Isis, Ra, Horus delno)
      ...rep("egypt-scarab", 4),    // Sun, poceni
      ...rep("egypt-isis", 3),      // Sun, heal
      ...rep("egypt-horus", 2),     // Sky/Sun
      ...rep("egypt-sphinx", 2),    // Wisdom/Sun wall
      ...rep("egypt-ra", 2),        // Sun finisher
      ...rep("egypt-anubis", 1),    // Underworld splash
      "egypt-osiris",               // Underworld/Sun revive
      "egypt-anubis-asc",           // ascension
      // 14 Energy — Sun težišče + Sky (Horus) + Wisdom (Sphinx) + Underworld
      ...rep("energy-sun", 8), ...rep("energy-underworld", 2),
      ...rep("energy-wisdom", 2), ...rep("energy-sky", 2),
      // 6 Oracle
      ...rep("oracle-ritual-rebirth", 2), // heal60
      ...rep("oracle-sandstorm-ra", 2),   // dmg30
      "oracle-blessing-ancestors", "oracle-council-olympus",
      // 3 Relic
      "relic-eye-of-ra", ...rep("relic-ankh", 2),
      // 1 Realm
      "realm-duat",
    ],
  },

  /* ---------------------------------------------------------------- */
  /* FOREST — Nature jedro, status/control. Osredotočeno, manj razpršeno. */
  spirits: {
    id: "spirits",
    name: "Forest of Spirits",
    pantheon: "Slavic",
    blurb: "Slovansko-keltski deck narave in statusov. Nadzor tempa, zdravljenje in prekletstva okoli Nature jedra.",
    style: "Nature • Status • Control",
    list: [
      // 16 Champions — jedro Nature (Vesna, Druid, Cernunnos, Leshy) + nekaj splasha
      ...rep("celtic-druid", 3),     // Nature, draw/utility
      ...rep("slavic-vesna", 3),     // Nature, heal
      ...rep("celtic-cernunnos", 2), // Nature body
      ...rep("slavic-leshy", 2),     // Nature wall
      ...rep("slavic-morana", 1),    // Frost splash
      ...rep("slavic-svarog", 1),    // Fire splash
      ...rep("celtic-brigid", 1),    // Fire/Nature heal
      ...rep("slavic-babayaga", 1),  // Trickery/Nature
      ...rep("celtic-morrigan", 1),  // Trickery
      "slavic-veles",                // Underworld splash
      // 14 Energy — Nature težišče + manjši splashi
      ...rep("energy-nature", 8), ...rep("energy-fire", 2),
      ...rep("energy-frost", 2), ...rep("energy-trickery", 2),
      // 6 Oracle
      ...rep("oracle-tricksters-bargain", 2), // curse
      ...rep("oracle-blessing-ancestors", 2), // heal reserve
      "oracle-prophecy-war", "oracle-sandstorm-ra",
      // 3 Relic
      "relic-veles-chain", ...rep("relic-druid-amulet", 2),
      // 1 Realm
      "realm-grove",
    ],
  },
};

/* expose */
if (typeof window !== "undefined") window.STARTER_DECKS = STARTER_DECKS;
if (typeof module !== "undefined") module.exports = { STARTER_DECKS };
