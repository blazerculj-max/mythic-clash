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

/* ---------------------- GSAP HELPERS ----------------------------- */
// Vse animacije gredo skozi te ovojnice. Če GSAP ni naložen, igra deluje normalno.
const hasGsap = () => typeof window.gsap !== "undefined";

function fxScreenIn(node) {
  if (!node) return;
  if (!hasGsap()) return;
  gsap.fromTo(node, { opacity: 0, scale: 0.98 }, { opacity: 1, scale: 1, duration: 0.45, ease: "power2.out" });
}
function fxDealHand(cards) {
  if (!hasGsap() || !cards || !cards.length) return;
  gsap.from(cards, {
    y: 160, opacity: 0, scale: 0.85,
    duration: 0.45, ease: "back.out(1.4)", stagger: 0.05, clearProps: "all",
  });
}
function fxChampEnter(node) {
  if (!node || !hasGsap()) return;
  gsap.fromTo(node, { scale: 0.7, opacity: 0, y: 14 },
    { scale: 1, opacity: 1, y: 0, duration: 0.45, ease: "back.out(1.6)" });
}
function fxLunge(attackerNode, dir) {
  if (!attackerNode || !hasGsap()) return;
  gsap.timeline()
    .to(attackerNode, { y: dir * 22, scale: 1.06, duration: 0.12, ease: "power2.in" })
    .to(attackerNode, { y: 0, scale: 1, duration: 0.28, ease: "elastic.out(1, 0.5)" });
}
function fxVictoryIn(node) {
  if (!node || !hasGsap()) return;
  const title = node.querySelector(".victory-title");
  const rest = node.querySelectorAll(".victory-sub, .victory-stats, #play-again");
  gsap.fromTo(node, { opacity: 0 }, { opacity: 1, duration: 0.4 });
  if (title) gsap.fromTo(title, { scale: 0.5, opacity: 0, y: -20 },
    { scale: 1, opacity: 1, y: 0, duration: 0.7, ease: "elastic.out(1, 0.55)", delay: 0.1 });
  if (rest.length) gsap.from(rest, { y: 24, opacity: 0, duration: 0.5, stagger: 0.08, delay: 0.35, ease: "power2.out" });
}

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

  // zberi vse slike, ki jih bo bitka potrebovala (oba decka + statusi)
  const ids = new Set();
  [chosenDeck, aiDeck].forEach(dk => {
    (STARTER_DECKS[dk].list || []).forEach(id => ids.add(id));
  });
  const urls = [...ids].map(id => `art/${id}.png`);
  // energijske ikone (10) + statusi (7)
  ["sky","war","wisdom","underworld","nature","trickery","fire","frost","sun","moon"]
    .forEach(t => urls.push(`art/energy-${t}.png`));
  ["burn","freeze","stun","curse","blessing","shield","poison"]
    .forEach(s => urls.push(`art/status-${s}.png`));

  showLoadingScreen();
  preloadImages(urls, (done, total) => {
    updateLoadingProgress(done, total);
  }, () => {
    // končano -> zaženi bitko
    hideLoadingScreen();
    window.startGame(chosenDeck, aiDeck);
    $("#start-screen").classList.add("hidden");
    $("#game-screen").classList.remove("hidden");
    $("#victory-screen").classList.add("hidden");
    $("#concede").classList.remove("hidden");
    $("#help-btn").classList.remove("hidden");
    render();
    fxScreenIn($("#game-screen"));
    // igra se začne v mulligan fazi -> pokaži mulligan UI
    if (G.mulliganPhase) {
      showMulligan();
    } else {
      fxDealHand(document.querySelectorAll("#hand .card"));
    }
  });
}

/* ---------------------- IMAGE PRELOADER -------------------------- */
const _imgCache = {};
function preloadImages(urls, onProgress, onDone) {
  let done = 0;
  const total = urls.length;
  if (total === 0) { onDone(); return; }
  let finished = false;
  const finishOne = () => {
    done++;
    onProgress && onProgress(done, total);
    if (done >= total && !finished) { finished = true; onDone(); }
  };
  // varovalo: ne čakaj večno (počasna povezava) — max 8s
  const safety = setTimeout(() => { if (!finished) { finished = true; onDone(); } }, 8000);
  urls.forEach(url => {
    if (_imgCache[url]) { finishOne(); return; }
    const img = new Image();
    img.onload = () => { _imgCache[url] = true; finishOne(); };
    img.onerror = () => { finishOne(); }; // manjkajoča slika ne blokira
    img.src = url;
  });
  // počisti safety ko je done
  const chk = setInterval(() => { if (finished) { clearTimeout(safety); clearInterval(chk); } }, 200);
}

