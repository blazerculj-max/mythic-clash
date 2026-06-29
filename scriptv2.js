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

/* ---------------- FX (puščica, animacije, reveal) ---------------- */
function ensureFx() {
  if (!document.getElementById("v2-fx")) { const f = el("div", "v2-fx"); f.id = "v2-fx"; document.body.appendChild(f); }
  if (!document.getElementById("v2-arrow")) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.id = "v2-arrow"; svg.classList.add("hidden");
    svg.innerHTML = `<defs><marker id="ah" markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto">
      <path d="M0,0 L6,3 L0,6 Z" fill="#ffd97a"/></marker></defs>
      <line id="v2-arrow-line" x1="0" y1="0" x2="0" y2="0" stroke="#ffd97a" stroke-width="4" stroke-linecap="round" marker-end="url(#ah)" opacity="0.9"/>`;
    document.body.appendChild(svg);
  }
}
function elCenter(e) { const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }
function findChampEl(uid) { return document.querySelector(`.v2-champ[data-uid="${uid}"]`); }
function heroElOf(side) { return document.querySelector(`.v2-${side} .v2-hero`); }
function flyDamage(x, y, dmg, kind) {
  ensureFx();
  const n = el("div", "v2-fd " + (kind || ""));
  n.textContent = kind === "heal" ? "+" + dmg : (dmg > 0 ? "-" + dmg : "0");
  n.style.left = x + "px"; n.style.top = y + "px";
  document.getElementById("v2-fx").appendChild(n);
  setTimeout(() => n.remove(), 1100);
}
function shakeEl(e) { if (!e) return; e.classList.remove("v2-hit"); void e.offsetWidth; e.classList.add("v2-hit"); setTimeout(() => e.classList.remove("v2-hit"), 450); }
function lunge(attEl, targetEl) {
  if (!attEl || !targetEl) return;
  const a = elCenter(attEl), t = elCenter(targetEl);
  const dx = (t.x - a.x) * 0.3, dy = (t.y - a.y) * 0.3;
  attEl.style.transition = "transform .13s ease-out";
  attEl.style.transform = `translate(${dx}px,${dy}px) scale(1.05)`;
  attEl.style.zIndex = "60";
  setTimeout(() => { attEl.style.transform = ""; setTimeout(() => { attEl.style.transition = ""; attEl.style.zIndex = ""; }, 160); }, 150);
}
// animira napad: napadalec (uid) -> tarča (el); izpiše škodo
function animateStrike(attUid, targetEl, dmg, dodged) {
  const attEl = findChampEl(attUid);
  lunge(attEl, targetEl);
  if (targetEl) {
    const c = elCenter(targetEl);
    setTimeout(() => {
      shakeEl(targetEl);
      if (dodged) flyDamage(c.x, c.y, 0, "dodge");
      else flyDamage(c.x, c.y, dmg, dmg > 0 ? "dmg" : "zero");
    }, 130);
  }
}
// reveal karte, ki jo odigra nasprotnik (ali kdorkoli)
function revealCard(d, label, done) {
  ensureFx();
  const st = d.pantheon ? PANTHEON_STYLE[d.pantheon] : null;
  const card = el("div", "v2-reveal-card");
  card.style.setProperty("--c-grad", st ? `linear-gradient(160deg, ${st.grad[0]}, ${st.grad[1]})` : "linear-gradient(160deg,#23233a,#3a3a52)");
  let glyph = st ? st.symbol : (ENERGY_STYLE[d.energyType] ? ENERGY_STYLE[d.energyType].glyph : (d.type === "Relic" ? "⚜" : d.type === "Oracle" ? "📜" : d.type === "Realm" ? "🏛" : "✦"));
  card.innerHTML = `<div class="v2-reveal-label">${label || "Nasprotnik igra"}</div>
    <div class="v2-reveal-art">${artImg(d, "card-art-img")}<span class="card-art-glyph">${glyph}</span></div>
    <div class="v2-reveal-name">${d.name}</div>
    <div class="v2-reveal-meta">${d.type}${d.type === "Champion" ? " · ❤" + d.hp : ""}</div>`;
  const wrap = el("div", "v2-reveal");
  wrap.appendChild(card);
  document.getElementById("v2-fx").appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add("show"));
  setTimeout(() => { wrap.classList.remove("show"); wrap.classList.add("out"); }, 1000);
  setTimeout(() => { wrap.remove(); if (done) done(); }, 1350);
}
// puščica: posodobi glede na stanje + kazalec
let arrowPos = { x: 0, y: 0 };
function arrowActive() { return (G.turn === 0 && !G.over && ((selAttacker && selAtkIndex != null) || pendingPlay)); }
function updateArrow() {
  ensureFx();
  const svg = document.getElementById("v2-arrow"), line = document.getElementById("v2-arrow-line");
  if (!arrowActive()) { svg.classList.add("hidden"); return; }
  let originEl = null;
  if (selAttacker && selAtkIndex != null) originEl = findChampEl(selAttacker);
  if (!originEl) { svg.classList.add("hidden"); return; }
  const o = elCenter(originEl);
  svg.classList.remove("hidden");
  line.setAttribute("x1", o.x); line.setAttribute("y1", o.y);
  line.setAttribute("x2", arrowPos.x || o.x); line.setAttribute("y2", arrowPos.y || o.y - 60);
}

