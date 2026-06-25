/* ============================================================================
   MYTHIC CLASH: WARS OF PANTHEONS — script.js
   UI render + interakcija. Engine je v engine.js (globalne funkcije).
============================================================================ */

let selectedHandUid = null;   // izbrana karta v roki
let dragHandUid = null;       // uid karte, ki jo trenutno vlečemo
let dragChampUid = null;      // uid bojevnika, ki ga trenutno vlečemo
let relicTargetMode = false;  // čakamo izbiro tarče za relic

/* ---------------------- DOM helperji ----------------------------- */
const $ = sel => document.querySelector(sel);
const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
};

/* ---------------------- START SCREEN ----------------------------- */
let chosenDeck = null;

function buildStartScreen() {
  const grid = $("#deck-grid");
  grid.innerHTML = "";
  for (const d of Object.values(STARTER_DECKS)) {
    const st = PANTHEON_STYLE[d.pantheon];
    const card = el("button", "deck-card");
    card.style.setProperty("--deck-grad", `linear-gradient(160deg, ${st.grad[0]}, ${st.grad[1]})`);
    card.innerHTML = `
      <span class="deck-pantheon">${d.pantheon}</span>
      <div class="deck-symbol">${st.symbol}</div>
      <h3>${d.name}</h3>
      <div class="deck-style">${d.style}</div>
      <div class="deck-blurb">${d.blurb}</div>`;
    card.addEventListener("click", () => {
      chosenDeck = d.id;
      document.querySelectorAll(".deck-card").forEach(c => c.classList.remove("selected"));
      card.classList.add("selected");
      $("#start-battle").disabled = false;
    });
    grid.appendChild(card);
  }
}

function startBattle() {
  if (!chosenDeck) return;
  // AI dobi naključen drug deck
  const others = Object.keys(STARTER_DECKS).filter(k => k !== chosenDeck);
  const aiDeck = others[Math.floor(Math.random() * others.length)];
  window.startGame(chosenDeck, aiDeck);
  $("#start-screen").classList.add("hidden");
  $("#game-screen").classList.remove("hidden");
  $("#victory-screen").classList.add("hidden");
  $("#concede").classList.remove("hidden");
  render();
}

/* ---------------------- ENERGY / cost render --------------------- */
// En energijski "dot": če obstaja slika art/energy-<tip>.png, jo pokaže;
// sicer (ali ob napaki) ostane barvni krog z emoji glyphom.
function edotHtml(type, extraCls) {
  const s = ENERGY_STYLE[type] || ENERGY_STYLE.Any;
  const cls = "edot" + (extraCls ? " " + extraCls : "");
  // "Any" nima slike – samo glyph
  if (type === "Any") {
    return `<span class="${cls}" style="background:${s.color}" title="${type}">${s.glyph}</span>`;
  }
  const file = "art/energy-" + String(type).toLowerCase() + ".png";
  return `<span class="${cls}" style="background:${s.color}" title="${type}">
    <img class="edot-img" src="${file}" alt="" onerror="this.style.display='none';this.parentNode.classList.add('noimg')">
    <span class="edot-glyph">${s.glyph}</span>
  </span>`;
}

function costToHtml(cost) {
  return cost.map(c => edotHtml(c)).join("");
}

function energyDotsHtml(energyArr) {
  return energyArr.map(t => edotHtml(t)).join("");
}

function statusIcon(name) {
  return `<img class="status-img" src="art/status-${name}.png" alt="" onerror="this.style.display='none'">`;
}
function statusHtml(status) {
  const out = [];
  if (status.burn) out.push(`<span class="status-chip st-burn">${statusIcon("burn")}BURN</span>`);
  if (status.freeze) out.push(`<span class="status-chip st-freeze">${statusIcon("freeze")}FREEZE</span>`);
  if (status.stun) out.push(`<span class="status-chip st-stun">${statusIcon("stun")}STUN</span>`);
  if (status.curse) out.push(`<span class="status-chip st-curse">${statusIcon("curse")}CURSE</span>`);
  if (status.blessing) out.push(`<span class="status-chip st-blessing">${statusIcon("blessing")}BLESS ${status.blessing}</span>`);
  if (status.shield) out.push(`<span class="status-chip st-shield">${statusIcon("shield")}SHIELD</span>`);
  if (status.poison) out.push(`<span class="status-chip st-poison">${statusIcon("poison")}POISON ${status.poison}</span>`);
  return out.join("");
}

/* ---------------------- CHAMPION render -------------------------- */
// Izračuna, katero energijo še manjka za napad (vrne seznam manjkajočih tipov).
function missingEnergyFor(champ, cost) {
  const pool = champ.energy.slice();
  const dID = def(champ).id;
  const lugh = dID === "celtic-lugh";
  const specific = cost.filter(c => c !== "Any");
  const anyCount = cost.filter(c => c === "Any").length;
  const missing = [];
  for (const need of specific) {
    let i = pool.indexOf(need);
    if (i < 0 && lugh && need === "Sun" && pool.length > 0) i = 0;
    if (i < 0) { missing.push(need); continue; }
    pool.splice(i, 1);
  }
  // koliko "Any" še manjka
  let anyShort = Math.max(0, anyCount - pool.length);
  for (let k = 0; k < anyShort; k++) missing.push("Any");
  return missing;
}

