/* ============================================================================
   MYTHIC CLASH: WARS OF PANTHEONS
   engine.js — Game logic (state, rules, combat, statuses, AI)
   ----------------------------------------------------------------------------
   Brez zunanjih knjižnic. Vse stanje je v objektu `G`.
   UI (render) bere stanje in kliče funkcije iz tega modula.
============================================================================ */

/* ---------------------- Konstante / pravila ---------------------- */
const GLORY_TO_WIN = 3;
const HAND_START = 7;
const MAX_RESERVE = 5;

/* ---------------------- Pomožne funkcije ------------------------- */
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Omen Roll: 50/50. true = Favorable Omen, false = Dark Omen
function omenRoll() { return Math.random() < 0.5; }

let UID = 1;
function makeInstance(cardId) {
  // ustvari "instanco" karte z lastnim runtime stanjem
  const def = CARDS[cardId];
  const inst = {
    uid: "u" + (UID++),
    cardId,
    type: def.type,
  };
  if (def.type === "Champion") {
    inst.hp = def.hp;
    inst.maxHp = def.hp;
    inst.damage = 0;            // koliko škode je prejel
    inst.energy = [];           // pripeti energijski tipi (npr. ["Sky","War"])
    inst.relic = null;          // pripet relic instance uid ali def id
    inst.relicEffect = null;    // shranjen efekt pripetega relica
    inst.status = {};           // { burn:true, freeze:true, stun:1, curse:true, blessing:2, shield:true, poison:1 }
    inst.justPlayed = true;     // ne sme ascendati / napasti turn ko je položen
    inst.osirisUsed = false;    // za Osiris rebirth
    inst._comboType = null;     // combo (momentum) — zaporedni napadi istega tipa
    inst._comboCount = 0;
  }
  return inst;
}

/* ---------------------- Inicializacija igre ---------------------- */
function newPlayer(name, deckId, isAI) {
  const deckDef = STARTER_DECKS[deckId];
  const deck = shuffle(deckDef.list.map(makeInstance));
  return {
    name,
    isAI: !!isAI,
    deckId,
    pantheon: deckDef.pantheon,
    deck,
    hand: [],
    discard: [],
    active: null,         // Champion instance
    reserve: [],          // [Champion instance]
    glory: 0,
    // per-turn flags
    energyAttachedThisTurn: false,
    drawnAbilityUsed: {},  // za "once per turn" abilities npr. {athena:true}
    // combat depth resursi
    favor: 0,              // Naklonjenost: porabi za zagotovljen ×1.3 (Omen)
    _favorArmed: false,    // ali je naslednji napad "naoružan" z Naklonjenostjo
    // stats
    stats: { damageDealt: 0, cardsDrawn: 0 },
  };
}

// Razdeli začetno roko; če ni basic Championa, ponovi (mulligan).
function dealOpeningHand(player) {
  let attempts = 0;
  while (attempts < 50) {
    attempts++;
    // vrni roko nazaj v deck in premešaj
    player.deck = shuffle(player.deck.concat(player.hand));
    player.hand = [];
    for (let i = 0; i < HAND_START; i++) player.hand.push(player.deck.pop());
    const hasBasic = player.hand.some(inst => {
      const d = CARDS[inst.cardId];
      return d.type === "Champion" && d.stage === "basic";
    });
    if (hasBasic) break;
  }
  // (statistika cardsDrawn se prišteje pri AI takoj, pri človeku ob koncu mulligana)
}

/* ---------------------- Globalno stanje -------------------------- */
const G = {
  players: [],     // [you, ai]
  turn: 0,         // index trenutnega igralca
  turnCount: 0,
  realm: null,     // aktivna Realm card def id
  realmOwner: null,
  log: [],
  over: false,
  winner: null,
  // UI selection helpers
  selectedHandUid: null,
  awaitingNewActive: null, // playerIndex ki mora izbrati novega aktivnega
  pendingDamageStats: 0,
  // Mulligan faza (samo človek)
  mulliganPhase: false,    // true = čakamo na človekovo odločitev (keep/mulligan/izbira aktivnega)
  mulliganStage: null,     // "decide" (keep/mull) ali "pickActive" (izberi aktivnega)
  mulliganCount: 0,        // koliko mulliganov je bilo narejenih
  mulliganKeepN: HAND_START, // koliko kart sme obdržati (London: -1 na mulligan)
};

function logMsg(msg) {
  G.log.push(msg);
  if (G.log.length > 60) G.log.shift();
}

function startGame(playerDeckId, aiDeckId, difficulty) {
  UID = 1;
  G.difficulty = difficulty || "normal";  // "easy" | "normal" | "hard"
  G.players = [
    newPlayer("Ti", playerDeckId, false),
    newPlayer("Nasprotnik", aiDeckId, true),
  ];
  G.turn = 0;
  G.turnCount = 1;
  G.realm = null;
  G.realmOwner = null;
  G.log = [];
  G.over = false;
  G.winner = null;
  G.selectedHandUid = null;
  G.awaitingNewActive = null;
  G.mulliganCount = 0;
  G.mulliganKeepN = HAND_START;

  // AI: samodejna začetna roka + aktivni
  const ai = G.players[1];
  dealOpeningHand(ai);
  ai.stats.cardsDrawn += HAND_START;
  autoPlaceActive(ai);

  // Človek: razdeli 7 (z garantijo championa), nato vstopi v mulligan fazo
  const you = G.players[0];
  dealOpeningHand(you); // zagotovi vsaj 1 championa (auto-mulligan brez kazni)
  G.mulliganPhase = true;
  G.mulliganStage = "decide";

  logMsg("Bitka se začenja! " + G.players[0].name + " vs " + G.players[1].name + ".");
  logMsg("Mulligan: obdrži roko ali zamenjaj. Prvi mulligan je brezplačen.");
  // beginTurn se NE kliče tu — počaka na konec mulligana (finishMulligan)
}

/* ---------------------- MULLIGAN (samo človek) ------------------- */
// Igralec zavrne roko: London mulligan — vrni vse, premešaj, potegni 7.
// Vsak mulligan po prvem zmanjša koliko kart sme obdržati (keepN).
function playerMulligan() {
  if (!G.mulliganPhase || G.mulliganStage !== "decide") return { ok: false };
  const you = G.players[0];
  // vrni roko v deck, premešaj
  you.deck = shuffle(you.deck.concat(you.hand));
  you.hand = [];
  // potegni 7 z garantijo championa (auto-mulligan če ni)
  let attempts = 0;
  do {
    attempts++;
    you.deck = shuffle(you.deck.concat(you.hand));
    you.hand = [];
    for (let i = 0; i < HAND_START; i++) you.hand.push(you.deck.pop());
  } while (attempts < 50 && !you.hand.some(inst => {
    const d = CARDS[inst.cardId];
    return d.type === "Champion" && d.stage === "basic";
  }));

  G.mulliganCount++;
  // prvi mulligan free; vsak naslednji -1 keep
  G.mulliganKeepN = Math.max(1, HAND_START - Math.max(0, G.mulliganCount - 1));
  if (G.mulliganCount === 1) {
    logMsg("Mulligan #1 (brezplačen). Nova roka 7 kart.");
  } else {
    logMsg("Mulligan #" + G.mulliganCount + ". Obdržiš " + G.mulliganKeepN + " kart (preostale na dno).");
  }
  return { ok: true };
}

// Igralec obdrži roko: če mora vrniti odvečne (keepN < 7), gre v "bottom" fazo;
// sicer takoj v izbiro aktivnega.
function keepHand() {
  if (!G.mulliganPhase || G.mulliganStage !== "decide") return { ok: false };
  const you = G.players[0];
  const toBottom = you.hand.length - G.mulliganKeepN;
  if (toBottom > 0) {
    // mora vrniti 'toBottom' kart na dno — to uredi UI (chooseBottomCards),
    // za enostavnost: če UI ne izbere, samodejno vrni ne-champion/energije presežek kasneje.
    G.mulliganStage = "bottom";
    G.mulliganBottomN = toBottom;
    logMsg("Vrni " + toBottom + " kart na dno decka (London mulligan).");
    return { ok: true, needBottom: toBottom };
  }
  G.mulliganStage = "pickActive";
  logMsg("Roka obdržana. Izberi aktivnega Championa.");
  return { ok: true };
}