let chosenDeck = null, chosenDiff = "normal";
let selAttacker = null, selAtkIndex = null; // izbira napada (tvoja poteza)
let pendingPlay = null;  // {inst, need:'ally'|'enemy'} — čaka izbiro tarče za urok/relic
let manaPick = null;     // {cost, lughAny, sel:[], onPaid} — ročna izbira mane
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
  // prikaži CELO roko: basic championi so izberljivi (bogata kartica), ostalo je info
  you.hand.forEach(inst => {
    const d = def(inst);
    if (d.type === "Champion" && d.stage === "basic") {
      const node = champPreviewCard(d);
      node.classList.add("pickable");
      node.addEventListener("click", () => { V2.chooseFirstChampion(inst.uid); $("#v2-pick").classList.add("hidden"); render(); });
      wrap.appendChild(node);
    } else {
      wrap.appendChild(handInfoCard(d));
    }
  });
  // gumb za mulligan
  let actions = document.getElementById("v2-pick-actions");
  if (!actions) {
    actions = el("div", "mull-actions"); actions.id = "v2-pick-actions";
    $("#v2-pick .mulligan-inner").appendChild(actions);
  }
  actions.innerHTML = "";
  const mull = el("button", "mull-btn mull", "🔄 Zamešaj roko (mulligan)");
  mull.addEventListener("click", () => { V2.mulliganHand(); showFirstPick(); });
  actions.appendChild(mull);
  $("#v2-pick").classList.remove("hidden");
}
// info kartica za ne-šampione (energija/oracle/relic/realm) v izbiri
function handInfoCard(d) {
  const st = d.pantheon ? PANTHEON_STYLE[d.pantheon] : null;
  const n = el("div", "mull-card v2-infocard");
  n.style.setProperty("--c-grad", st ? `linear-gradient(160deg, ${st.grad[0]}, ${st.grad[1]})` : "linear-gradient(160deg,#23233a,#3a3a52)");
  let glyph = st ? st.symbol : (ENERGY_STYLE[d.energyType] ? ENERGY_STYLE[d.energyType].glyph : (d.type === "Relic" ? "⚜" : d.type === "Oracle" ? "📜" : d.type === "Realm" ? "🏛" : "✦"));
  let costTag = "";
  if (d.type === "Energy") costTag = `<span class="v2-cost energy">+mana</span>`;
  else if (["Oracle", "Relic", "Realm"].includes(d.type)) costTag = `<span class="v2-cost">⬡ ${V2.manaCostOf(d)}</span>`;
  const desc = d.type === "Energy" ? `${d.energyType} mana` : (d.text || (d.effect || ""));
  n.innerHTML = `
    <div class="v2-pick-art">${artImg(d, "card-art-img")}<span class="card-art-glyph">${glyph}</span>${costTag}</div>
    <div class="v2-pick-body">
      <div class="v2-pick-name">${d.name}</div>
      <div class="v2-pick-meta">${d.type}${d.pantheon ? " · " + d.pantheon : ""}</div>
      <div class="v2-info-desc">${desc}</div>
    </div>`;
  return n;
}
function energiesUsed(d) {
  const set = [...new Set((d.attacks || []).flatMap(a => a.cost || []).filter(c => c !== "Any"))];
  if (!set.length) return `<span class="v2-pick-en none">brez specifične</span>`;
  return set.map(t => { const s = ENERGY_STYLE[t] || { color: "#888", glyph: "✦" };
    return `<span class="v2-pick-en"><span class="v2-cc" style="--mc:${s.color}">${s.glyph}</span> ${t}</span>`; }).join("");
}
function champPreviewCard(d) {
  const st = PANTHEON_STYLE[d.pantheon] || { symbol: "✦", grad: ["#333", "#555"] };
  const n = el("div", "mull-card v2-pickcard");
  n.style.setProperty("--c-grad", `linear-gradient(160deg, ${st.grad[0]}, ${st.grad[1]})`);
  const wr = [];
  if (d.weakness) wr.push(`<span class="wk">⚠ ${d.weakness}</span>`);
  if (d.resistance) wr.push(`<span class="rs">🛡 ${d.resistance}</span>`);
  n.innerHTML = `
    <div class="v2-pick-art">${artImg(d, "card-art-img")}<span class="card-art-glyph">${st.symbol}</span>
      <span class="v2-champ-hp">❤ ${d.hp}</span></div>
    <div class="v2-pick-body">
      <div class="v2-pick-name">${d.name} ${kwMini(d)}</div>
      <div class="v2-pick-meta">${d.pantheon} · ${d.rarity}</div>
      ${d.ability ? `<div class="v2-pick-ability"><b>${d.ability.name}.</b> ${d.ability.text}</div>` : ""}
      ${d.activated ? `<div class="v2-pick-ability act"><b>⚡ ${d.activated.name}</b> (${costHtml(d.activated.cost)}). ${d.activated.text}</div>` : ""}
      ${d.dodge ? `<div class="v2-pick-ability act">💨 <b>Umik ${Math.round(d.dodge * 100)}%</b> — možnost izogiba napadu.</div>` : ""}
      <div class="v2-pick-sec">Napadi</div>
      ${atkRowsHtml(d, null)}
      <div class="v2-pick-sec">Energije</div>
      <div class="v2-pick-enrow">${energiesUsed(d)}</div>
      ${wr.length ? `<div class="v2-pick-wr">${wr.join("")}</div>` : ""}
    </div>`;
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
  updateArrow();
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
  node.dataset.uid = c.uid;
  node.dataset.owner = isYou ? "you" : "opp";
  node.style.setProperty("--c-grad", `linear-gradient(160deg, ${st.grad[0]}, ${st.grad[1]})`);
  const canAtk = isYou && G.turn === 0 && !G.over && V2.canAttack(owner, c);
  if (canAtk) node.classList.add("ready");
  if (selAttacker === c.uid) node.classList.add("selected-att");
  // targetable highlight (napad ali izbira tarče za urok/relic)
  if (selAttacker && selAtkIndex != null && !isYou) node.classList.add("targetable");
  if (pendingPlay && ((pendingPlay.need === "ally" && isYou) || (pendingPlay.need === "enemy" && !isYou)))
    node.classList.add(pendingPlay.need === "enemy" ? "targetable" : "target-ally");
  node.innerHTML = `
    <div class="v2-champ-art">${artImg(d, "champ-art-img")}<span class="v2-champ-sym">${st.symbol}</span>
      <span class="v2-champ-hp">${life}</span>
      ${c.sick ? `<span class="v2-tag sick">💤</span>` : ""}${c.tapped ? `<span class="v2-tag tap">↻</span>` : ""}</div>
    <div class="v2-champ-body">
      <div class="v2-champ-name">${d.name}</div>
      <div class="v2-hpbar"><div class="v2-hpfill ${pct <= 35 ? "low" : ""}" style="width:${pct}%"></div></div>
      ${atkRowsHtml(d, isYou ? owner : null)}
      <div class="v2-status">${statusChips(c)}${kwMini(d)}</div>
    </div>`;
  node.addEventListener("click", () => onChampClick(c, owner, isYou));
  return node;
}
// vrstice napadov: cena (mana glyphi) + damage; označi plačljive (tvoja poteza)
function atkRowsHtml(d, owner) {
  if (!d.attacks || !d.attacks.length) return "";
  return `<div class="v2-atks">` + d.attacks.map(a => {
    const payable = owner && G.turn === 0 && !G.over && V2.canPay(owner, a.cost, d.id === "celtic-lugh");
    return `<div class="v2-atk${payable ? " ok" : ""}"><span class="v2-atk-cost">${costHtml(a.cost)}</span><span class="v2-atk-dmg">${a.damage}</span></div>`;
  }).join("") + `</div>`;
}
function statusChips(c) {
  const s = c.status || {}; const out = [];
  const map = { burn: "🔥", freeze: "❄️", stun: "💫", curse: "💀", blessing: "✨", shield: "🛡️", poison: "☠️", guard: "⛨" };
  for (const k in map) if (s[k]) out.push(`<span class="v2-st">${map[k]}${typeof s[k] === "number" && s[k] > 1 ? s[k] : ""}</span>`);
  return out.join("");
}
function kwMini(d) {
  const ic = [];
  if (d.charge) ic.push("⚡"); if (d.lifesteal) ic.push("🩸"); if (d.overload) ic.push("⛓");
  if (d.onEnter) ic.push("➹"); if (d.onDefeat) ic.push("☠");
  if (d.activated) ic.push("✦"); if (d.dodge) ic.push("💨");
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
    else if (d.type === "Energy") cost = `<span class="v2-cost energy">+mana</span>`;
    else if (["Oracle", "Relic", "Realm"].includes(d.type)) cost = `<span class="v2-cost">⬡ ${V2.manaCostOf(d)}</span>`;
    const playable = isPlayable(inst);
    if (playable) node.classList.add("playable");
    let glyph = st ? st.symbol : (ENERGY_STYLE[d.energyType] ? ENERGY_STYLE[d.energyType].glyph : "✦");
    node.innerHTML = `<div class="v2-hc-art">${artImg(d, "card-art-img")}<span class="card-art-glyph">${glyph}</span>${cost}</div>
      <div class="v2-hc-body"><div class="v2-hc-name">${d.name}</div>
      <div class="v2-hc-meta">${d.type}${d.type === "Champion" ? " ❤" + d.hp : ""}</div>
      ${d.type === "Champion" ? atkRowsHtml(d, null) : ""}</div>`;
    node.addEventListener("click", () => onHandClick(inst));
    h.appendChild(node);
  });
  $("#v2-hand").classList.toggle("dim", G.turn !== 0 || G.over);
}
function isPlayable(inst) {
  const you = G.players[0]; const d = def(inst);
  if (G.turn !== 0 || G.over || G.pendingBlock || manaPick) return false;
  if (d.type === "Energy") return !you.playedEnergyThisTurn;
  if (d.type === "Champion") return d.stage === "basic" && you.board.length < V2.BOARD_MAX && V2.canPay(you, Array.from({ length: V2.summonCostOf(d) }, () => "Any"));
  if (["Oracle", "Relic", "Realm"].includes(d.type)) {
    if (!V2.canPay(you, Array.from({ length: V2.manaCostOf(d) }, () => "Any"))) return false;
    const need = V2.cardNeedsTarget(d);
    if (need === "ally" && !you.board.length) return false;
    if (need === "enemy" && !G.players[1].board.length) return false;
    if (d.type === "Realm" && G.realm === d.id) return false;
    return true;
  }
  return false;
}