// Vrne HTML vrstico stanja napada na aktivnem bojevniku.
function attackStatusRow(champ, atk) {
  const ready = canPayCost(champ, atk.cost) && !champ.status.stun && !champ.justPlayed;
  const missing = missingEnergyFor(champ, atk.cost);
  const costHtml = atk.cost.map(c => edotHtml(c, "mini")).join("");
  let tip;
  if (champ.status.stun) tip = `<span class="atk-tip stun">omamljen</span>`;
  else if (champ.justPlayed) tip = `<span class="atk-tip wait">pravkar postavljen</span>`;
  else if (ready) tip = `<span class="atk-tip ok">✓ pripravljen</span>`;
  else {
    const need = missing.map(m => edotHtml(m, "mini need")).join("");
    tip = `<span class="atk-tip miss">rabi ${need}</span>`;
  }
  return `<div class="champ-atk ${ready ? "rdy" : ""}">
    <span class="ca-cost">${costHtml}</span>
    <span class="ca-name">${atk.name}</span>
    <span class="ca-dmg">${atk.damage || 0}</span>
    ${tip}
  </div>`;
}

function renderChampion(inst, opts = {}) {
  const d = def(inst);
  const st = PANTHEON_STYLE[d.pantheon];
  const hp = inst.maxHp - inst.damage;
  const pct = Math.max(0, Math.round((hp / inst.maxHp) * 100));
  const node = el("div", "champ" + (opts.active ? " active-champ" : ""));
  node.style.setProperty("--c-grad", `linear-gradient(160deg, ${st.grad[0]}, ${st.grad[1]})`);
  if (opts.isTurnActive) node.classList.add("is-active-turn");
  if (opts.targetable) node.classList.add("targetable");

  // POINTER: če je izbrana energija v roki in je to igralčev bojevnik,
  // osvetli ga; zeleno če bi ta energija odklenila kakšen napad.
  const me0 = G.players[0];
  const isMineChampForHint = me0 && (
    (me0.active && me0.active.uid === inst.uid) || me0.reserve.some(c => c.uid === inst.uid)
  );
  if (isMineChampForHint && G.turn === 0 && !G.over) {
    const selH = selectedHandInst();
    if (selH && def(selH).type === "Energy" && !me0.energyAttachedThisTurn) {
      const etype = def(selH).energyType;
      // simuliraj: bi ta energija odklenila napad, ki zdaj ni plačljiv?
      const sim = { ...inst, energy: inst.energy.concat([etype]) };
      const unlocks = (def(inst).attacks || []).some(atk =>
        !canPayCost(inst, atk.cost) && canPayCost(sim, atk.cost));
      node.classList.add(unlocks ? "unlocks-attack" : "energy-hint");
    }
  }

  // Stanje napadov – samo za IGRALČEVEGA aktivnega (pomoč: kaj rabiš)
  let atkStatusHtml = "";
  const isMyActive = opts.active && G.players[0] && G.players[0].active && G.players[0].active.uid === inst.uid;
  if (isMyActive && (d.attacks || []).length) {
    atkStatusHtml = `<div class="champ-atk-list">${d.attacks.map(atk => attackStatusRow(inst, atk)).join("")}</div>`;
  }

  node.innerHTML = `
    <div class="champ-art">
      ${artImg(d, "champ-art-img")}
      <span class="pantheon-badge">${st.symbol}</span>
      <span class="hp-badge">${hp}/${inst.maxHp}</span>
      ${d.symbol || ""}<span style="font-size:0.9em">${pantheonGlyph(d)}</span>
    </div>
    <div class="champ-body">
      <div class="champ-name">${d.name}</div>
      <div class="champ-tags">${d.pantheon} · ${d.rarity}${d.stage === "ascended" ? " · ASCENDED" : ""}</div>
      <div class="hp-bar"><div class="hp-fill ${pct <= 35 ? "low" : ""}" style="width:${pct}%"></div></div>
      <div class="energy-dots">${energyDotsHtml(inst.energy)}</div>
      ${inst.relic ? `<span class="relic-chip">⚜ ${CARDS[inst.relic].name}</span>` : ""}
      <div class="status-row">${statusHtml(inst.status)}</div>
      ${atkStatusHtml}
    </div>`;

  node.addEventListener("click", (e) => {
    e.stopPropagation();
    handleChampClick(inst, opts);
  });

  // --- DRAG bojevnika (samo igralčevi, ali nasprotnikov aktivni kot tarča) ---
  const me = G.players[0];
  const amMineActive = me && me.active && me.active.uid === inst.uid;
  const amMineReserve = me && me.reserve.some(c => c.uid === inst.uid);
  const isMineChamp = amMineActive || amMineReserve;

  if (isMineChamp && !G.over) {
    node.setAttribute("draggable", "true");
    node.addEventListener("dragstart", (e) => {
      dragChampUid = inst.uid;
      node.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      try { e.dataTransfer.setData("text/plain", "champ:" + inst.uid); } catch (_) {}
      document.body.classList.add("dragging-champ");
      if (amMineActive) document.body.classList.add("dragging-active");
      if (amMineReserve) document.body.classList.add("dragging-reserve");
    });
    node.addEventListener("dragend", () => {
      dragChampUid = null;
      node.classList.remove("dragging");
      document.body.classList.remove("dragging-champ", "dragging-active", "dragging-reserve");
    });
  }

  // drop tarča na bojevniku: energija/relic iz roke ALI bojevnik-na-bojevnika
  const me2 = G.players[0];
  const opp2 = G.players[1];
  const isMine = me2 && allChampions(me2).some(c => c.uid === inst.uid);
  const isEnemyActive = opp2 && opp2.active && opp2.active.uid === inst.uid;

  node.addEventListener("dragover", (e) => {
    // 1) karta iz roke (energija/relic-attach) na svojega bojevnika
    if (dragHandUid && isMine) {
      const sel = me2.hand.find(i => i.uid === dragHandUid);
      if (sel) {
        const sd = def(sel);
        if (sd.type === "Energy" || (sd.type === "Relic" && sd.relicMode === "attach")) {
          e.preventDefault(); node.classList.add("drop-hover"); return;
        }
      }
    }
    // 2) bojevnik na bojevnika
    if (dragChampUid) {
      const drole = champRole(dragChampUid);
      // rezerva -> moj aktivni (swap/retreat/choose) : dovolimo drop na MOJ aktivni
      if (drole === "reserve" && isMine && me2.active && me2.active.uid === inst.uid) {
        e.preventDefault(); node.classList.add("drop-hover"); return;
      }
      // moj aktivni -> nasprotnikov aktivni (napad)
      if (drole === "active" && isEnemyActive && G.turn === 0 && !G.over) {
        e.preventDefault(); node.classList.add("drop-target-enemy"); return;
      }
    }
  });
  node.addEventListener("dragleave", () => node.classList.remove("drop-hover", "drop-target-enemy"));
  node.addEventListener("drop", (e) => {
    node.classList.remove("drop-hover", "drop-target-enemy");
    const p = G.players[0];

    // karta iz roke
    if (dragHandUid && isMine) {
      const sel = me2.hand.find(i => i.uid === dragHandUid);
      if (sel) {
        const sd = def(sel);
        if (sd.type === "Energy") { e.preventDefault(); const r = attachEnergy(p, sel, inst); flash(r); selectedHandUid = null; render(); return; }
        if (sd.type === "Relic" && sd.relicMode === "attach") { e.preventDefault(); const r = playRelic(p, sel, inst); flash(r); selectedHandUid = null; relicTargetMode = false; render(); return; }
      }
    }
    // bojevnik na bojevnika
    if (dragChampUid) {
      const drole = champRole(dragChampUid);
      const dragInst = allChampions(p).find(c => c.uid === dragChampUid);
      if (drole === "reserve" && isMine && me2.active && me2.active.uid === inst.uid && dragInst) {
        e.preventDefault(); doSwapOrRetreat(dragInst); return;
      }
      if (drole === "active" && isEnemyActive && G.turn === 0 && !G.over) {
        e.preventDefault(); doAttackGesture(); return;
      }
    }
  });
  if (opts.shake) node.classList.add("shake", "hit-flash");
  return node;
}