// UI pokliče: igralec izbere katere karte gredo na dno (London penalty)
function putCardsToBottom(uids) {
  if (!G.mulliganPhase || G.mulliganStage !== "bottom") return { ok: false };
  const you = G.players[0];
  (uids || []).forEach(uid => {
    const idx = you.hand.findIndex(c => c.uid === uid);
    if (idx >= 0) {
      const inst = you.hand.splice(idx, 1)[0];
      you.deck.unshift(inst); // na dno
    }
  });
  G.mulliganStage = "pickActive";
  logMsg("Karte vrnjene na dno. Izberi aktivnega Championa.");
  return { ok: true };
}

// Igralec izbere aktivnega Championa (basic) iz roke -> konec mulligana, začetek bitke
function chooseStartingActive(uid) {
  if (!G.mulliganPhase || G.mulliganStage !== "pickActive") return { ok: false };
  const you = G.players[0];
  const idx = you.hand.findIndex(c => {
    const d = CARDS[c.cardId];
    return c.uid === uid && d.type === "Champion" && d.stage === "basic";
  });
  if (idx < 0) return { ok: false, reason: "Ni veljaven basic Champion." };
  const inst = you.hand.splice(idx, 1)[0];
  inst.justPlayed = false;
  you.active = inst;
  you.stats.cardsDrawn += HAND_START;

  // konec mulligana
  G.mulliganPhase = false;
  G.mulliganStage = null;
  logMsg(def(you.active).name + " stopi v areno kot aktivni Champion.");
  logMsg("Na potezi: " + cur().name + ".");
  beginTurn(true);
  return { ok: true };
}

function autoPlaceActive(p) {
  if (p.active) return;
  // izberi prvi basic Champion iz roke
  const idx = p.hand.findIndex(inst => {
    const d = CARDS[inst.cardId];
    return d.type === "Champion" && d.stage === "basic";
  });
  if (idx >= 0) {
    const inst = p.hand.splice(idx, 1)[0];
    inst.justPlayed = false; // začetni aktivni lahko takoj napade
    p.active = inst;
  }
}

/* ---------------------- Dostop / pomožne ------------------------- */
function cur() { return G.players[G.turn]; }
function opp() { return G.players[1 - G.turn]; }
function playerByIndex(i) { return G.players[i]; }
function def(inst) { return CARDS[inst.cardId]; }

/* ---------------------- Turn lifecycle --------------------------- */
function beginTurn(isFirstEver) {
  const p = cur();
  p.energyAttachedThisTurn = false;
  p.drawnAbilityUsed = {};

  // Freeze: 50% odstranitev na začetku turna
  if (p.active && p.active.status.freeze) {
    if (omenRoll()) {
      delete p.active.status.freeze;
      logMsg(p.name + ": " + def(p.active).name + " ni več zamrznjen.");
    }
  }

  // odstrani justPlayed flag na začetku NOVE poteze lastnika
  if (p.active) p.active.justPlayed = false;
  for (const r of p.reserve) r.justPlayed = false;

  // KEYWORD: Preobremenitev — porabi zaklenjeno energijo na začetku poteze
  for (const c of (p.active ? [p.active, ...p.reserve] : p.reserve)) {
    if (c._overloadLock > 0) {
      const lose = Math.min(c._overloadLock, c.energy.length);
      for (let i = 0; i < lose; i++) c.energy.pop();
      c._overloadLock = 0;
      if (lose > 0) logMsg(p.name + ": " + def(c).name + " izgubi " + lose + " energije (Preobremenitev).");
    }
  }

  // Draw 1 — prvi igralec NE vleče na prvi potezi (zmanjša first-player advantage)
  if (!isFirstEver) {
    drawCard(p, 1);
  } else {
    logMsg(p.name + " začenja in zato na prvi potezi ne vleče karte.");
  }
}

function drawCard(player, n) {
  for (let i = 0; i < n; i++) {
    if (player.deck.length === 0) {
      // Deck out = poraz
      endGame(1 - G.players.indexOf(player), player.name + " ne more vleči kart in izgubi!");
      return;
    }
    player.hand.push(player.deck.pop());
    player.stats.cardsDrawn++;
  }
}

function endTurn() {
  if (G.over) return;
  const p = cur();

  // ---- konec poteze efekti za AKTIVNEGA igralca ----
  endOfTurnEffects(p);

  if (G.over) return;

  // preklopi
  G.turn = 1 - G.turn;
  G.turnCount++;
  logMsg("— Poteza " + G.turnCount + ": " + cur().name + " —");
  beginTurn(false);
}

function endOfTurnEffects(p) {
  if (!p.active) return;
  const a = p.active;

  // Burn (15, prej 10)
  if (a.status.burn) {
    let burnDmg = 15;
    // Searing: če je hkrati Burn IN Poison -> burn naredi +5 (sinergija)
    if (a.status.poison) burnDmg += 5;
    applyRawDamage(a, p, burnDmg, "Burn");
    if (resolveDefeatCheck(p)) return;
  }
  // Poison (naraščajoč: 15, 25, 35... prej 10,20,30)
  if (a.status.poison) {
    const dmg = 5 + 10 * a.status.poison;
    applyRawDamage(a, p, dmg, "Poison");
    a.status.poison++;
    if (resolveDefeatCheck(p)) return;
  }
  // Blessing trajanje
  if (a.status.blessing) {
    a.status.blessing--;
    if (a.status.blessing <= 0) delete a.status.blessing;
  }

  // healing abilities ob koncu turna
  const d = def(a);
  // Isis / Vesna / Brigid: heal Active 10
  if (["egypt-isis", "slavic-vesna", "celtic-brigid"].includes(d.id)) {
    healChampion(a, 10);
    logMsg(p.name + ": " + d.name + " se zdravi 10 HP (sposobnost).");
  }
  // Hydra Endless Heads
  if (d.id === "greek-hydra") {
    healChampion(a, 10);
    logMsg(p.name + ": Hydra obnovi 10 HP.");
  }
  // Druidic Amulet relic na komurkoli
  for (const champ of allChampions(p)) {
    if (champ.relicEffect === "healEndTurn10") {
      healChampion(champ, 10);
    }
  }
  // Capitoline Wolf / She-Wolf: roman reserve heal 10
  if (allChampions(p).some(c => def(c).id === "roman-wolf")) {
    for (const r of p.reserve) {
      if (def(r).pantheon === "Roman") healChampion(r, 10);
    }
  }
  // Realm Sacred Grove: aktivni heal 10 (velja za oba igralca ob njunem koncu turna)
  if (G.realm === "realm-grove") {
    healChampion(a, 10);
  }
}

/* ---------------------- Energy helpers --------------------------- */
function attachEnergy(player, energyInst, targetChamp) {
  if (player.energyAttachedThisTurn) return { ok: false, msg: "To potezo si že pripel energijo." };
  const d = CARDS[energyInst.cardId];
  if (d.type !== "Energy") return { ok: false, msg: "To ni energijska karta." };
  // odstrani iz roke
  const idx = player.hand.indexOf(energyInst);
  if (idx < 0) return { ok: false, msg: "Karte ni v roki." };
  player.hand.splice(idx, 1);
  targetChamp.energy.push(d.energyType);
  player.energyAttachedThisTurn = true;
  logMsg(player.name + " je pripel " + d.energyType + " energijo na " + def(targetChamp).name + ".");

  // Athena Strategic Mind: ob pripenjanju draw 1 (once/turn)
  if (def(targetChamp).id === "greek-athena" && !player.drawnAbilityUsed.athena) {
    player.drawnAbilityUsed.athena = true;
    drawCard(player, 1);
    logMsg(player.name + ": Athena izkoristi Strategic Mind in vleče karto.");
  }
  return { ok: true };
}

