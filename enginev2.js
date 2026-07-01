/* ============================================================================
   MYTHIC CLASH — ENGINE v2 (MTG-style: mana/tap, board of 3, hybrid combat)
   ----------------------------------------------------------------------------
   Ruleset:
   - Življenja 30/igralec; zmaga = nasprotnik na 0.
   - Energija = mana: igraš 1/turn na vrsto, ostane in se ODTAPA na začetku
     tvoje poteze; tapaš za priklic/napade/efekte.
   - Board max 3 šampioni; prvi (izbrani) zastonj, dodatni stanejo summonCost.
   - Summon sickness (Naval/charge obide).
   - Boj (hibrid): napadalec tapne + plača ceno napada; cilja ŠAMPIONA ali FACE.
     Ob napadu na face lahko branilec z NETAPNJENIM šampionom prestreže (block).
   - Statusi, weakness/resistance, combo (momentum), Naklonjenost (favor),
     keywordi (charge/lifesteal/overload/onEnter/onDefeat) ostanejo.
   Per-card hardkodirane sposobnosti se migrirajo kasneje (prek keyword sistema).
============================================================================ */
(function (global) {
  "use strict";
  const CARDS = global.CARDS;
  const STARTER_DECKS = global.STARTER_DECKS;

  const START_LIFE = 150;   // z odprtim startom (prazen board), 6-board swarmom in napadalnimi
                            // uroki je 150 boljši — boardi se razvijejo, burst ne konča igre v 2 potezah.
  const BOARD_MAX = 6;
  const HAND_START = 7;
  let UID = 1;

  // Hero Power po panteonu (balansirano: ~2 mana, 1× na potezo)
  const HERO_POWERS = {
    Greek:    { name: "Bolt of Olympus", cost: 2, kind: "heroAttack", value: 25, text: "25 škode nasprotnikovemu heroju (lahko brani netapnjen šampion)." },
    Norse:    { name: "Storm Chain",     cost: 2, kind: "chain",      value: 15, text: "15 škode VSEM nasprotnikovim šampionom." },
    Egyptian: { name: "Solar Renewal",   cost: 2, kind: "heroHeal",   value: 25, text: "Heroj dobi +25 življenja." },
    Slavic:   { name: "Frost Surge",     cost: 2, kind: "chain",      value: 12, text: "12 škode vsem nasprotnikovim šampionom." },
    Roman:    { name: "Legion Bulwark",  cost: 2, kind: "shieldAll",  value: 0,  text: "Vsi tvoji šampioni dobijo Shield." },
    Celtic:   { name: "Moon Mend",       cost: 1, kind: "heroHeal",   value: 18, text: "Heroj dobi +18 življenja (poceni)." },
  };

  // ARTEFAKTI — trajni run-modifikatorji (StS relikvije / Balatro jokerji). Veljajo cel run.
  // hook: battleStart | turnStart | onHeal | onKill | passive(computeDamage). scale=true -> Balatro multiplikativni motor.
  const ARTIFACTS = {
    "art-aegis":      { name: "Aegisov pulz",   icon: "🛡", rarity: "common", hook: "turnStart", desc: "Na začetku tvoje poteze vsi tvoji šampioni dobijo Shield." },
    "art-runestone":  { name: "Runski kamen",   icon: "🔷", rarity: "common", hook: "turnStart", desc: "Vsako potezo dobiš +1 nevtralno (Any) energijo." },
    "art-warhorn":    { name: "Bojni rog",      icon: "📯", rarity: "common", hook: "passive",   desc: "Vsi tvoji napadi zadajo +5 škode." },
    "art-oracle-eye": { name: "Orakeljsko oko", icon: "👁", rarity: "common", hook: "battleStart", desc: "Vsako bitko začneš z 2 dodatnima kartama." },
    "art-thiefglove": { name: "Tatova rokavica",icon: "🧤", rarity: "uncommon", hook: "onKill",  desc: "Ko premagaš nasprotnikovega šampiona, potegneš karto." },
    "art-healtotem":  { name: "Zdravilni totem",icon: "🪬", rarity: "uncommon", hook: "turnStart", desc: "Na začetku poteze tvoj najbolj poškodovan šampion +15 HP." },
    "art-vampirefang":{ name: "Vampirski zob",  icon: "🦇", rarity: "uncommon", hook: "passive",  desc: "Vsi tvoji napadi imajo Krvoses (zdraviš se za zadano škodo)." },
    // --- Balatro motorji (skalirajo ČEZ bitko) ---
    "art-warmblood":  { name: "Vrela kri",      icon: "🩸", rarity: "rare", scale: true, hook: "onHeal", desc: "Vsakič ko se kaj tvojega pozdravi, +3 TRAJNE škode do konca bitke." },
    "art-bloodtax":   { name: "Krvni davek",    icon: "💀", rarity: "rare", scale: true, hook: "onKill", desc: "Vsak premagan nasprotnik ti da +5 TRAJNE škode do konca bitke." },
    "art-sunaltar":   { name: "Sončni oltar",   icon: "🌞", rarity: "rare", scale: true, hook: "passive", desc: "Tvoji Sun napadi zadajo ×1.5 škode." },
    "art-momentum":   { name: "Momentum jedro", icon: "🌀", rarity: "rare", scale: true, hook: "passive", desc: "Vsak zaporedni napad v potezi je +5 močnejši (ponastavi se vsako potezo)." },
    "art-glasscannon":{ name: "Steklen top",    icon: "💥", rarity: "rare", hook: "battleStart", desc: "Tvoji napadi +15 škode, a vsako bitko začneš s −30 življenja. Tveganje." },
  };

  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function omenRoll() { return Math.random() < 0.5; }
  function def(inst) { return CARDS[inst.cardId]; }
  // Summon cost (mana): balansiran po HP + najmočnejšem napadu + redkosti.
  // Karta lahko ima ročni override d.summonCost.
  const RARITY_FLOOR = { Common: 1, Uncommon: 1, Rare: 2, Epic: 3, Legendary: 4, Mythic: 5 };
  function maxAtkDmg(d) { return Math.max(0, ...((d.attacks || []).map(a => a.damage || 0))); }
  function summonCostOf(d) {
    if (typeof d.summonCost === "number") return d.summonCost;
    let cost = Math.round(((d.hp || 60) + maxAtkDmg(d) * 1.2) / 60);
    if (d.stage === "ascended") cost += 1;
    cost = Math.max(RARITY_FLOOR[d.rarity] || 1, cost);
    return Math.max(1, Math.min(6, cost));
  }
  // Mana cost za ne-šampione (Oracle/Relic/Realm) — za ko pridejo v v2.
  function manaCostOf(d) {
    if (typeof d.manaCost === "number") return d.manaCost;
    if (d.type === "Realm") return 3;
    if (d.type === "Relic") return d.relicMode === "instant" ? 1 : 2;
    if (d.type === "Oracle") return 2;
    if (d.type === "Equipment") return 2; // orožje/oklep: privzeto 2 (sicer d.manaCost)
    return 0; // Energy = ni cene (je resurs)
  }
  // Oprema (orožje/oklep) pritrjena na šampiona
  function weaponOf(c) { return c && c.weapon ? CARDS[c.weapon] : null; }
  function armorOf(c)  { return c && c.armor  ? CARDS[c.armor]  : null; }
  function equipGrants(c, kw) { const w = weaponOf(c), a = armorOf(c); return (!!w && w.grant === kw) || (!!a && a.grant === kw); }
  function isTaunt(c) { return !!(def(c).taunt || (c.status && c.status.taunt) || equipGrants(c, "taunt")); } // "zid" — napasti ga moraš najprej (status.taunt = začasni)

  /* ---------------- Sinergije (Faza 2) ----------------
     Bond = 3+ šampionov enega panteona na boardu (trajen bonus).
     Zavezništvo = 2+ enega IN 2+ drugega panteona (cross-combo). */
  const BONDS = {
    Greek:    { name: "Modrost",     text: "Na začetku poteze potegneš +1 karto." },
    Norse:    { name: "Furija",      text: "Tvoji napadi zadajo +10 škode." },
    Roman:    { name: "Formacija",   text: "Tvoji šampioni prejmejo −10 škode." },
    Egyptian: { name: "Obnova",      text: "Ob koncu poteze tvoji šampioni +15 HP." },
    Slavic:   { name: "Prekletstvo", text: "Napadi proti tarči s statusom +15 škode." },
    Celtic:   { name: "Mistika",     text: "Tvoji šampioni dobijo +20% Umik (dodge)." },
  };
  const ALLIANCES = [
    { id: "order",   a: "Greek",    b: "Roman",    name: "Klasični red", text: "Shield vpije −30 (namesto −20)." },
    { id: "winter",  a: "Norse",    b: "Slavic",   name: "Zimski pakt",  text: "Zmrznjeni prejmejo ×1.4 škode." },
    { id: "warhost", a: "Norse",    b: "Roman",    name: "Vojni pohod",  text: "War napadi +15 škode." },
    { id: "sunsky",  a: "Greek",    b: "Egyptian", name: "Sončno nebo",  text: "Sky in Sun napadi +10 škode." },
    { id: "sunring", a: "Egyptian", b: "Celtic",   name: "Sončni krog",  text: "Ob koncu poteze tvoji šampioni +10 HP." },
  ];
  function pantheonCounts(p) { const c = {}; p.board.forEach(ch => { const pan = def(ch).pantheon; if (pan) c[pan] = (c[pan] || 0) + 1; }); return c; }
  function hasBond(p, pan) { return (pantheonCounts(p)[pan] || 0) >= 3; }
  function hasAlliance(p, id) { const al = ALLIANCES.find(x => x.id === id); if (!al) return false; const c = pantheonCounts(p); return (c[al.a] || 0) >= 2 && (c[al.b] || 0) >= 2; }
  function synergyOf(p) {
    const c = pantheonCounts(p);
    return { counts: c, bonds: Object.keys(c).filter(pan => c[pan] >= 3 && BONDS[pan]), alliances: ALLIANCES.filter(al => (c[al.a] || 0) >= 2 && (c[al.b] || 0) >= 2).map(al => al.id) };
  }
  function synergyLabels(p) {
    const s = synergyOf(p); const out = [];
    s.bonds.forEach(pan => out.push({ kind: "bond", pantheon: pan, name: BONDS[pan].name, text: pan + " Bond — " + BONDS[pan].text }));
    s.alliances.forEach(id => { const al = ALLIANCES.find(x => x.id === id); out.push({ kind: "alliance", id, name: al.name, text: "Zavezništvo — " + al.text }); });
    return out;
  }

  const G = {
    players: [], turn: 0, turnCount: 1, log: [], over: false, winner: null,
    realm: null, difficulty: "normal",
    pendingBlock: null,   // {attackerUid, attackerOwner, atkIndex, dmg, atkType} ko človek brani face
    mulliganPhase: false, mulliganStage: null,
    startingActiveChosen: false,
  };

  function logMsg(m) { G.log.push(m); }

  function makeInstance(cardId) {
    const d = CARDS[cardId];
    const inst = { uid: "u" + (UID++), cardId, type: d.type };
    if (d.type === "Champion") {
      inst.maxHp = d.hp; inst.damage = 0; inst.status = {};
      inst.tapped = false; inst.sick = true;
      inst.relic = null; inst.relicEffect = null;
      inst.weapon = null; inst.armor = null;
      inst._comboType = null; inst._comboCount = 0;
      inst.osirisUsed = false;
    }
    return inst;
  }

  function newPlayer(name, deckId, isAI) {
    const dk = STARTER_DECKS[deckId];
    return {
      name, isAI: !!isAI, deckId, pantheon: dk.pantheon,
      deck: shuffle(dk.list.map(makeInstance)),
      hand: [], discard: [], board: [], mana: [], life: START_LIFE, maxLife: START_LIFE,
      favor: 0, _favorArmed: false, kills: 0,
      heroPower: HERO_POWERS[dk.pantheon] || HERO_POWERS.Greek, heroPowerUsed: false,
      playedEnergyThisTurn: false,
      stats: { damageDealt: 0, cardsDrawn: 0, kills: 0 },
    };
  }

  function cur() { return G.players[G.turn]; }
  function oppOf(p) { return G.players[1 - G.players.indexOf(p)]; }
  function ownerOfChamp(c) { return G.players.find(p => p.board.indexOf(c) >= 0) || null; }
  function hp(c) { return c.maxHp - c.damage; }

  /* ---------------- setup ---------------- */
  function startGame(playerDeckId, aiDeckId, difficulty) {
    UID = 1;
    G.difficulty = difficulty || "normal";
    G.players = [newPlayer("Ti", playerDeckId, false), newPlayer("Nasprotnik", aiDeckId, true)];
    G.turn = 0; G.turnCount = 1; G.over = false; G.winner = null; G.log = [];
    G.pendingBlock = null; G.startingActiveChosen = false; G.noDeckout = false;
    for (const p of G.players) {
      p._mulligans = 0;
      dealOpening(p);
      p.stats.cardsDrawn += HAND_START;
    }
    // brez "free" championa — oba začneta s praznim boardom, vse igraš iz roke
    G.mulliganPhase = true; G.mulliganStage = "keep"; // človek obdrži ali mulligana
    logMsg("Bitka se začenja (v2)! " + G.players[0].name + " vs " + G.players[1].name + ".");
    return G;
  }
  function dealOpening(p, n) {
    n = n || HAND_START;
    let tries = 0;
    do {
      p.deck = shuffle(p.deck.concat(p.hand)); p.hand = [];
      for (let i = 0; i < n && p.deck.length; i++) p.hand.push(p.deck.pop());
      tries++;
    } while (tries < 50 && !p.hand.some(i => def(i).type === "Champion" && def(i).stage === "basic"));
  }
  // človek obdrži roko -> konča mulligan, začne bitko (board prazen)
  function keepHand() {
    if (!G.mulliganPhase) return { ok: false };
    G.mulliganPhase = false; G.startingActiveChosen = true;
    beginTurn(true);
    return { ok: true };
  }

  /* ---------------- turn ---------------- */
  function beginTurn(first) {
    const p = cur();
    p.playedEnergyThisTurn = false;
    p.heroPowerUsed = false;
    // untap mana + champs; clear sickness; overload
    p.mana.forEach(m => m.tapped = false);
    for (const c of p.board) {
      c.tapped = false; c.sick = false;
      if (c._overloadLock > 0) {
        const lose = Math.min(c._overloadLock, p.mana.filter(m => !m.tapped).length);
        for (let k = 0; k < lose; k++) { const m = p.mana.find(x => !x.tapped); if (m) m.tapped = true; }
        c._overloadLock = 0;
        if (lose > 0) logMsg(p.name + ": " + def(c).name + " — Preobremenitev tapne " + lose + " mane.");
      }
      // freeze 50% odprave
      if (c.status.freeze && omenRoll()) { delete c.status.freeze; logMsg(def(c).name + " ni več zamrznjen."); }
      // Guard drža in začasni Taunt potečeta na začetku tvoje poteze
      if (c.status.guard) delete c.status.guard;
      if (c.status.taunt) delete c.status.taunt;
    }
    if (!first) draw(p, 1);
    else logMsg(p.name + " začenja (brez vleke na prvi potezi).");
    if (!first && hasBond(p, "Greek")) { draw(p, 1); logMsg(p.name + ": Greek Bond (Modrost) — +1 karta."); } // Greek Bond
    artTurnStart(p); // Artefakti: turnStart (Aegis, Runski kamen, Zdravilni totem, Momentum reset)
  }
  function draw(p, n) {
    for (let i = 0; i < n; i++) {
      if (!p.deck.length) {
        if (G.noDeckout) { logMsg(p.name + " nima več kart za vleko (brez kazni v Pohodu)."); return; }
        endGame(1 - G.players.indexOf(p), p.name + " ne more vleči in izgubi!"); return;
      }
      p.hand.push(p.deck.pop()); p.stats.cardsDrawn++;
    }
  }
  function endTurn() {
    if (G.over) return;
    const p = cur();
    endOfTurn(p);
    if (G.over) return;
    G.turn = 1 - G.turn; G.turnCount++;
    logMsg("— Poteza " + G.turnCount + ": " + cur().name + " —");
    beginTurn(false);
  }
  function endOfTurn(p) {
    for (const c of p.board.slice()) {
      if (c.status.burn) { let d = 15; if (c.status.poison) d += 5; rawDamage(c, p, d, "Burn"); if (checkDeaths()) return; }
      if (c.status.poison) { rawDamage(c, p, 5 + 10 * c.status.poison, "Poison"); c.status.poison++; if (checkDeaths()) return; }
      if (def(c).decay) { rawDamage(c, p, def(c).decay, "Razpad"); if (checkDeaths()) return; } // npr. berserk: vsak konec poteze izgubi HP
      if (c.status.blessing) { c.status.blessing--; if (c.status.blessing <= 0) delete c.status.blessing; }
      // Relikvija Druidic Amulet: +10 HP na koncu poteze
      if (c.relicEffect === "healEndTurn10") { c.damage = Math.max(0, c.damage - 10); }
    }
    // Realm Grove: lastnikovi šampioni +10 HP na koncu poteze
    if (G.realm === "realm-grove" && G.realmOwner === G.players.indexOf(p)) {
      p.board.forEach(c => c.damage = Math.max(0, c.damage - 10));
    }
    // Sinergije: Egyptian Bond (Obnova +15) + Sončni krog zavezništvo (+10)
    let synHeal = 0;
    if (hasBond(p, "Egyptian")) synHeal += 15;
    if (hasAlliance(p, "sunring")) synHeal += 10;
    if (synHeal) { p.board.forEach(c => c.damage = Math.max(0, c.damage - synHeal)); logMsg(p.name + ": Sinergija — šampioni +" + synHeal + " HP."); artHeal(p); }
    p.mana = p.mana.filter(m => !m.temp); // začasna (dork) mana izgine ob koncu poteze
    delete p._apotheosis; // Apoteoza velja le to potezo
  }

  /* ---------------- mana ---------------- */
  function playEnergy(p, energyInst) {
    if (p.playedEnergyThisTurn) return { ok: false, msg: "Energijo lahko igraš le 1× na turn." };
    const d = def(energyInst); if (d.type !== "Energy") return { ok: false };
    const i = p.hand.indexOf(energyInst); if (i < 0) return { ok: false };
    p.hand.splice(i, 1);
    if (d.energyTypes) p.mana.push({ type: d.energyTypes[0], types: d.energyTypes.slice(), tapped: false }); // dual
    else p.mana.push({ type: d.energyType, tapped: false });
    p.playedEnergyThisTurn = true;
    logMsg(p.name + " igra energijo: " + (d.energyTypes ? d.energyTypes.join("/") : d.energyType) + " (mana " + p.mana.length + ").");
    return { ok: true };
  }
  // ali mana žeton pokrije določeno potrebo (podpira dual + "Any" wildcard + Lugh)
  function manaMatches(m, need, lughAny) {
    if (need === "Any") return true;
    if (m.type === "Any" || (m.types && m.types.includes("Any"))) return true; // nevtralna (dork)
    if (m.type === need && !m.types) return true;
    if (m.types && m.types.includes(need)) return true;
    return !!lughAny;
  }
  function manaFlex(m) { return m.type === "Any" ? 3 : (m.types ? 2 : 1); } // manj fleksibilno = nižje
  // razporedi izbrano mano na cost; vrne array uporabljenih žetonov ali null
  function assignMana(poolObjs, cost, lughAny) {
    const specific = cost.filter(c => c !== "Any");
    const anyN = cost.filter(c => c === "Any").length;
    const used = new Set();
    for (const need of specific) {
      const cands = poolObjs.filter(m => !used.has(m) && manaMatches(m, need, lughAny)).sort((a, b) => manaFlex(a) - manaFlex(b));
      if (!cands.length) return null;
      used.add(cands[0]);
    }
    const rest = poolObjs.filter(m => !used.has(m)).sort((a, b) => manaFlex(a) - manaFlex(b));
    if (rest.length < anyN) return null;
    for (let k = 0; k < anyN; k++) used.add(rest[k]);
    return [...used];
  }
  function canPay(p, cost, lughAny) { return !!assignMana(p.mana.filter(m => !m.tapped), cost, lughAny); }
  function payMana(p, cost, lughAny) {
    const sel = assignMana(p.mana.filter(m => !m.tapped), cost, lughAny);
    if (!sel) return false; sel.forEach(m => m.tapped = true); return true;
  }
  // plača z IZBRANIMI mana indeksi (ročna izbira)
  function paySpecific(p, indices, cost, lughAny) {
    const chosen = (indices || []).map(i => p.mana[i]).filter(m => m && !m.tapped);
    if (chosen.length !== cost.length) return false;
    const sel = assignMana(chosen, cost, lughAny);
    if (!sel || sel.length !== cost.length) return false;
    chosen.forEach(m => m.tapped = true); return true;
  }
  // validacija ročne izbire brez tapanja (za UI)
  function canPaySelection(p, indices, cost, lughAny) {
    const chosen = (indices || []).map(i => p.mana[i]).filter(m => m && !m.tapped);
    if (chosen.length !== cost.length) return false;
    const sel = assignMana(chosen, cost, lughAny);
    return !!(sel && sel.length === cost.length);
  }
  // plača cost: ročno (manaIdx) ali samodejno
  function payCost(p, cost, lughAny, manaIdx) {
    if (manaIdx && manaIdx.length) return paySpecific(p, manaIdx, cost, lughAny);
    return payMana(p, cost, lughAny);
  }
  function manaCostArr(n) { return Array.from({ length: n }, () => "Any"); }
  function cardNeedsTarget(d) {
    if (d.type === "Champion") return null;
    if (d.type === "Realm") return null;
    const ENEMY = ["curseEnemy", "dmgEnemy30", "dmgEnemy25", "dmgEnemy40", "fireball40burn", "boltStun50", "burnEnemy", "freezeEnemy"];
    const ALLY = ["healActive60", "healActive40", "blessActive"];
    // aoe* in faceDmg25 ne potrebujejo tarče (prizadenejo ves board / obraz)
    const e = d.effect;
    if (d.type === "Relic" && d.relicMode === "attach") return "ally";
    if (d.type === "Equipment") return "ally";
    if (ENEMY.includes(e)) return "enemy";
    if (ALLY.includes(e)) return "ally";
    return null; // board-wide / draw
  }

  /* ---------------- summon ---------------- */
  function summon(p, champInst, manaIdx) {
    const d = def(champInst);
    if (d.type !== "Champion") return { ok: false };
    if (p.board.length >= BOARD_MAX) return { ok: false, msg: "Board je poln (3)." };
    const cost = manaCostArr(summonCostOf(d));
    if (!canPay(p, cost)) return { ok: false, msg: "Premalo mane za priklic (" + cost.length + ")." };
    const i = p.hand.indexOf(champInst); if (i < 0) return { ok: false };
    if (!payCost(p, cost, false, manaIdx)) return { ok: false, msg: "Izbrana mana ne pokrije cene." };
    p.hand.splice(i, 1);
    champInst.sick = !d.charge; // Naval obide summon sickness
    p.board.push(champInst);
    logMsg(p.name + " prikliče " + d.name + " (cena " + cost.length + ").");
    onEnter(p, champInst);
    return { ok: true };
  }

  /* ---------------- Aktivirane sposobnosti ---------------- */
  // Champion lahko ima d.activated = { name, cost:[...], effect, text }.
  // Aktivacija plača cost + TAPNE championa (namesto napada).
  function canActivate(p, c) {
    const d = def(c);
    return d.activated && !c.tapped && !c.sick && !c.status.stun && canPay(p, d.activated.cost, d.id === "celtic-lugh");
  }
  function activateAbility(p, champUid, manaIdx) {
    const c = p.board.find(x => x.uid === champUid);
    if (!c) return { ok: false };
    const d = def(c);
    if (!d.activated) return { ok: false, msg: "Ta šampion nima aktivne sposobnosti." };
    if (c.tapped || c.sick || c.status.stun) return { ok: false, msg: "Ne more aktivirati (tapnjen/sick/stun)." };
    const lugh = d.id === "celtic-lugh";
    if (!canPay(p, d.activated.cost, lugh)) return { ok: false, msg: "Premalo mane." };
    if (!payCost(p, d.activated.cost, lugh, manaIdx)) return { ok: false, msg: "Izbrana mana ne pokrije cene." };
    c.tapped = true;
    const e = d.activated.effect;
    switch (e) {
      case "healSelf30": c.damage = Math.max(0, c.damage - 30); logMsg(def(c).name + " se pozdravi 30 HP."); artHeal(p); break;
      case "healBoard20": p.board.forEach(x => x.damage = Math.max(0, x.damage - 20)); logMsg(p.name + ": vsi šampioni +20 HP."); artHeal(p); break;
      case "shieldSelf": c.status.shield = true; logMsg(def(c).name + " dvigne Shield."); break;
      case "guard": c.status.guard = true; logMsg(def(c).name + " zavzame obrambno držo (−50% škode)."); break;
      case "blessSelf": c.status.blessing = Math.max(c.status.blessing || 0, 2); logMsg(def(c).name + " dobi Blessing."); break;
      // mana dork: tapni -> dodaj 1 začasno energijo (velja le to potezo)
      case "rampAny": p.mana.push({ type: "Any", tapped: false, temp: true }); logMsg(def(c).name + ": +1 nevtralna energija (to potezo)."); break;
      case "rampNature": p.mana.push({ type: "Nature", tapped: false, temp: true }); logMsg(def(c).name + ": +1 Nature energija (to potezo)."); break;
      case "rampSun": p.mana.push({ type: "Sun", tapped: false, temp: true }); logMsg(def(c).name + ": +1 Sun energija (to potezo)."); break;
      // FORTIFY: utrdi se — dobi Taunt (do naslednje poteze) + Shield
      case "fortify": c.status.taunt = true; c.status.shield = true; logMsg(def(c).name + " se UTRDI — Taunt + Shield."); break;
      // EVOLVE: naberi urjenje; pri d.evolve.need se transformira v močnejšo verzijo
      case "evolve": {
        const ev = d.evolve || { need: 3 };
        c._evolve = (c._evolve || 0) + 1;
        if (c._evolve >= (ev.need || 3) && ev.into) { transformChamp(p, c, ev.into); }
        else logMsg(def(c).name + " se uri (" + c._evolve + "/" + (ev.need || 3) + ").");
        break;
      }
      default: logMsg("(sposobnost " + e + " še ni v v2)"); break;
    }
    return { ok: true };
  }
  // transformacija (Evolve): zamenja karto v močnejšo, prenese poškodbo (+ manjši heal ob evoluciji)
  function transformChamp(owner, c, intoId) {
    const nd = CARDS[intoId]; if (!nd) { logMsg("(Evolucija: tarča " + intoId + " manjka)"); return; }
    const armorBonus = (armorOf(c) && armorOf(c).hpBonus) ? armorOf(c).hpBonus : 0;
    const dmgBefore = c.damage;
    c.cardId = intoId; c.type = nd.type;
    c.maxHp = (nd.hp || 60) + armorBonus;
    c.damage = Math.max(0, Math.min(dmgBefore - 20, c.maxHp)); // ob evoluciji +20 HP
    c._evolve = 0; c._evolved = true;
    logMsg("⚡ EVOLUCIJA! Postane " + nd.name + " (" + nd.hp + " HP).");
  }

  /* ---------------- Hero Power (1× na potezo) ---------------- */
  function useHeroPower(p, manaIdx) {
    const hpw = p.heroPower; if (!hpw) return { ok: false };
    if (p.heroPowerUsed) return { ok: false, msg: "Hero Power je že uporabljen to potezo." };
    const cost = manaCostArr(hpw.cost);
    if (!canPay(p, cost)) return { ok: false, msg: "Premalo mane za Hero Power." };
    if (!payCost(p, cost, false, manaIdx)) return { ok: false, msg: "Izbrana mana ne pokrije cene." };
    p.heroPowerUsed = true;
    const opp = oppOf(p);
    if (hpw.kind === "heroAttack") {
      const blockers = opp.board.filter(c => !c.tapped);
      if (blockers.length) {
        const b = blockers.sort((a, b) => (b.maxHp - b.damage) - (a.maxHp - a.damage))[0];
        logMsg(def(b).name + " prestreže Hero Power.");
        rawDamage(b, opp, hpw.value, "Hero Power"); checkDeaths();
      } else {
        opp.life -= hpw.value;
        logMsg(p.name + ": Hero Power udari OBRAZ za " + hpw.value + " (življenja " + opp.name + ": " + opp.life + ").");
        if (opp.life <= 0) endGame(G.players.indexOf(p), opp.name + " je premagan!");
      }
    } else if (hpw.kind === "chain") {
      opp.board.slice().forEach(c => rawDamage(c, opp, hpw.value, "Chain"));
      logMsg(p.name + ": Chain — " + hpw.value + " škode vsem nasprotnikovim šampionom.");
      checkDeaths();
    } else if (hpw.kind === "heroHeal") {
      p.life = Math.min(p.maxLife, p.life + hpw.value);
      logMsg(p.name + ": Hero Power — heroj +" + hpw.value + " (življenja " + p.life + ").");
      artHeal(p);
    } else if (hpw.kind === "shieldAll") {
      p.board.forEach(c => c.status.shield = true);
      logMsg(p.name + ": Hero Power — vsi šampioni dobijo Shield.");
    }
    return { ok: true };
  }

  /* ---------------- Mulligan (samo začetek, samo človek) ---------------- */
  // mulligan: prvi je zastonj, vsak naslednji poteguje 1 karto manj
  function mulliganHand() {
    const you = G.players[0];
    if (!G.mulliganPhase) return { ok: false };
    you._mulligans = (you._mulligans || 0) + 1;
    const n = Math.max(3, HAND_START - Math.max(0, you._mulligans - 1));
    dealOpening(you, n);
    logMsg(you.name + " mulligan #" + you._mulligans + " — roka " + n + (you._mulligans === 1 ? " (prvi zastonj)." : " (−1 karta)."));
    return { ok: true, handSize: n, nextSize: Math.max(3, n - 1), free: you._mulligans === 1 };
  }

  /* ---------------- Oracle / Relic / Realm ---------------- */
  function spellEffect(key, p, targetUid) {
    const opp = oppOf(p);
    const ally = p.board.find(c => c.uid === targetUid) || p.board[0];
    const enemy = opp.board.find(c => c.uid === targetUid) || opp.board[0];
    switch (key) {
      case "draw3": draw(p, 3); break;
      case "draw2": case "draw2attach": draw(p, 2); break;
      case "healActive60": if (ally) { ally.damage = Math.max(0, ally.damage - 60); logMsg(def(ally).name + " +60 HP."); artHeal(p); } break;
      case "healActive40": if (ally) { ally.damage = Math.max(0, ally.damage - 40); logMsg(def(ally).name + " +40 HP."); artHeal(p); } break;
      case "healReserve30": p.board.forEach(c => c.damage = Math.max(0, c.damage - 30)); logMsg(p.name + ": vsi šampioni +30 HP."); artHeal(p); break;
      case "blessActive": if (ally) { ally.status.blessing = Math.max(ally.status.blessing || 0, 2); logMsg(def(ally).name + " dobi Blessing."); } break;
      case "shieldAll": p.board.forEach(c => c.status.shield = true); logMsg(p.name + ": vsi dobijo Shield."); break;
      case "curseEnemy": if (enemy) { enemy.status.curse = true; logMsg(def(enemy).name + " je preklet."); } break;
      case "burnEnemy": if (enemy) { enemy.status.burn = true; logMsg(def(enemy).name + " gori."); } break;
      case "freezeEnemy": if (enemy) { enemy.status.freeze = true; logMsg(def(enemy).name + " zamrznjen."); } break;
      case "dmgEnemy30": if (enemy) { rawDamage(enemy, opp, 30, "urok"); checkDeaths(); } break;
      // ---- napadalni uroki (Faza: spelle) ----
      case "dmgEnemy25": if (enemy) { rawDamage(enemy, opp, 25, "Kopje"); checkDeaths(); } break;
      case "dmgEnemy40": if (enemy) { rawDamage(enemy, opp, 40, "Ognjena krogla"); checkDeaths(); } break;
      case "fireball40burn": if (enemy) { rawDamage(enemy, opp, 40, "Ognjena krogla"); enemy.status.burn = true; checkDeaths(); } break;
      case "boltStun50": if (enemy) { rawDamage(enemy, opp, 50, "Mjölnir"); enemy.status.stun = true; checkDeaths(); } break;
      case "aoe15": opp.board.slice().forEach(c => rawDamage(c, opp, 15, "Salva")); logMsg(p.name + ": Salva — 15 vsem nasprotnikovim šampionom."); checkDeaths(); break;
      case "aoe20": opp.board.slice().forEach(c => rawDamage(c, opp, 20, "Sončni izbruh")); logMsg(p.name + ": 20 vsem nasprotnikovim šampionom."); checkDeaths(); break;
      case "aoe15freeze": opp.board.slice().forEach(c => { rawDamage(c, opp, 15, "Zmrzal"); c.status.freeze = true; }); logMsg(p.name + ": Zmrzal — 15 + zmrznitev vsem."); checkDeaths(); break;
      case "faceDmg25": opp.life -= 25; logMsg(p.name + ": urok udari OBRAZ za 25 (življenja " + opp.name + ": " + opp.life + ")."); if (opp.life <= 0) endGame(G.players.indexOf(p), opp.name + " je premagan z urokom!"); break;
      case "apotheosis": p._apotheosis = true; logMsg(p.name + ": APOTEOZA — skalirni motorji to potezo štejejo dvojno!"); break;
      default: logMsg("(učinek " + key + " še ni v v2)"); break;
    }
  }
  // odigraj Oracle/Relic/Realm; opts={targetUid, manaIdx}
  function playCard(p, inst, opts) {
    opts = opts || {};
    const d = def(inst);
    if (!["Oracle", "Relic", "Realm", "Equipment"].includes(d.type)) return { ok: false };
    const cost = manaCostArr(manaCostOf(d));
    if (!canPay(p, cost)) return { ok: false, msg: "Premalo mane (" + cost.length + ")." };
    const i = p.hand.indexOf(inst); if (i < 0) return { ok: false };
    if (!payCost(p, cost, false, opts.manaIdx)) return { ok: false, msg: "Izbrana mana ne pokrije cene." };
    p.hand.splice(i, 1);

    if (d.type === "Realm") {
      G.realm = d.id; G.realmEffect = d.effect || d.realmEffect; G.realmOwner = G.players.indexOf(p);
      p.discard.push(inst);
      logMsg(p.name + " razglasi Realm: " + d.name + ".");
      return { ok: true };
    }
    if (d.type === "Relic" && d.relicMode === "attach") {
      const tgt = p.board.find(c => c.uid === opts.targetUid) || p.board[0];
      if (!tgt) { return { ok: false, msg: "Ni tarče za relikvijo." }; }
      tgt.relic = d.id; tgt.relicEffect = d.effect;
      p.discard.push(inst);
      logMsg(p.name + ": " + def(tgt).name + " dobi " + d.name + ".");
      return { ok: true };
    }
    if (d.type === "Equipment") {
      const tgt = p.board.find(c => c.uid === opts.targetUid) || p.board[0];
      if (!tgt) { return { ok: false, msg: "Ni šampiona za opremo." }; }
      const slot = d.slot === "armor" ? "armor" : "weapon";
      const oldId = tgt[slot];
      if (oldId) { // zamenjaj staro opremo (gre v odlagališče)
        const old = CARDS[oldId];
        if (slot === "armor" && old.hpBonus) { tgt.maxHp -= old.hpBonus; if (tgt.damage > tgt.maxHp) tgt.damage = tgt.maxHp; }
        p.discard.push(makeInstance(oldId));
      }
      tgt[slot] = d.id;
      if (slot === "armor" && d.hpBonus) tgt.maxHp += d.hpBonus; // oklep dvigne mejo HP
      if (d.grant === "shield") tgt.status.shield = true;
      p.discard.push(inst);
      logMsg(p.name + ": " + def(tgt).name + " opremi " + d.name + ".");
      return { ok: true };
    }
    // Oracle ali instant Relic
    logMsg(p.name + " odigra " + d.name + ".");
    spellEffect(d.effect, p, opts.targetUid);
    p.discard.push(inst);
    return { ok: true };
  }

  /* ---------------- Artefakti (run modifikatorji) ---------------- */
  function hasArt(p, id) { return !!(p && p.artifacts && p.artifacts.indexOf(id) >= 0); }
  function artAtkFlat(p, atkType) {
    let b = 0;
    if (hasArt(p, "art-warhorn")) b += 5;
    if (hasArt(p, "art-glasscannon")) b += 15;
    if (p.artBonus) b += (p.artBonus.atkFlat || 0);           // Vrela kri + Krvni davek (skalira)
    if (hasArt(p, "art-momentum")) b += (p._atkChain || 0) * 5; // Momentum: zaporedni napadi
    return b;
  }
  function artAtkMult(p, atkType) {
    let m = 1;
    if (hasArt(p, "art-sunaltar") && atkType === "Sun") m *= 1.5; // Sončni oltar
    return m;
  }
  function artHeal(p) { // ko se nekaj tvojega pozdravi
    if (hasArt(p, "art-warmblood")) { p.artBonus = p.artBonus || { atkFlat: 0 }; p.artBonus.atkFlat += 3; logMsg(p.name + ": Vrela kri — +3 trajne škode (ta boj)."); }
  }
  function artKill(p) { // p je premagal nasprotnikovega šampiona
    if (!p) return;
    if (hasArt(p, "art-thiefglove")) { draw(p, 1); logMsg(p.name + ": Tatova rokavica — vlek karte."); }
    if (hasArt(p, "art-bloodtax")) { p.artBonus = p.artBonus || { atkFlat: 0 }; p.artBonus.atkFlat += 5; logMsg(p.name + ": Krvni davek — +5 trajne škode (ta boj)."); }
  }
  function artTurnStart(p) {
    if (!p.artifacts || !p.artifacts.length) { p._atkChain = 0; return; }
    if (hasArt(p, "art-runestone")) { p.mana.push({ type: "Any", tapped: false, temp: true }); logMsg(p.name + ": Runski kamen — +1 energija."); }
    if (hasArt(p, "art-aegis")) { p.board.forEach(c => c.status.shield = true); if (p.board.length) logMsg(p.name + ": Aegisov pulz — Shield vsem."); }
    if (hasArt(p, "art-healtotem") && p.board.length) {
      const c = p.board.slice().sort((a, b) => b.damage - a.damage)[0];
      if (c && c.damage > 0) { c.damage = Math.max(0, c.damage - 15); logMsg(p.name + ": Zdravilni totem — " + def(c).name + " +15 HP."); }
    }
    p._atkChain = 0; // Momentum se ponastavi vsako potezo
  }
  // klic ob začetku bitke (run nastavi p.artifacts, nato to)
  function artBattleStart(p) {
    p.artBonus = { atkFlat: 0 }; p._atkChain = 0;
    if (!p.artifacts || !p.artifacts.length) return;
    if (hasArt(p, "art-oracle-eye")) { draw(p, 2); logMsg(p.name + ": Orakeljsko oko — +2 karti."); }
    if (hasArt(p, "art-glasscannon")) { p.life = Math.max(1, p.life - 30); logMsg(p.name + ": Steklen top — −30 življenja, a +15 škode."); }
  }

  /* ---------------- Skalirni motorji (Balatro) ---------------- */
  // Karta lahko ima atk.scale = {per, amt, type?} ali polje takih. Bonus = amt * count(per).
  // _apotheosis na lastniku podvoji ta bonus to potezo.
  function champHasType(c, t) { return (def(c).attacks || []).some(a => (a.cost || []).includes(t)) || def(c).resistance === t; }
  function scaleCount(per, attacker, p) {
    switch (per) {
      case "allyChamps":    return Math.max(0, p.board.length - 1);
      case "boardChamps":   return p.board.length;
      case "boardPairs":    return Math.floor(p.board.length / 2);
      case "sunAllies":     return p.board.filter(c => c !== attacker && champHasType(c, "Sun")).length;
      case "natureAllies":  return p.board.filter(c => c !== attacker && champHasType(c, "Nature")).length;
      case "attacksThisTurn": return p._atkChain || 0;
      case "enemyStatuses": { const s = new Set(); oppOf(p).board.forEach(c => { const st = c.status || {}; for (const k in st) if (st[k]) s.add(k); }); return s.size; }
      default: return 0;
    }
  }
  function scaleBonus(atk, attacker, atkOwner, atkType) {
    const sc = atk && atk.scale; if (!sc || !atkOwner) return 0;
    const arr = Array.isArray(sc) ? sc : [sc];
    let bonus = 0;
    for (const s of arr) { if (s.type && s.type !== atkType) continue; bonus += (s.amt || 0) * scaleCount(s.per, attacker, atkOwner); }
    if (atkOwner._apotheosis) bonus *= 2; // Apoteoza ×2
    return bonus;
  }

  /* ---------------- combat ---------------- */
  function effType(atk) { return (atk.cost || []).find(c => c !== "Any") || null; }

  function computeDamage(attacker, atkOwner, defender, atk, opts) {
    opts = opts || {};
    let dmg = atk.damage || 0; const parts = [];
    if (attacker.status.blessing) dmg += 15;
    if (attacker.status.curse) dmg -= 15;
    const atkType0 = effType(atk);
    // Relikvije na napadalcu / branilcu
    if (attacker.relicEffect === "dmgPlus20") dmg += 20;
    if (defender.relicEffect === "dmgReduce20") dmg -= 20;
    // Oprema: orožje (+napad), oklep (−prejeta škoda); Prebod ignorira Shield
    const wpn = weaponOf(attacker), arm = armorOf(defender);
    if (wpn && wpn.atkBonus) dmg += wpn.atkBonus;
    if (arm && arm.dmgReduce) dmg -= arm.dmgReduce;
    const pierce = !!(wpn && wpn.grant === "pierce");
    // Realm bonusi (napadalec)
    const ad = def(attacker);
    if (G.realm === "realm-olympus" && atkType0 === "Sky" && ad.pantheon === "Greek") dmg += 10;
    if (G.realm === "realm-asgard" && atkType0 === "War" && ad.pantheon === "Norse") dmg += 10;
    if (G.realm === "realm-duat" && (atkType0 === "Underworld" || atkType0 === "Sun")) dmg += 10;
    // Realm: Forum -10 če ima branilčev lastnik 2+ šampione
    const dOwner = ownerOfChamp(defender);
    if (G.realm === "realm-forum") { if (dOwner && dOwner.board.length >= 2) dmg -= 10; }
    // Sinergije — napad
    if (atkOwner) {
      if (hasBond(atkOwner, "Norse")) { dmg += 10; parts.push("FURIJA"); }                                  // Norse Bond
      if (atkType0 === "War" && hasAlliance(atkOwner, "warhost")) { dmg += 15; parts.push("VOJNA"); }        // Norse+Roman
      if ((atkType0 === "Sky" || atkType0 === "Sun") && hasAlliance(atkOwner, "sunsky")) { dmg += 10; parts.push("SONCE"); } // Greek+Egyptian
      if (hasBond(atkOwner, "Slavic")) { const s = defender.status || {}; if (s.burn || s.freeze || s.stun || s.curse || s.poison) { dmg += 15; parts.push("KLETEV"); } } // Slavic Bond
      const af = artAtkFlat(atkOwner, atkType0); if (af) { dmg += af; parts.push("ARTEFAKT"); } // Artefakti (Bojni rog, Vrela kri, Momentum ...)
      const sb = scaleBonus(atk, attacker, atkOwner, atkType0); if (sb) { dmg += sb; parts.push(atkOwner._apotheosis ? "MOTOR×2" : "MOTOR"); } // Skalirni motorji
    }
    // Sinergije — obramba
    if (dOwner && hasBond(dOwner, "Roman")) { dmg -= 10; parts.push("FORMACIJA"); }                          // Roman Bond
    if (defender.status.shield && !pierce) dmg -= (dOwner && hasAlliance(dOwner, "order")) ? 30 : 20;        // Greek+Roman: Shield −30
    if (dmg < 0) dmg = 0;
    const atkType = atkType0;
    let mult = 1;
    const dd = def(defender);
    if (atkType) {
      if (dd.weakness === atkType) { mult *= 1.5; parts.push("WEAK"); }
      else if (dd.resistance === atkType) { mult *= 0.6; parts.push("RESIST"); }
    }
    if (atkOwner) { const am = artAtkMult(atkOwner, atkType0); if (am !== 1) { mult *= am; parts.push("OLTAR"); } } // Sončni oltar ×1.5
    if (defender.status.freeze) mult *= (atkOwner && hasAlliance(atkOwner, "winter")) ? 1.4 : 1.2;           // Norse+Slavic
    if (defender.status.stun) mult *= 1.1;
    if (defender.status.guard) { mult *= 0.5; parts.push("GUARD"); } // obrambna drža −50%
    if (opts.forceOmenBonus) { mult *= 1.3; parts.push("FAVOR"); }
    else if ((atk.cost || []).length >= 3) {
      if (opts.omen === true) { mult *= 1.3; parts.push("OMEN+"); }
      else if (opts.omen == null) mult *= 1.15;
    }
    dmg = Math.round((dmg * mult) / 5) * 5;
    if (opts.comboBonus) dmg += opts.comboBonus;
    if (dmg < 0) dmg = 0;
    return { dmg, parts };
  }
  function comboInfo(att, atkType) {
    if (!atkType) return { count: 0, bonus: 0 };
    const count = att._comboType === atkType ? att._comboCount + 1 : 1;
    return { count, bonus: count >= 2 ? Math.min((count - 1) * 10, 30) : 0 };
  }
  function previewDamage(att, attOwner, defn, atk) {
    if (!att || !defn || !atk) return null;
    const t = effType(atk); const cb = comboInfo(att, t);
    const fo = !!(attOwner && attOwner._favorArmed && attOwner.favor > 0);
    const r = computeDamage(att, attOwner, defn, atk, { comboBonus: cb.bonus, forceOmenBonus: fo });
    return { dmg: r.dmg, parts: r.parts, comboCount: cb.count };
  }
  // predviden damage proti OBRAZU (brez naključnega omena; heavy -> ×1.15 pričakovano)
  function previewFace(att, attOwner, atk) {
    if (!att || !atk) return null;
    const atkType = effType(atk); const cb = comboInfo(att, atkType);
    const fo = !!(attOwner && attOwner._favorArmed && attOwner.favor > 0);
    let dmg = atk.damage || 0; const parts = [];
    if (att.status.blessing) dmg += 15;
    if (att.status.curse) dmg -= 15;
    const w = weaponOf(att); if (w && w.atkBonus) dmg += w.atkBonus;
    if (attOwner) { const af = artAtkFlat(attOwner, atkType); if (af) { dmg += af; parts.push("ARTEFAKT"); } }
    if (attOwner) { const sb = scaleBonus(atk, att, attOwner, atkType); if (sb) { dmg += sb; parts.push(attOwner._apotheosis ? "MOTOR×2" : "MOTOR"); } }
    const heavy = (atk.cost || []).length >= 3;
    let mult = 1;
    if (attOwner) { const am = artAtkMult(attOwner, atkType); if (am !== 1) { mult *= am; parts.push("OLTAR"); } }
    if (fo) { mult *= 1.3; parts.push("FAVOR"); }
    else if (heavy) { mult *= 1.15; parts.push("OMEN?"); }
    dmg = Math.round((dmg * mult) / 5) * 5 + cb.bonus;
    if (dmg < 0) dmg = 0;
    if (cb.bonus > 0) parts.push("COMBO+" + cb.bonus);
    return { dmg, parts, comboCount: cb.count };
  }

  function canAttack(p, c) {
    return c && !c.tapped && !c.sick && !c.status.stun;
  }

  // ali ima branilec še žive Taunt branilce (zid)?
  function tauntsOf(opp) { return opp.board.filter(c => isTaunt(c)); }
  // attacker napade; target = {kind:'champ', uid} | {kind:'face'}
  function attack(p, attackerUid, atkIndex, target, manaIdx) {
    if (G.over) return { ok: false };
    const att = p.board.find(c => c.uid === attackerUid);
    if (!att) return { ok: false };
    if (!canAttack(p, att)) return { ok: false, msg: "Ta šampion ne more napasti (tapnjen/sick/stun)." };
    const atk = def(att).attacks[atkIndex];
    if (!atk || !(atk.damage > 0)) return { ok: false, msg: "Ta karta nima napada." };
    const lugh = def(att).id === "celtic-lugh";
    if (!canPay(p, atk.cost, lugh)) return { ok: false, msg: "Premalo mane za napad." };

    const opp = oppOf(p);
    const taunts = tauntsOf(opp);
    // VALIDIRAJ tarčo PRED plačilom (Taunt zid)
    let defn = null;
    if (target && target.kind === "champ") {
      defn = opp.board.find(c => c.uid === target.uid);
      if (!defn) return { ok: false, msg: "Tarča ne obstaja." };
      if (taunts.length && !isTaunt(defn)) return { ok: false, msg: "Najprej premagaj branilce (Taunt)." };
    } else {
      if (atk.noFace) return { ok: false, msg: "Ta napad lahko cilja le bitja (ne obraza)." };
      if (taunts.length) return { ok: false, msg: "Najprej premagaj branilce (Taunt)." };
    }
    // plačaj + tapni napadalca
    if (!payCost(p, atk.cost, lugh, manaIdx)) return { ok: false, msg: "Izbrana mana ne pokrije cene." };
    att.tapped = true;
    const atkType = effType(atk);
    if (defn) return resolveStrike(p, att, atk, atkType, opp, defn);
    return faceHit(p, att, atk, atkType, opp);
  }

  // človek (branilec) izbere blokerja ali null (sprejme v obraz)
  function resolveBlock(blockerUidOrNull) {
    const pb = G.pendingBlock; if (!pb) return { ok: false };
    const attacker = G.players[pb.attackerOwnerIndex];
    const att = attacker.board.find(c => c.uid === pb.attackerUid);
    const opp = oppOf(attacker);
    const atk = def(att).attacks[pb.atkIndex];
    G.pendingBlock = null;
    if (blockerUidOrNull) {
      const blocker = opp.board.find(c => c.uid === blockerUidOrNull && !c.tapped);
      if (blocker) { logMsg(opp.name + " prestreže z " + def(blocker).name + "."); return resolveStrike(attacker, att, atk, pb.atkType, opp, blocker); }
    }
    return faceHit(attacker, att, atk, pb.atkType, opp);
  }

  function resolveStrike(p, att, atk, atkType, opp, defn) {
    let forceOmen = false;
    if (p._favorArmed && p.favor > 0) { forceOmen = true; p.favor--; p._favorArmed = false; logMsg(p.name + " porabi Naklonjenost (×1.3)."); }
    const heavy = (atk.cost || []).length >= 3;
    const omen = forceOmen ? true : (heavy ? omenRoll() : null);
    const cb = comboInfo(att, atkType);
    const r = computeDamage(att, p, defn, atk, { omen, forceOmenBonus: forceOmen, comboBonus: cb.bonus });
    att._comboType = atkType; att._comboCount = cb.count;
    if (heavy && !forceOmen && omen === false) { p.favor = Math.min(3, p.favor + 1); }
    // Umik (dodge): pasivna možnost izogiba napadu
    const dodgeChance = (def(defn).dodge || 0) + (hasBond(opp, "Celtic") ? 0.2 : 0); // Celtic Bond (Mistika)
    if (dodgeChance > 0 && Math.random() < dodgeChance) {
      logMsg(def(defn).name + " se izogne napadu (Umik)!");
      att._comboType = atkType; att._comboCount = cb.count;
      afterAction(p);
      return { ok: true, dmg: 0, dodged: true };
    }
    if (r.dmg > 0) { defn.damage += r.dmg; p.stats.damageDealt += r.dmg; }
    if (defn.status.shield && r.dmg > 0 && !(weaponOf(att) && weaponOf(att).grant === "pierce")) delete defn.status.shield;
    if ((def(att).lifesteal || equipGrants(att, "lifesteal") || hasArt(p, "art-vampirefang")) && r.dmg > 0) { defn0heal(att, r.dmg); artHeal(p); }
    p._atkChain = (p._atkChain || 0) + 1; // Momentum jedro
    // Trni (oklep): branilec vrne škodo napadalcu
    const dArm = armorOf(defn);
    if (dArm && dArm.thorns && r.dmg > 0) {
      att.damage += dArm.thorns;
      logMsg(def(att).name + " utrpi " + dArm.thorns + " od Trnov (" + dArm.name + ").");
    }
    if (def(att).overload) att._overloadLock = (att._overloadLock || 0) + def(att).overload;
    logMsg(p.name + ": " + def(att).name + " → " + def(defn).name + " za " + r.dmg + (r.parts.length ? " [" + r.parts.join(",") + "]" : "") + ".");
    applyAtkEffect(atk, att, p, defn, opp);
    checkDeaths();
    afterAction(p);
    return { ok: true, dmg: r.dmg };
  }
  function defn0heal(c, amt) { c.damage = Math.max(0, c.damage - amt); logMsg(def(c).name + " (Krvoses) +" + amt + " HP."); }

  function faceHit(p, att, atk, atkType, opp) {
    let forceOmen = false;
    if (p._favorArmed && p.favor > 0) { forceOmen = true; p.favor--; p._favorArmed = false; logMsg(p.name + " porabi Naklonjenost (×1.3)."); }
    const heavy = (atk.cost || []).length >= 3;
    const omen = forceOmen ? true : (heavy ? omenRoll() : null);
    const cb = comboInfo(att, atkType);
    // proti face ni weakness/resistance; uporabimo osnovno + blessing/curse + combo + omen/favor
    let dmg = atk.damage || 0;
    if (att.status.blessing) dmg += 15;
    if (att.status.curse) dmg -= 15;
    const wF = weaponOf(att); if (wF && wF.atkBonus) dmg += wF.atkBonus; // orožje šteje tudi proti obrazu
    dmg += artAtkFlat(p, atkType); // Artefakti (Bojni rog, Vrela kri, Momentum ...)
    dmg += scaleBonus(atk, att, p, atkType); // Skalirni motorji
    let mult = 1;
    mult *= artAtkMult(p, atkType); // Sončni oltar
    if (forceOmen) mult *= 1.3; else if (heavy && omen === true) mult *= 1.3; else if (heavy && omen == null) mult *= 1.15;
    dmg = Math.round((dmg * mult) / 5) * 5 + cb.bonus;
    if (dmg < 0) dmg = 0;
    att._comboType = atkType; att._comboCount = cb.count;
    if (heavy && !forceOmen && omen === false) p.favor = Math.min(3, p.favor + 1);
    opp.life -= dmg; p.stats.damageDealt += dmg;
    if ((def(att).lifesteal || hasArt(p, "art-vampirefang")) && dmg > 0) { defn0heal(att, dmg); artHeal(p); }
    p._atkChain = (p._atkChain || 0) + 1; // Momentum jedro
    if (def(att).overload) att._overloadLock = (att._overloadLock || 0) + def(att).overload;
    logMsg(p.name + ": " + def(att).name + " udari OBRAZ za " + dmg + " (življenja " + opp.name + ": " + opp.life + ").");
    applyAtkEffect(atk, att, p, null, opp); // lastni/podporni učinki veljajo tudi proti obrazu
    if (opp.life <= 0) { endGame(G.players.indexOf(p), opp.name + " je premagan (0 življenj)!"); }
    afterAction(p);
    return { ok: true, dmg, face: true };
  }

  function applyAtkEffect(atk, att, attOwner, defn, defOwner) {
    if (!atk.effect) return;
    const e = atk.effect;
    // ciljni učinki (le ob udarcu na bitje; proti obrazu defn === null)
    if (defn) {
      if (e === "burn") { defn.status.burn = true; return; }
      if (e === "freeze") { defn.status.freeze = true; return; }
      if (e === "poison") { defn.status.poison = defn.status.poison || 1; return; }
      if (e === "curse") { defn.status.curse = true; return; }
      if (e === "stunOmen") { if (omenRoll()) { defn.status.stun = (defn.status.stun || 0) + 1; logMsg(def(defn).name + " je OMAMLJEN (ugoden Omen)!"); } else { logMsg(def(att).name + ": Omen ni ugoden — brez omame."); } return; }
    }
    // lastni / podporni učinki (veljajo tudi proti obrazu)
    if (e === "selfShield") { att.status.shield = true; logMsg(def(att).name + " dvigne Shield."); }
    else if (e === "guardSelf") { att.status.guard = true; logMsg(def(att).name + " zavzame obrambno držo (−50% škode)."); }
    else if (e === "tauntSelf") { att.status.taunt = true; logMsg(def(att).name + " prevzame Taunt (do tvoje naslednje poteze)."); }
    else if (e === "healSelf20" || e === "heal20") { att.damage = Math.max(0, att.damage - 20); logMsg(def(att).name + " se pozdravi 20 HP."); artHeal(attOwner); }
    else if (e === "healBoard15") { attOwner.board.forEach(c => c.damage = Math.max(0, c.damage - 15)); logMsg(attOwner.name + ": vsi šampioni +15 HP."); artHeal(attOwner); }
    else if (e === "healReserve") { attOwner.board.forEach(c => c.damage = Math.max(0, c.damage - 20)); logMsg(attOwner.name + ": vsi šampioni +20 HP."); artHeal(attOwner); }
    else if (e === "drawSelf" || e === "draw1") { draw(attOwner, 1); logMsg(attOwner.name + ": +1 karta."); }
    else if (e === "draw2") { draw(attOwner, 2); logMsg(attOwner.name + ": +2 karti."); }
    else if (e === "reserveBuff") { attOwner.board.forEach(c => c.status.blessing = Math.max(c.status.blessing || 0, 2)); logMsg(attOwner.name + ": vsi šampioni dobijo Blagoslov (+15 škode)."); }
    else if (e === "blessActive") { att.status.blessing = Math.max(att.status.blessing || 0, 2); logMsg(def(att).name + " dobi Blagoslov."); }
    else if (e === "selfDamage20") { att.damage += 20; }
    else if (e === "selfDamage30") { att.damage += 30; }
    else if (e === "swapHint") { /* zgolj flavor (menjava mesta) — brez mehanskega učinka */ }
  }

  /* ---------------- keywords (onEnter / onDefeat) ---------------- */
  function applyKwEffect(eff, source, owner) {
    if (!eff || !owner) return;
    const opp = oppOf(owner);
    const enemy = opp.board[0]; // najprej prvi nasprotnikov (poenostavljeno; UI lahko izbere)
    const v = eff.value || 0;
    switch (eff.kind) {
      case "damageEnemy": if (enemy) { rawDamage(enemy, opp, v, "keyword"); checkDeaths(); } else { opp.life -= v; if (opp.life <= 0) endGame(G.players.indexOf(owner), opp.name + " premagan!"); } break;
      case "draw": draw(owner, v || 1); break;
      case "heal": if (source) source.damage = Math.max(0, source.damage - (v || 20)); break;
      case "freezeEnemy": if (enemy) enemy.status.freeze = true; break;
      case "burnEnemy": if (enemy) enemy.status.burn = true; break;
      case "stunEnemy": if (enemy) enemy.status.stun = (enemy.status.stun || 0) + 1; break;
      case "curseEnemy": if (enemy) enemy.status.curse = true; break;
      case "shieldSelf": if (source) source.status.shield = true; break;
      // bogatejši Klic ob vstopu (battlecry)
      case "healBoard": owner.board.forEach(x => x.damage = Math.max(0, x.damage - (v || 15))); artHeal(owner); break;
      case "buffBoard": owner.board.forEach(x => x.status.blessing = Math.max(x.status.blessing || 0, 2)); break;
      case "damageAll": opp.board.slice().forEach(x => rawDamage(x, opp, v || 15, "Klic")); checkDeaths(); break;
      case "shieldBoard": owner.board.forEach(x => x.status.shield = true); break;
      case "tauntSelf": if (source) source.status.taunt = true; break;
    }
  }
  function onEnter(p, inst) {
    const d = def(inst);
    if (d.onEnter) { logMsg(d.name + " — Klic ob vstopu!"); applyKwEffect(d.onEnter, inst, p); }
  }

  /* ---------------- damage / deaths ---------------- */
  function rawDamage(c, owner, amt, src) { c.damage += amt; logMsg(owner.name + ": " + def(c).name + " -" + amt + " (" + src + ")."); }

  function checkDeaths() {
    let any = false;
    for (const p of G.players) {
      for (const c of p.board.slice()) {
        if (c.damage >= c.maxHp) {
          // Osiris rebirth
          if (def(c).id === "egypt-osiris" && !c.osirisUsed) {
            c.osirisUsed = true; c.damage = c.maxHp - 60; c.status = {}; c.tapped = true;
            logMsg(p.name + ": Osiris se ponovno rodi (60 HP).");
            continue;
          }
          defeat(p, c); any = true;
        }
      }
    }
    return any;
  }
  function defeat(owner, champ) {
    logMsg(owner.name + ": " + def(champ).name + " je premagan.");
    owner.discard.push(champ);
    const i = owner.board.indexOf(champ); if (i >= 0) owner.board.splice(i, 1);
    const killer = oppOf(owner); killer.kills++; killer.stats.kills++;
    artKill(killer); // Artefakti: Tatova rokavica / Krvni davek
    if (def(champ).onDefeat) { logMsg(def(champ).name + " — Poslednji dih!"); applyKwEffect(def(champ).onDefeat, champ, owner); }
  }

  function afterAction(p) {
    // napad NE konča poteze (lahko napadeš z več šampioni); poteza se konča z endTurn ali ko ni več akcij
  }

  function endGame(winnerIdx, msg) { G.over = true; G.winner = winnerIdx; logMsg("KONEC: " + msg); }

  /* ---------------- AI ---------------- */
  function aiHp(c) { return c.maxHp - c.damage; }
  function aiBestAtk(c, owner, target, face) {
    let best = null;
    (def(c).attacks || []).forEach((atk, i) => {
      if (face && atk.noFace) return; // proti obrazu preskoči napade, ki smejo le na bitja
      if (!canPay(owner, atk.cost, def(c).id === "celtic-lugh")) return;
      const pr = target ? previewDamage(c, owner, target, atk) : null;
      const dmg = pr ? pr.dmg : (atk.damage || 0);
      const score = dmg + (atk.effect ? 0.5 : 0); // ob enaki škodi imej raje napad z učinkom
      if (!best || score > best.score) best = { atk, i, dmg, score };
    });
    return best;
  }
  // AI: aktiviraj mana dorke (rampAny/Nature/Sun), če imamo s to mano kaj odigrati
  function aiUseDorks(p) {
    const RAMP = { rampAny: 1, rampNature: 1, rampSun: 1 };
    const wantMana = p.hand.some(i => {
      const d = def(i);
      return (d.type === "Champion" && d.stage === "basic") || d.type === "Oracle";
    });
    if (!wantMana) return;
    for (const c of p.board.slice()) {
      const d = def(c);
      if (d.activated && RAMP[d.activated.effect] && canActivate(p, c)) activateAbility(p, c.uid);
    }
  }
  // AI: odigraj uroke (napadalne, AoE, obrazni burst, vlek, zdravljenje)
  function aiPlaySpells(p, opp) {
    const DMG1 = { dmgEnemy25: 25, dmgEnemy30: 30, fireball40burn: 40, boltStun50: 50 };
    const AOE  = { aoe15: 15, aoe20: 20, aoe15freeze: 15 };
    const FACE = { faceDmg25: 25 };
    const HEAL = { healActive60: 60, healActive40: 40, healReserve30: 30 };
    const DRAW = { draw3: 1, draw2attach: 1, draw2: 1 };
    let guard = 0;
    while (guard++ < 5 && !G.over) {
      const playable = p.hand.filter(i => def(i).type === "Oracle" && canPay(p, manaCostArr(manaCostOf(def(i)))));
      if (!playable.length) break;
      let best = null;
      const consider = (inst, target, score) => { if (!best || score > best.score) best = { inst, target, score }; };
      for (const inst of playable) {
        const e = def(inst).effect;
        if (DMG1[e] !== undefined) {
          const dmg = DMG1[e];
          const kills = opp.board.filter(t => aiHp(t) <= dmg);
          if (kills.length) {
            kills.sort((a, b) => (isTaunt(b) - isTaunt(a)) || (aiHp(b) - aiHp(a)));
            const t = kills[0];
            consider(inst, t.uid, 50 + (isTaunt(t) ? 30 : 0) + aiHp(t)); // ubij: prednost taunt, nato največji
          } else if (e === "boltStun50" && opp.board.length) {
            const t = opp.board.slice().sort((a, b) => aiHp(b) - aiHp(a))[0];
            consider(inst, t.uid, 22 + aiHp(t) * 0.2); // stun največje grožnje tudi brez ubitja
          }
        } else if (AOE[e] !== undefined) {
          const dmg = AOE[e];
          const kills = opp.board.filter(t => aiHp(t) <= dmg).length;
          if (opp.board.length >= 2 || kills >= 1) consider(inst, null, 25 + kills * 30 + opp.board.length * 5);
        } else if (FACE[e] !== undefined) {
          if (opp.life <= FACE[e]) consider(inst, null, 200);              // smrtonosno
          else if (!opp.board.length) consider(inst, null, 15);            // čip ko ni blokerjev
        } else if (HEAL[e] !== undefined) {
          const hurt = p.board.filter(c => c.damage >= 30);
          if (hurt.length) {
            if (e === "healReserve30") consider(inst, null, 10 + hurt.length * 8);
            else { hurt.sort((a, b) => b.damage - a.damage); consider(inst, hurt[0].uid, 12 + Math.min(HEAL[e], hurt[0].damage) * 0.3); }
          }
        } else if (DRAW[e] !== undefined) {
          if (p.hand.length <= 6 && p.deck.length > 5) consider(inst, null, 8); // vlek za card advantage, brez deckouta
        }
      }
      if (!best) break;
      const r = playCard(p, best.inst, { targetUid: best.target });
      if (!r.ok) break;
    }
  }
  function aiChooseBlock(defOwner, attacker, atk) {
    const incoming = (atk.damage || 0); // груба ocena
    const untapped = defOwner.board.filter(c => !c.tapped);
    if (!untapped.length) return null;
    // blokiraj če smo nizko na življenjih ali če bloker preživi
    if (defOwner.life - incoming > 12) {
      // sprejmemo v obraz, če smo varni — razen če bloker ubije napadalca brez smrti
      const goodTrade = untapped.find(b => aiHp(b) > incoming && false);
      if (!goodTrade) return null;
    }
    // izberi blokerja z najmanj HP, ki še preživi; sicer najbolj zdravega
    const survive = untapped.filter(b => aiHp(b) > incoming).sort((a, b) => aiHp(a) - aiHp(b));
    return survive[0] || untapped.sort((a, b) => aiHp(b) - aiHp(a))[0];
  }
  function aiTakeTurn(onStep, onDone) {
    const p = cur();
    if (!p.isAI || G.over) { onDone && onDone(); return; }
    const diff = G.difficulty || "normal";
    const opp = oppOf(p);
    const steps = [];
    // 1) igraj energijo
    steps.push(() => { const e = p.hand.find(i => def(i).type === "Energy"); if (e) playEnergy(p, e); });
    // 1b) aktiviraj mana dorke, če imamo s to mano kaj odigrati (pred priklicem)
    steps.push(() => aiUseDorks(p));
    // 2) prikliči šampione dokler je prostor in mana
    steps.push(() => {
      let guard = 0;
      while (p.board.length < BOARD_MAX && guard++ < 3) {
        const c = p.hand.find(i => def(i).type === "Champion" && def(i).stage === "basic" && canPay(p, Array.from({ length: summonCostOf(def(i)) }, () => "Any")));
        if (!c) break; const r = summon(p, c); if (!r.ok) break;
      }
    });
    // 2b) Hero Power — uporabi, ko je smiselno (po priklicu, pred napadom)
    steps.push(() => {
      const hpw = p.heroPower;
      if (!hpw || p.heroPowerUsed) return;
      let want = false;
      switch (hpw.kind) {
        case "chain":      want = opp.board.length >= 2; break;                 // AoE se splača pri 2+ tarčah
        case "heroAttack": want = opp.board.every(c => c.tapped); break;        // pritisni obraz le ko ni netapnjenih blokerjev
        case "heroHeal":   want = p.life <= p.maxLife - hpw.value + 1 && p.life < p.maxLife * 0.7; break; // ko si pod pritiskom, brez overheala
        case "shieldAll":  want = p.board.length >= 2; break;                   // zaščiti pred povratnim napadom
      }
      if (want) useHeroPower(p); // sam preveri mano; če je ni, je no-op
    });
    // 2c) odigraj uroke (removal/AoE/burst/vlek/heal) — pred napadom, da počistiš blokerje
    steps.push(() => aiPlaySpells(p, opp));
    // 3) napadi z vsemi pripravljenimi (spoštuj Taunt in noFace napade)
    steps.push(() => {
      for (const c of p.board.slice()) {
        if (G.over) break;
        if (!canAttack(p, c)) continue;
        const targets = opp.board.slice();
        const faceAtk = aiBestAtk(c, p, null, true); // najboljši napad, ki sme v obraz (preskoči noFace)
        if (!targets.length) { if (faceAtk) attack(p, c.uid, faceAtk.i, { kind: "face" }); continue; }
        // proti bitjem: izberi tarčo + napad (vključno z noFace) z najboljšo škodo
        let bt = null, btAtk = null, btDmg = -1;
        targets.forEach(t => { const a = aiBestAtk(c, p, t, false); if (a && a.dmg > btDmg) { btDmg = a.dmg; bt = t; btAtk = a; } });
        if (btAtk && bt && btDmg >= aiHp(bt)) attack(p, c.uid, btAtk.i, { kind: "champ", uid: bt.uid });       // lethal na bitje
        else if (faceAtk && diff !== "easy" && opp.life <= faceAtk.dmg + 5) attack(p, c.uid, faceAtk.i, { kind: "face" }); // skoraj-lethal pritisk
        else if (btAtk) attack(p, c.uid, btAtk.i, { kind: "champ", uid: bt.uid });
        else if (faceAtk) attack(p, c.uid, faceAtk.i, { kind: "face" });
      }
    });
    let k = 0;
    (function run() {
      if (G.over) { onDone && onDone(); return; }
      if (k >= steps.length) { if (!G.over) endTurn(); onDone && onDone(); return; }
      steps[k++](); onStep && onStep();
      if (G.over) { onDone && onDone(); return; }
      setTimeout(run, 600);
    })();
  }

  // Vsak champion dobi univerzalni "Basic Strike" (1 katerakoli energija, manjša škoda).
  // Specialni napadi ostanejo s svojo specifično energijo. (Enkratna augmentacija CARDS.)
  function ensureBasicAttacks() {
    if (!CARDS) return;
    for (const id in CARDS) {
      const d = CARDS[id];
      if (d.type !== "Champion" || d._basic) continue;
      d._basic = true;
      const dmg = d.minion ? 10 : 15;
      d.attacks = [{ name: "Basic Strike", cost: ["Any"], damage: dmg, effect: null, basic: true, text: "Osnovni napad — stane 1 katerokoli energijo." }, ...(d.attacks || [])];
    }
  }
  ensureBasicAttacks();

  /* ---------------- exports ---------------- */
  const api = {
    G, startGame, beginTurn, endTurn, draw, playEnergy, canPay, payMana, canPaySelection,
    summon, attack, resolveBlock, previewDamage, previewFace, canAttack, summonCostOf, manaCostOf,
    playCard, cardNeedsTarget, activateAbility, canActivate, mulliganHand, useHeroPower,
    keepHand, aiTakeTurn, cur, oppOf, def, makeInstance, omenRoll, ensureBasicAttacks,
    isTaunt, tauntsOf, synergyOf, synergyLabels, HERO_POWERS, BOARD_MAX, START_LIFE,
    ARTIFACTS, artBattleStart, hasArt,
  };
  if (typeof module !== "undefined") module.exports = api;
  if (global) { global.V2 = api; }
})(typeof window !== "undefined" ? window : globalThis);
