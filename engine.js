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
  player.stats.cardsDrawn += HAND_START;
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
};

function logMsg(msg) {
  G.log.push(msg);
  if (G.log.length > 60) G.log.shift();
}

function startGame(playerDeckId, aiDeckId) {
  UID = 1;
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

  for (const p of G.players) dealOpeningHand(p);

  // Avtomatsko postavi prvega basic Championa kot aktivnega za oba (poenostavitev prototipa).
  for (const p of G.players) autoPlaceActive(p);

  logMsg("Bitka se začenja! " + G.players[0].name + " vs " + G.players[1].name + ".");
  logMsg("Na potezi: " + cur().name + ".");
  // začetni draw za prvega igralca se NE izvede (kot pri klasiki prvi turn brez draw-a — a tu zaradi enostavnosti damo draw v beginTurn)
  beginTurn(true);
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

  // Draw 1
  if (!isFirstEver || true) { // vedno vlečemo (poenostavitev prototipa)
    drawCard(p, 1);
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

  // Burn
  if (a.status.burn) {
    applyRawDamage(a, p, 10, "Burn");
    if (resolveDefeatCheck(p)) return;
  }
  // Poison (naraščajoč)
  if (a.status.poison) {
    const dmg = 10 * a.status.poison;
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
function effectiveTypeOfAttack(attack) {
  // primarni tip napada = prvi ne-Any v costu (za weakness/resistance)
  const t = attack.cost.find(c => c !== "Any");
  return t || null;
}

function computeDamage(attacker, attackerOwner, defender, attack) {
  let dmg = attack.damage;
  const ad = def(attacker);
  const dd = def(defender);
  const atkType = effectiveTypeOfAttack(attack);

  // --- napadalčevi modifikatorji (+) ---
  // Blessing
  if (attacker.status.blessing) dmg += 10;
  // Curse (na napadalcu) zmanjša
  if (attacker.status.curse) dmg -= 10;

  // ability buffi po tipu energije
  if (atkType === "Sky" && ["greek-zeus", "slavic-perun"].includes(ad.id)) dmg += 10;
  if (atkType === "War" && ad.id === "norse-thor") dmg += 10;
  if (atkType === "Sun" && ad.id === "egypt-ra") dmg += 10;
  if (atkType === "Fire" && ad.id === "slavic-svarog") dmg += 10;
  if (atkType === "Nature" && ad.id === "celtic-cernunnos") dmg += 10;

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

  // --- weakness / resistance ---
  if (atkType) {
    if (dd.weakness === atkType) dmg += 20;
    if (dd.resistance === atkType) dmg -= 20;
  }

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
  return dmg;
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

/* ---------------------- Napad ------------------------------------ */
function performAttack(attackIndex) {
  if (G.over) return { ok: false };
  const p = cur();
  const a = p.active;
  if (!a) return { ok: false, msg: "Nimaš aktivnega bojevnika." };
  if (a.justPlayed) return { ok: false, msg: "Ta bojevnik je bil pravkar postavljen in ne more napasti." };
  if (a.status.stun) return { ok: false, msg: def(a).name + " je omamljen in ne more napasti." };

  const attack = def(a).attacks[attackIndex];
  if (!attack) return { ok: false, msg: "Ta napad ne obstaja." };
  if (!canPayCost(a, attack.cost)) return { ok: false, msg: "Nimaš dovolj energije za " + attack.name + "." };

  const o = opp();
  const target = o.active;
  if (!target) return { ok: false, msg: "Nasprotnik nima aktivnega bojevnika." };

  // omen-based predefekt (stun chance ipd. se razreši po škodi)
  const dmg = computeDamage(a, p, target, attack);

  // izvedi škodo
  if (dmg > 0) {
    target.damage += dmg;
    p.stats.damageDealt += dmg;
  }
  // porabi shield (enkratno)
  if (target.status.shield && dmg > 0) delete target.status.shield;

  logMsg(p.name + ": " + def(a).name + " uporabi " + attack.name + " za " + dmg + " škode.");
  shakeTarget = o; // za UI animacijo

  // efekt napada
  applyAttackEffect(attack, a, p, target, o);

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
}

function onDefeatTriggers(loserOwner, winnerOwner) {
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
  // če je bil to konec napada nasprotnika, mora zdaj teči endTurn napadalca:
  // a ker je napad nasprotnika že končal turn pred izbiro? Ne — performAttack ni klical endTurn ker je awaiting.
  // Po izbiri: če je trenutni igralec na potezi ravno napadel, končaj turn.
  return { ok: true };
}

function aiChooseNewActive(owner) {
  if (owner.reserve.length === 0) return;
  // izberi z največ HP, nato z največ energije
  owner.reserve.sort((x, y) => {
    const hx = x.maxHp - x.damage, hy = y.maxHp - y.damage;
    if (hy !== hx) return hy - hx;
    return y.energy.length - x.energy.length;
  });
  owner.active = owner.reserve.shift();
  owner.active.justPlayed = false;
  logMsg(owner.name + " postavi " + def(owner.active).name + " kot novega aktivnega.");
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
  return { ok: true };
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
function aiTakeTurn(onStep, onDone) {
  const p = cur();
  if (!p.isAI || G.over) { onDone && onDone(); return; }

  const steps = [];

  // 1) postavi basic Champion v rezervo če je prostor
  steps.push(() => {
    const basic = p.hand.find(inst => {
      const d = CARDS[inst.cardId];
      return d.type === "Champion" && d.stage === "basic";
    });
    if (basic && p.reserve.length < MAX_RESERVE) playReserveChampion(p, basic);
  });

  // če nima aktivnega (npr. začetek): postavi
  steps.push(() => { if (!p.active) autoPlaceActive(p); });

  // 2) ascend če lahko
  steps.push(() => {
    if (p.active && findAscensionInHand(p, p.active) && !p.active.justPlayed) {
      ascend(p, p.active);
    }
  });

  // 3) pripni energijo najboljšemu (aktivnemu, ki ima napad ki ga skoraj plača)
  steps.push(() => {
    const energyInst = p.hand.find(inst => CARDS[inst.cardId].type === "Energy");
    if (energyInst && p.active && !p.energyAttachedThisTurn) {
      attachEnergy(p, energyInst, p.active);
    }
  });

  // 4) odigraj realm če ga ima in ni aktiven istega
  steps.push(() => {
    const realmInst = p.hand.find(inst => CARDS[inst.cardId].type === "Realm");
    if (realmInst && G.realm !== realmInst.cardId) playRealm(p, realmInst);
  });

  // 5) odigraj eno smiselno Oracle/Relic
  steps.push(() => {
    // healing oracle če je aktivni poškodovan
    const hpPct = p.active ? (p.active.maxHp - p.active.damage) / p.active.maxHp : 1;
    const oracle = p.hand.find(inst => {
      const d = CARDS[inst.cardId];
      if (d.type !== "Oracle") return false;
      if (["healActive60", "healReserve30"].includes(d.effect)) return hpPct < 0.5;
      return true;
    });
    if (oracle) playOracle(p, oracle);

    const relic = p.hand.find(inst => CARDS[inst.cardId].type === "Relic");
    if (relic) {
      const d = CARDS[relic.cardId];
      if (d.relicMode === "attach" && p.active && !p.active.relic) playRelic(p, relic, p.active);
      else if (d.relicMode === "instant") playRelic(p, relic, p.active);
    }
  });

  // 6) napadi z najboljšim možnim napadom
  steps.push(() => {
    if (!p.active || p.active.status.stun || p.active.justPlayed) { endTurnIfStillAI(); return; }
    const atks = def(p.active).attacks
      .map((atk, i) => ({ atk, i }))
      .filter(x => canPayCost(p.active, x.atk.cost));
    if (atks.length === 0) { endTurnIfStillAI(); return; }
    // izberi največjo škodo
    atks.sort((a, b) => b.atk.damage - a.atk.damage);
    performAttack(atks[0].i);
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
    findAscensionInHand, omenRoll,
    GLORY_TO_WIN, MAX_RESERVE,
    get shakeTarget() { return shakeTarget; },
    clearShake() { shakeTarget = null; },
  });
}
if (typeof module !== "undefined") {
  module.exports = {
    G, startGame, endTurn, performAttack, attachEnergy, canPayCost,
    playReserveChampion, playRelic, playOracle, playRealm, ascend, retreat,
    chooseNewActive, aiTakeTurn, cur, opp, def, allChampions, CARDS_OK: true,
  };
}