// preveri ali napad lahko plačaš s pripeto energijo
function canPayCost(champ, cost) {
  const pool = champ.energy.slice();
  const dID = def(champ).id;
  // Lugh Samildanach: katerakoli energija šteje kot Sun
  const lugh = dID === "celtic-lugh";

  const specific = cost.filter(c => c !== "Any");
  const anyCount = cost.filter(c => c === "Any").length;

  // poskusi pokriti specifične
  for (const need of specific) {
    let i = pool.indexOf(need);
    if (i < 0 && lugh && need === "Sun" && pool.length > 0) i = 0; // Lugh: katera koli šteje kot Sun
    if (i < 0) return false;
    pool.splice(i, 1);
  }
  // Any pokrijemo z ostankom
  return pool.length >= anyCount;
}

/* ---------------------- Damage / combat -------------------------- */
/* Predogled škode/učinkovitosti za UI (brez metanja Omena — pričakovana vrednost). */
function previewDamage(attacker, attackerOwner, defender, attack) {
  if (!attacker || !defender || !attack) return null;
  const atkType = effectiveTypeOfAttack(attack);
  const combo = comboInfoFor(attacker, atkType);
  const forceOmenBonus = !!(attackerOwner && attackerOwner._favorArmed && attackerOwner.favor > 0);
  const res = computeDamage(attacker, attackerOwner, defender, attack,
    { wantBreakdown: true, comboBonus: combo.bonus, forceOmenBonus });
  return { dmg: res.dmg, pct: res.eff.pct, parts: res.eff.parts, comboCount: combo.count };
}

function effectiveTypeOfAttack(attack) {
  // primarni tip napada = prvi ne-Any v costu (za weakness/resistance)
  const t = attack.cost.find(c => c !== "Any");
  return t || null;
}

// Combo (momentum): zaporedni napadi ISTEGA tipa z istim bojevnikom dajejo bonus.
// Vrne {count, bonus} za stanje, KI BI nastalo, če ta bojevnik zdaj napade s tem tipom.
function comboInfoFor(attacker, atkType) {
  if (!attacker || !atkType) return { count: 0, bonus: 0 };
  const count = (attacker._comboType === atkType) ? (attacker._comboCount + 1) : 1;
  const bonus = count >= 2 ? Math.min((count - 1) * 10, 30) : 0; // +10 / +20 / +30 (cap)
  return { count, bonus };
}

function computeDamage(attacker, attackerOwner, defender, attack, options) {
  options = options || {};
  let dmg = attack.damage;
  const ad = def(attacker);
  const dd = def(defender);
  const atkType = effectiveTypeOfAttack(attack);

  // --- napadalčevi modifikatorji (+) ---
  // Blessing (+15, prej +10)
  if (attacker.status.blessing) dmg += 15;
  // Curse (na napadalcu) zmanjša (-15, prej -10)
  if (attacker.status.curse) {
    dmg -= 15;
    // Anubis, Lord of the Scales (asc): prekleti sovražniki dodatnih -10
    const defenderOwner = ownerOf(defender);
    if (defenderOwner && allChampions(defenderOwner).some(c => def(c).id === "egypt-anubis-asc")) {
      dmg -= 10;
    }
  }

  // ability buffi po tipu energije
  if (atkType === "Sky" && ["greek-zeus", "slavic-perun"].includes(ad.id)) dmg += 10;
  if (atkType === "War" && ad.id === "norse-thor") dmg += 10;
  if (atkType === "Sun" && ad.id === "egypt-ra") dmg += 10;
  if (atkType === "Fire" && ad.id === "slavic-svarog") dmg += 10;
  if (atkType === "Nature" && ad.id === "celtic-cernunnos") dmg += 10;

  // PANTHEON SINERGIJA: če imaš 3+ championov istega pantheona v igri -> +10 (mono nagrada)
  if (ad.pantheon) {
    const samePantheon = allChampions(attackerOwner).filter(c => def(c).pantheon === ad.pantheon).length;
    if (samePantheon >= 3) dmg += 10;
  }

  // Storm Authority (Zeus v igri): Sky napadi grških +10 — če je Zeus aktiven ali v rezervi
  if (atkType === "Sky" && ad.pantheon === "Greek" &&
      allChampions(attackerOwner).some(c => def(c).id === "greek-zeus")) {
    dmg += 10;
  }
  // Thor Storm Unleashed / asc: +20 že vključen prek tega:
  if (ad.id === "norse-thor-asc") dmg += 20;
  // Heracles Twelve Trials Undying ne vpliva na napad
  // Fenrir Unleashed / Cu Chulainn Battle Fury: nizek HP buff
  if (ad.id === "norse-fenrir" && (attacker.maxHp - attacker.damage) <= 60) dmg += 20;
  if (ad.id === "celtic-cuchulainn" && (attacker.maxHp - attacker.damage) <= 50) dmg += 20;

  // Relic +20 (Thunderbolt/Spear)
  if (attacker.relicEffect === "dmgPlus20") dmg += 20;
  // Vulcan: relics give +10 (če ima napadalec relic in je Vulcan kjerkoli)
  if (attacker.relic && allChampions(attackerOwner).some(c => def(c).id === "roman-vulcan")) dmg += 10;

  // Mars March of Conquest reserve buff
  if (attack.effect === "reserveBuff") dmg += 10 * attackerOwner.reserve.length;

  // Realm buffi
  if (G.realm === "realm-olympus" && atkType === "Sky" && ad.pantheon === "Greek") dmg += 10;
  if (G.realm === "realm-asgard" && atkType === "War" && ad.pantheon === "Norse") dmg += 10;
  if (G.realm === "realm-duat" && (atkType === "Underworld" || atkType === "Sun")) dmg += 10;

  // Morana: frozen enemy +10; Rusalka/Banshee: cursed enemy +10; Anubis asc: cursed -10 to their attacks handled elsewhere
  if (ad.id === "slavic-morana" && defender.status.freeze) dmg += 10;
  if ((ad.id === "slavic-rusalka" || ad.id === "celtic-banshee") && defender.status.curse) dmg += 10;

  // --- weakness / resistance se zdaj obravnava kot MULTIPLIKATOR spodaj ---
  // (osnovna + ploščati modifikatorji so izračunani; zdaj uporabi učinkovitost)

  // --- branilčevi modifikatorji (-) ---
  // Shield: -20 (enkratno) — odštejemo tu in odstranimo status v applyAttack
  if (defender.status.shield) dmg -= 20;
  // Shield of Athena relic
  if (defender.relicEffect === "dmgReduce20") dmg -= 20;
  // Heracles Heroic Resolve / Twelve Trials
  if (dd.id === "greek-heracles" && defender.energy.length > 0) dmg -= 10;
  if (dd.id === "greek-heracles-asc") dmg -= 20;
  // Valkyrie Battle Hymn: druge Norse -10 (če je Valkyrie kje in branilec ni ta valkyrie)
  if (dd.pantheon === "Norse" &&
      ownerOf(defender) &&
      ownerOf(defender).reserve.concat([ownerOf(defender).active]).some(c => c && def(c).id === "norse-valkyrie" && c !== defender)) {
    dmg -= 10;
  }
  // Frost Giant Jotun Hide: -10 from War
  if (dd.id === "norse-frostgiant" && atkType === "War") dmg -= 10;
  // Horus: -10 from Underworld
  if (dd.id === "egypt-horus" && atkType === "Underworld") dmg -= 10;
  // Veles: -10 from Sky
  if (dd.id === "slavic-veles" && atkType === "Sky") dmg -= 10;
  // Leshy: -10 while Nature realm
  if (dd.id === "slavic-leshy" && G.realm === "realm-grove") dmg -= 10;
  // Roman Formation / War Standard / Forum realm: reserve-based reduction
  const defOwner = ownerOf(defender);
  if (defOwner) {
    if (dd.id === "roman-legionnaire") {
      const others = defOwner.reserve.filter(c => def(c).pantheon === "Roman").length;
      dmg -= Math.min(20, others * 10);
    }
    if (dd.pantheon === "Roman" &&
        allChampions(defOwner).some(c => def(c).id === "roman-mars") &&
        defOwner.reserve.length >= 2) {
      dmg -= 10;
    }
    if (G.realm === "realm-forum" && defOwner.reserve.length >= 2) dmg -= 10;
  }

  if (dmg < 0) dmg = 0;

  // ============================================================
  //  UČINKOVITOST (multiplikatorji) — daje globino napadom
  // ============================================================
  const eff = computeEffectiveness(attacker, attackerOwner, defender, attack, atkType, options);
  dmg = Math.round((dmg * eff.mult) / 5) * 5; // zaokroži na 5

  // Combo bonus (ploščato, po multiplikatorjih) — momentum istega tipa napadov
  const comboBonus = options.comboBonus || 0;
  if (comboBonus > 0 && dmg > 0) {
    dmg += comboBonus;
    eff.parts.push({ k: "COMBO", v: "+" + comboBonus, good: true });
  }

  if (dmg < 0) dmg = 0;
  if (options && options.wantBreakdown) {
    return { dmg, eff };
  }
  return dmg;
}

