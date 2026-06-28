/* ============================================================================
   MYTHIC CLASH v2 — UI (script-v2.js)  [samostojen prototip, v2.html]
============================================================================ */
const V2 = window.V2;
const G = V2.G;
const def = V2.def;
const $ = s => document.querySelector(s);
function el(t, c, h) { const n = document.createElement(t); if (c) n.className = c; if (h != null) n.innerHTML = h; return n; }
function artImg(d, cls) { return d && d.id ? `<img class="${cls}" src="art/${d.id}.png" alt="" decoding="async" onerror="this.style.display='none'">` : ""; }
let toastTimer;
function toast(m) { const t = $("#toast"); t.textContent = m; t.classList.remove("hidden"); t.style.opacity = "1"; clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.style.opacity = "0"; }, 1800); }

let chosenDeck = null, chosenDiff = "normal";
let selAttacker = null, selAtkIndex = null; // izbira napada (tvoja poteza)
let aiBusy = false;

/* ---------------- SETUP ---------------- */
function buildSetup() {
  const dg = $("#v2-decks"); dg.innerHTML = "";
  Object.values(STARTER_DECKS).filter(d => d.id !== "custom").forEach(d => {
    const st = PANTHEON_STYLE[d.pantheon] || { symbol: "✦", grad: ["#333", "#555"] };
    const b = el("button", "deck-card");
    b.style.setProperty("--deck-grad", `linear-gradient(160deg, ${st.grad[0]}, ${st.grad[1]})`);
    b.innerHTML = `<span class="deck-pantheon">${d.pantheon}</span><div class="deck-symbol">${st.symbol}</div>
      <h3>${d.name}</h3><div class="deck-style">${d.style}</div><div class="deck-blurb">${d.blurb}</div>`;
    b.addEventListener("click", () => { chosenDeck = d.id; document.querySelectorAll("#v2-decks .deck-card").forEach(c => c.classList.remove("selected")); b.classList.add("selected"); $("#v2-start").disabled = false; });
    dg.appendChild(b);
  });
  const dr = $("#v2-diff"); dr.innerHTML = "";
  [["easy", "Lahko"], ["normal", "Normalno"], ["hard", "Težko"]].forEach(([id, lab]) => {
    const b = el("button", "diff-chip" + (id === chosenDiff ? " sel" : ""), `<span class="diff-name">${lab}</span>`);
    b.addEventListener("click", () => { chosenDiff = id; dr.querySelectorAll(".diff-chip").forEach(c => c.classList.remove("sel")); b.classList.add("sel"); });
    dr.appendChild(b);
  });
  $("#v2-start").addEventListener("click", startV2);
}
function startV2() {
  if (!chosenDeck) return;
  const others = Object.keys(STARTER_DECKS).filter(k => k !== chosenDeck && k !== "custom");
  const aiDeck = others[(Math.random() * others.length) | 0];
  V2.startGame(chosenDeck, aiDeck, chosenDiff);
  $("#v2-setup").classList.add("hidden");
  $("#v2-game").classList.remove("hidden");
  showFirstPick();
}

/* ---------------- FIRST CHAMPION PICK ---------------- */
function showFirstPick() {
  const you = G.players[0];
  const wrap = $("#v2-pick-cards"); wrap.innerHTML = "";
  you.hand.filter(i => def(i).type === "Champion" && def(i).stage === "basic").forEach(inst => {
    const node = champPreviewCard(def(inst));
    node.classList.add("pickable");
    node.addEventListener("click", () => { V2.chooseFirstChampion(inst.uid); $("#v2-pick").classList.add("hidden"); render(); });
    wrap.appendChild(node);
  });
  $("#v2-pick").classList.remove("hidden");
}
function champPreviewCard(d) {
  const st = PANTHEON_STYLE[d.pantheon] || { symbol: "✦", grad: ["#333", "#555"] };
  const n = el("div", "mull-card card");
  n.style.setProperty("--c-grad", `linear-gradient(160deg, ${st.grad[0]}, ${st.grad[1]})`);
  n.innerHTML = `<div class="card-art">${artImg(d, "card-art-img")}<span class="card-art-glyph">${st.symbol}</span></div>
    <div class="card-body"><div class="card-name">${d.name}</div>
    <div class="card-meta">❤ ${d.hp} · ${d.pantheon}</div></div>`;
  return n;
}

