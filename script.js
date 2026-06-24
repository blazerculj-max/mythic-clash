/* ============================================================================
   MYTHIC CLASH: WARS OF PANTHEONS — script.js
   UI render + interakcija. Engine je v engine.js (globalne funkcije).
============================================================================ */

let selectedHandUid = null;   // izbrana karta v roki
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
function costToHtml(cost) {
  return cost.map(c => {
    const s = ENERGY_STYLE[c] || ENERGY_STYLE.Any;
    return `<span class="edot" style="background:${s.color}" title="${c}">${s.glyph}</span>`;
  }).join("");
}

function energyDotsHtml(energyArr) {
  return energyArr.map(t => {
    const s = ENERGY_STYLE[t] || ENERGY_STYLE.Any;
    return `<span class="edot" style="background:${s.color}" title="${t}">${s.glyph}</span>`;
  }).join("");
}

function statusHtml(status) {
  const out = [];
  if (status.burn) out.push(`<span class="status-chip st-burn">BURN</span>`);
  if (status.freeze) out.push(`<span class="status-chip st-freeze">FREEZE</span>`);
  if (status.stun) out.push(`<span class="status-chip st-stun">STUN</span>`);
  if (status.curse) out.push(`<span class="status-chip st-curse">CURSE</span>`);
  if (status.blessing) out.push(`<span class="status-chip st-blessing">BLESS ${status.blessing}</span>`);
  if (status.shield) out.push(`<span class="status-chip st-shield">SHIELD</span>`);
  if (status.poison) out.push(`<span class="status-chip st-poison">POISON ${status.poison}</span>`);
  return out.join("");
}

/* ---------------------- CHAMPION render -------------------------- */
function renderChampion(inst, opts = {}) {
  const d = def(inst);
  const st = PANTHEON_STYLE[d.pantheon];
  const hp = inst.maxHp - inst.damage;
  const pct = Math.max(0, Math.round((hp / inst.maxHp) * 100));
  const node = el("div", "champ" + (opts.active ? " active-champ" : ""));
  node.style.setProperty("--c-grad", `linear-gradient(160deg, ${st.grad[0]}, ${st.grad[1]})`);
  if (opts.isTurnActive) node.classList.add("is-active-turn");
  if (opts.targetable) node.classList.add("targetable");

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
    </div>`;

  node.addEventListener("click", (e) => {
    e.stopPropagation();
    handleChampClick(inst, opts);
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

  node.innerHTML = `
    <div class="rarity-bar" style="background:${rar.color}"></div>
    <div class="card-art">${artImg(d, "card-art-img")}<span class="card-art-glyph">${artGlyph}</span></div>
    <div class="card-body">
      <div class="card-name">${d.name}</div>
      <div class="card-meta">${d.type}${d.pantheon ? " · " + d.pantheon : ""}</div>
    </div>`;

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
      ? "Izberi novega aktivnega iz rezerve →" : "Ni aktivnega bojevnika");
    activeSlot.appendChild(empty);
  }
  wrap.appendChild(activeSlot);

  // reserve
  const resCol = el("div");
  resCol.style.flex = "1";
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
});