/* ----------------------------------------------------------------
   UČINKOVITOST napada: vrne { mult, label, parts[] }
   - type advantage (weakness)  -> ×1.5
   - type resistance            -> ×0.6
   - HP/level prednost          -> do ×1.1
   - Omen Roll na močnih napadih -> ×1.3 ob Favorable
   options.omen: če podan (true/false) uporabi ta rezultat (za prikaz pred metom);
                 sicer ne meče (samo prikaz pričakovane vrednosti).
---------------------------------------------------------------- */
function computeEffectiveness(attacker, attackerOwner, defender, attack, atkType, options) {
  options = options || {};
  const dd = def(defender);
  const ad = def(attacker);
  let mult = 1;
  const parts = [];

  // 1) Type matchup
  if (atkType) {
    // Loki Shapeshifter: nima weakness
    const lokiNoWeak = dd.id === "norse-loki";
    if (dd.weakness === atkType && !lokiNoWeak) { mult *= 1.5; parts.push({ k: "WEAK", v: "×1.5", good: true }); }
    else if (dd.resistance === atkType) { mult *= 0.6; parts.push({ k: "RESIST", v: "×0.6", good: false }); }
  }

  // 2) HP/level prednost: če ima napadalec večji max HP od branilca
  const hpDiff = (attacker.maxHp || 0) - (defender.maxHp || 0);
  if (hpDiff >= 40) { mult *= 1.1; parts.push({ k: "PREVLADA", v: "×1.1", good: true }); }
  else if (hpDiff <= -40) { mult *= 0.92; parts.push({ k: "ŠIBKEJŠI", v: "×0.92", good: false }); }

  // 2b) STATUS ranljivost: zamrznjena tarča je ranljiva (freeze = setup orodje)
  if (defender.status && defender.status.freeze) { mult *= 1.2; parts.push({ k: "FROZEN", v: "×1.2", good: true }); }
  // omamljena tarča (stun) prav tako rahlo ranljiva
  if (defender.status && defender.status.stun) { mult *= 1.1; parts.push({ k: "STUN", v: "×1.1", good: true }); }

  // 3) Naklonjenost (Favor) zagotovi ugoden Omen na KATERIKOLI napad
  const heavy = (attack.cost || []).length >= 3;
  if (options.forceOmenBonus) {
    mult *= 1.3; parts.push({ k: "NAKLONJENOST ✦", v: "×1.3", good: true });
  } else if (heavy) {
    // Omen Roll na močnih napadih (3+ energije v ceni)
    let favorable;
    if (typeof options.omen === "boolean") favorable = options.omen;
    else favorable = null; // prikaz: pričakovana vrednost
    if (favorable === true) { mult *= 1.3; parts.push({ k: "OMEN ✓", v: "×1.3", good: true }); }
    else if (favorable === false) { parts.push({ k: "OMEN ✗", v: "×1.0", good: false }); }
    else { mult *= 1.15; parts.push({ k: "OMEN", v: "~50%", good: null }); } // pričakovana (povprečje 1.0 in 1.3)
  }

  const pct = Math.round(mult * 100);
  return { mult, pct, parts };
}

function ownerOf(champ) {
  for (const p of G.players) {
    if (p.active === champ) return p;
    if (p.reserve.includes(champ)) return p;
  }
  return null;
}

function allChampions(p) {
  const list = [];
  if (p.active) list.push(p.active);
  for (const r of p.reserve) list.push(r);
  return list;
}

// surova škoda (status efekti) — brez weakness/shield
function applyRawDamage(champ, owner, amount, source) {
  champ.damage += amount;
  logMsg(owner.name + ": " + def(champ).name + " prejme " + amount + " škode (" + source + ").");
}

function healChampion(champ, amount) {
  champ.damage = Math.max(0, champ.damage - amount);
}

/* ---------------------- Keyword učinki (generični) --------------- */
/* Uporablja se za onEnter ("Klic ob vstopu") in onDefeat ("Poslednji dih").
   eff = { kind, value }. source = bojevnik, owner = njegov lastnik. */
function applyKwEffect(eff, source, owner) {
  if (!eff || !owner) return;
  const oppP = G.players[1 - G.players.indexOf(owner)];
  const enemy = oppP && oppP.active;
  const v = eff.value || 0;
  switch (eff.kind) {
    case "damageEnemy":
      if (enemy) { applyRawDamage(enemy, oppP, v, "keyword"); resolveDefeatCheck(oppP); }
      break;
    case "draw": drawCard(owner, v || 1); logMsg(owner.name + ": keyword — vleče " + (v || 1) + "."); break;
    case "heal": if (source) { healChampion(source, v || 20); logMsg(def(source).name + ": keyword — pozdravi " + (v || 20) + " HP."); } break;
    case "healReserve": owner.reserve.forEach(c => healChampion(c, v || 10)); logMsg(owner.name + ": keyword — rezerva +" + (v || 10) + " HP."); break;
    case "burnEnemy": if (enemy) { enemy.status.burn = true; logMsg(def(enemy).name + ": keyword — Burn."); } break;
    case "freezeEnemy": if (enemy) { enemy.status.freeze = true; logMsg(def(enemy).name + ": keyword — Freeze."); } break;
    case "stunEnemy": if (enemy) { enemy.status.stun = (enemy.status.stun || 0) + 1; logMsg(def(enemy).name + ": keyword — Stun."); } break;
    case "curseEnemy": if (enemy) { enemy.status.curse = true; logMsg(def(enemy).name + ": keyword — Curse."); } break;
    case "shieldSelf": if (source) { source.status.shield = true; logMsg(def(source).name + ": keyword — Shield."); } break;
    case "blessSelf": if (source) { source.status.blessing = Math.max(source.status.blessing || 0, 2); logMsg(def(source).name + ": keyword — Blessing."); } break;
  }
}