/* ---------------- RENDER ---------------- */
function render() {
  if (!G.players.length) return;
  renderSide($("#v2-opp"), G.players[1], false);
  renderSide($("#v2-you"), G.players[0], true);
  renderHand();
  renderActions();
  renderLog();
  $("#v2-turn").innerHTML = G.over ? "" : `Poteza ${G.turnCount} · na potezi: <b>${G.turn === 0 ? "Ti" : "Nasprotnik"}</b>`;
  $("#v2-end").style.display = (G.turn === 0 && !G.over) ? "" : "none";
}

function heroBar(p) {
  const pct = Math.max(0, Math.round(p.life / V2.START_LIFE * 100));
  return `<div class="v2-hero">
    <span class="v2-hero-name">${p.name}</span>
    <div class="v2-hero-bar"><div class="v2-hero-fill ${p.life <= 40 ? "low" : ""}" style="width:${pct}%"></div>
      <span class="v2-hero-life">❤ ${p.life}</span></div>
  </div>`;
}
function manaRow(p) {
  const untap = p.mana.filter(m => !m.tapped).length;
  const pips = p.mana.map(m => {
    const s = ENERGY_STYLE[m.type] || { color: "#888", glyph: "✦" };
    return `<span class="v2-mana ${m.tapped ? "tapped" : ""}" title="${m.type}" style="--mc:${s.color}">${s.glyph}</span>`;
  }).join("");
  return `<div class="v2-mana-row"><span class="v2-mana-lab">MANA ${untap}/${p.mana.length}</span>${pips}</div>`;
}

function renderSide(container, p, isYou) {
  container.innerHTML = "";
  const head = el("div", "v2-head");
  head.innerHTML = heroBar(p) + `<div class="v2-meta">Deck ${p.deck.length} · Roka ${p.hand.length}</div>` + manaRow(p);
  container.appendChild(head);
  const row = el("div", "v2-board-row");
  if (!p.board.length) row.appendChild(el("div", "v2-empty", isYou ? "Tvoj board je prazen" : "Brez branilcev — napadljiv obraz!"));
  p.board.forEach(c => row.appendChild(boardChamp(c, p, isYou)));
  container.appendChild(row);
}

function boardChamp(c, owner, isYou) {
  const d = def(c);
  const st = PANTHEON_STYLE[d.pantheon] || { symbol: "✦", grad: ["#333", "#555"] };
  const life = c.maxHp - c.damage;
  const pct = Math.max(0, Math.round(life / c.maxHp * 100));
  const node = el("div", "v2-champ" + (c.tapped ? " tapped" : "") + (c.sick ? " sick" : ""));
  node.style.setProperty("--c-grad", `linear-gradient(160deg, ${st.grad[0]}, ${st.grad[1]})`);
  const canAtk = isYou && G.turn === 0 && !G.over && V2.canAttack(owner, c);
  if (canAtk) node.classList.add("ready");
  if (selAttacker === c.uid) node.classList.add("selected-att");
  // targetable highlight (kadar izbiramo tarčo)
  if (selAttacker && selAtkIndex != null && !isYou) node.classList.add("targetable");
  node.innerHTML = `
    <div class="v2-champ-art">${artImg(d, "champ-art-img")}<span class="v2-champ-sym">${st.symbol}</span>
      <span class="v2-champ-hp">${life}</span>
      ${c.sick ? `<span class="v2-tag sick">💤</span>` : ""}${c.tapped ? `<span class="v2-tag tap">↻</span>` : ""}</div>
    <div class="v2-champ-body">
      <div class="v2-champ-name">${d.name}</div>
      <div class="v2-hpbar"><div class="v2-hpfill ${pct <= 35 ? "low" : ""}" style="width:${pct}%"></div></div>
      <div class="v2-status">${statusChips(c)}${kwMini(d)}</div>
    </div>`;
  node.addEventListener("click", () => onChampClick(c, owner, isYou));
  return node;
}
function statusChips(c) {
  const s = c.status || {}; const out = [];
  const map = { burn: "🔥", freeze: "❄️", stun: "💫", curse: "💀", blessing: "✨", shield: "🛡️", poison: "☠️" };
  for (const k in map) if (s[k]) out.push(`<span class="v2-st">${map[k]}${typeof s[k] === "number" && s[k] > 1 ? s[k] : ""}</span>`);
  return out.join("");
}
function kwMini(d) {
  const ic = [];
  if (d.charge) ic.push("⚡"); if (d.lifesteal) ic.push("🩸"); if (d.overload) ic.push("⛓");
  if (d.onEnter) ic.push("➹"); if (d.onDefeat) ic.push("☠");
  return ic.length ? `<span class="v2-kw">${ic.join("")}</span>` : "";
}