// pomožen vizual: izberi emoji za lik glede na ključne besede
function pantheonGlyph(d) {
  return ""; // pantheon badge je dovolj; lik prikazuje pantheon simbol
}

/* Slika karte iz art/<id>.png. Če slike ni, se <img> skrije in ostane
   placeholder (gradient + simbol), ki je za njo. */
function artImg(d, cls) {
  if (!d || !d.id) return "";
  return `<img class="${cls}" src="art/${d.id}.png" alt="" loading="lazy"
    onerror="this.style.display='none'">`;
}

/* ---------------------- HAND card render ------------------------- */
/* ---------------------- Effect labels (kratki opisi) ------------- */
const EFFECT_LABEL = {
  burn: "🔥 Burn", burnEnemy: "🔥 Burn", curse: "💀 Curse", curseEnemy: "💀 Curse",
  freeze: "❄️ Freeze", freezeEnemy: "❄️ Freeze", poison: "☠️ Poison",
  stunOmen: "💫 Stun (Omen)", blessActive: "✨ Blessing", selfShield: "🛡️ Shield",
  shieldAll: "🛡️ Shield vsem", dmgPlus20: "+20 škode", dmgReduce20: "−20 škode",
  dmgEnemy30: "30 dodatne škode", draw1: "🃏 Potegni 1", draw2: "🃏 Potegni 2",
  draw3: "🃏 Potegni 3", draw2attach: "🃏 Potegni 2 + pripni energijo",
  heal20: "❤️ Heal 20", healActive40: "❤️ Heal 40", healActive60: "❤️ Heal 60",
  healEndTurn10: "❤️ Heal 10/turn", healReserve: "❤️ Heal rezervo", healReserve30: "❤️ Heal rezervo 30",
  natureHeal10: "❤️ Heal 10", selfDamage20: "⚠️ −20 sebi", selfDamage30: "⚠️ −30 sebi",
  reserveBuff: "⬆️ Buff rezerve", reserveReduce10: "⬇️ Rezerva −10", swapHint: "🔄 Zamenjaj aktivnega",
  greekSkyPlus10: "+10 Sky (Greek)", norseWarPlus10: "+10 War (Norse)",
  underworldPlus10: "+10 Underworld", nonNorseRetreatPlus1: "Retreat +1 (ne-Norse)",
};
function effectShort(key) { return key ? (EFFECT_LABEL[key] || "✦ poseben učinek") : ""; }

/* en napad kot vrstica: ime, cost ikone, damage, učinek */
function attackRowHtml(atk) {
  const eff = atk.effect ? `<span class="atk-eff">${effectShort(atk.effect)}</span>` : "";
  return `<div class="atk-row">
    <span class="atk-cost">${costToHtml(atk.cost)}</span>
    <span class="atk-name">${atk.name}</span>
    <span class="atk-dmg">${atk.damage || 0}</span>
    ${eff}
  </div>`;
}