/* ---------------------- Napad ------------------------------------ */
function performAttack(attackIndex) {
  if (G.over) return { ok: false };
  const p = cur();
  const a = p.active;
  if (!a) return { ok: false, msg: "Nimaš aktivnega bojevnika." };
  if (a.justPlayed && !def(a).charge) return { ok: false, msg: "Ta bojevnik je bil pravkar postavljen in ne more napasti." };
  if (a.status.stun) return { ok: false, msg: def(a).name + " je omamljen in ne more napasti." };

  const attack = def(a).attacks[attackIndex];
  if (!attack) return { ok: false, msg: "Ta napad ne obstaja." };
  if (!canPayCost(a, attack.cost)) return { ok: false, msg: "Nimaš dovolj energije za " + attack.name + "." };

  const o = opp();
  const target = o.active;
  if (!target) return { ok: false, msg: "Nasprotnik nima aktivnega bojevnika." };

  const atkType = effectiveTypeOfAttack(attack);

  // Naklonjenost (Favor): če je naoružana in jo imaš, zagotovi ugoden Omen na ta napad
  let forceOmenBonus = false;
  if (p._favorArmed && p.favor > 0) {
    forceOmenBonus = true;
    p.favor -= 1;
    p._favorArmed = false;
    logMsg(p.name + " porabi Naklonjenost — zagotovljen ugoden Omen (×1.3).");
  }

  // Omen Roll na močnih napadih (3+ energije) — vrže se enkrat tu
  const heavyAttack = (attack.cost || []).length >= 3;
  const omenResult = forceOmenBonus ? true : (heavyAttack ? omenRoll() : null);

  // Combo (momentum) bonus za TA napad
  const combo = comboInfoFor(a, atkType);

  // izračun škode z dejanskim omenom + combo
  const dmgRes = computeDamage(a, p, target, attack,
    { omen: omenResult, forceOmenBonus, comboBonus: combo.bonus, wantBreakdown: true });
  const dmg = dmgRes.dmg;
  const effInfo = dmgRes.eff;

  // posodobi combo stanje napadalca
  a._comboType = atkType;
  a._comboCount = combo.count;

  // Naklonjenost (pity): nesrečen Dark Omen na močnem napadu ti da +1 Naklonjenost
  if (heavyAttack && !forceOmenBonus && omenResult === false) {
    p.favor = Math.min(3, p.favor + 1);
    logMsg(p.name + ": Dark Omen — pridobiš +1 Naklonjenost (zdaj " + p.favor + ").");
  }

  // izvedi škodo
  if (dmg > 0) {
    target.damage += dmg;
    p.stats.damageDealt += dmg;
  }
  // porabi shield (enkratno)
  if (target.status.shield && dmg > 0) delete target.status.shield;

  // KEYWORD: Krvoses (Lifesteal) — napadalec se pozdravi za zadano škodo
  if (def(a).lifesteal && dmg > 0) {
    healChampion(a, dmg);
    logMsg(def(a).name + " (Krvoses) se pozdravi za " + dmg + " HP.");
  }
  // KEYWORD: Preobremenitev (Overload) — zakleni energijo za naslednjo potezo
  if (def(a).overload) {
    a._overloadLock = (a._overloadLock || 0) + def(a).overload;
    logMsg(def(a).name + " (Preobremenitev): " + def(a).overload + " energije zaklenjene za naslednjo potezo.");
  }

  let omenMsg = "";
  if (heavyAttack) omenMsg = omenResult ? " (Omen ✓)" : " (Omen ✗)";
  logMsg(p.name + ": " + def(a).name + " uporabi " + attack.name + " za " + dmg + " škode" + omenMsg + ".");
  shakeTarget = o; // za UI animacijo
  // podatki za UI animacijo (floating damage + lunge)
  lastAttack = {
    attackerOwnerIndex: G.players.indexOf(p),
    targetOwnerIndex: G.players.indexOf(o),
    damage: dmg,
    attackName: attack.name,
    weak: def(target).weakness === effectiveTypeOfAttack(attack),
    resist: def(target).resistance === effectiveTypeOfAttack(attack),
    effPct: effInfo ? effInfo.pct : 100,
    omen: omenResult,
    atkType: effectiveTypeOfAttack(attack),
    heavy: (attack.cost || []).length >= 3,
  };

  // efekt napada
  applyAttackEffect(attack, a, p, target, o);

  // Medusa Stone Curse: ko je napadena, Omen Roll -> napadalec preklet
  if (def(target).id === "greek-medusa" && target.damage < target.maxHp) {
    if (omenRoll()) {
      a.status.curse = true;
      logMsg(def(a).name + " je okamnel pod Medusinim pogledom (Curse)!");
    }
  }

  // preveri poraz branilca
  resolveDefeatCheck(o);

  // napad konča turn (razen če igra konec)
  if (!G.over) {
    // počakaj če igralec mora izbrati novega aktivnega (to vodi UI), sicer končaj turn
    if (G.awaitingNewActive === null) {
      endTurn();
    }
  }
  return { ok: true };
}

let shakeTarget = null; // UI hint
let lastAttack = null;  // zadnji napad za UI animacijo

function applyAttackEffect(attack, attacker, attackerOwner, target, targetOwner) {
  switch (attack.effect) {
    case "stunOmen": {
      const fav = omenRoll();
      logMsg(fav ? "Favorable Omen! Nasprotnik je omamljen." : "Dark Omen. Brez dodatnega učinka.");
      if (fav) target.status.stun = 1;
      break;
    }
    case "poison":
      target.status.poison = target.status.poison || 1;
      logMsg(def(target).name + " je zastrupljen.");
      break;
    case "burn":
      target.status.burn = true;
      logMsg(def(target).name + " gori.");
      break;
    case "freeze":
      target.status.freeze = true;
      logMsg(def(target).name + " je zamrznjen.");
      break;
    case "curse":
      target.status.curse = true;
      logMsg(def(target).name + " je preklet.");
      break;
    case "selfShield":
      attacker.status.shield = true;
      logMsg(def(attacker).name + " dobi Shield.");
      break;
    case "heal20":
      healChampion(attacker, 20);
      logMsg(def(attacker).name + " se zdravi 20 HP.");
      break;
    case "healReserve":
      for (const c of allChampions(attackerOwner)) healChampion(c, 20);
      logMsg(attackerOwner.name + ": vsi bojevniki se zdravijo 20 HP.");
      break;
    case "draw1": drawCard(attackerOwner, 1); logMsg(attackerOwner.name + " vleče karto."); break;
    case "draw2": drawCard(attackerOwner, 2); logMsg(attackerOwner.name + " vleče 2 karti."); break;
    case "selfDamage20":
      attacker.damage += 20;
      logMsg(def(attacker).name + " prejme 20 povratne škode.");
      break;
    case "selfDamage30":
      attacker.damage += 30;
      logMsg(def(attacker).name + " prejme 30 povratne škode.");
      break;
    case "swapHint":
      // omogoči zamenjavo: nastavi flag, UI ponudi izbiro (poenostavljeno: avtomatsko ne zamenjamo)
      logMsg(attackerOwner.name + " lahko zamenja aktivnega bojevnika (klikni rezervo).");
      attackerOwner._mayFreeSwap = true;
      break;
    case "reserveBuff":
    case null:
    case undefined:
      break;
    default:
      break;
  }
  // recoil lahko ubije napadalca
  resolveDefeatCheck(attackerOwner);
}

/* ---------------------- Defeat / Glory --------------------------- */
function resolveDefeatCheck(owner) {
  const a = owner.active;
  if (!a) return false;
  if (a.damage >= a.maxHp) {
    // Osiris rebirth
    if (def(a).id === "egypt-osiris" && !a.osirisUsed) {
      a.osirisUsed = true;
      a.damage = a.maxHp - 60; // ostane 60 HP
      a.status = {};
      owner.reserve.push(a);
      owner.active = null;
      logMsg(owner.name + ": Osiris se ponovno rodi in gre v rezervo s 60 HP!");
    } else {
      defeatChampion(owner, a);
    }
    // nasprotnik dobi glory
    const winnerIdx = 1 - G.players.indexOf(owner);
    const winner = G.players[winnerIdx];
    winner.glory++;
    logMsg(winner.name + " dobi 1 Glory point (" + winner.glory + "/" + GLORY_TO_WIN + ").");

    // on-defeat draws
    onDefeatTriggers(owner, winner);

    if (winner.glory >= GLORY_TO_WIN) {
      endGame(winnerIdx, winner.name + " doseže " + GLORY_TO_WIN + " Glory in zmaga!");
      return true;
    }
    // owner mora postaviti novega aktivnega
    if (owner.active === null) {
      if (owner.reserve.length === 0) {
        endGame(winnerIdx, owner.name + " nima več bojevnikov in izgubi!");
        return true;
      }
      // če je AI ali ni človek na potezi izbire: avtomatsko
      promptNewActive(owner);
    }
    return true;
  }
  return false;
}

function defeatChampion(owner, champ) {
  logMsg(owner.name + ": " + def(champ).name + " je premagan.");
  // vse pripeto gre v discard (poenostavljeno: samo champion + relic)
  owner.discard.push(champ);
  if (owner.active === champ) owner.active = null;
  const ri = owner.reserve.indexOf(champ);
  if (ri >= 0) owner.reserve.splice(ri, 1);
  // KEYWORD: Poslednji dih (onDefeat) — sproži se ob porazu tega bojevnika
  if (def(champ).onDefeat) {
    logMsg(def(champ).name + " — Poslednji dih!");
    applyKwEffect(def(champ).onDefeat, champ, owner);
  }
}