function renderHand() {
  const you = G.players[0];
  const h = $("#v2-hand"); h.innerHTML = "";
  you.hand.forEach(inst => {
    const d = def(inst);
    const st = d.pantheon ? PANTHEON_STYLE[d.pantheon] : null;
    const node = el("div", "v2-handcard");
    node.style.setProperty("--c-grad", st ? `linear-gradient(160deg, ${st.grad[0]}, ${st.grad[1]})` : "linear-gradient(160deg,#2a2a3a,#444)");
    let cost = "";
    if (d.type === "Champion") cost = `<span class="v2-cost">⬡ ${V2.summonCostOf(d)}</span>`;
    if (d.type === "Energy") cost = `<span class="v2-cost energy">+mana</span>`;
    const playable = isPlayable(inst);
    if (playable) node.classList.add("playable");
    let glyph = st ? st.symbol : (ENERGY_STYLE[d.energyType] ? ENERGY_STYLE[d.energyType].glyph : "✦");
    node.innerHTML = `<div class="v2-hc-art">${artImg(d, "card-art-img")}<span class="card-art-glyph">${glyph}</span>${cost}</div>
      <div class="v2-hc-body"><div class="v2-hc-name">${d.name}</div>
      <div class="v2-hc-meta">${d.type}${d.type === "Champion" ? " ❤" + d.hp : ""}</div></div>`;
    node.addEventListener("click", () => onHandClick(inst));
    h.appendChild(node);
  });
  $("#v2-hand").classList.toggle("dim", G.turn !== 0 || G.over);
}
function isPlayable(inst) {
  const you = G.players[0]; const d = def(inst);
  if (G.turn !== 0 || G.over) return false;
  if (d.type === "Energy") return !you.playedEnergyThisTurn;
  if (d.type === "Champion" && d.stage === "basic") return you.board.length < V2.BOARD_MAX && V2.canPay(you, Array.from({ length: V2.summonCostOf(d) }, () => "Any"));
  return false; // oracle/relic/realm: kasneje
}