/* ---------------------- Igraj izbrano karto --------------------- */
// Vrne true če je karta odigrana; false če potrebuje tarčo (energija/relic-attach).
function playSelectedCard() {
  const p = G.players[0];
  if (G.turn !== 0 || G.over || G.awaitingNewActive !== null) return false;
  const sel = selectedHandInst();
  if (!sel) return false;
  const sd = def(sel);

  if (sd.type === "Champion" && sd.stage === "basic") {
    if (p.reserve.length >= MAX_RESERVE) { toast("Rezerva je polna (5)."); return false; }
    const r = playReserveChampion(p, sel); flash(r); selectedHandUid = null; render(); return true;
  }
  if (sd.type === "Champion" && sd.stage === "ascended") {
    const target = allChampions(p).find(c => c.cardId === sd.ascendsFrom && !c.justPlayed);
    if (!target) { toast("Ni veljavnega bojevnika za ascension."); return false; }
    const r = ascend(p, target); flash(r); selectedHandUid = null; render(); return true;
  }
  if (sd.type === "Oracle") {
    const r = playOracle(p, sel); flash(r); selectedHandUid = null; render(); return true;
  }
  if (sd.type === "Realm") {
    const r = playRealm(p, sel); flash(r); selectedHandUid = null; render(); return true;
  }
  if (sd.type === "Relic" && sd.relicMode === "instant") {
    const r = playRelic(p, sel, p.active); flash(r); selectedHandUid = null; render(); return true;
  }
  // Energija ali relic-attach: potrebuje tarčo
  if (sd.type === "Energy") {
    if (!p.active) { toast("Ni aktivnega bojevnika."); return false; }
    relicTargetMode = false;
    toast("Klikni svojega bojevnika, da pripneš energijo.");
    return false;
  }
  if (sd.type === "Relic" && sd.relicMode === "attach") {
    relicTargetMode = true;
    toast(`Klikni bojevnika, da pripneš ${sd.name}.`);
    return false;
  }
  return false;
}

function renderHandCard(inst) {
  const d = def(inst);
  const pan = d.pantheon ? PANTHEON_STYLE[d.pantheon] : null;
  const grad = pan ? `linear-gradient(160deg, ${pan.grad[0]}, ${pan.grad[1]})` :
    energyGrad(d);
  const rar = RARITY_STYLE[d.rarity] || RARITY_STYLE.Common;
  const node = el("div", "card");
  node.style.setProperty("--c-grad", grad);
  if (selectedHandUid === inst.uid) node.classList.add("selected-hand");
  if (isHandCardPlayable(inst)) node.classList.add("playable");

  let artGlyph = pan ? pan.symbol : (ENERGY_STYLE[d.energyType] ? ENERGY_STYLE[d.energyType].glyph : "✦");
  if (d.type === "Relic") artGlyph = "⚜";
  if (d.type === "Oracle") artGlyph = "📜";
  if (d.type === "Realm") artGlyph = "🏛";

  // tip-specifičen info blok
  let infoHtml = "";
  if (d.type === "Champion") {
    const hpLine = `<div class="card-hp">❤️ ${d.hp} HP</div>`;
    const atks = (d.attacks || []).map(attackRowHtml).join("");
    const wr = [];
    if (d.weakness) wr.push(`<span class="wk">W: ${d.weakness}</span>`);
    if (d.resistance) wr.push(`<span class="rs">R: ${d.resistance}</span>`);
    const wrLine = wr.length ? `<div class="card-wr">${wr.join("")}</div>` : "";
    infoHtml = `${hpLine}<div class="atk-list">${atks}</div>${wrLine}`;
  } else if (d.type === "Energy") {
    infoHtml = `<div class="energy-line">${edotHtml(d.energyType)} ${d.energyType} energija</div>`;
  } else {
    // Relic / Oracle / Realm -> učinek
    const effKey = d.effect || d.realmEffect;
    const lab = effKey ? effectShort(effKey) : "";
    const txt = d.text || "";
    infoHtml = `<div class="card-effect">${lab ? `<b>${lab}</b><br>` : ""}<span class="ce-text">${txt}</span></div>`;
  }

  const isSelected = selectedHandUid === inst.uid;
  const playable = isHandCardPlayable(inst);
  const playBtnHtml = (isSelected && playable)
    ? `<button class="card-play-btn">▶ Igraj</button>` : "";

  node.innerHTML = `
    <div class="rarity-bar" style="background:${rar.color}"></div>
    <div class="card-art${d.type === "Energy" ? " card-art-energy" : ""}">${artImg(d, "card-art-img")}<span class="card-art-glyph">${artGlyph}</span></div>
    <div class="card-body">
      <div class="card-name">${d.name}</div>
      <div class="card-meta">${d.type}${d.pantheon ? " · " + d.pantheon : ""}</div>
      ${infoHtml}
    </div>
    ${playBtnHtml}`;

  const pb = node.querySelector(".card-play-btn");
  if (pb) {
    pb.addEventListener("click", (e) => {
      e.stopPropagation();
      playSelectedCard();
    });
  }

  node.setAttribute("draggable", "true");
  node.addEventListener("dragstart", (e) => {
    dragHandUid = inst.uid;
    selectedHandUid = inst.uid;
    node.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
    try { e.dataTransfer.setData("text/plain", inst.uid); } catch (_) {}
    document.body.classList.add("dragging-card");
  });
  node.addEventListener("dragend", () => {
    dragHandUid = null;
    node.classList.remove("dragging");
    document.body.classList.remove("dragging-card");
  });

  node.addEventListener("click", (e) => {
    e.stopPropagation();
    selectedHandUid = (selectedHandUid === inst.uid) ? null : inst.uid;
    relicTargetMode = false;
    render();
  });
  // dvoklik = detajl
  node.addEventListener("dblclick", (e) => { e.stopPropagation(); openCardModal(d); });
  return node;
}

function energyGrad(d) {
  const s = ENERGY_STYLE[d.energyType];
  if (!s) return "linear-gradient(160deg,#333,#555)";
  return `linear-gradient(160deg, ${s.color}aa, ${s.color}33)`;
}

/* ---------------------- Playability hinting ---------------------- */
function isHandCardPlayable(inst) {
  if (G.over || G.turn !== 0 || G.awaitingNewActive !== null) return false;
  const p = G.players[0];
  const d = def(inst);
  if (d.type === "Energy") return !p.energyAttachedThisTurn && !!p.active;
  if (d.type === "Champion" && d.stage === "basic") return p.reserve.length < MAX_RESERVE;
  if (d.type === "Champion" && d.stage === "ascended") {
    // playable če ustreza aktivnemu/rezervnemu, ki ni justPlayed
    return allChampions(p).some(c => c.cardId === d.ascendsFrom && !c.justPlayed);
  }
  if (d.type === "Relic" || d.type === "Oracle" || d.type === "Realm") return true;
  return false;
}