function showLoadingScreen() {
  let ls = document.getElementById("loading-screen");
  if (!ls) {
    ls = document.createElement("div");
    ls.id = "loading-screen";
    ls.innerHTML = `
      <div class="ls-inner">
        <div class="ls-symbols">⚡ ❄ 🦅 ☀ 🌲 🌙</div>
        <div class="ls-title">MYTHIC CLASH</div>
        <div class="ls-sub">Priklicujem bogove ...</div>
        <div class="ls-bar"><div class="ls-fill" id="ls-fill"></div></div>
        <div class="ls-pct" id="ls-pct">0%</div>
      </div>`;
    document.body.appendChild(ls);
  }
  ls.classList.remove("hidden");
  requestAnimationFrame(() => ls.classList.add("visible"));
}
function updateLoadingProgress(done, total) {
  const pct = Math.round(done / total * 100);
  const fill = document.getElementById("ls-fill");
  const lbl = document.getElementById("ls-pct");
  if (fill) fill.style.width = pct + "%";
  if (lbl) lbl.textContent = pct + "%";
}
function hideLoadingScreen() {
  const ls = document.getElementById("loading-screen");
  if (!ls) return;
  ls.classList.remove("visible");
  setTimeout(() => ls.classList.add("hidden"), 400);
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

/* Pojasnila statusov (točno kot deluje engine) */
const STATUS_INFO = {
  burn:     { name: "Burn",     icon: "burn",     short: "−15 HP na koncu poteze (−20 če je tudi Poison)." },
  freeze:   { name: "Freeze",   icon: "freeze",   short: "Ne more retreatati; 50% odtajanje. Zamrznjena tarča prejme +20% škode." },
  stun:     { name: "Stun",     icon: "stun",     short: "Ne more napasti naslednjo potezo. Tarča prejme +10% škode." },
  curse:    { name: "Curse",    icon: "curse",    short: "Napadi tega bojevnika naredijo −15 škode." },
  blessing: { name: "Blessing", icon: "blessing", short: "Napadi naredijo +15 škode (traja 2 potezi)." },
  shield:   { name: "Shield",   icon: "shield",   short: "Naslednji prejeti udarec je −20 škode (enkratno)." },
  poison:   { name: "Poison",   icon: "poison",   short: "−15 HP na koncu poteze, vsako potezo +10 več." },
};

function statusIcon(name) {
  return `<img class="status-img" src="art/status-${name}.png" alt="" onerror="this.style.display='none'">`;
}
function statusChip(key, label) {
  const info = STATUS_INFO[key];
  const tip = info ? `${info.name}: ${info.short}` : key;
  return `<span class="status-chip st-${key}" title="${tip}" data-status="${key}">${statusIcon(info ? info.icon : key)}${label}</span>`;
}
function statusHtml(status) {
  const out = [];
  if (status.burn) out.push(statusChip("burn", "BURN"));
  if (status.freeze) out.push(statusChip("freeze", "FREEZE"));
  if (status.stun) out.push(statusChip("stun", "STUN"));
  if (status.curse) out.push(statusChip("curse", "CURSE"));
  if (status.blessing) out.push(statusChip("blessing", `BLESS ${status.blessing}`));
  if (status.shield) out.push(statusChip("shield", "SHIELD"));
  if (status.poison) out.push(statusChip("poison", `POISON ${status.poison}`));
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
    // glow če lahko zdaj napade (igralčeva poteza, energija, ni stun/justPlayed)
    if (G.turn === 0 && !G.over && !inst.status.stun && !inst.justPlayed &&
        (d.attacks || []).some(atk => canPayCost(inst, atk.cost))) {
      node.classList.add("attack-ready");
    }
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
  return `<img class="${cls}" src="art/${d.id}.png" alt="" decoding="async"
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
    const enemyActive = G.players[1] && G.players[1].active;
    dd.attacks.forEach((atk, i) => {
      const can = canPayCost(a, atk.cost) && !a.status.stun && !a.justPlayed;
      const btn = el("button", "action-btn attack");
      // predogled škode proti dejanskemu nasprotniku
      let dmgLabel = `${atk.damage} dmg`;
      let effBadge = "";
      if (enemyActive) {
        const prev = previewDamage(a, G.players[0], enemyActive, atk);
        if (prev) {
          dmgLabel = `~${prev.dmg} dmg`;
          if (prev.pct !== 100) {
            const cls = prev.pct > 100 ? "eff-good" : "eff-bad";
            effBadge = ` <span class="eff-badge ${cls}">${prev.pct}%</span>`;
          }
        }
      }
      btn.innerHTML = `${atk.name} <span class="ab-cost">${dmgLabel} · ${costToHtml(atk.cost)}</span>${effBadge}`;
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

  // Odin All-Father: gumb za plačilo 10 HP -> vlek
  const odin = [p.active].concat(p.reserve).find(c => c && def(c).id === "norse-odin");
  if (odin && !p.drawnAbilityUsed.odin && odin.damage < odin.maxHp - 10) {
    const odinBtn = el("button", "action-btn ability", `⚡ Odin: plačaj 10 HP → vleci karto`);
    odinBtn.addEventListener("click", () => {
      const r = window.odinDraw(p);
      flash(r);
      render();
    });
    panel.appendChild(odinBtn);
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

  // hand — pahljača (Balatro/Hearthstone stil)
  const handEl = $("#hand");
  handEl.innerHTML = "";
  const cards = you.hand.map(inst => renderHandCard(inst));
  const n = cards.length;
  cards.forEach((node, i) => {
    // sredinski indeks; krajni listi rotirani navzven, sredina dvignjena (arc)
    const mid = (n - 1) / 2;
    const offset = i - mid;
    const maxRot = Math.min(3.5, 14 / Math.max(1, n)); // manj rotacije pri več kartah
    const rot = offset * maxRot;
    // arc: sredina rahlo nižja, robovi malo višji (naravna pahljača); blaga krivulja
    const lift = Math.pow(offset, 2) * (1.6 / Math.max(1, n));
    node.style.setProperty("--fan-rot", rot.toFixed(2) + "deg");
    node.style.setProperty("--fan-lift", lift.toFixed(1) + "px");
    node.style.setProperty("--fan-i", i);
    node.style.zIndex = String(10 + i);
    handEl.appendChild(node);
  });
  handEl.style.setProperty("--hand-n", String(n));
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

  // animacija napada (lunge + shake + floating damage)
  playAttackFx();

  window.clearShake && window.clearShake();
}

/* ---------------------- ATTACK FX -------------------------------- */
function playAttackFx() {
  const la = window.lastAttack;
  if (!la) return;
  window.clearLastAttack && window.clearLastAttack();

  const targetZone = la.targetOwnerIndex === 0 ? "#you-zone" : "#opp-zone";
  const attackerZone = la.attackerOwnerIndex === 0 ? "#you-zone" : "#opp-zone";
  const targetNode = document.querySelector(`${targetZone} .active-champ`);
  const attackerNode = document.querySelector(`${attackerZone} .active-champ`);

  // lunge napadalca proti tarči (GSAP če na voljo, sicer CSS)
  if (attackerNode) {
    const dir = la.attackerOwnerIndex === 0 ? -1 : 1; // ti spodaj -> udari navzgor
    if (hasGsap()) {
      fxLunge(attackerNode, dir);
    } else {
      attackerNode.style.setProperty("--lunge-y", `${dir * 14}px`);
      attackerNode.classList.add("lunge");
      setTimeout(() => attackerNode.classList.remove("lunge"), 360);
    }
  }

  if (targetNode) {
    const slot = targetNode.closest(".active-slot") || targetNode.parentNode;
    // shake + flash z rahlim zamikom (ko "udari")
    setTimeout(() => {
      targetNode.classList.add("shake", "hit-flash");
      setTimeout(() => targetNode.classList.remove("shake", "hit-flash"), 420);
      // particle burst v barvi tipa napada
      spawnParticles(targetNode, la.atkType, la.heavy ? 22 : 14);
      // screen shake + flash pri močnih ali zelo učinkovitih napadih
      if (la.heavy || (la.effPct && la.effPct >= 150) || la.damage >= 90) {
        screenImpact(la.heavy ? "big" : "small");
      }
    }, 130);

    // floating damage number (na slot, da ni odrezan)
    if (la.damage > 0) {
      const fd = el("div", "floating-dmg");
      let extra = "";
      if (la.weak) extra = `<span class="fd-tag weak">WEAK ×1.5</span>`;
      else if (la.resist) extra = `<span class="fd-tag resist">RESIST ×0.6</span>`;
      else if (la.effPct && la.effPct > 100) extra = `<span class="fd-tag weak">${la.effPct}%</span>`;
      else if (la.effPct && la.effPct < 100) extra = `<span class="fd-tag resist">${la.effPct}%</span>`;
      if (la.omen === true) extra += `<span class="fd-tag omen">OMEN ✓</span>`;
      fd.innerHTML = `<span class="fd-num">−${la.damage}</span>${extra}`;
      slot.appendChild(fd);
      setTimeout(() => fd.remove(), 1100);
    } else {
      const fd = el("div", "floating-dmg zero");
      fd.innerHTML = `<span class="fd-num">0</span><span class="fd-tag">BLOK</span>`;
      slot.appendChild(fd);
      setTimeout(() => fd.remove(), 1100);
    }
  }
}

/* ---------------------- PARTICLE SYSTEM -------------------------- */
// barve delcev po tipu energije napada
const PARTICLE_COLORS = {
  Sky: ["#bfe0ff", "#7fb3ff", "#ffffff"],
  War: ["#ff8a6b", "#ff5e4d", "#ffd0c0"],
  Wisdom: ["#d6c4ff", "#b89bff", "#fff"],
  Underworld: ["#b6a8d0", "#7a6f8f", "#3a2f50"],
  Nature: ["#aef0c0", "#6fd98a", "#d6ffe2"],
  Trickery: ["#ffc4ef", "#ff9be0", "#fff"],
  Fire: ["#ffd24a", "#ff8a3d", "#ff5722"],
  Frost: ["#d6fffb", "#8fe6e0", "#bfe3ee"],
  Sun: ["#ffe9a8", "#ffd24a", "#fff7e0"],
  Moon: ["#e4e0ff", "#c9c2ff", "#fff"],
  _default: ["#ffe9a8", "#e9c46a", "#fff"],
};

function spawnParticles(targetEl, type, count) {
  if (!targetEl) return;
  // koren za delce: igralni zaslon (da niso odrezani)
  const layer = ensureFxLayer();
  const rect = targetEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const colors = PARTICLE_COLORS[type] || PARTICLE_COLORS._default;
  for (let i = 0; i < count; i++) {
    const p = document.createElement("div");
    p.className = "particle";
    const ang = Math.random() * Math.PI * 2;
    const dist = 30 + Math.random() * 70;
    const dx = Math.cos(ang) * dist;
    const dy = Math.sin(ang) * dist - 10; // rahlo navzgor
    const size = 4 + Math.random() * 7;
    const col = colors[Math.floor(Math.random() * colors.length)];
    p.style.left = cx + "px";
    p.style.top = cy + "px";
    p.style.width = size + "px";
    p.style.height = size + "px";
    p.style.background = col;
    p.style.boxShadow = `0 0 ${size}px ${col}`;
    p.style.setProperty("--dx", dx + "px");
    p.style.setProperty("--dy", dy + "px");
    p.style.animationDelay = (Math.random() * 60) + "ms";
    layer.appendChild(p);
    setTimeout(() => p.remove(), 750);
  }
}

let _fxLayer = null;
function ensureFxLayer() {
  if (_fxLayer && document.body.contains(_fxLayer)) return _fxLayer;
  _fxLayer = document.createElement("div");
  _fxLayer.className = "fx-layer";
  document.body.appendChild(_fxLayer);
  return _fxLayer;
}

// screen shake + flash
function screenImpact(size) {
  const board = document.querySelector(".board") || document.body;
  board.classList.remove("screen-shake-big", "screen-shake-small");
  void board.offsetWidth; // restart animacije
  board.classList.add(size === "big" ? "screen-shake-big" : "screen-shake-small");
  setTimeout(() => board.classList.remove("screen-shake-big", "screen-shake-small"), 450);
  // bel flash overlay
  const flash = ensureFxLayer();
  const ov = document.createElement("div");
  ov.className = "screen-flash" + (size === "big" ? " big" : "");
  flash.appendChild(ov);
  setTimeout(() => ov.remove(), 280);
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
    const targetable = false;
    const champNode = renderChampion(player.active, { active: true, isTurnActive });
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
/* ---------------------- MULLIGAN UI ------------------------------ */
let mullSelectedBottom = new Set();

function showMulligan() {
  const back = $("#mulligan-backdrop");
  back.classList.remove("hidden");
  renderMulligan();
  if (hasGsap()) {
    gsap.fromTo("#mulligan-backdrop .mulligan-inner",
      { opacity: 0, y: 20, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: "power3.out" });
  }
}

function renderMulligan() {
  const you = G.players[0];
  const cardsWrap = $("#mull-cards");
  const actions = $("#mull-actions");
  const title = $("#mull-title");
  const sub = $("#mull-sub");
  cardsWrap.innerHTML = "";
  actions.innerHTML = "";

  // narisi karte (velike)
  you.hand.forEach(inst => {
    const node = renderHandCard(inst);
    node.classList.add("mull-card");
    node.classList.remove("playable", "selected-hand");
    const d = def(inst);
    const isBasicChamp = d.type === "Champion" && d.stage === "basic";

    if (G.mulliganStage === "pickActive") {
      // klikni championa za aktivnega
      if (isBasicChamp) {
        node.classList.add("pickable");
        node.addEventListener("click", () => {
          const r = window.chooseStartingActive(inst.uid);
          if (r.ok) endMulligan();
        });
      } else {
        node.classList.add("dimmed");
      }
    } else if (G.mulliganStage === "bottom") {
      // izberi karte za na dno
      node.addEventListener("click", () => {
        if (mullSelectedBottom.has(inst.uid)) mullSelectedBottom.delete(inst.uid);
        else if (mullSelectedBottom.size < G.mulliganBottomN) mullSelectedBottom.add(inst.uid);
        renderMulligan();
      });
      if (mullSelectedBottom.has(inst.uid)) node.classList.add("to-bottom");
    }
    cardsWrap.appendChild(node);
  });

  // gumbi glede na stage
  if (G.mulliganStage === "decide") {
    title.textContent = G.mulliganCount === 0 ? "Obdrži ali zamenjaj roko" : "Mulligan #" + G.mulliganCount;
    const keepInfo = G.mulliganCount >= 1
      ? `Obdrži (vrneš ${HAND_START - G.mulliganKeepN} na dno)` : "Obdrži roko";
    sub.innerHTML = G.mulliganCount === 0
      ? "Prvi mulligan je <b>brezplačen</b>. Vsak naslednji: obdržiš 1 karto manj."
      : `Naslednji mulligan: obdržiš <b>${Math.max(1, G.mulliganKeepN - 1)}</b> kart.`;

    const keepBtn = el("button", "mull-btn keep", keepInfo);
    keepBtn.addEventListener("click", () => {
      const r = window.keepHand();
      if (r.ok) {
        if (r.needBottom) { mullSelectedBottom = new Set(); renderMulligan(); }
        else renderMulligan();
      }
    });
    const mullBtn = el("button", "mull-btn mull",
      G.mulliganCount === 0 ? "Mulligan (brezplačen)" : "Mulligan (−1 karta)");
    mullBtn.addEventListener("click", () => {
      const r = window.playerMulligan();
      if (r.ok) {
        renderMulligan();
        if (hasGsap()) gsap.from("#mull-cards .mull-card", { y: 40, opacity: 0, scale: 0.9, duration: 0.35, stagger: 0.04, ease: "back.out(1.4)" });
      }
    });
    actions.appendChild(keepBtn);
    actions.appendChild(mullBtn);
  } else if (G.mulliganStage === "bottom") {
    title.textContent = "Vrni karte na dno";
    sub.innerHTML = `Izberi <b>${G.mulliganBottomN}</b> kart, ki gredo na dno decka (London mulligan).`;
    const confirmBtn = el("button", "mull-btn keep",
      `Potrdi (${mullSelectedBottom.size}/${G.mulliganBottomN})`);
    confirmBtn.disabled = mullSelectedBottom.size !== G.mulliganBottomN;
    confirmBtn.addEventListener("click", () => {
      const r = window.putCardsToBottom([...mullSelectedBottom]);
      if (r.ok) renderMulligan();
    });
    actions.appendChild(confirmBtn);
  } else if (G.mulliganStage === "pickActive") {
    title.textContent = "Izberi aktivnega Championa";
    sub.innerHTML = "Klikni <b>basic Championa</b>, ki stopi v areno. Ostane ti 6 kart.";
  }
}

function endMulligan() {
  const back = $("#mulligan-backdrop");
  const finish = () => {
    back.classList.add("hidden");
    render();
    fxDealHand(document.querySelectorAll("#hand .card"));
  };
  if (hasGsap()) {
    gsap.to("#mulligan-backdrop .mulligan-inner", { opacity: 0, y: -16, duration: 0.3, ease: "power2.in", onComplete: finish });
  } else finish();
}

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
  $("#help-btn").classList.add("hidden");
  fxVictoryIn($("#victory-screen"));
}

/* ---------------------- WIRING ----------------------------------- */
window.addEventListener("DOMContentLoaded", () => {
  buildStartScreen();
  // animacija vstopa začetne strani
  if (hasGsap()) {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.from(".title-block .eyebrow", { y: -16, opacity: 0, duration: 0.5 })
      .from(".game-title", { y: 20, opacity: 0, scale: 0.92, duration: 0.7 }, "-=0.2")
      .from(".tagline", { y: 14, opacity: 0, duration: 0.5 }, "-=0.4")
      .from(".deck-select-block .eyebrow", { opacity: 0, duration: 0.4 }, "-=0.2")
      .from(".deck-card", { y: 30, opacity: 0, duration: 0.5, stagger: 0.08 }, "-=0.2")
      .from(".start-actions", { y: 16, opacity: 0, duration: 0.4 }, "-=0.2");
  }
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
    $("#help-btn").classList.add("hidden");
    chosenDeck = null;
    $("#start-battle").disabled = true;
    document.querySelectorAll(".deck-card").forEach(c => c.classList.remove("selected"));
  });
  $("#concede").addEventListener("click", () => {
    if (G.players.length) { G.over = true; G.winner = 1; showVictory(); }
  });

  // glossar statusov (gumb "?")
  $("#help-btn").addEventListener("click", () => {
    const body = $("#glossary-body");
    body.innerHTML = Object.keys(STATUS_INFO).map(k => {
      const i = STATUS_INFO[k];
      return `<div class="gloss-row">
        <span class="gloss-icon">${statusIcon(i.icon)}</span>
        <span class="gloss-text"><b>${i.name}</b><br>${i.short}</span>
      </div>`;
    }).join("") + `
      <h3 class="glossary-title" style="margin-top:18px;">Učinkovitost</h3>
      <div class="gloss-row"><span class="gloss-text"><b style="color:#7fe6a0;">150%</b> — napad zadene šibkost tarče.</span></div>
      <div class="gloss-row"><span class="gloss-text"><b style="color:#ff8a8a;">60%</b> — tarča je odporna.</span></div>
      <div class="gloss-row"><span class="gloss-text"><b style="color:#ffe39a;">Omen ✓</b> — močni napadi (3+ energije) imajo 50% za ×1.3 bonus.</span></div>`;
    $("#glossary-backdrop").classList.remove("hidden");
  });
  $("#glossary-close").addEventListener("click", () => $("#glossary-backdrop").classList.add("hidden"));
  $("#glossary-backdrop").addEventListener("click", (e) => {
    if (e.target === $("#glossary-backdrop")) $("#glossary-backdrop").classList.add("hidden");
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