function renderActions() {
  const panel = $("#v2-actions"); panel.innerHTML = "";
  if (G.over) { panel.appendChild(el("div", "hint", G.winner === 0 ? "ZMAGA! 🏆" : "Poraz.")); return; }
  if (G.turn !== 0) { panel.appendChild(el("div", "hint", "Nasprotnik je na potezi…")); return; }
  const you = G.players[0];
  if (selAttacker) {
    const c = you.board.find(x => x.uid === selAttacker); const d = c ? def(c) : null;
    if (d) {
      panel.appendChild(el("div", "hint", `Napada: <b>${d.name}</b>. Izberi napad, nato tarčo.`));
      d.attacks.forEach((atk, i) => {
        const can = V2.canPay(you, atk.cost, d.id === "celtic-lugh");
        const b = el("button", "action-btn attack" + (selAtkIndex === i ? " sel" : ""));
        b.innerHTML = `${atk.name} <span class="ab-cost">${atk.damage} dmg · ${costHtml(atk.cost)}</span>`;
        b.disabled = !can;
        b.addEventListener("click", () => { selAtkIndex = i; toast("Klikni nasprotnikovega šampiona ali NJEGOV OBRAZ."); render(); });
        panel.appendChild(b);
      });
      const cancel = el("button", "action-btn", "Prekliči");
      cancel.addEventListener("click", () => { selAttacker = null; selAtkIndex = null; render(); });
      panel.appendChild(cancel);
      // gumb za napad na obraz (če je izbran napad)
      if (selAtkIndex != null) {
        const face = el("button", "action-btn attack", "⚔ Napadi OBRAZ nasprotnika");
        face.addEventListener("click", () => doAttack({ kind: "face" }));
        panel.appendChild(face);
      }
    }
  } else {
    panel.appendChild(el("div", "hint", "Klikni svojega <b>netapnjenega</b> šampiona za napad, ali igraj karto iz roke (energija / priklic)."));
    // Naklonjenost toggle
    if (you.favor > 0 || you._favorArmed) {
      const armed = you._favorArmed && you.favor > 0;
      const fb = el("button", "action-btn favor" + (armed ? " armed" : ""), `🔮 Naklonjenost ${you.favor}/3 ${armed ? "✦" : ""}`);
      fb.addEventListener("click", () => { you._favorArmed = !you._favorArmed; render(); });
      panel.appendChild(fb);
    }
  }
}
function costHtml(cost) {
  return (cost || []).map(c => { const s = ENERGY_STYLE[c]; return `<span class="v2-cc" style="--mc:${s ? s.color : "#aaa"}">${s ? s.glyph : "◇"}</span>`; }).join("");
}

function renderLog() {
  const l = $("#v2-log"); l.innerHTML = "";
  G.log.slice(-24).forEach(line => l.appendChild(el("div", null, line)));
  l.scrollTop = l.scrollHeight;
}

/* ---------------- HUMAN INTERACTION ---------------- */
function onHandClick(inst) {
  const you = G.players[0]; const d = def(inst);
  if (G.turn !== 0 || G.over) return;
  if (d.type === "Energy") { const r = V2.playEnergy(you, inst); if (!r.ok && r.msg) toast(r.msg); render(); return; }
  if (d.type === "Champion" && d.stage === "basic") { const r = V2.summon(you, inst); if (!r.ok) toast(r.msg || "Ni mogoče priklicati."); render(); return; }
  toast("Ta tip karte (Oracle/Relic/Realm) pride v naslednji fazi v2.");
}
function onChampClick(c, owner, isYou) {
  if (G.turn !== 0 || G.over) return;
  if (isYou) {
    if (!V2.canAttack(owner, c)) { toast("Ta šampion ne more napasti (tapnjen / sick / stun)."); return; }
    selAttacker = (selAttacker === c.uid) ? null : c.uid; selAtkIndex = null; render();
  } else {
    if (selAttacker && selAtkIndex != null) doAttack({ kind: "champ", uid: c.uid });
    else toast("Najprej izberi svojega napadalca in napad.");
  }
}
function doAttack(target) {
  const you = G.players[0];
  const r = V2.attack(you, selAttacker, selAtkIndex, target);
  if (!r.ok) { toast(r.msg || "Napad ni mogoč."); return; }
  selAttacker = null; selAtkIndex = null;
  render(); checkOver();
}

$("#v2-end") && document.addEventListener("DOMContentLoaded", () => {});