/* ---------------------- Interakcije ------------------------------ */
function selectedHandInst() {
  if (!selectedHandUid) return null;
  return G.players[0].hand.find(i => i.uid === selectedHandUid) || null;
}

function handleChampClick(inst, opts) {
  const p = G.players[0];

  // 1) izbira novega aktivnega (po porazu)
  if (G.awaitingNewActive === 0 && p.reserve.includes(inst)) {
    const r = chooseNewActive(0, inst);
    if (r.ok) {
      // po izbiri novega aktivnega, če je bil to konec napada nasprotnika, nadaljuje človek normalno
      render();
    }
    return;
  }

  // 2) prosta zamenjava (Janus/Morrigan)
  if (p._mayFreeSwap && p.reserve.includes(inst)) {
    freeSwap(p, inst);
    render();
    return;
  }

  // 3) če je izbrana energija/relic v roki -> pripni na tega champa
  const sel = selectedHandInst();
  if (sel && G.turn === 0) {
    const sd = def(sel);
    if (sd.type === "Energy" && (p.active === inst || p.reserve.includes(inst))) {
      const r = attachEnergy(p, sel, inst);
      flash(r);
      selectedHandUid = null;
      render(); return;
    }
    if (sd.type === "Relic" && sd.relicMode === "attach" && (p.active === inst || p.reserve.includes(inst))) {
      const r = playRelic(p, sel, inst);
      flash(r);
      selectedHandUid = null;
      render(); return;
    }
  }

  // 4) retreat: klik na rezervnega ko je aktivni izbran za retreat — naredimo prek action buttona
  // sicer: odpri detajl
  openCardModal(def(inst));
}

function flash(r) {
  if (r && r.ok === false && r.msg) toast(r.msg);
}

/* ---- DRAG GESTURE HELPERS (skladno s pravili) ------------------- */
// vrne vlogo bojevnika: "active" | "reserve" | null (za človeka)
function champRole(uid) {
  const p = G.players[0];
  if (p.active && p.active.uid === uid) return "active";
  if (p.reserve.some(c => c.uid === uid)) return "reserve";
  return null;
}

// spusti rezervnega na aktivno mesto -> izbira novega aktivnega / prosti swap / retreat
function doSwapOrRetreat(reserveInst) {
  const p = G.players[0];
  // 1) po porazu: izbira novega aktivnega (brez stroška)
  if (G.awaitingNewActive === 0) {
    const r = chooseNewActive(0, reserveInst); flash(r); render(); return;
  }
  // 2) ni igralčeva poteza -> ne dovolimo
  if (G.turn !== 0 || G.over) { toast("Nisi na potezi."); return; }
  // 3) prosti swap (Janus/Morrigan)
  if (p._mayFreeSwap) { const r = freeSwap(p, reserveInst); flash(r); render(); return; }
  // 4) navadni retreat (stane energijo; engine preveri pravila)
  const r = retreat(p, reserveInst);
  flash(r);
  if (r && r.ok) { render(); }
  else { render(); }
}

// spusti svojega aktivnega na nasprotnikovega -> napad (izbere najmočnejši plačljiv napad)
function doAttackGesture() {
  const p = G.players[0];
  const a = p.active;
  if (G.turn !== 0 || G.over || !a) return;
  if (a.status.stun) { toast("Tvoj bojevnik je omamljen to potezo."); return; }
  if (a.justPlayed) { toast("Pravkar postavljen bojevnik ne more napasti to potezo."); return; }
  const dd = def(a);
  // izberi najmočnejši napad, ki ga lahko plačaš
  let best = -1, bestDmg = -1;
  dd.attacks.forEach((atk, i) => {
    if (canPayCost(a, atk.cost) && (atk.damage || 0) > bestDmg) { best = i; bestDmg = atk.damage || 0; }
  });
  if (best < 0) { toast("Premalo energije za napad."); return; }
  // če sta dva napada možna, opozori da je izbran najmočnejši
  const affordable = dd.attacks.filter(atk => canPayCost(a, atk.cost)).length;
  if (affordable > 1) toast(`Napad: ${dd.attacks[best].name} (najmočnejši). Za drugega uporabi gumbe.`);
  const r = performAttack(best);
  flash(r);
  selectedHandUid = null;
  render();
  afterHumanAction();
}

let toastTimer = null;
function toast(msg) {
  let t = $("#toast");
  if (!t) { t = el("div"); t.id = "toast"; document.body.appendChild(t);
    Object.assign(t.style, { position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)",
      background: "rgba(20,20,34,0.96)", color: "#ece8df", padding: "12px 20px", borderRadius: "10px",
      border: "1px solid rgba(255,215,130,0.25)", zIndex: 200, fontSize: "14px", maxWidth: "80vw", boxShadow: "0 8px 30px rgba(0,0,0,0.5)" }); }
  t.textContent = msg;
  t.style.opacity = "1";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.style.opacity = "0"; t.style.transition = "opacity 0.4s"; }, 1900);
}