function onDefeatTriggers(loserOwner, winnerOwner) {
  // Naklonjenost: ko premagaš nasprotnikovega bojevnika, dobiš +1
  if (winnerOwner) {
    winnerOwner.favor = Math.min(3, (winnerOwner.favor || 0) + 1);
    logMsg(winnerOwner.name + " pridobi +1 Naklonjenost za premaganega bojevnika.");
  }
  // Freyja Chooser of Slain: Norse defeated -> draw
  if (allChampions(loserOwner).concat(loserOwner.discard).some(c => def(c).id === "norse-freya")) {
    if (allChampions(loserOwner).some(c => def(c).id === "norse-freya")) {
      drawCard(loserOwner, 1);
      logMsg(loserOwner.name + ": Freyja vleče karto (Chooser of Slain).");
    }
  }
  // Anubis basic: when defeated draw 2 (za lastnika)
  // Scarab: when defeated draw 1
  const lastDiscard = loserOwner.discard[loserOwner.discard.length - 1];
  if (lastDiscard) {
    if (def(lastDiscard).id === "egypt-anubis") { drawCard(loserOwner, 2); logMsg(loserOwner.name + ": Anubis vleče 2 karti."); }
    if (def(lastDiscard).id === "egypt-scarab") { drawCard(loserOwner, 1); logMsg(loserOwner.name + ": Scarab vleče karto."); }
  }
  // Morrigan Foreteller: ob kateremkoli porazu draw (oba lastnika ki imata Morrigan)
  for (const p of G.players) {
    if (allChampions(p).some(c => def(c).id === "celtic-morrigan")) {
      drawCard(p, 1);
      logMsg(p.name + ": Morrigan vleče karto (poraz na bojišču).");
    }
  }
}

function promptNewActive(owner) {
  const idx = G.players.indexOf(owner);
  if (owner.isAI) {
    aiChooseNewActive(owner);
  } else {
    // počakaj na človekov klik
    G.awaitingNewActive = idx;
    logMsg("Izberi novega aktivnega bojevnika iz rezerve.");
  }
}

function chooseNewActive(playerIndex, reserveInst) {
  const p = G.players[playerIndex];
  const i = p.reserve.indexOf(reserveInst);
  if (i < 0) return { ok: false };
  p.active = p.reserve.splice(i, 1)[0];
  p.active.justPlayed = false; // nadomestni lahko napade ob naslednji potezi normalno
  G.awaitingNewActive = null;
  logMsg(p.name + " postavi " + def(p.active).name + " kot novega aktivnega.");
  onEnterActive(p, p.active);
  // če je bil to konec napada nasprotnika, mora zdaj teči endTurn napadalca:
  // a ker je napad nasprotnika že končal turn pred izbiro? Ne — performAttack ni klical endTurn ker je awaiting.
  // Po izbiri: če je trenutni igralec na potezi ravno napadel, končaj turn.
  return { ok: true };
}

function aiChooseNewActive(owner) {
  if (owner.reserve.length === 0) return;
  const diff = G.difficulty || "normal";
  const enemyActive = G.players[1 - G.players.indexOf(owner)].active;
  // hard: najprej po matchupu proti nasprotnikovemu aktivnemu, nato HP/energija
  owner.reserve.sort((x, y) => {
    if (diff === "hard" && enemyActive) {
      const sx = aiPotentialBest(x, owner, enemyActive);
      const sy = aiPotentialBest(y, owner, enemyActive);
      if (sy !== sx) return sy - sx;
    }
    const hx = x.maxHp - x.damage, hy = y.maxHp - y.damage;
    if (hy !== hx) return hy - hx;
    return y.energy.length - x.energy.length;
  });
  owner.active = owner.reserve.shift();
  owner.active.justPlayed = false;
  logMsg(owner.name + " postavi " + def(owner.active).name + " kot novega aktivnega.");
  onEnterActive(owner, owner.active);
}

/* ---------------------- Igranje kart iz roke --------------------- */
function playReserveChampion(player, inst) {
  if (player.reserve.length >= MAX_RESERVE) return { ok: false, msg: "Rezerva je polna (5)." };
  const d = CARDS[inst.cardId];
  if (d.type !== "Champion" || d.stage !== "basic") return { ok: false, msg: "Samo osnovne Champion karte gredo v rezervo." };
  const idx = player.hand.indexOf(inst);
  if (idx < 0) return { ok: false };
  player.hand.splice(idx, 1);
  inst.justPlayed = true;
  player.reserve.push(inst);
  logMsg(player.name + " postavi " + d.name + " v rezervo.");

  // on-enter triggers
  if (d.id === "greek-oracle") { drawCard(player, 1); logMsg(player.name + ": Oracle of Delphi vleče karto."); }
  if (d.id === "celtic-druid") { drawCard(player, 1); logMsg(player.name + ": Druid vleče karto."); }
  if (d.id === "roman-romulus") {
    for (const r of player.reserve) healChampion(r, 10);
    logMsg(player.name + ": Romulus zdravi rezervo 10 HP.");
  }
  return { ok: true };
}

function playRelic(player, inst, targetChamp) {
  const d = CARDS[inst.cardId];
  if (d.type !== "Relic") return { ok: false };
  const idx = player.hand.indexOf(inst);
  if (idx < 0) return { ok: false };

  if (d.relicMode === "attach") {
    if (!targetChamp) return { ok: false, msg: "Izberi bojevnika za relikvijo." };
    if (targetChamp.relic) return { ok: false, msg: "Ta bojevnik že ima relikvijo." };
    player.hand.splice(idx, 1);
    targetChamp.relic = d.id;
    targetChamp.relicEffect = d.effect;
    logMsg(player.name + " pripne " + d.name + " na " + def(targetChamp).name + ".");
    return { ok: true };
  } else {
    // instant
    player.hand.splice(idx, 1);
    applyInstantRelic(d, player);
    player.discard.push(inst);
    logMsg(player.name + " uporabi " + d.name + ".");
    return { ok: true };
  }
}

function applyInstantRelic(d, player) {
  const o = G.players[1 - G.players.indexOf(player)];
  switch (d.effect) {
    case "draw2": drawCard(player, 2); break;
    case "burnEnemy": if (o.active) { o.active.status.burn = true; logMsg(def(o.active).name + " gori."); } break;
    case "freezeEnemy": if (o.active) { o.active.status.freeze = true; logMsg(def(o.active).name + " je zamrznjen."); } break;
    case "healActive40": if (player.active) { healChampion(player.active, 40); logMsg(def(player.active).name + " se zdravi 40 HP."); } break;
    default: break;
  }
}

function playOracle(player, inst) {
  const d = CARDS[inst.cardId];
  if (d.type !== "Oracle") return { ok: false };
  const idx = player.hand.indexOf(inst);
  if (idx < 0) return { ok: false };
  const o = G.players[1 - G.players.indexOf(player)];
  player.hand.splice(idx, 1);

  // Baba Yaga / Sphinx bonus draw
  const bonusDraw = allChampions(player).some(c => ["slavic-babayaga", "egypt-sphinx"].includes(def(c).id)) ? 1 : 0;

  switch (d.effect) {
    case "blessActive":
      if (player.active) { player.active.status.blessing = 2; logMsg(def(player.active).name + " dobi Blessing."); }
      break;
    case "healReserve30":
      for (const c of allChampions(player)) healChampion(c, 30);
      logMsg(player.name + ": vsi bojevniki +30 HP.");
      break;
    case "draw3": drawCard(player, 3); logMsg(player.name + " vleče 3 karte."); break;
    case "draw2attach": drawCard(player, 2); logMsg(player.name + " vleče 2 karti."); break;
    case "curseEnemy": if (o.active) { o.active.status.curse = true; logMsg(def(o.active).name + " je preklet."); } break;
    case "healActive60": if (player.active) { healChampion(player.active, 60); logMsg(def(player.active).name + " se zdravi 60 HP."); } break;
    case "dmgEnemy30":
      if (o.active) {
        o.active.damage += 30; player.stats.damageDealt += 30;
        logMsg("Sandstorm zada 30 škode " + def(o.active).name + ".");
        if (o.active.status.shield) {} // sandstorm ignorira tipne modifikatorje, shield velja? — pustimo da ne
        resolveDefeatCheck(o);
      }
      break;
    case "shieldAll":
      for (const c of allChampions(player)) c.status.shield = true;
      logMsg(player.name + ": vsi bojevniki dobijo Shield.");
      break;
    default: break;
  }
  if (bonusDraw) { drawCard(player, bonusDraw); logMsg(player.name + ": dodatni vlek (Baba Yaga/Sphinx)."); }
  // Minerva Strategist: 1×/turn dodaten vlek ob Oraclu
  if (allChampions(player).some(c => def(c).id === "roman-minerva") && !player.drawnAbilityUsed.minerva) {
    player.drawnAbilityUsed.minerva = true;
    drawCard(player, 1);
    logMsg(player.name + ": Minerva izkoristi Strategist in vleče karto.");
  }
  player.discard.push(inst);
  return { ok: true };
}