/* ---------------- AI TURN ---------------- */
function endHumanTurn() {
  if (G.turn !== 0 || G.over) return;
  selAttacker = null; selAtkIndex = null;
  V2.endTurn(); render();
  if (!G.over) setTimeout(runAiTurn, 500);
}
function runAiTurn() {
  if (G.over) { checkOver(); return; }
  aiBusy = true;
  const ai = G.players[1];
  const e = ai.hand.find(i => def(i).type === "Energy"); if (e) V2.playEnergy(ai, e);
  render();
  setTimeout(aiSummon, 550);
}
function aiSummon() {
  if (G.over) { aiBusy = false; checkOver(); return; }
  const ai = G.players[1];
  if (ai.board.length < V2.BOARD_MAX) {
    const c = ai.hand.find(i => def(i).type === "Champion" && def(i).stage === "basic" && V2.canPay(ai, Array.from({ length: V2.summonCostOf(def(i)) }, () => "Any")));
    if (c) { V2.summon(ai, c); render(); setTimeout(aiSummon, 550); return; }
  }
  setTimeout(() => aiAttack(ai.board.filter(c => V2.canAttack(ai, c))), 550);
}
function aiAttack(queue) {
  if (G.over) { aiBusy = false; checkOver(); return; }
  const ai = G.players[1], you = G.players[0];
  if (!queue.length) { V2.endTurn(); aiBusy = false; render(); checkOver(); if (!G.over) toast("Tvoja poteza."); return; }
  const c = queue.shift();
  if (!V2.canAttack(ai, c)) { aiAttack(queue); return; }
  const best = aiBestAttack(c);
  if (!best) { aiAttack(queue); return; }
  // tarča: ubij šampiona če moreš, sicer pritisni obraz
  let target = { kind: "face" };
  if (you.board.length) {
    let bt = null, btDmg = -1;
    you.board.forEach(t => { const pr = V2.previewDamage(c, ai, t, def(c).attacks[best.i]); if (pr && pr.dmg > btDmg) { btDmg = pr.dmg; bt = t; } });
    if (bt && btDmg >= (bt.maxHp - bt.damage)) target = { kind: "champ", uid: bt.uid };
    else target = { kind: "face" }; // pritisk na obraz -> človek lahko blokira
  }
  const res = V2.attack(ai, c.uid, best.i, target);
  render();
  if (res && res.pending) { showBlock(() => { render(); checkOver(); if (!G.over) setTimeout(() => aiAttack(queue), 450); else aiBusy = false; }); return; }
  checkOver();
  if (G.over) { aiBusy = false; return; }
  setTimeout(() => aiAttack(queue), 600);
}
function aiBestAttack(c) {
  const ai = G.players[1];
  let best = null;
  (def(c).attacks || []).forEach((atk, i) => {
    if (!V2.canPay(ai, atk.cost, def(c).id === "celtic-lugh")) return;
    if (!best || (atk.damage || 0) > (best.dmg || 0)) best = { i, dmg: atk.damage || 0 };
  });
  return best;
}

/* ---------------- BLOCK (človek brani) ---------------- */
function showBlock(onDone) {
  const pb = G.pendingBlock; if (!pb) { onDone(); return; }
  const you = G.players[0];
  const atk = def(G.players[pb.attackerOwnerIndex].board.find(c => c.uid === pb.attackerUid));
  $("#v2-block-sub").innerHTML = `<b>${atk ? atk.name : "Napad"}</b> meri na tvoj obraz. Prestrežeš z netapnjenim šampionom ali sprejmeš škodo.`;
  const wrap = $("#v2-block-choices"); wrap.innerHTML = "";
  you.board.filter(c => !c.tapped).forEach(c => {
    const d = def(c);
    const b = el("button", "action-btn", `🛡 Prestreži z ${d.name} (❤${c.maxHp - c.damage})`);
    b.addEventListener("click", () => { $("#v2-block").classList.add("hidden"); V2.resolveBlock(c.uid); onDone(); });
    wrap.appendChild(b);
  });
  const take = el("button", "action-btn attack", "Sprejmi v obraz");
  take.addEventListener("click", () => { $("#v2-block").classList.add("hidden"); V2.resolveBlock(null); onDone(); });
  wrap.appendChild(take);
  $("#v2-block").classList.remove("hidden");
}

/* ---------------- END / OVERLAY ---------------- */
function checkOver() {
  if (!G.over) return;
  render();
  setTimeout(() => toast(G.winner === 0 ? "🏆 ZMAGA!" : "Poraz — heroj je padel."), 200);
}

/* ---------------- BOOT ---------------- */
window.addEventListener("DOMContentLoaded", () => {
  buildSetup();
  $("#v2-end").addEventListener("click", endHumanTurn);
});