/* ---------------------- ACTION PANEL ----------------------------- */
function renderActions() {
  const panel = $("#action-list");
  panel.innerHTML = "";
  const p = G.players[0];
  const myTurn = G.turn === 0 && !G.over;

  if (G.awaitingNewActive === 0) {
    panel.appendChild(el("div", "hint", "Klikni bojevnika v svoji rezervi, da postane nov aktivni."));
    return;
  }
  if (!myTurn) {
    panel.appendChild(el("div", "hint", "Nasprotnik je na potezi…"));
    return;
  }

  const sel = selectedHandInst();
  const a = p.active;

  // kontekstni namig glede na izbrano karto
  if (sel) {
    const sd = def(sel);
    if (sd.type === "Energy") panel.appendChild(el("div", "hint", `Izbrana energija: <b>${sd.energyType}</b>. Klikni svojega bojevnika, da jo pripneš.`));
    else if (sd.type === "Relic" && sd.relicMode === "attach") panel.appendChild(el("div", "hint", `Klikni bojevnika, da pripneš <b>${sd.name}</b>.`));
  }

  // Play selected (champion to reserve / relic instant / oracle / realm)
  if (sel) {
    const sd = def(sel);
    if (sd.type === "Champion" && sd.stage === "basic") {
      addBtn(panel, `Postavi v rezervo: ${sd.name}`, "", () => {
        const r = playReserveChampion(p, sel); flash(r); selectedHandUid = null; render();
      }, p.reserve.length >= MAX_RESERVE);
    }
    if (sd.type === "Champion" && sd.stage === "ascended") {
      const base = allChampions(p).find(c => c.cardId === sd.ascendsFrom && !c.justPlayed);
      addBtn(panel, `Ascend → ${sd.name}`, "", () => {
        const target = allChampions(p).find(c => c.cardId === sd.ascendsFrom && !c.justPlayed);
        if (!target) { toast("Ni veljavnega bojevnika za ascension."); return; }
        const r = ascend(p, target); flash(r); selectedHandUid = null; render();
      }, !base);
    }
    if (sd.type === "Oracle") {
      addBtn(panel, `Odigraj Oracle: ${sd.name}`, "", () => {
        const r = playOracle(p, sel); flash(r); selectedHandUid = null; render();
      });
    }
    if (sd.type === "Relic" && sd.relicMode === "instant") {
      addBtn(panel, `Uporabi relikvijo: ${sd.name}`, "", () => {
        const r = playRelic(p, sel, p.active); flash(r); selectedHandUid = null; render();
      });
    }
    if (sd.type === "Realm") {
      addBtn(panel, `Odigraj Realm: ${sd.name}`, "", () => {
        const r = playRealm(p, sel); flash(r); selectedHandUid = null; render();
      });
    }
  }

  // Ascend (če ima ustrezno karto in ni izbral nič)
  if (a && !sel) {
    const asc = findAscensionInHand(p, a);
    if (asc && !a.justPlayed) {
      addBtn(panel, `Ascend ${def(a).name} → ${def(asc).name}`, "", () => {
        const r = ascend(p, a); flash(r); render();
      });
    }
  }

  // Retreat
  if (a && p.reserve.length > 0) {
    const rc = retreatCostOf(p, a);
    addBtn(panel, `Retreat (zamenjaj aktivnega)`, `${rc}⚡`, () => {
      // ponudi izbiro rezerve prek toasta/klika: poenostavljeno — zamenjaj s prvim možnim
      beginRetreatSelection();
    }, a.status.freeze || a.energy.length < rc);
  }

  // Attacks
  if (a) {
    const dd = def(a);
    dd.attacks.forEach((atk, i) => {
      const can = canPayCost(a, atk.cost) && !a.status.stun && !a.justPlayed;
      const btn = el("button", "action-btn attack");
      btn.innerHTML = `${atk.name} <span class="ab-cost">${atk.damage} dmg · ${costToHtml(atk.cost)}</span>`;
      btn.disabled = !can;
      btn.addEventListener("click", () => {
        const r = performAttack(i);
        flash(r);
        selectedHandUid = null;
        render();
        afterHumanAction();
      });
      panel.appendChild(btn);
    });
    if (a.status.stun) panel.appendChild(el("div", "hint", "Tvoj bojevnik je omamljen to potezo."));
    if (a.justPlayed) panel.appendChild(el("div", "hint", "Ta bojevnik je bil pravkar postavljen in ne more napasti to potezo."));
  }

  // End turn
  const endBtn = el("button", "action-btn end-turn", "Končaj potezo");
  endBtn.addEventListener("click", () => {
    selectedHandUid = null;
    endTurn();
    render();
    afterHumanAction();
  });
  panel.appendChild(endBtn);
}

function addBtn(panel, label, cost, fn, disabled) {
  const btn = el("button", "action-btn");
  btn.innerHTML = `${label}${cost ? ` <span class="ab-cost">${cost}</span>` : ""}`;
  if (disabled) btn.disabled = true;
  btn.addEventListener("click", fn);
  panel.appendChild(btn);
}

function retreatCostOf(p, a) {
  let cost = def(a).retreatCost;
  if (["greek-pegasus", "egypt-bastet", "celtic-faerie"].includes(def(a).id)) cost = 0;
  if (allChampions(p).some(c => def(c).id === "roman-janus")) cost = Math.max(0, cost - 1);
  if (G.realm === "realm-frozen" && def(a).pantheon !== "Norse") cost += 1;
  return cost;
}

let retreatMode = false;
function beginRetreatSelection() {
  retreatMode = true;
  toast("Klikni bojevnika v rezervi za retreat.");
  render();
}

/* ---------------------- After human action ----------------------- */
function afterHumanAction() {
  if (G.over) { showVictory(); return; }
  // če je zdaj na potezi AI, izvedi AI turn
  if (G.turn === 1 && !G.over) {
    runAITurn();
  }
}

function runAITurn() {
  // onemogoči interakcijo med AI potezo (vizualno)
  window.aiTakeTurn(
    () => { render(); },          // ob vsakem koraku
    () => {                        // ko AI konča
      // če čaka človek izbiro novega aktivnega
      render();
      if (G.over) { showVictory(); return; }
      // če je spet na potezi AI (npr. človek nima aktivnega in čaka) — ne; sicer nič
    }
  );
}