function playRealm(player, inst) {
  const d = CARDS[inst.cardId];
  if (d.type !== "Realm") return { ok: false };
  const idx = player.hand.indexOf(inst);
  if (idx < 0) return { ok: false };
  player.hand.splice(idx, 1);
  // zamenjaj staro realm
  if (G.realm) {
    const oldDef = CARDS[G.realm];
    G.realmOwner.discard.push(makeInstance(G.realm));
  }
  G.realm = d.id;
  G.realmOwner = player;
  logMsg(player.name + " odigra Realm: " + d.name + ".");
  return { ok: true };
}

/* ---------------------- Ascension -------------------------------- */
function findAscensionInHand(player, baseChamp) {
  return player.hand.find(inst => {
    const d = CARDS[inst.cardId];
    return d.type === "Champion" && d.stage === "ascended" && d.ascendsFrom === baseChamp.cardId;
  });
}

function ascend(player, baseChamp) {
  if (baseChamp.justPlayed) return { ok: false, msg: "Bojevnik ne more ascendati turn, ko je bil postavljen." };
  const ascInst = findAscensionInHand(player, baseChamp);
  if (!ascInst) return { ok: false, msg: "Nimaš ustrezne Ascension karte v roki." };
  const ascDef = CARDS[ascInst.cardId];

  // prenesi stanje
  const idx = player.hand.indexOf(ascInst);
  player.hand.splice(idx, 1);

  baseChamp.cardId = ascInst.cardId;
  // HP: ohrani sorazmerno škodo
  const oldMax = baseChamp.maxHp;
  const ratio = baseChamp.damage / oldMax;
  baseChamp.maxHp = ascDef.hp;
  baseChamp.damage = Math.round(ratio * ascDef.hp);
  // energija ostane, relic ostane, status ostane
  baseChamp.justPlayed = false;

  logMsg(player.name + ": " + ascDef.name + " — Ascension dosežen!");

  // Imperial Augur: ob ascensionu draw
  if (allChampions(player).some(c => def(c).id === "roman-augur")) {
    drawCard(player, 1);
    logMsg(player.name + ": Imperial Augur vleče karto.");
  }
  return { ok: true };
}

/* ---------------------- Retreat ---------------------------------- */
// Odin All-Father: 1×/turn plačaj 10 HP (Odinu) -> vleči karto
function odinDraw(player) {
  const odin = allChampions(player).find(c => def(c).id === "norse-odin");
  if (!odin) return { ok: false, msg: "Nimaš Odina." };
  if (player.drawnAbilityUsed.odin) return { ok: false, msg: "Odin je to potezo že uporabil All-Father." };
  if (odin.damage >= odin.maxHp - 10) return { ok: false, msg: "Odin nima dovolj HP." };
  player.drawnAbilityUsed.odin = true;
  odin.damage += 10;
  drawCard(player, 1);
  logMsg(player.name + ": Odin plača 10 HP (All-Father) in vleče karto.");
  return { ok: true };
}

function retreat(player, reserveInst) {
  const a = player.active;
  if (!a) return { ok: false };
  if (a.status.freeze) return { ok: false, msg: "Zamrznjen bojevnik ne more retreatati." };
  let cost = def(a).retreatCost;
  // Janus: -1; Frozen Battlefield: +1 za ne-Norse; Pegasus/Bastet/Faerie: 0 ability
  if (["greek-pegasus", "egypt-bastet", "celtic-faerie"].includes(def(a).id)) cost = 0;
  if (allChampions(player).some(c => def(c).id === "roman-janus")) cost = Math.max(0, cost - 1);
  if (G.realm === "realm-frozen" && def(a).pantheon !== "Norse") cost += 1;

  if (a.energy.length < cost) return { ok: false, msg: "Premalo energije za retreat (potrebuješ " + cost + ")." };
  // odvrzi energijo
  for (let i = 0; i < cost; i++) a.energy.pop();

  // zamenjaj
  const i = player.reserve.indexOf(reserveInst);
  if (i < 0) return { ok: false };
  player.reserve.splice(i, 1);
  player.reserve.push(a);
  player.active = reserveInst;
  logMsg(player.name + " retreata. Nov aktivni: " + def(reserveInst).name + ".");
  onEnterActive(player, reserveInst);
  return { ok: true };
}

// prosta zamenjava (od Janus Twin Faces / Morrigan Phantom Flight)
function freeSwap(player, reserveInst) {
  if (!player._mayFreeSwap) return { ok: false };
  const i = player.reserve.indexOf(reserveInst);
  if (i < 0) return { ok: false };
  const old = player.active;
  player.reserve.splice(i, 1);
  if (old) player.reserve.push(old);
  player.active = reserveInst;
  player._mayFreeSwap = false;
  logMsg(player.name + " zamenja aktivnega z " + def(reserveInst).name + ".");
  onEnterActive(player, reserveInst);
  return { ok: true };
}

// Sproži se, ko bojevnik POSTANE aktivni (retreat/swap/nov aktivni) — daje benchu taktično vrednost.
function onEnterActive(player, inst) {
  if (!inst) return;
  const d = def(inst);
  // KEYWORD: Klic ob vstopu (onEnter) — sproži se, ko bojevnik postane aktivni
  if (d.onEnter) {
    logMsg(def(inst).name + " — Klic ob vstopu!");
    applyKwEffect(d.onEnter, inst, player);
  }
  // "Refreshing Switch": ob vstopu bojevnik očisti Burn in Poison (sveža menjava)
  let cleaned = false;
  if (inst.status.burn) { delete inst.status.burn; cleaned = true; }
  if (inst.status.poison) { delete inst.status.poison; cleaned = true; }
  if (cleaned) logMsg(def(inst).name + " se osveži ob vstopu (odstrani Burn/Poison).");

  // Vesna / Brigid / Isis: ob vstopu zdravita 20 HP
  if (["slavic-vesna", "celtic-brigid", "egypt-isis"].includes(d.id)) {
    healChampion(inst, 20);
    logMsg(def(inst).name + " ob vstopu zdravi 20 HP.");
  }
  // Romulus Rally: ob vstopu rezerva +10 HP vsak
  if (d.id === "roman-romulus") {
    for (const c of player.reserve) healChampion(c, 10);
    logMsg("Romulus Rally: rezerva +10 HP.");
  }
}

/* ---------------------- Konec igre ------------------------------- */
function endGame(winnerIdx, msg) {
  G.over = true;
  G.winner = winnerIdx;
  logMsg("KONEC: " + msg);
}

/* ============================================================================
   AI — preprost a igralen nasprotnik
============================================================================ */
/* --- AI pomožne ocene --------------------------------------------- */
function aiHp(champ) { return champ ? champ.maxHp - champ.damage : 0; }

// najboljši PLAČLJIV napad zdaj proti tarči: vrne {atk,i,dmg} ali null
function aiBestPayableAttack(champ, owner, target) {
  const atks = def(champ).attacks || [];
  let best = null;
  atks.forEach((atk, i) => {
    if (!canPayCost(champ, atk.cost)) return;
    const prev = target ? previewDamage(champ, owner, target, atk) : null;
    const dmg = prev ? prev.dmg : (atk.damage || 0);
    if (!best || dmg > best.dmg) best = { atk, i, dmg };
  });
  return best;
}