function renderActions() {
  const panel = $("#v2-actions"); panel.innerHTML = "";
  if (G.over) { panel.appendChild(el("div", "hint", G.winner === 0 ? "ZMAGA! 🏆" : "Poraz.")); return; }
  if (G.turn !== 0) { panel.appendChild(el("div", "hint", "Nasprotnik je na potezi…")); return; }
  const you = G.players[0];

  // ročna izbira mane
  if (manaPick) {
    panel.appendChild(el("div", "hint", `Plačaj: ${costHtml(manaPick.cost)} — klikni katero mano porabiš (${manaPick.sel.length}/${manaPick.cost.length}).`));
    const row = el("div", "v2-manapick");
    you.mana.forEach((m, i) => {
      if (m.tapped && !manaPick.sel.includes(i)) return;
      const s = ENERGY_STYLE[m.type] || { color: "#888", glyph: "✦" };
      const b = el("button", "v2-mp" + (manaPick.sel.includes(i) ? " sel" : ""), `${s.glyph} ${m.type}`);
      b.style.setProperty("--mc", s.color);
      b.addEventListener("click", () => {
        const k = manaPick.sel.indexOf(i);
        if (k >= 0) manaPick.sel.splice(k, 1); else manaPick.sel.push(i);
        render();
      });
      row.appendChild(b);
    });
    panel.appendChild(row);
    const ok = manaSelValid(manaPick.sel, manaPick.cost, manaPick.lughAny);
    const confirm = el("button", "action-btn end-turn", "Potrdi plačilo");
    confirm.disabled = !ok;
    confirm.addEventListener("click", () => { const cb = manaPick.onPaid, idx = manaPick.sel.slice(); manaPick = null; cb(idx); });
    const cancel = el("button", "action-btn", "Prekliči");
    cancel.addEventListener("click", () => { manaPick = null; render(); });
    panel.appendChild(confirm); panel.appendChild(cancel);
    return;
  }

  // čaka tarčo za urok/relic
  if (pendingPlay) {
    panel.appendChild(el("div", "hint", `Izberi ${pendingPlay.need === "enemy" ? "nasprotnikovega" : "svojega"} šampiona za <b>${def(pendingPlay.inst).name}</b>.`));
    const cancel = el("button", "action-btn", "Prekliči");
    cancel.addEventListener("click", () => { pendingPlay = null; render(); });
    panel.appendChild(cancel);
    return;
  }

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
      // aktivirana (obrambna/utility) sposobnost — namesto napada
      if (d.activated) {
        const a = d.activated;
        const canAct = V2.canPay(you, a.cost, d.id === "celtic-lugh");
        const ab = el("button", "action-btn ability");
        ab.innerHTML = `⚡ ${a.name} <span class="ab-cost">${costHtml(a.cost)}</span>`;
        ab.disabled = !canAct;
        ab.title = a.text;
        ab.addEventListener("click", () => doActivate());
        panel.appendChild(ab);
      }
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
// plačaj cost: če ni izbire (untapped == cost) avtomatsko; sicer ročna izbira mane
function payThen(cost, lughAny, onPaid) {
  const you = G.players[0];
  if (!V2.canPay(you, cost, lughAny)) { toast("Premalo mane."); return; }
  const untapped = you.mana.map((m, i) => i).filter(i => !you.mana[i].tapped);
  if (untapped.length === cost.length) { onPaid(untapped); return; }
  manaPick = { cost, lughAny, sel: [], onPaid };
  selAttacker = selAttacker; // ohrani
  toast("Izberi mano za plačilo (" + cost.length + ").");
  render();
}
function manaSelValid(sel, cost, lughAny) {
  const you = G.players[0];
  if (sel.length !== cost.length) return false;
  const pool = sel.map(i => you.mana[i]).filter(m => m && !m.tapped).map(m => m.type);
  if (pool.length !== cost.length) return false;
  const specific = cost.filter(c => c !== "Any"); const anyN = cost.filter(c => c === "Any").length;
  const tmp = pool.slice();
  for (const need of specific) { let k = tmp.indexOf(need); if (k < 0 && lughAny && tmp.length) k = 0; if (k < 0) return false; tmp.splice(k, 1); }
  return tmp.length === anyN;
}

function onHandClick(inst) {
  const you = G.players[0]; const d = def(inst);
  if (G.turn !== 0 || G.over || manaPick) return;
  if (d.type === "Energy") { const r = V2.playEnergy(you, inst); if (!r.ok && r.msg) toast(r.msg); render(); return; }
  if (d.type === "Champion") {
    if (d.stage !== "basic") { toast("Ascension karte (zaenkrat) v v2 ne moreš priklicati."); return; }
    if (you.board.length >= V2.BOARD_MAX) { toast("Board je poln (3)."); return; }
    const cost = Array.from({ length: V2.summonCostOf(d) }, () => "Any");
    payThen(cost, false, idx => { const r = V2.summon(you, inst, idx); if (!r.ok) toast(r.msg || "Ni mogoče."); manaPick = null; render(); });
    return;
  }
  if (["Oracle", "Relic", "Realm"].includes(d.type)) {
    const need = V2.cardNeedsTarget(d);
    if (need) {
      pendingPlay = { inst, need };
      selAttacker = null; selAtkIndex = null;
      toast(need === "enemy" ? "Izberi nasprotnikovega šampiona." : "Izberi svojega šampiona.");
      render();
      return;
    }
    const cost = Array.from({ length: V2.manaCostOf(d) }, () => "Any");
    payThen(cost, false, idx => { const r = V2.playCard(you, inst, { manaIdx: idx }); if (!r.ok) toast(r.msg || "Ni mogoče."); manaPick = null; render(); });
    return;
  }
}

function onChampClick(c, owner, isYou) {
  if (G.turn !== 0 || G.over || manaPick) return;
  // 1) izbira tarče za urok/relic
  if (pendingPlay) {
    const want = pendingPlay.need;
    if ((want === "ally" && isYou) || (want === "enemy" && !isYou)) {
      const inst = pendingPlay.inst; const d = def(inst);
      const cost = Array.from({ length: V2.manaCostOf(d) }, () => "Any");
      const targetUid = c.uid;
      pendingPlay = null;
      payThen(cost, false, idx => { const r = V2.playCard(G.players[0], inst, { targetUid, manaIdx: idx }); if (!r.ok) toast(r.msg || "Ni mogoče."); manaPick = null; render(); });
      return;
    } else { toast(want === "ally" ? "Izberi SVOJEGA šampiona." : "Izberi NASPROTNIKOVEGA šampiona."); return; }
  }
  // 2) napad
  if (isYou) {
    if (!V2.canAttack(owner, c)) { toast("Ta šampion ne more napasti (tapnjen / sick / stun)."); return; }
    if (selAttacker === c.uid) { selAttacker = null; selAtkIndex = null; render(); return; }
    selAttacker = c.uid; selAtkIndex = null;
    // če ima samo en plačljiv napad, ga samodejno izberi -> puščica se takoj pokaže
    const atks = def(c).attacks || [];
    const payable = atks.map((a, i) => i).filter(i => V2.canPay(owner, atks[i].cost, def(c).id === "celtic-lugh"));
    if (payable.length === 1) selAtkIndex = payable[0];
    render();
  } else {
    if (selAttacker && selAtkIndex != null) doAttack({ kind: "champ", uid: c.uid });
    else toast("Najprej izberi svojega napadalca in napad.");
  }
}

function doActivate() {
  const you = G.players[0];
  const c = you.board.find(x => x.uid === selAttacker); if (!c || !def(c).activated) return;
  payThen(def(c).activated.cost, def(c).id === "celtic-lugh", idx => {
    const r = V2.activateAbility(you, selAttacker, idx);
    if (!r.ok) toast(r.msg || "Ni mogoče.");
    selAttacker = null; selAtkIndex = null; manaPick = null;
    render();
  });
}
function doAttack(target) {
  const you = G.players[0];
  const c = you.board.find(x => x.uid === selAttacker); if (!c) return;
  const atk = def(c).attacks[selAtkIndex];
  const attUid = selAttacker, atkIdx = selAtkIndex;
  payThen(atk.cost, def(c).id === "celtic-lugh", idx => {
    const targetEl = target.kind === "champ" ? findChampEl(target.uid) : heroElOf("opp");
    const r = V2.attack(you, attUid, atkIdx, target, idx);
    if (!r.ok) { toast(r.msg || "Napad ni mogoč."); manaPick = null; render(); return; }
    selAttacker = null; selAtkIndex = null; manaPick = null;
    updateArrow();
    animateStrike(attUid, targetEl, r.dmg, r.dodged);
    setTimeout(() => { render(); checkOver(); }, 300);
  });
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
    if (c) { const dd = def(c); revealCard(dd, "Nasprotnik prikliče", () => { V2.summon(ai, c); render(); setTimeout(aiSummon, 350); }); return; }
  }
  setTimeout(aiSpells, 400);
}
function aiSpells() {
  if (G.over) { aiBusy = false; checkOver(); return; }
  const ai = G.players[1], you = G.players[0];
  // odigraj en smiseln Oracle/Relic/Realm, če je mana in tarča
  const inst = ai.hand.find(i => {
    const d = def(i); if (!["Oracle", "Relic", "Realm"].includes(d.type)) return false;
    if (!V2.canPay(ai, Array.from({ length: V2.manaCostOf(d) }, () => "Any"))) return false;
    const need = V2.cardNeedsTarget(d);
    if (need === "ally" && !ai.board.length) return false;
    if (need === "enemy" && !you.board.length) return false;
    if (d.type === "Realm" && G.realm === d.id) return false;
    return true;
  });
  if (inst) {
    const need = V2.cardNeedsTarget(def(inst));
    let targetUid = null;
    if (need === "enemy") targetUid = (you.board[0] || {}).uid;
    else if (need === "ally") targetUid = (ai.board.slice().sort((a, b) => (b.maxHp - b.damage) - (a.maxHp - a.damage))[0] || {}).uid;
    const dd = def(inst);
    revealCard(dd, "Nasprotnik igra", () => { V2.playCard(ai, inst, { targetUid }); render(); setTimeout(aiSpells, 300); });
    return; // morda še en
  }
  setTimeout(aiAbilities, 400);
}
function aiAbilities() {
  if (G.over) { aiBusy = false; checkOver(); return; }
  const ai = G.players[1];
  // aktiviraj obrambno/heal sposobnost na poškodovanem šampionu (HP < 55%)
  const c = ai.board.find(x => V2.canActivate && V2.canActivate(ai, x) &&
    (x.maxHp - x.damage) / x.maxHp < 0.55 &&
    ["healSelf30", "guard", "shieldSelf", "healBoard20"].includes(def(x).activated.effect));
  if (c) { V2.activateAbility(ai, c.uid); render(); setTimeout(aiAbilities, 500); return; }
  setTimeout(() => aiAttack(ai.board.filter(x => V2.canAttack(ai, x))), 450);
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
  const targetEl = target.kind === "champ" ? findChampEl(target.uid) : heroElOf("you");
  const res = V2.attack(ai, c.uid, best.i, target);
  if (res && res.pending) { render(); showBlock(() => { render(); checkOver(); if (!G.over) setTimeout(() => aiAttack(queue), 450); else aiBusy = false; }); return; }
  animateStrike(c.uid, targetEl, res.dmg, res.dodged);
  setTimeout(() => {
    render(); checkOver();
    if (G.over) { aiBusy = false; return; }
    setTimeout(() => aiAttack(queue), 350);
  }, 320);
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
  ensureFx();
  buildSetup();
  $("#v2-end").addEventListener("click", endHumanTurn);
  document.addEventListener("mousemove", (e) => {
    arrowPos = { x: e.clientX, y: e.clientY };
    if (arrowActive()) updateArrow();
  });
});