/* ---------------------- REALM render ----------------------------- */
function renderRealm() {
  const slot = $("#realm-slot");
  slot.innerHTML = "";
  if (!G.realm) { slot.appendChild(el("span", "realm-empty", "Ni aktivnega Realma")); return; }
  const d = CARDS[G.realm];
  const st = PANTHEON_STYLE[d.pantheon] || { symbol: "🏛", grad: ["#333", "#555"] };
  const node = el("div", "champ");
  node.style.width = "150px";
  node.style.setProperty("--c-grad", `linear-gradient(160deg, ${st.grad[0]}, ${st.grad[1]})`);
  node.innerHTML = `
    <div class="champ-art" style="height:48px;font-size:26px">🏛 ${st.symbol}</div>
    <div class="champ-body">
      <div class="champ-name">${d.name}</div>
      <div class="champ-tags">REALM · ${d.pantheon || ""}</div>
    </div>`;
  node.addEventListener("click", () => openCardModal(d));
  slot.appendChild(node);
  $("#realm-text").textContent = d.text;
}

/* ---------------------- MAIN RENDER ------------------------------ */
function render() {
  window.clearShake && (() => {})();
  const you = G.players[0];
  const ai = G.players[1];

  // turn indicator
  $("#turn-indicator").innerHTML = G.over ? "Igra končana" :
    `Poteza ${G.turnCount} · na potezi: <b>${G.players[G.turn].name}</b>`;

  // opponent zone
  renderZone($("#opp-zone"), ai, false);
  // your zone
  renderZone($("#you-zone"), you, true);

  // realm
  renderRealm();

  // hand
  const handEl = $("#hand");
  handEl.innerHTML = "";
  you.hand.forEach(inst => handEl.appendChild(renderHandCard(inst)));
  $("#hand-count").textContent = you.hand.length;

  // actions
  renderActions();

  // log
  const logList = $("#log-list");
  logList.innerHTML = "";
  G.log.slice(-30).forEach(line => logList.appendChild(el("div", null, escapeHtml(line))));
  logList.scrollTop = logList.scrollHeight;

  // retreat mode highlight
  if (retreatMode) toast("Klikni rezervo za retreat (ali ponovno klikni za preklic).");

  window.clearShake && window.clearShake();
}