// največja škoda, ki bi jo champ LAHKO naredil tarči (ne glede na trenutno energijo) — za oceno matchupa
function aiPotentialBest(champ, owner, target) {
  const atks = def(champ).attacks || [];
  let best = 0;
  atks.forEach(atk => {
    const prev = target ? previewDamage(champ, owner, target, atk) : null;
    const dmg = prev ? prev.dmg : (atk.damage || 0);
    if (dmg > best) best = dmg;
  });
  return best;
}

// ali lahko nasprotnikov aktivni zdaj ubije našega aktivnega s plačljivim napadom?
function aiEnemyCanKO(myActive, enemyActive, enemyOwner) {
  if (!myActive || !enemyActive) return false;
  const best = aiBestPayableAttack(enemyActive, enemyOwner, myActive);
  return !!(best && best.dmg >= aiHp(myActive));
}

function aiTakeTurn(onStep, onDone) {
  const p = cur();
  if (!p.isAI || G.over) { onDone && onDone(); return; }
  const diff = G.difficulty || "normal";
  const o = opp();

  const steps = [];

  // 1) razvoj rezerve — normal/hard postavita do 2 championa, easy 1
  steps.push(() => {
    const maxPlay = diff === "easy" ? 1 : 2;
    let played = 0;
    while (played < maxPlay && p.reserve.length < MAX_RESERVE) {
      const basic = p.hand.find(inst => {
        const d = CARDS[inst.cardId];
        return d.type === "Champion" && d.stage === "basic";
      });
      if (!basic) break;
      playReserveChampion(p, basic);
      played++;
    }
  });

  // če nima aktivnega (npr. začetek): postavi
  steps.push(() => { if (!p.active) autoPlaceActive(p); });

  // 1b) HARD: taktična menjava — zamenjaj aktivnega za bistveno boljši matchup,
  //     ali se umakni, če je aktivni v smrtni nevarnosti in nizek na HP
  if (diff === "hard") {
    steps.push(() => {
      if (!p.active || !o.active || p.reserve.length === 0) return;
      const curBest = aiPotentialBest(p.active, p, o.active);
      let target = null, bestScore = curBest + 15; // zahtevaj OPAZNO boljši matchup
      for (const r of p.reserve) {
        if (aiHp(r) <= 30) continue;
        const sc = aiPotentialBest(r, p, o.active);
        if (sc > bestScore) { bestScore = sc; target = r; }
      }
      const inDanger = aiEnemyCanKO(p.active, o.active, o) && aiHp(p.active) <= p.active.maxHp * 0.4;
      if (!target && inDanger) {
        target = p.reserve.slice().sort((a, b) => aiHp(b) - aiHp(a))[0];
      }
      if (target) retreat(p, target); // če premalo energije, retreat tiho spodleti
    });
  }

  // 2) ascend če lahko
  steps.push(() => {
    if (p.active && findAscensionInHand(p, p.active) && !p.active.justPlayed) {
      ascend(p, p.active);
    }
  });

  // 3) pripni energijo aktivnemu
  steps.push(() => {
    const energyInst = p.hand.find(inst => CARDS[inst.cardId].type === "Energy");
    if (energyInst && p.active && !p.energyAttachedThisTurn) {
      attachEnergy(p, energyInst, p.active);
    }
  });

  // 4) odigraj realm (easy ga ignorira)
  steps.push(() => {
    if (diff === "easy") return;
    const realmInst = p.hand.find(inst => CARDS[inst.cardId].type === "Realm");
    if (realmInst && G.realm !== realmInst.cardId) playRealm(p, realmInst);
  });

  // 5) odigraj eno smiselno Oracle/Relic
  steps.push(() => {
    const hpPct = p.active ? aiHp(p.active) / p.active.maxHp : 1;
    const oracle = p.hand.find(inst => {
      const d = CARDS[inst.cardId];
      if (d.type !== "Oracle") return false;
      if (["healActive60", "healActive40", "healReserve30"].includes(d.effect)) return hpPct < 0.55;
      return diff !== "easy"; // easy igra le nujne (healing) oracle
    });
    if (oracle) playOracle(p, oracle);

    if (diff !== "easy") {
      const relic = p.hand.find(inst => CARDS[inst.cardId].type === "Relic");
      if (relic) {
        const d = CARDS[relic.cardId];
        if (d.relicMode === "attach" && p.active && !p.active.relic) playRelic(p, relic, p.active);
        else if (d.relicMode === "instant") playRelic(p, relic, p.active);
      }
    }
  });

  // 6) napadi — normal/hard izbereta najboljši napad (lethal-aware prek previewDamage),
  //    easy 40% izbere naključen napad (manj optimalno)
  steps.push(() => {
    if (!p.active || p.active.status.stun || (p.active.justPlayed && !def(p.active).charge)) { endTurnIfStillAI(); return; }
    const enemyActive = o.active;
    const payable = (def(p.active).attacks || [])
      .map((atk, i) => ({ atk, i }))
      .filter(x => canPayCost(p.active, x.atk.cost));
    if (payable.length === 0) { endTurnIfStillAI(); return; }

    let chosen;
    if (diff === "easy" && payable.length > 1 && Math.random() < 0.4) {
      chosen = payable[Math.floor(Math.random() * payable.length)].i;
    } else {
      const best = aiBestPayableAttack(p.active, p, enemyActive);
      chosen = best ? best.i : payable[0].i;
    }
    // AI uporabi Naklonjenost: če bi ×1.3 zagotovil KO (sicer ne), ali na hard za močne napade
    if (diff !== "easy" && p.favor > 0 && enemyActive) {
      const chosenAtk = def(p.active).attacks[chosen];
      const prev = previewDamage(p.active, p, enemyActive, chosenAtk);
      if (prev) {
        const boosted = Math.round(prev.dmg * 1.3);
        if (boosted >= aiHp(enemyActive) && prev.dmg < aiHp(enemyActive)) p._favorArmed = true;
        else if (diff === "hard" && (chosenAtk.cost || []).length >= 3 && p.favor >= 2) p._favorArmed = true;
      }
    }
    performAttack(chosen);
    // performAttack običajno kliče endTurn sam
  });

  // izvedi korake z zamikom
  let k = 0;
  function next() {
    if (G.over) { onDone && onDone(); return; }
    if (k >= steps.length) {
      // če napad ni končal turna (npr. AI ni mogel napasti), končaj
      if (G.turn === G.players.indexOf(p) && !G.over) {
        // turn še na AI -> ni napadel
        endTurn();
      }
      onDone && onDone();
      return;
    }
    const step = steps[k++];
    step();
    onStep && onStep();
    if (G.over) { onDone && onDone(); return; }
    // če je turn že prešel na človeka (AI je napadel), končaj sekvenco
    if (G.turn !== G.players.indexOf(p)) { onDone && onDone(); return; }
    setTimeout(next, 700);
  }
  function endTurnIfStillAI() { /* placeholder, handled in next() */ }
  next();
}

/* ---------------------- Export (za UI + testiranje) -------------- */
if (typeof window !== "undefined") {
  Object.assign(window, {
    G, startGame, beginTurn, endTurn, drawCard,
    attachEnergy, canPayCost, performAttack, playReserveChampion,
    playRelic, playOracle, playRealm, ascend, retreat, freeSwap,
    chooseNewActive, aiTakeTurn, cur, opp, def, allChampions,
    findAscensionInHand, omenRoll, makeInstance, previewDamage,
    playerMulligan, keepHand, putCardsToBottom, chooseStartingActive, odinDraw,
    GLORY_TO_WIN, MAX_RESERVE,
    clearShake() { shakeTarget = null; },
    clearLastAttack() { lastAttack = null; },
  });
  // pravi živi getterji (Object.assign bi jih "sploščil" v statične vrednosti)
  Object.defineProperty(window, "shakeTarget", { get() { return shakeTarget; }, configurable: true });
  Object.defineProperty(window, "lastAttack", { get() { return lastAttack; }, configurable: true });
}
if (typeof module !== "undefined") {
  module.exports = {
    G, startGame, endTurn, performAttack, attachEnergy, canPayCost,
    playReserveChampion, playRelic, playOracle, playRealm, ascend, retreat,
    chooseNewActive, aiTakeTurn, cur, opp, def, allChampions, CARDS_OK: true,
  };
}