function escapeHtml(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

function renderZone(container, player, isYou) {
  const st = PANTHEON_STYLE[player.pantheon];
  container.innerHTML = `
    <div class="zone-head">
      <span class="who">${st.symbol} ${escapeHtml(player.name)} · ${STARTER_DECKS[player.deckId].name}</span>
      <div class="zone-stats">
        <span class="glory-track">${gloryPips(player.glory)}</span>
        <span class="stat">Deck <b>${player.deck.length}</b></span>
        <span class="stat">Discard <b>${player.discard.length}</b></span>
      </div>
    </div>`;

  const wrap = el("div", "active-and-reserve");
  // active
  const activeSlot = el("div", "active-slot");
  if (player.active) {
    const isTurnActive = (G.turn === G.players.indexOf(player));
    const sh = (window.shakeTarget === player);
    const targetable = false;
    const champNode = renderChampion(player.active, { active: true, isTurnActive, shake: sh && !isYou ? true : (sh && isYou) });
    activeSlot.appendChild(champNode);
  } else {
    const empty = el("div", "empty-active", isYou && G.awaitingNewActive === 0
      ? "Spusti rezervo sem za novega aktivnega" : "Ni aktivnega bojevnika");
    if (isYou) {
      empty.addEventListener("dragover", (e) => {
        if (dragChampUid && champRole(dragChampUid) === "reserve") { e.preventDefault(); empty.classList.add("drop-hover"); }
      });
      empty.addEventListener("dragleave", () => empty.classList.remove("drop-hover"));
      empty.addEventListener("drop", (e) => {
        empty.classList.remove("drop-hover");
        if (!dragChampUid) return;
        const dragInst = G.players[0].reserve.find(c => c.uid === dragChampUid);
        if (dragInst) { e.preventDefault(); doSwapOrRetreat(dragInst); }
      });
    }
    activeSlot.appendChild(empty);
  }
  wrap.appendChild(activeSlot);

  // reserve
  const resCol = el("div");
  resCol.style.flex = "1 1 0";
  resCol.style.minWidth = "0";
  resCol.appendChild(el("div", "reserve-label", `REZERVA (${player.reserve.length}/${MAX_RESERVE})`));
  const resRow = el("div", "reserve-row");
  player.reserve.forEach(inst => {
    const canTargetForNewActive = isYou && G.awaitingNewActive === 0;
    const canRetreatTarget = isYou && retreatMode;
    const canSwap = isYou && player._mayFreeSwap;
    const node = renderChampion(inst, { targetable: canTargetForNewActive || canRetreatTarget || canSwap });
    if (canRetreatTarget) {
      node.addEventListener("click", (e) => {
        e.stopPropagation();
        const r = retreat(player, inst);
        flash(r);
        retreatMode = false;
        render();
      }, true);
    }
    resRow.appendChild(node);
  });
  if (player.reserve.length === 0) resRow.appendChild(el("span", "realm-empty", "—"));
  resCol.appendChild(resRow);
  wrap.appendChild(resCol);

  container.appendChild(wrap);
}

function gloryPips(n) {
  let s = "";
  for (let i = 0; i < GLORY_TO_WIN; i++) s += `<span class="glory-pip ${i < n ? "filled" : ""}"></span>`;
  return s;
}

/* ---------------------- CARD MODAL ------------------------------- */
function openCardModal(d) {
  const back = $("#modal-backdrop");
  const st = d.pantheon ? PANTHEON_STYLE[d.pantheon] : { symbol: "✦", grad: ["#333", "#555"], accent: "#888" };
  const rar = RARITY_STYLE[d.rarity] || RARITY_STYLE.Common;
  const mc = $("#modal-card");
  mc.style.setProperty("--c-grad", `linear-gradient(160deg, ${st.grad[0]}, ${st.grad[1]})`);
  mc.style.setProperty("--c-accent", st.accent || "#888");

  let glyph = st.symbol;
  if (d.type === "Relic") glyph = "⚜";
  if (d.type === "Oracle") glyph = "📜";
  if (d.type === "Realm") glyph = "🏛";
  if (d.type === "Energy") glyph = (ENERGY_STYLE[d.energyType] || {}).glyph || "✦";

  let body = "";
  if (d.type === "Champion") {
    body += `<div class="m-sub">${d.pantheon} · ${d.rarity} · ${d.stage}${d.hp ? " · " + d.hp + " HP" : ""}</div>`;
    if (d.ability) body += `<div class="m-ability"><b>${d.ability.name}.</b> ${d.ability.text}</div>`;
    (d.attacks || []).forEach(at => {
      body += `<div class="m-attack">
        <div class="at-head"><span class="at-name">${at.name}</span><span class="at-dmg">${at.damage}</span></div>
        <div class="at-cost">${costToHtml(at.cost)} <span style="color:var(--ink-dim)">(${at.cost.join(", ")})</span></div>
        <div class="at-text">${at.text}</div></div>`;
    });
    body += `<div class="m-wr"><span>Weakness: ${d.weakness || "—"}</span><span>Resistance: ${d.resistance || "—"}</span><span>Retreat: ${d.retreatCost}</span></div>`;
  } else if (d.type === "Energy") {
    body += `<div class="m-sub">Divine Energy · ${d.energyType}</div>`;
  } else {
    body += `<div class="m-sub">${d.type}${d.pantheon ? " · " + d.pantheon : ""} · ${d.rarity}</div>`;
    body += `<div class="m-ability">${d.text}</div>`;
  }
  if (d.flavorText) body += `<div class="m-flavor">“${d.flavorText}”</div>`;

  mc.innerHTML = `
    <div class="m-art">${artImg(d, "m-art-img")}<span class="m-art-glyph">${glyph}</span><span class="m-rarity" style="color:${rar.color}">${d.rarity}</span></div>
    <div class="m-body"><div class="m-name">${d.name}</div>${body}</div>`;
  back.classList.remove("hidden");
}
function closeModal() { $("#modal-backdrop").classList.add("hidden"); }

/* ---------------------- VICTORY ---------------------------------- */
function showVictory() {
  const winner = G.players[G.winner];
  const you = G.players[0];
  $("#victory-title").textContent = G.winner === 0 ? "ZMAGA" : "PORAZ";
  $("#victory-sub").textContent = G.winner === 0
    ? "Tvoj pantheon vlada areni." : `${winner.name} je zmagal. Pantheoni počakajo na maščevanje.`;
  $("#vstat-turns").textContent = G.turnCount;
  $("#vstat-glory").textContent = you.glory;
  $("#vstat-damage").textContent = you.stats.damageDealt;
  $("#vstat-cards").textContent = you.stats.cardsDrawn;
  $("#victory-screen").classList.remove("hidden");
  $("#concede").classList.add("hidden");
}

/* ---------------------- WIRING ----------------------------------- */
window.addEventListener("DOMContentLoaded", () => {
  buildStartScreen();
  $("#start-battle").addEventListener("click", startBattle);
  $("#start-battle").disabled = true;
  $("#rules-toggle").addEventListener("click", () => $("#rules-box").classList.toggle("hidden"));
  $("#modal-backdrop").addEventListener("click", (e) => { if (e.target.id === "modal-backdrop") closeModal(); });
  $("#modal-close").addEventListener("click", closeModal);
  $("#play-again").addEventListener("click", () => {
    $("#victory-screen").classList.add("hidden");
    $("#game-screen").classList.add("hidden");
    $("#start-screen").classList.remove("hidden");
    $("#concede").classList.add("hidden");
    chosenDeck = null;
    $("#start-battle").disabled = true;
    document.querySelectorAll(".deck-card").forEach(c => c.classList.remove("selected"));
  });
  $("#concede").addEventListener("click", () => {
    if (G.players.length) { G.over = true; G.winner = 1; showVictory(); }
  });
  // klik izven kart prekliče izbiro/retreat
  $("#game-screen").addEventListener("click", () => {
    if (retreatMode) { retreatMode = false; render(); }
  });

  // drop v lastno cono = odigraj karto (champion v rezervo / oracle / realm / ascend)
  const youZone = $("#you-zone");
  youZone.addEventListener("dragover", (e) => {
    if (!dragHandUid) return;
    const sel = G.players[0] && G.players[0].hand.find(i => i.uid === dragHandUid);
    if (!sel) return;
    const sd = def(sel);
    // energija in relic-attach gresta na bojevnika (ne na cono)
    if (sd.type === "Energy" || (sd.type === "Relic" && sd.relicMode === "attach")) return;
    e.preventDefault();
    youZone.classList.add("drop-zone-hover");
  });
  youZone.addEventListener("dragleave", (e) => {
    if (e.target === youZone) youZone.classList.remove("drop-zone-hover");
  });
  youZone.addEventListener("drop", (e) => {
    const sel = G.players[0] && G.players[0].hand.find(i => i.uid === dragHandUid);
    youZone.classList.remove("drop-zone-hover");
    if (!sel) return;
    const sd = def(sel);
    if (sd.type === "Energy" || (sd.type === "Relic" && sd.relicMode === "attach")) return;
    e.preventDefault();
    selectedHandUid = sel.uid;
    playSelectedCard();
  });
});
