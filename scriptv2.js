/* ============================================================================
   MYTHIC CLASH v2 — UI (script-v2.js)  [samostojen prototip, v2.html]
============================================================================ */
const V2 = window.V2;
const G = V2.G;
const def = V2.def;
const $ = s => document.querySelector(s);
function el(t, c, h) { const n = document.createElement(t); if (c) n.className = c; if (h != null) n.innerHTML = h; return n; }
function artImg(d, cls) { if (!d || !d.id) return ""; const artId = d._baseId || d.id; return `<img class="${cls}" src="art/${encodeURIComponent(artId)}.png" alt="" decoding="async" onerror="this.style.display='none'">`; }
let toastTimer;
function toast(m) { const t = $("#toast"); t.textContent = m; t.classList.remove("hidden"); t.style.opacity = "1"; clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.style.opacity = "0"; }, 1800); }

/* ---------------- TOOLTIPS (hover + dvoklik za pin) ----------------
   Vsak element z atributoma data-tip (besedilo) in po želji data-tip-title
   dobi razlago. Hover prikaže, dvoklik "pripne" (za touch/branje). */
function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
let tipPinned = false;
function ensureTip() {
  let t = document.getElementById("v2-tip");
  if (!t) { t = el("div", "v2-tip hidden"); t.id = "v2-tip"; document.body.appendChild(t); }
  return t;
}
function showTip(target, x, y) {
  const t = ensureTip();
  const title = target.getAttribute("data-tip-title");
  const body = target.getAttribute("data-tip");
  if (!body && !title) return;
  t.innerHTML = (title ? `<div class="v2-tip-title">${esc(title)}</div>` : "") +
    `<div class="v2-tip-body">${esc(body).replace(/\n/g, "<br>")}</div>`;
  t.classList.remove("hidden");
  const r = t.getBoundingClientRect();
  let px = x + 14, py = y + 16;
  if (px + r.width > window.innerWidth - 8) px = x - r.width - 14;
  if (py + r.height > window.innerHeight - 8) py = y - r.height - 16;
  t.style.left = Math.max(6, px) + "px";
  t.style.top = Math.max(6, py) + "px";
}
function hideTip(force) { if (tipPinned && !force) return; const t = document.getElementById("v2-tip"); if (t) t.classList.add("hidden"); }
function initTooltips() {
  document.addEventListener("mouseover", e => {
    const tgt = e.target.closest("[data-tip],[data-tip-title]"); if (!tgt) return;
    if (tipPinned) return; showTip(tgt, e.clientX, e.clientY);
  });
  document.addEventListener("mousemove", e => {
    if (tipPinned) return;
    const tgt = e.target.closest("[data-tip],[data-tip-title]");
    if (tgt) showTip(tgt, e.clientX, e.clientY); else hideTip();
  });
  document.addEventListener("mouseout", e => {
    const tgt = e.target.closest("[data-tip],[data-tip-title]"); if (tgt && !tipPinned) hideTip();
  });
  // dvoklik = pripni razlago (uporabno na dotik/za branje)
  document.addEventListener("dblclick", e => {
    const tgt = e.target.closest("[data-tip],[data-tip-title]");
    if (tgt) { e.preventDefault(); tipPinned = true; showTip(tgt, e.clientX, e.clientY); }
    else { tipPinned = false; hideTip(true); }
  });
  document.addEventListener("click", e => { if (tipPinned && !e.target.closest("#v2-tip")) { tipPinned = false; hideTip(true); } });
}

/* Razlage učinkov / statusov / ključnih besed (za tooltipe) */
const STATUS_TEXT = {
  burn: ["🔥 Ožig", "Šampion gori — prejema dodatno škodo skozi čas."],
  freeze: ["❄️ Zmrznjen", "Prejema +20% škode."],
  stun: ["💫 Omamljen", "Prejema +10% škode; lahko izpusti napad."],
  curse: ["💀 Prekletstvo", "Njegovi napadi zadajo −15 škode."],
  blessing: ["✨ Blagoslov", "Njegovi napadi zadajo +15 škode (nekaj potez)."],
  shield: ["🛡️ Shield", "Naslednji prejeti udarec −20 škode (nato izgine)."],
  poison: ["☠️ Strup", "Prejema škodo skozi čas."],
  guard: ["⛨ Obrambna drža", "Prejema −50% škode do naslednje poteze."],
};
const KEYWORD_TEXT = {
  charge: ["⚡ Naval", "Lahko napade že v isti potezi, ko je priklican."],
  lifesteal: ["🩸 Krvoses", "Ko zada škodo, se za toliko pozdravi."],
  overload: ["⛓ Preobremenitev", "Po močnem napadu ostane tapnjen dlje."],
  onEnter: ["➹ Ob prihodu", "Sproži učinek, ko pride na bojišče."],
  onDefeat: ["☠ Ob porazu", "Sproži učinek, ko je premagan."],
  dodge: ["💨 Umik", "Ima možnost, da se popolnoma izogne napadu."],
  pierce: ["🗡️ Prebod", "Napadi ignorirajo Shield branilca."],
  thorns: ["🌵 Trni", "Napadalec ob udarcu nanj utrpi škodo."],
};
const EFFECT_TEXT = {
  stunOmen: "Omen met: ob ugodnem znamenju je branilec omamljen.",
  selfShield: "Ta šampion dobi Shield.",
  selfDamage20: "Zada polno škodo, a šampion utrpi 20 povratne škode.",
  draw3: "Potegneš 3 karte.", draw2: "Potegneš 2 karti.", draw2attach: "Potegneš 2 karti.",
  healActive60: "Izbrani šampion +60 HP.", healActive40: "Izbrani šampion +40 HP.",
  healReserve30: "Vsi tvoji šampioni +30 HP.", blessActive: "Izbrani šampion dobi Blagoslov.",
  shieldAll: "Vsi tvoji šampioni dobijo Shield.", curseEnemy: "Nasprotnikov šampion je preklet (−15 škode).",
  burnEnemy: "Nasprotnikov šampion gori.", freezeEnemy: "Nasprotnikov šampion zamrzne (+20% škode).",
  dmgEnemy30: "Zada 30 škode nasprotnikovemu šampionu.",
  apotheosis: "To potezo tvoja skalirna izplačila (motorji) štejejo dvojno.",
  healSelf30: "Ta šampion +30 HP.", healBoard20: "Vsi tvoji šampioni +20 HP.",
  healSelf20: "Ta šampion +20 HP.", healBoard15: "Vsi tvoji šampioni +15 HP.",
  tauntSelf: "Ta šampion prevzame Taunt (zid) do tvoje naslednje poteze.",
  guardSelf: "Obrambna drža: −50% prejete škode do tvoje naslednje poteze.",
  drawSelf: "Potegneš 1 karto.",
  shieldSelf: "Ta šampion dobi Shield (−20 naslednji udarec).",
  guard: "Obrambna drža: −50% prejete škode do naslednje poteze.",
  fortify: "Tapni: dobi Taunt (do naslednje poteze) + Shield. Zabetoniraj se.",
  evolve: "Tapni: +1 urjenje. Pri 3/3 se šampion razvije v močnejšo verzijo.",
  blessSelf: "Ta šampion dobi Blagoslov.",
  dmgPlus20: "Pritrjeni šampion zada +20 škode.", dmgReduce20: "Pritrjeni šampion prejme −20 škode.",
  healEndTurn10: "Pritrjeni šampion se ob koncu poteze pozdravi 10 HP.",
};
// razlaga statusov/ključnih besed — kaj pomenijo za igro (za hover)
const KW_GLOSSARY = {
  curse: "🟣 Prekletstvo — žrtev zada −15 škode pri svojih napadih.",
  blessing: "🟡 Blagoslov — +15 škode pri napadih (2 potezi).",
  burn: "🔥 Ožig — −15 HP na koncu vsake poteze.",
  freeze: "❄ Zmrznitev — prejme +20% škode; vsako potezo 50% možnost odtajanja.",
  stun: "💫 Omama — ta šampion ne more napasti to potezo.",
  poison: "☠ Strup — naraščajoča škoda vsak konec poteze.",
  shield: "🛡 Shield — naslednji udarec nase je blokiran (−20/−30 škode).",
  guard: "🔰 Garda — −50% prejete škode do naslednje poteze.",
  taunt: "🧱 Taunt (zid) — nasprotnik mora najprej napasti tega branilca.",
  lifesteal: "🩸 Krvoses — napadalec se pozdravi za toliko, kolikor zada.",
  dodge: "💨 Umik — možnost, da se popolnoma izogne napadu.",
  decay: "⌛ Razpad — izgublja HP vsak konec poteze.",
  charge: "⚡ Naval — lahko napade že v potezi priklica.",
};
// iz učinka napada izlušči, katere statuse povzroči (za razlago)
function kwsForEffect(e) {
  if (!e) return [];
  if (/curse/i.test(e)) return ["curse"];
  if (/burn|fireball/i.test(e)) return ["burn"];
  if (/freeze|frost|nova/i.test(e)) return ["freeze"];
  if (/stun|bolt/i.test(e)) return ["stun"];
  if (/poison/i.test(e)) return ["poison"];
  if (/shield/i.test(e)) return ["shield"];
  if (/guard/i.test(e)) return ["guard"];
  if (/taunt/i.test(e)) return ["taunt"];
  if (/bless|reserveBuff|buffBoard/i.test(e)) return ["blessing"];
  return [];
}
function kwGlossaryLines(kws) {
  const seen = new Set(); const out = [];
  kws.forEach(k => { if (KW_GLOSSARY[k] && !seen.has(k)) { seen.add(k); out.push(KW_GLOSSARY[k]); } });
  return out;
}
function atkTipText(atk) {
  let s = `${atk.damage} škode · cena ${(atk.cost || []).length} mane`;
  if (atk.text) s += "\n" + atk.text;
  if (atk.effect && EFFECT_TEXT[atk.effect]) s += "\nUčinek: " + EFFECT_TEXT[atk.effect];
  const g = kwGlossaryLines(kwsForEffect(atk.effect));
  if (g.length) s += "\n\n" + g.join("\n");
  return s;
}
function cardTipText(d) {
  const lines = [];
  if (d.type === "Champion") {
    lines.push(`Šampion · ${d.pantheon} · ❤${d.hp}`);
    (d.attacks || []).forEach(a => lines.push(`• ${a.name}: ${a.damage} dmg (${(a.cost || []).length} mane)`));
    if (d.ability) lines.push(`Sposobnost — ${d.ability.name}: ${d.ability.text}`);
    if (d.activated) lines.push(`⚡ ${d.activated.name}: ${d.activated.text}`);
    if (d.weakness) lines.push(`Šibkost: ${d.weakness}  ·  Odpornost: ${d.resistance || "—"}`);
    // razlaga ključnih besed te karte
    const kws = [];
    (d.attacks || []).forEach(a => kwsForEffect(a.effect).forEach(k => kws.push(k)));
    ["taunt", "lifesteal", "dodge", "decay", "charge"].forEach(k => { if (d[k]) kws.push(k); });
    const g = kwGlossaryLines(kws);
    if (g.length) lines.push("—", ...g);
  } else {
    lines.push(`${d.type}${d.pantheon ? " · " + d.pantheon : ""}`);
    if (d.text) lines.push(d.text);
    const g = kwGlossaryLines(kwsForEffect(d.effect));
    if (g.length) lines.push("—", ...g);
  }
  return lines.join("\n");
}
function tipAttr(title, body) { return `data-tip-title="${esc(title)}" data-tip="${esc(body)}"`; }

/* ---------------- ZVOK (audio motor) ---------------- */
const SFX = {
  muted: localStorage.getItem("mc-muted") === "1",
  vol: (() => { const v = parseFloat(localStorage.getItem("mc-vol")); return isNaN(v) ? 0.7 : v; })(),
  base: {}, last: {}, unlocked: false,
  // dogodek -> ime datoteke v audio/
  map: { summon: "summon", spell: "spell", hit: "hit", hitBig: "hit_big", heal: "heal", draw: "draw", mana: "mana", energy: "energy", hero: "hero", turn: "turn", death: "death", click: "click", victory: "victory", defeat: "defeat" },
  // relativna glasnost posameznega zvoka (da niso vsi enako glasni)
  gain: { click: 0.45, mana: 0.5, draw: 0.55, hit: 0.8, hitBig: 1.0, death: 0.7, heal: 0.6, turn: 0.7, summon: 0.85, spell: 0.85, energy: 0.7, hero: 0.9, victory: 0.95, defeat: 0.95 },
  // min. razmik (ms) za hitro ponavljajoče se zvoke, da se ne zlijejo v hrup
  throttle: { mana: 70, hit: 55, draw: 90, heal: 130, summon: 90, click: 40, energy: 90 },
  preload() { for (const k in this.map) { try { const a = new Audio("audio/" + this.map[k] + ".mp3"); a.preload = "auto"; this.base[k] = a; } catch (e) {} } },
  unlock() { if (this.unlocked) return; this.unlocked = true; const a = this.base.click; if (a) { const c = a.cloneNode(); c.volume = 0; c.play().then(() => { c.pause(); }).catch(() => {}); } },
  play(key) {
    if (this.muted) return;
    const b = this.base[key]; if (!b) return;
    const now = performance.now(), th = this.throttle[key] || 0;
    if (th && this.last[key] && now - this.last[key] < th) return;
    this.last[key] = now;
    try { const a = b.cloneNode(); a.volume = Math.max(0, Math.min(1, this.vol * (this.gain[key] != null ? this.gain[key] : 0.8))); a.play().catch(() => {}); } catch (e) {}
  },
  setMuted(m) { this.muted = m; try { localStorage.setItem("mc-muted", m ? "1" : "0"); } catch (e) {} },
};
SFX.preload();
function ensureSoundBtn() {
  if (document.getElementById("mc-sound")) return;
  const b = el("button", "mc-sound-btn"); b.id = "mc-sound"; b.title = "Zvok vklop/izklop";
  const upd = () => { b.textContent = SFX.muted ? "🔇" : "🔊"; b.classList.toggle("muted", SFX.muted); };
  upd();
  b.addEventListener("click", () => { SFX.setMuted(!SFX.muted); upd(); if (!SFX.muted) SFX.play("click"); });
  document.body.appendChild(b);
}

/* ---------------- FX (puščica, animacije, reveal) ---------------- */
function ensureFx() {
  if (!document.getElementById("v2-fx")) { const f = el("div", "v2-fx"); f.id = "v2-fx"; document.body.appendChild(f); }
  if (!document.getElementById("v2-arrow")) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.id = "v2-arrow"; svg.classList.add("hidden");
    svg.innerHTML = `<defs>
      <marker id="ah" markerWidth="9" markerHeight="9" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#ffd97a"/></marker>
      <filter id="arrowglow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <path id="v2-arrow-line" d="" fill="none" stroke="#ffd97a" stroke-width="5" stroke-linecap="round" marker-end="url(#ah)" filter="url(#arrowglow)" opacity="0.95"/>`;
    document.body.appendChild(svg);
  }
}
function elCenter(e) { const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }
function findChampEl(uid) { return document.querySelector(`.v2-champ[data-uid="${uid}"]`); }
function heroElOf(side) { return document.querySelector(`.v2-${side} .v2-hero`); }
function flyDamage(x, y, dmg, kind) {
  ensureFx();
  const size = dmg >= 50 ? " crit" : dmg >= 30 ? " big" : "";
  const n = el("div", "v2-fd " + (kind || "") + size);
  n.textContent = kind === "heal" ? "+" + dmg : (dmg > 0 ? "-" + dmg : "0");
  // rahel naključni zamik, da se zaporedni številki ne prekrijeta
  n.style.left = (x + (Math.random() * 22 - 11)) + "px"; n.style.top = y + "px";
  document.getElementById("v2-fx").appendChild(n);
  setTimeout(() => n.remove(), 1100);
}
// blisk ob udarcu (Balatro/HS impact)
function impactBurst(x, y, big) {
  ensureFx();
  const n = el("div", "v2-impact" + (big ? " big" : ""));
  n.style.left = x + "px"; n.style.top = y + "px";
  document.getElementById("v2-fx").appendChild(n);
  setTimeout(() => n.remove(), 480);
}
// tresenje zaslona (bojišča) ob močnem udarcu / udarcu v heroja
function shakeScreen(big) {
  const f = document.querySelector(".v2-field"); if (!f) return;
  f.classList.remove("v2-shake", "v2-shake-big"); void f.offsetWidth;
  f.classList.add(big ? "v2-shake-big" : "v2-shake");
  setTimeout(() => f.classList.remove("v2-shake", "v2-shake-big"), big ? 440 : 320);
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
/* ---------- SPELL PROJEKTIL (svetlobni izstrelek do tarče) ---------- */
function spellFxKind(e) {
  e = e || "";
  if (/freeze|frost|nova/i.test(e)) return "frost";
  if (/heal/i.test(e)) return "heal";
  if (/curse/i.test(e)) return "curse";
  if (/bless|shield|buff|apotheosis|draw/i.test(e)) return "gold";
  if (/dmg|fireball|bolt|aoe|burn|face/i.test(e)) return "fire";
  return "fire";
}
function spellProjectile(fromEl, toEl, kind, done) {
  ensureFx();
  if (!fromEl || !toEl) { done && done(); return; }
  const a = elCenter(fromEl), b = elCenter(toEl);
  const orb = el("div", "v2-proj " + (kind || "fire"));
  document.getElementById("v2-fx").appendChild(orb);
  const t0 = performance.now(), dur = 380;
  const cx = (a.x + b.x) / 2, cy = Math.min(a.y, b.y) - 90; // lok navzgor
  let frame = 0;
  (function step(now) {
    const t = Math.min(1, (now - t0) / dur), u = 1 - t;
    const x = u * u * a.x + 2 * u * t * cx + t * t * b.x;
    const y = u * u * a.y + 2 * u * t * cy + t * t * b.y;
    orb.style.left = x + "px"; orb.style.top = y + "px";
    if (++frame % 3 === 0) { // sled
      const d = el("div", "v2-proj-trail " + (kind || "fire"));
      d.style.left = x + "px"; d.style.top = y + "px";
      document.getElementById("v2-fx").appendChild(d);
      setTimeout(() => d.remove(), 320);
    }
    if (t < 1) requestAnimationFrame(step);
    else { orb.remove(); done && done(); }
  })(performance.now());
}
// urok: FX od izvajalca do tarče; onDone -> render (stanje je že uveljavljeno)
function castSpellFx(byYou, d, targetUid, done) {
  const e = d.effect || "";
  const kind = spellFxKind(e);
  const from = heroElOf(byYou ? "you" : "opp");
  const enemySide = byYou ? "opp" : "you";
  let to = null, aoe = false, face = false;
  if (targetUid != null) to = findChampEl(targetUid);
  else if (/faceDmg/.test(e)) { to = heroElOf(enemySide); face = true; }
  else if (/^aoe/.test(e)) { to = document.querySelector(".v2-" + enemySide + " .v2-board-row"); aoe = true; }
  if (!to || !from) { // samo-učinek (vlek/ščit/apoteoza): zlat sij nad izvajalcem
    if (from) { const c = elCenter(from); impactBurst(c.x, c.y, false); }
    done && done(); return;
  }
  spellProjectile(from, to, kind, () => {
    if (aoe) {
      document.querySelectorAll('.v2-' + enemySide + ' .v2-champ').forEach(ch => { const c = elCenter(ch); impactBurst(c.x, c.y, false); shakeEl(ch); });
      shakeScreen(false);
    } else {
      const c = elCenter(to); impactBurst(c.x, c.y, true); shakeEl(to);
      if (face) { heroHitFx(to, enemySide === "you"); shakeScreen(true); }
    }
    SFX.play("hit");
    done && done();
  });
}
/* ---------- HERO HIT (razpoka + rdeč blisk zaslona) ---------- */
function heroHitFx(heroEl, isYou) {
  ensureFx();
  if (heroEl) {
    const ava = heroEl.querySelector(".v2-hero-ava") || heroEl;
    const cr = el("div", "v2-crack");
    ava.appendChild(cr);
    setTimeout(() => cr.remove(), 650);
  }
  if (isYou) { // rdeč vinjetni blisk le ob udarcu v TVOJEGA heroja
    const f = el("div", "v2-redflash");
    document.getElementById("v2-fx").appendChild(f);
    requestAnimationFrame(() => f.classList.add("show"));
    setTimeout(() => f.remove(), 500);
  }
}
function animateStrike(attUid, targetEl, dmg, dodged, retal) {
  const attEl = findChampEl(attUid);
  lunge(attEl, targetEl);
  if (targetEl) {
    const c = elCenter(targetEl);
    const isHero = targetEl.classList.contains("v2-hero");
    setTimeout(() => {
      shakeEl(targetEl);
      if (isHero && !dodged && dmg > 0) {
        targetEl.classList.add("hero-hurt"); setTimeout(() => targetEl.classList.remove("hero-hurt"), 600);
        heroHitFx(targetEl, !!targetEl.closest(".v2-you"));
      }
      if (dodged) { flyDamage(c.x, c.y, 0, "dodge"); }
      else {
        flyDamage(c.x, c.y, dmg, dmg > 0 ? "dmg" : "zero");
        if (dmg > 0) { impactBurst(c.x, c.y, dmg >= 40); shakeScreen(isHero || dmg >= 50); SFX.play(dmg >= 40 ? "hitBig" : "hit"); }
      }
      // povratni udarec (retaliation): škoda na napadalcu
      if (retal > 0 && attEl) { const a = elCenter(attEl); setTimeout(() => { shakeEl(attEl); flyDamage(a.x, a.y, retal, "retal"); }, 120); }
    }, 130);
  }
}
// sweep banner ob menjavi poteze (feel)
let turnBannerTimer;
function showTurnBanner(text, cls) {
  ensureFx();
  const fx = document.getElementById("v2-fx");
  const old = fx.querySelector(".v2-turnbanner"); if (old) old.remove();
  const b = el("div", "v2-turnbanner " + (cls || ""), `<span>${text}</span>`);
  fx.appendChild(b);
  if (cls === "you") SFX.play("turn");
  requestAnimationFrame(() => b.classList.add("show"));
  clearTimeout(turnBannerTimer);
  turnBannerTimer = setTimeout(() => { b.classList.add("out"); setTimeout(() => b.remove(), 350); }, 800);
}
// reveal karte, ki jo odigra nasprotnik (ali kdorkoli)
function revealCard(d, label, done) {
  ensureFx();
  const st = d.pantheon ? PANTHEON_STYLE[d.pantheon] : null;
  const card = el("div", "v2-reveal-card");
  card.style.setProperty("--c-grad", st ? `linear-gradient(160deg, ${st.grad[0]}, ${st.grad[1]})` : "linear-gradient(160deg,#23233a,#3a3a52)");
  let glyph = st ? st.symbol : (ENERGY_STYLE[d.energyType] ? ENERGY_STYLE[d.energyType].glyph : (d.type === "Relic" ? "⚜" : d.type === "Oracle" ? "📜" : d.type === "Realm" ? "🏛" : "✦"));
  // opis učinka, da vidiš KAJ karta naredi
  let desc = "";
  if (d.type === "Champion") {
    const sig = (d.attacks || []).find(a => a.effect && !a.basic);
    desc = d.ability ? `${d.ability.name}: ${d.ability.text}` : (sig ? sig.text : "");
  } else {
    desc = d.text || (typeof EFFECT_TEXT !== "undefined" ? EFFECT_TEXT[d.effect] : "") || "";
  }
  const cost = d.type === "Champion" ? `⬡${V2.summonCostOf(d)}` : (d.type === "Energy" ? "+energija" : `⬡${V2.manaCostOf(d)}`);
  card.innerHTML = `<div class="v2-reveal-label">${label || "Nasprotnik igra"}</div>
    <div class="v2-reveal-art">${artImg(d, "card-art-img")}<span class="card-art-glyph">${glyph}</span><span class="v2-reveal-cost">${cost}</span></div>
    <div class="v2-reveal-name">${d.name}</div>
    <div class="v2-reveal-meta">${d.type}${d.type === "Champion" ? " · ❤" + d.hp : ""}${d.pantheon ? " · " + d.pantheon : ""}</div>
    ${desc ? `<div class="v2-reveal-desc">${desc}</div>` : ""}`;
  const wrap = el("div", "v2-reveal");
  wrap.appendChild(card);
  document.getElementById("v2-fx").appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add("show"));
  setTimeout(() => { wrap.classList.remove("show"); wrap.classList.add("out"); }, 1500); // dlje, da se prebere
  setTimeout(() => { wrap.remove(); if (done) done(); }, 1900);
}
// puščica: posodobi glede na stanje + kazalec
let arrowPos = { x: 0, y: 0 };
function arrowActive() { return (G.turn === 0 && !G.over && !manaPick && ((selAttacker && selAtkIndex != null) || pendingPlay)); }
function updateArrow() {
  ensureFx();
  const svg = document.getElementById("v2-arrow"), line = document.getElementById("v2-arrow-line");
  if (!arrowActive()) { svg.classList.add("hidden"); return; }
  let originEl = null;
  if (selAttacker && selAtkIndex != null) originEl = findChampEl(selAttacker);
  if (!originEl) { svg.classList.add("hidden"); return; }
  const o = elCenter(originEl);
  const tx = arrowPos.x || o.x, ty = arrowPos.y || (o.y - 60);
  const mx = (o.x + tx) / 2, my = (o.y + ty) / 2;
  const cy = my - Math.max(45, Math.abs(tx - o.x) * 0.32); // lok navzgor (Hearthstone-like)
  svg.classList.remove("hidden");
  line.setAttribute("d", `M ${o.x} ${o.y} Q ${mx} ${cy} ${tx} ${ty}`);
}
// predogled škode med ciljanjem (Hearthstone-like): koliko + ali je smrtno
function ensureDmgPrev() {
  let p = document.getElementById("v2-dmgprev");
  if (!p) { p = el("div", "v2-dmgprev hidden"); p.id = "v2-dmgprev"; document.body.appendChild(p); }
  return p;
}
function hideDmgPreview() {
  const p = document.getElementById("v2-dmgprev"); if (p) p.classList.add("hidden");
  const svg = document.getElementById("v2-arrow"); if (svg) svg.classList.remove("lethal");
  document.querySelectorAll(".v2-champ.lethal-target, .v2-hero.lethal-target").forEach(e => e.classList.remove("lethal-target"));
}
function updateDmgPreview() {
  if (!(selAttacker && selAtkIndex != null) || G.turn !== 0 || G.over || manaPick) { hideDmgPreview(); return; }
  const you = G.players[0], opp = G.players[1];
  const att = you.board.find(c => c.uid === selAttacker); if (!att) { hideDmgPreview(); return; }
  const atk = def(att).attacks[selAtkIndex];
  if (!atk || !V2.canPay(you, atk.cost, def(att).id === "celtic-lugh")) { hideDmgPreview(); return; }
  const elx = document.elementFromPoint(arrowPos.x, arrowPos.y); if (!elx) { hideDmgPreview(); return; }
  const champEl = elx.closest('.v2-champ[data-owner="opp"]');
  const heroEl = elx.closest('.v2-opp .v2-hero');
  let pv = null, target = null, lethal = false;
  if (champEl) {
    const defn = opp.board.find(c => c.uid === champEl.dataset.uid);
    if (defn) { pv = V2.previewDamage(att, you, defn, atk); lethal = pv && pv.dmg >= (defn.maxHp - defn.damage); target = champEl; }
  } else if (heroEl) {
    pv = V2.previewFace(att, you, atk); lethal = pv && pv.dmg >= opp.life; target = heroEl;
  }
  if (!pv || !target) { hideDmgPreview(); return; }
  document.querySelectorAll(".lethal-target").forEach(e => e.classList.remove("lethal-target"));
  const p = ensureDmgPrev();
  const lab = { WEAK: "ŠIBKOST ×1.5", RESIST: "ODPOR ×0.6", GUARD: "GARDA ×0.5", FAVOR: "NAKLONJENOST", "OMEN?": "OMEN (±)", FURIJA: "FURIJA +10", FORMACIJA: "FORMACIJA −10", VOJNA: "VOJNI POHOD +15", SONCE: "SONČNO NEBO +10", KLETEV: "PREKLETSTVO +15", ARTEFAKT: "ARTEFAKT ⚔", OLTAR: "SONČNI OLTAR ×1.5", MOTOR: "MOTOR ⚙", "MOTOR×2": "MOTOR ⚙ ×2 (Apoteoza)", "MOČ": "MOČ +", "BES": "BES +", "LOV": "LOV +" };
  const parts = (pv.parts || []).filter(x => lab[x]);
  const retal = champEl ? (pv.retal || 0) : 0; // povratni udarec le pri napadu na bitje
  p.className = "v2-dmgprev" + (lethal ? " lethal" : "");
  p.innerHTML = `<span class="dp-dmg">-${pv.dmg}</span>${lethal ? '<span class="dp-lethal">💀 SMRTNO</span>' : ""}${retal ? `<span class="dp-retal">↩ prejmeš −${retal}</span>` : ""}${parts.length ? `<span class="dp-parts">${parts.map(x => lab[x] || x).join(" · ")}</span>` : ""}`;
  const r = target.getBoundingClientRect();
  p.style.left = (r.left + r.width / 2) + "px";
  p.style.top = (r.top - 6) + "px";
  p.classList.remove("hidden");
  const svg = document.getElementById("v2-arrow"); if (svg) svg.classList.toggle("lethal", !!lethal);
  if (lethal) target.classList.add("lethal-target");
}

let chosenDeck = null, chosenDiff = "normal";
let selAttacker = null, selAtkIndex = null; // izbira napada (tvoja poteza)
let pendingPlay = null;  // {inst, need:'ally'|'enemy'} — čaka izbiro tarče za urok/relic
let manaPick = null;     // {cost, lughAny, sel:[], onPaid} — ročna izbira mane
let aiBusy = false;
let seenChampUids = new Set(); // za "enter play" animacijo (vsak šampion se animira ob prvem prikazu)
let seenHandUids = new Set();   // za "card draw" animacijo (vsaka karta zleti v roko ob prvem prikazu)
let firstHandRender = true;     // prvi render bitke -> brez deal-in animacije (mulligan to že prikaže)

/* ---------------- SETUP ---------------- */
function heroPowerBlurb(pantheon) {
  const hp = V2.HERO_POWERS && (V2.HERO_POWERS[pantheon] || V2.HERO_POWERS.Greek);
  if (!hp) return "";
  return `<div class="deck-hp" ${tipAttr("★ " + hp.name, hp.text)}>★ ${hp.name} <span class="deck-hp-cost">⬡${hp.cost}</span></div>`;
}
function setupInner(html) { const w = document.querySelector("#v2-setup .v2-setup-inner"); w.innerHTML = html; return w; }
function setupHeader(sub) {
  return `<span class="eyebrow">Wars of Pantheons · Arena v2</span>
    <h1 class="game-title" style="font-size:clamp(34px,7vw,68px)">MYTHIC<br>CLASH</h1>
    ${sub ? `<p class="tagline">${sub}</p>` : ""}`;
}
function buildSetup() { loadRun(); showMainMenu(); }
function showMainMenu() {
  loadRun();
  const resume = RUN ? `<button class="mode-card resume" data-m="resume"><div class="mc-ic">▶</div><h3>Nadaljuj</h3><p>${RUN.mode === "arena" ? "Arena" : "Kampanja"} v teku — ${RUN.deck.length} kart.</p></button>` : "";
  const w = setupInner(`${setupHeader("Izberi način igre.")}
    <div class="mode-grid">
      <button class="mode-card" data-m="premade"><div class="mc-ic">⚔️</div><h3>Hitra igra</h3><p>Izberi enega od premade deckov in se bori proti naključnemu nasprotniku.</p></button>
      <button class="mode-card" data-m="custom"><div class="mc-ic">🛠️</div><h3>Custom deck</h3><p>Sestavi svoj deck in igraj proti smiselnemu nasprotniku.</p></button>
      <button class="mode-card" data-m="campaign"><div class="mc-ic">🗺️</div><h3>Kampanja</h3><p>Premagaj 6 vse težjih panteonov. Deck in heroj rasteta. 1 poraz konča.</p></button>
      <button class="mode-card" data-m="arena"><div class="mc-ic">🏟️</div><h3>Arena</h3><p>Draftaj deck 30 kart (3 na izbiro). Nagrada po vsaki zmagi. Do 3 porazov.</p></button>
    </div>
    ${resume}`);
  w.querySelectorAll(".mode-card").forEach(b => b.addEventListener("click", () => {
    const m = b.dataset.m;
    if (m === "premade") showPremade();
    else if (m === "custom") showCustomBuilder();
    else if (m === "campaign") { if (RUN && RUN.mode === "campaign") showRunMap(); else { clearRun(); openRunStart(); } }
    else if (m === "arena") { if (RUN && RUN.mode === "arena") showRunMap(); else { clearRun(); openArenaStart(); } }
    else if (m === "resume") showRunMap();
  }));
}
function showPremade() {
  const decks = Object.values(STARTER_DECKS).filter(d => d.id !== "custom" && d.id !== "run");
  const cards = decks.map(d => {
    const st = PANTHEON_STYLE[d.pantheon] || { symbol: "✦", grad: ["#333", "#555"] };
    return `<button class="deck-card" data-deck="${d.id}" style="--deck-grad:linear-gradient(160deg,${st.grad[0]},${st.grad[1]})">
      <span class="deck-pantheon">${d.pantheon}</span><div class="deck-symbol">${st.symbol}</div>
      <h3>${d.name}</h3><div class="deck-style">${d.style}</div><div class="deck-blurb">${d.blurb}</div>${heroPowerBlurb(d.pantheon)}</button>`;
  }).join("");
  const w = setupInner(`${setupHeader("Hitra igra — izberi deck.")}
    <button class="rules-toggle" id="back-menu" style="align-self:flex-start">← Nazaj</button>
    <div id="v2-decks" class="v2-decks">${cards}</div>
    <div class="difficulty-block"><span class="eyebrow">Težavnost</span><div id="v2-diff" class="diff-row"></div></div>
    <button id="v2-start" class="btn-primary" disabled>Začni bitko</button>`);
  w.querySelector("#back-menu").addEventListener("click", showMainMenu);
  w.querySelectorAll(".deck-card").forEach(b => b.addEventListener("click", () => {
    chosenDeck = b.dataset.deck; w.querySelectorAll(".deck-card").forEach(c => c.classList.remove("selected")); b.classList.add("selected"); w.querySelector("#v2-start").disabled = false;
  }));
  const dr = w.querySelector("#v2-diff");
  [["easy", "Lahko"], ["normal", "Normalno"], ["hard", "Težko"]].forEach(([id, lab]) => {
    const b = el("button", "diff-chip" + (id === chosenDiff ? " sel" : ""), `<span class="diff-name">${lab}</span>`);
    b.addEventListener("click", () => { chosenDiff = id; dr.querySelectorAll(".diff-chip").forEach(c => c.classList.remove("sel")); b.classList.add("sel"); });
    dr.appendChild(b);
  });
  w.querySelector("#v2-start").addEventListener("click", startV2);
}
function startV2() {
  if (!chosenDeck) return;
  const others = Object.keys(STARTER_DECKS).filter(k => k !== chosenDeck && k !== "custom" && k !== "run");
  const aiDeck = others[(Math.random() * others.length) | 0];
  V2.startGame(chosenDeck, aiDeck, chosenDiff);
  $("#v2-setup").classList.add("hidden");
  $("#v2-game").classList.remove("hidden");
  showFirstPick();
}

/* ---------------- CUSTOM DECK BUILDER ---------------- */
let customDeck = [];
function energyFor(list, ratio) {
  const need = {}; list.forEach(id => cardEnergyTypes(id).forEach(t => need[t] = (need[t] || 0) + 1));
  let types = Object.keys(need).sort((a, b) => need[b] - need[a]); if (!types.length) types = ["Sky", "War", "Nature"];
  const target = Math.round(list.length * (ratio || 0.5)); const out = []; let i = 0;
  while (out.length < target && types.length) { const e = energyCardFor(types[i % types.length]); if (e) out.push(e); i++; if (i > 300) break; }
  return out;
}
function showCustomBuilder() {
  const counts = {}; customDeck.forEach(id => counts[id] = (counts[id] || 0) + 1);
  const poolIds = [...new Set(randomCardPool())].sort((a, b) => {
    const da = CARDS[a], db = CARDS[b];
    return (da.pantheon || "z").localeCompare(db.pantheon || "z") || (V2.summonCostOf(da) || V2.manaCostOf(da)) - (V2.summonCostOf(db) || V2.manaCostOf(db));
  });
  const champCount = customDeck.filter(id => CARDS[id].type === "Champion").length;
  const cardHtml = id => {
    const d = CARDS[id]; const st = d.pantheon ? PANTHEON_STYLE[d.pantheon] : null;
    const glyph = st ? st.symbol : (ENERGY_STYLE[d.energyType] ? ENERGY_STYLE[d.energyType].glyph : (d.type === "Relic" ? "⚜" : d.type === "Oracle" ? "📜" : "🏛"));
    const cost = d.type === "Champion" ? `⬡${V2.summonCostOf(d)}` : `⬡${V2.manaCostOf(d)}`;
    const n = counts[id] || 0;
    return `<div class="cb-card ${n ? "owned" : ""}" data-id="${id}" ${tipAttr(d.name, cardTipText(d))} style="--c-grad:linear-gradient(160deg,${st ? st.grad[0] : "#23233a"},${st ? st.grad[1] : "#3a3a52"})">
      <div class="rdc-art">${artImg(d, "card-art-img")}<span class="card-art-glyph">${glyph}</span><span class="rdc-x">${cost}</span>${n ? `<span class="cb-count">×${n}</span>` : ""}</div>
      <div class="rdc-n">${d.name}</div><div class="rdc-m">${d.minion ? "Minion" : d.type}${d.type === "Champion" ? " ❤" + d.hp : ""}</div>
      ${n ? `<button class="cb-rem" data-rem="${id}">−</button>` : ""}</div>`;
  };
  const enough = customDeck.length >= 16 && champCount >= 6;
  const s = showRunScreen(`
    <header class="run-head"><div><span class="eyebrow">Custom deck</span><h2 class="run-title">Sestavi svoj deck</h2></div>
      <button class="rules-toggle" id="cb-back">← Nazaj</button></header>
    <div class="cb-bar">
      <span class="run-statline">🃏 <b>${customDeck.length}</b> kart · ${champCount} šampionov ${customDeck.length < 16 ? "(min 16)" : ""} ${champCount < 6 ? "· potrebuješ ≥6 šampionov" : ""}</span>
      ${affinityHtml(customDeck)}
      <span class="cb-actions"><button class="rules-toggle" id="cb-clear">Počisti</button>
      <button class="btn-primary" id="cb-start" ${enough ? "" : "disabled"}>Začni bitko</button></span>
    </div>
    <p class="run-sub">Klikni karto za dodajanje (do 3 kopije, max 30). Klikni <b>−</b> za odstranitev. Energije se dodajo samodejno. Igraš proti naključnemu premade decku.</p>
    <div class="cb-pool">${poolIds.map(cardHtml).join("")}</div>`);
  s.querySelector("#cb-back").addEventListener("click", showMainMenu);
  s.querySelector("#cb-clear").addEventListener("click", () => { customDeck = []; showCustomBuilder(); });
  s.querySelector("#cb-start").addEventListener("click", startCustom);
  s.querySelectorAll(".cb-card").forEach(card => card.addEventListener("click", e => {
    if (e.target.classList.contains("cb-rem")) return; // handled below
    const id = card.dataset.id; const n = customDeck.filter(x => x === id).length;
    if (n >= 3) { toast("Največ 3 kopije."); return; }
    if (customDeck.length >= 30) { toast("Deck je poln (30)."); return; }
    customDeck.push(id); showCustomBuilder();
  }));
  s.querySelectorAll(".cb-rem").forEach(b => b.addEventListener("click", e => {
    e.stopPropagation(); const id = b.dataset.rem; const i = customDeck.indexOf(id); if (i >= 0) customDeck.splice(i, 1); showCustomBuilder();
  }));
}
function startCustom() {
  const champCount = customDeck.filter(id => CARDS[id].type === "Champion").length;
  if (customDeck.length < 16 || champCount < 6) { toast("Potrebuješ vsaj 16 kart in 6 šampionov."); return; }
  const list = customDeck.slice().concat(energyFor(customDeck, 0.55));
  STARTER_DECKS.custom = { id: "custom", name: "Custom", pantheon: deckPantheon(customDeck), blurb: "", style: "Custom", list };
  const others = Object.keys(STARTER_DECKS).filter(k => k !== "custom" && k !== "run");
  const aiDeck = others[(Math.random() * others.length) | 0];
  V2.startGame("custom", aiDeck, chosenDiff || "normal");
  $("#v2-setup").classList.add("hidden"); $("#v2-game").classList.remove("hidden");
  showFirstPick();
}

/* ============================================================================
   ROGUELIKE (KAMPANJA / ARENA): zaporedje bitk + nagrade, deck/heroj rasteta
============================================================================ */
const RUN_KEY = "mythic-run-v2";
const RUN_STAGES = [
  { ai: "olympus", diff: "easy", name: "Olympus Strike" },
  { ai: "spirits", diff: "easy", name: "Forest of Spirits" },
  { ai: "eternity", diff: "normal", name: "Sands of Eternity" },
  { ai: "tirnanog", diff: "normal", name: "Tir na nÓg" },
  { ai: "legion", diff: "hard", name: "Legion of Rome" },
  { ai: "ragnarok", diff: "hard", name: "Ragnarok Fury" },
];
let RUN = null;
let runActive = false;
function loadRun() { try { const s = JSON.parse(localStorage.getItem(RUN_KEY)); if (s && Array.isArray(s.deck)) { if (!s.mode) s.mode = "campaign"; RUN = s; } } catch (_) {} }
function saveRun() { try { localStorage.setItem(RUN_KEY, JSON.stringify(RUN)); } catch (_) {} }
function clearRun() { RUN = null; try { localStorage.removeItem(RUN_KEY); } catch (_) {} }
function deckPantheon(list) {
  const c = deckPantheonCounts(list);
  return Object.keys(c).sort((a, b) => c[b] - c[a])[0] || "Greek";
}
function deckPantheonCounts(list) {
  const c = {}; list.forEach(id => { const d = CARDS[id]; if (d && d.type === "Champion" && d.pantheon) c[d.pantheon] = (c[d.pantheon] || 0) + 1; });
  return c;
}
function deckEnergyCounts(list) {
  const c = {}; list.forEach(id => {
    const d = CARDS[id]; if (!d || d.type !== "Energy") return;
    if (d.energyTypes) { const k = d.energyTypes.join("/"); c[k] = (c[k] || 0) + 1; }
    else if (d.energyType) c[d.energyType] = (c[d.energyType] || 0) + 1;
  });
  return c;
}
// katere KONKRETNE energije karta potrebuje (iz cen napadov / energyType)
function cardEnergyTypes(id) {
  const d = CARDS[id]; const out = new Set(); if (!d) return out;
  if (d.type === "Energy") { if (d.energyTypes) d.energyTypes.forEach(t => out.add(t)); else if (d.energyType) out.add(d.energyType); return out; }
  if (d.type === "Champion") (d.attacks || []).forEach(a => (a.cost || []).forEach(c => { if (c && c !== "Any") out.add(c); }));
  if (d.energyType && d.energyType !== "Any") out.add(d.energyType);
  return out;
}
function energyCardFor(type) { const id = "energy-" + String(type).toLowerCase(); return CARDS[id] ? id : null; }
function runTopPantheons() { const c = deckPantheonCounts(RUN.deck); return Object.keys(c).sort((a, b) => c[b] - c[a]); }

// LEAN startni deck za run (~14 kart): poceni championi + energije, ki jih potrebujejo
function runStarterDeck(deckId) {
  const full = STARTER_DECKS[deckId].list;
  const distinct = [...new Set(full)];
  const basics = distinct.filter(id => { const d = CARDS[id]; return d && d.type === "Champion" && d.stage === "basic"; });
  basics.sort((a, b) => V2.summonCostOf(CARDS[a]) - V2.summonCostOf(CARDS[b]));
  const champs = basics.slice(0, 5);
  if (basics[0]) champs.push(basics[0]); // 2. kopija najcenejšega
  if (basics[1]) champs.push(basics[1]);
  // energije glede na potrebe championov (round-robin -> pokrije vse barve)
  const need = {}; champs.forEach(id => cardEnergyTypes(id).forEach(t => need[t] = (need[t] || 0) + 1));
  const types = Object.keys(need).sort((a, b) => need[b] - need[a]);
  const energy = []; let i = 0;
  while (energy.length < 6 && types.length) { const e = energyCardFor(types[i % types.length]); if (e) energy.push(e); i++; if (i > 30) break; }
  const sig = full.find(id => ["Oracle", "Relic"].includes((CARDS[id] || {}).type));
  return [...champs, ...energy, ...(sig ? [sig] : [])];
}
// ob draftu nove karte samodejno dodaj manjkajočo energijo (do 2 na draft) — "dobiš tudi to energijo"
function autoAddEnergy(cardId) {
  const need = [...cardEnergyTypes(cardId)];
  const have = deckEnergyCounts(RUN.deck);
  const added = [];
  for (const t of need) {
    if (added.length >= 2) break;
    let cur = have[t] || 0;
    while (cur < 2 && added.length < 2) { const eid = energyCardFor(t); if (!eid) break; RUN.deck.push(eid); added.push(t); cur++; }
  }
  return added;
}
// kompakten prikaz "afinitete" decka (panteoni + energije)
function affinityHtml(list) {
  const pc = deckPantheonCounts(list), ec = deckEnergyCounts(list);
  const pan = Object.keys(pc).sort((a, b) => pc[b] - pc[a]).map(p => {
    const st = PANTHEON_STYLE[p] || { symbol: "✦" };
    return `<span class="aff-chip" ${tipAttr(p, "Šampionov tega panteona: " + pc[p])}>${st.symbol} ${pc[p]}</span>`;
  }).join("");
  const en = Object.keys(ec).sort((a, b) => ec[b] - ec[a]).map(t => {
    const s = ENERGY_STYLE[t] || { glyph: "✦", color: "#aaa" };
    return `<span class="aff-chip" style="--mc:${s.color}" ${tipAttr(t + " energija", "Energij tega tipa: " + ec[t])}>${s.glyph} ${ec[t]}</span>`;
  }).join("");
  return `<div class="run-affinity"><span class="aff-lab">Panteoni</span>${pan || "<i>—</i>"}<span class="aff-lab">Energije</span>${en || "<i>—</i>"}</div>`;
}
function ensureRunScreen() {
  let s = document.getElementById("v2-run");
  if (!s) { s = el("section", "screen hidden"); s.id = "v2-run"; document.body.appendChild(s); }
  return s;
}
function hideRun() { const s = document.getElementById("v2-run"); if (s) s.classList.add("hidden"); }
function showRunScreen(html) {
  const s = ensureRunScreen();
  s.innerHTML = `<div class="run-wrap">${html}</div>`;
  ["v2-setup", "v2-game"].forEach(id => $("#" + id) && $("#" + id).classList.add("hidden"));
  s.classList.remove("hidden");
  return s;
}

// začetek pohoda: izbira starting deck-a (če run obstaja -> map)
function openRunStart() {
  loadRun();
  if (RUN) return showRunMap();
  const decks = Object.values(STARTER_DECKS).filter(d => d.id !== "custom" && d.id !== "run");
  const cards = decks.map(d => {
    const st = PANTHEON_STYLE[d.pantheon] || { symbol: "✦", grad: ["#333", "#555"] };
    return `<button class="deck-card run-pick" data-deck="${d.id}" style="--deck-grad:linear-gradient(160deg,${st.grad[0]},${st.grad[1]})">
      <span class="deck-pantheon">${d.pantheon}</span><div class="deck-symbol">${st.symbol}</div>
      <h3>${d.name}</h3><div class="deck-style">${d.style}</div><div class="deck-blurb">${d.blurb}</div>${heroPowerBlurb(d.pantheon)}</button>`;
  }).join("");
  const s = showRunScreen(`
    <header class="run-head"><div><span class="eyebrow">Roguelike kampanja</span><h2 class="run-title">Izberi začetni deck</h2></div>
      <button class="rules-toggle" id="run-back">← Nazaj</button></header>
    <p class="run-sub">Začneš z majhnim jedrom (~14 kart) izbranega panteona. Po vsaki zmagi draftaš karto — če dodaš novo energijo, dobiš tudi ustrezno mano. Gradi okrog enega panteona za moč, ali mešaj za fleksibilnost. Poraz konča pohod.</p>
    <div class="deck-grid run-decks">${cards}</div>`);
  s.querySelector("#run-back").addEventListener("click", backToMenu);
  s.querySelectorAll(".run-pick").forEach(b => b.addEventListener("click", () => startRun(b.dataset.deck)));
}
function startRun(deckId) {
  RUN = { mode: "campaign", deckId, deck: runStarterDeck(deckId), heroLife: V2.START_LIFE, champHpBonus: 0, handBonus: 0, favorStart: 0, stage: 0, upgrades: {}, artifacts: [], map: genCampaignMap() };
  saveRun(); showRunMap();
}
function backToMenu() { hideRun(); $("#v2-setup").classList.remove("hidden"); showMainMenu(); }

/* ---------------- ARENA (draft 30 + nagrade, do 3 porazov) ---------------- */
const ARENA_PICKS = 30;
function openArenaStart() {
  loadRun(); if (RUN && RUN.mode === "arena") return showRunMap();
  const decks = Object.values(STARTER_DECKS).filter(d => d.id !== "custom" && d.id !== "run");
  const cards = decks.map(d => {
    const st = PANTHEON_STYLE[d.pantheon] || { symbol: "✦", grad: ["#333", "#555"] };
    return `<button class="deck-card run-pick" data-deck="${d.id}" style="--deck-grad:linear-gradient(160deg,${st.grad[0]},${st.grad[1]})">
      <span class="deck-pantheon">${d.pantheon}</span><div class="deck-symbol">${st.symbol}</div>
      <h3>${d.name}</h3><div class="deck-blurb">Draftaš lahko karte vseh panteonov.</div>${heroPowerBlurb(d.pantheon)}</button>`;
  }).join("");
  const s = showRunScreen(`
    <header class="run-head"><div><span class="eyebrow">Arena</span><h2 class="run-title">Izberi svojega heroja</h2></div>
      <button class="rules-toggle" id="run-back">← Nazaj</button></header>
    <p class="run-sub">Panteon določi tvojega heroja in <b>Hero Power</b> (prikazan na vsaki kartici). Nato draftaš 30 kart (3 na izbiro), na koncu pa izbereš svoje energije. Igraš do <b>3 porazov</b>; po vsaki zmagi izbereš nagrado.</p>
    <div class="deck-grid run-decks">${cards}</div>`);
  s.querySelector("#run-back").addEventListener("click", backToMenu);
  s.querySelectorAll(".run-pick").forEach(b => b.addEventListener("click", () => startArena(b.dataset.deck)));
}
function startArena(coreDeckId) {
  RUN = { mode: "arena", deckId: coreDeckId, deck: [], draftLeft: ARENA_PICKS, energyDone: false, energyPick: {}, heroLife: V2.START_LIFE, champHpBonus: 0, handBonus: 0, favorStart: 0, stage: 0, wins: 0, losses: 0, upgrades: {}, artifacts: [] };
  saveRun(); showArenaDraft();
}
function showArenaDraft() {
  if (RUN.draftLeft <= 0) return showArenaEnergyPick();
  const pool = randomCardPool();
  const offers = []; let guard = 0;
  while (offers.length < 3 && guard++ < 200) { const id = pool[(Math.random() * pool.length) | 0]; if (!offers.includes(id)) offers.push(id); }
  const cardHtml = id => {
    const d = CARDS[id]; const st = d.pantheon ? PANTHEON_STYLE[d.pantheon] : null;
    const glyph = st ? st.symbol : (ENERGY_STYLE[d.energyType] ? ENERGY_STYLE[d.energyType].glyph : (d.type === "Relic" ? "⚜" : d.type === "Oracle" ? "📜" : "🏛"));
    const cost = d.type === "Champion" ? `⬡${V2.summonCostOf(d)}` : `⬡${V2.manaCostOf(d)}`;
    const atks = d.type === "Champion" ? atkRowsHtml(d, null) : `<div class="rdc-m">${d.text || d.effect || ""}</div>`;
    return `<button class="reward-card" data-id="${id}" ${tipAttr(d.name, cardTipText(d))} style="--c-grad:linear-gradient(160deg,${st ? st.grad[0] : "#23233a"},${st ? st.grad[1] : "#3a3a52"})">
      <div class="rw-tag">${d.minion ? "Minion" : d.type}</div>
      <div class="rdc-art">${artImg(d, "card-art-img")}<span class="card-art-glyph">${glyph}</span><span class="rdc-x">${cost}</span></div>
      <div class="rdc-n">${d.name}</div><div class="rdc-m">${d.pantheon || "—"}${d.type === "Champion" ? " · ❤" + d.hp : ""}</div>${atks}</button>`;
  };
  const picked = ARENA_PICKS - RUN.draftLeft;
  const s = showRunScreen(`
    <header class="run-head"><div><span class="eyebrow">Arena draft · ${picked}/${ARENA_PICKS}</span><h2 class="run-title">Izberi karto</h2></div></header>
    ${affinityHtml(RUN.deck)}
    <div class="reward-grid">${offers.map(cardHtml).join("")}</div>`);
  s.querySelectorAll(".reward-card").forEach((b, i) => b.addEventListener("click", () => { RUN.deck.push(offers[i]); RUN.draftLeft--; saveRun(); showArenaDraft(); }));
}
function fillArenaEnergy() { RUN.deck.push(...energyFor(RUN.deck, 0.5)); }
// na koncu drafta: izberi svoje energije (10–16), da deck ni samo energij
function showArenaEnergyPick() {
  const MIN = 10, MAX = 16;
  RUN.energyPick = RUN.energyPick || {};
  const chosen = RUN.energyPick;
  const total = Object.values(chosen).reduce((a, b) => a + b, 0);
  const need = {}; RUN.deck.forEach(id => cardEnergyTypes(id).forEach(t => need[t] = (need[t] || 0) + 1));
  const rec = Object.keys(need).sort((a, b) => need[b] - need[a]).map(t => { const s = ENERGY_STYLE[t] || {}; return `<span class="aff-chip" style="--mc:${s.color}">${s.glyph} ${t} ×${need[t]}</span>`; }).join("") || "<i>—</i>";
  const types = (typeof ENERGY_TYPES !== "undefined" ? ENERGY_TYPES : Object.keys(ENERGY_STYLE).filter(k => k !== "Any"));
  const btns = types.map(t => { const s = ENERGY_STYLE[t] || {}; const c = chosen[t] || 0; return `<button class="energy-pick ${c ? "has" : ""}" data-t="${t}" style="--mc:${s.color}">${s.glyph} ${t} <b>${c}</b></button>`; }).join("");
  const s = showRunScreen(`
    <header class="run-head"><div><span class="eyebrow">Arena · energije</span><h2 class="run-title">Izberi energije (${total}/${MAX})</h2></div></header>
    <p class="run-sub">Tvoje karte največ rabijo: ${rec}. Dodaj <b>${MIN}–${MAX}</b> energij. Klik = +1, desni klik = −1. (Tako deck ni samo energije — preostanek so tvoje karte.)</p>
    <div class="energy-pick-grid">${btns}</div>
    <div class="run-foot">
      <button class="rules-toggle" id="ep-auto">Samodejno priporočilo</button>
      <button class="rules-toggle" id="ep-clear">Počisti</button>
      <button class="btn-primary" id="ep-go" ${total >= MIN ? "" : "disabled"}>Potrdi (${total})</button>
    </div>`);
  s.querySelectorAll(".energy-pick").forEach(b => {
    b.addEventListener("click", () => { const t = b.dataset.t; if (Object.values(chosen).reduce((a, c) => a + c, 0) >= MAX) { toast("Največ " + MAX + " energij."); return; } chosen[t] = (chosen[t] || 0) + 1; saveRun(); showArenaEnergyPick(); });
    b.addEventListener("contextmenu", e => { e.preventDefault(); const t = b.dataset.t; if (chosen[t] > 0) { chosen[t]--; saveRun(); showArenaEnergyPick(); } });
  });
  s.querySelector("#ep-auto").addEventListener("click", () => { RUN.energyPick = {}; fillArenaEnergy(); finalizeArenaEnergy(); });
  s.querySelector("#ep-clear").addEventListener("click", () => { RUN.energyPick = {}; saveRun(); showArenaEnergyPick(); });
  s.querySelector("#ep-go").addEventListener("click", () => {
    Object.keys(chosen).forEach(t => { for (let i = 0; i < chosen[t]; i++) { const e = energyCardFor(t); if (e) RUN.deck.push(e); } });
    finalizeArenaEnergy();
  });
}
function finalizeArenaEnergy() { RUN.energyDone = true; RUN.energyPick = {}; saveRun(); showRunMap(); }

// --- Razvejana mapa kampanje (StS) ---
const NODE_META = {
  battle:   { icon: "⚔", label: "Bitka",    desc: "Navadna bitka proti naključnemu panteonu. Nagrada: karta ali nadgradnja." },
  elite:    { icon: "☠", label: "Elita",    desc: "Težja bitka (okrepljen nasprotnik). Nagrada vključuje ZAJAMČEN artefakt." },
  rest:     { icon: "🔥", label: "Ognjišče", desc: "Trajna izboljšava: nadgradi šampiona ALI +20 max življenja." },
  event:    { icon: "🎲", label: "Dogodek",  desc: "Naključen dogodek z izbiro — tveganje in nagrada." },
  treasure: { icon: "💎", label: "Zaklad",   desc: "Brezplačen artefakt po izbiri." },
  boss:     { icon: "👑", label: "BOSS",     desc: "Zaključni boss. Zmaga konča kampanjo." },
};
function genCampaignMap() {
  const DEPTH = 6;
  const aiDecks = Object.keys(STARTER_DECKS).filter(k => !["custom", "run"].includes(k));
  const rnd = n => (Math.random() * n) | 0;
  const pickAi = () => aiDecks[rnd(aiDecks.length)];
  const cols = [];
  for (let c = 0; c < DEPTH; c++) {
    const count = 2 + rnd(2); // 2–3 vozlov
    const col = [];
    for (let i = 0; i < count; i++) {
      let type; const r = Math.random();
      if (c === 0) type = r < 0.25 ? "event" : "battle";
      else if (c === DEPTH - 1) type = r < 0.5 ? "rest" : (r < 0.8 ? "elite" : "treasure"); // pred-boss
      else if (r < 0.42) type = "battle";
      else if (r < 0.60) type = "elite";
      else if (r < 0.76) type = "event";
      else if (r < 0.90) type = "rest";
      else type = "treasure";
      const node = { type };
      if (type === "battle") { node.ai = pickAi(); node.diff = c < 2 ? "easy" : c < 4 ? "normal" : "hard"; }
      else if (type === "elite") { node.ai = pickAi(); node.diff = "hard"; node.elite = true; }
      col.push(node);
    }
    cols.push(col);
  }
  cols.push([{ type: "boss", ai: pickAi(), diff: "hard", boss: true }]);
  // povezave: vsak vozel -> 1–2 v naslednjem stolpcu; zagotovi pokritost
  for (let c = 0; c < cols.length - 1; c++) {
    const cur = cols[c], nxt = cols[c + 1];
    cur.forEach((node, i) => {
      const base = Math.round(i / Math.max(1, cur.length - 1) * (nxt.length - 1));
      const t = new Set([base]);
      if (nxt.length > 1 && Math.random() < 0.5) t.add(Math.max(0, Math.min(nxt.length - 1, base + (Math.random() < 0.5 ? -1 : 1))));
      node.next = [...t];
    });
    nxt.forEach((_, j) => { if (!cur.some(n => n.next.includes(j))) { const src = Math.min(cur.length - 1, Math.round(j / Math.max(1, nxt.length - 1) * (cur.length - 1))); cur[src].next.push(j); } });
  }
  return { cols, pos: -1, path: [] };
}
function mapAvailable() {
  const m = RUN.map; if (!m) return [];
  if (m.pos === -1) return m.cols[0].map((_, i) => ({ c: 0, i }));
  if (m.pos.c >= m.cols.length - 1) return [];
  return (m.cols[m.pos.c][m.pos.i].next || []).map(j => ({ c: m.pos.c + 1, i: j }));
}
function enterNode(c, i) {
  const avail = mapAvailable();
  if (!avail.some(a => a.c === c && a.i === i)) { toast("Ta vozel ni dosegljiv."); return; }
  RUN._node = { c, i }; saveRun();
  const node = RUN.map.cols[c][i];
  if (["battle", "elite", "boss"].includes(node.type)) return runLaunch();
  if (node.type === "rest") return restScreen();
  if (node.type === "event") return eventScreen();
  if (node.type === "treasure") return treasureScreen();
}
function clearNode() { // označi trenutni vozel kot opravljen in napreduj
  const n = RUN._node; if (!n) return;
  RUN.map.path = RUN.map.path || []; RUN.map.path.push({ c: n.c, i: n.i });
  RUN.map.pos = { c: n.c, i: n.i }; RUN._node = null; saveRun();
}
function showRunMap() {
  if (RUN.mode === "arena") return showArenaMap();
  if (!RUN.map) RUN.map = genCampaignMap();
  const m = RUN.map;
  const avail = mapAvailable();
  const onPath = (c, i) => (m.path || []).some(p => p.c === c && p.i === i);
  const isAvail = (c, i) => avail.some(a => a.c === c && a.i === i);
  const bossDone = m.pos !== -1 && m.pos.c === m.cols.length - 1;
  const champs = RUN.deck.filter(id => (CARDS[id] || {}).type === "Champion").length;
  const mapHtml = m.cols.map((col, c) => `<div class="map-col">` + col.map((node, i) => {
    const meta = NODE_META[node.type];
    const cls = onPath(c, i) ? "done" : (isAvail(c, i) ? "avail" : "other");
    const sub = (node.ai && STARTER_DECKS[node.ai]) ? STARTER_DECKS[node.ai].name : (node.type === "rest" ? "izbira" : node.type === "treasure" ? "artefakt" : node.type === "event" ? "?" : "");
    return `<button class="map-node ${node.type} ${cls}" data-c="${c}" data-i="${i}" ${cls === "avail" ? "" : "disabled"} ${tipAttr(meta.icon + " " + meta.label, meta.desc)}>
      <span class="mn-ic">${meta.icon}</span><span class="mn-lab">${meta.label}</span>${sub ? `<span class="mn-sub">${sub}</span>` : ""}${onPath(c, i) ? `<span class="mn-done">✓</span>` : ""}</button>`;
  }).join("") + `</div>`).join(`<div class="map-link">⋮</div>`);
  const s = showRunScreen(`
    <header class="run-head"><div><span class="eyebrow">Kampanja · ${(m.path || []).length} osvojenih</span><h2 class="run-title">${bossDone ? "🏆 Kampanja dokončana!" : "Karta kampanje"}</h2></div>
      <button class="rules-toggle" id="run-quit">Opusti</button></header>
    <div class="run-statline">❤ Heroj: <b>${RUN.heroLife}</b> · 🃏 Deck: <b>${RUN.deck.length}</b> (${champs} šampionov)${RUN.champHpBonus ? ` · 🛡 +${RUN.champHpBonus} HP` : ""}${RUN.handBonus ? ` · ✋ +${RUN.handBonus}` : ""}${RUN.favorStart ? ` · 🔮 +${RUN.favorStart}` : ""}</div>
    ${artStripHtml()}
    ${affinityHtml(RUN.deck)}
    <div class="run-map">${mapHtml}</div>
    <div class="run-foot">
      <button class="rules-toggle" id="run-deckbtn">Poglej deck</button>
      ${bossDone ? `<button class="btn-primary" id="run-finish">Zaključi</button>` : `<span class="run-hint">Izberi osvetljen vozel za napredovanje.</span>`}
    </div>`);
  s.querySelector("#run-quit").addEventListener("click", () => { if (confirm("Opustiš kampanjo?")) { clearRun(); backToMenu(); } });
  s.querySelector("#run-deckbtn").addEventListener("click", () => showRunDeck());
  if (bossDone) s.querySelector("#run-finish").addEventListener("click", () => { clearRun(); backToMenu(); });
  s.querySelectorAll(".map-node.avail").forEach(b => b.addEventListener("click", () => enterNode(+b.dataset.c, +b.dataset.i)));
  return;
}
function restScreen() {
  const s = showRunScreen(`
    <header class="run-head"><div><span class="eyebrow">🔥 Ognjišče</span><h2 class="run-title">Počitek</h2></div></header>
    <p class="run-sub">Izberi eno trajno izboljšavo za ostanek runa.</p>
    <div class="reward-grid">
      <button class="reward-card upgrade" id="rest-upg"><div class="rw-tag">Nadgradnja</div><div class="rw-up-label">⬆ Nadgradi šampiona</div><div class="rw-up-desc">Daj šampionu trajno novo moč (HP / škodo / sposobnost).</div></button>
      <button class="reward-card upgrade" id="rest-life"><div class="rw-tag">Okrepitev</div><div class="rw-up-label">❤ +20 max življenja</div><div class="rw-up-desc">Heroj trajno +20 življenja za vse prihodnje bitke.</div></button>
    </div>`);
  s.querySelector("#rest-life").addEventListener("click", () => { RUN.heroLife += 20; toast("Heroj +20 življenja."); clearNode(); showRunMap(); });
  s.querySelector("#rest-upg").addEventListener("click", () => { RUN._restMode = true; showUpgradePicker(); });
}
function treasureScreen() {
  let pool = Object.keys(V2.ARTIFACTS).filter(id => !(RUN.artifacts || []).includes(id)).sort(() => Math.random() - 0.5).slice(0, 3);
  if (!pool.length) { RUN.heroLife += 20; toast("Ni več artefaktov — +20 življenja."); clearNode(); showRunMap(); return; }
  const cards = pool.map(id => { const A = V2.ARTIFACTS[id]; return `<button class="reward-card artifact" data-id="${id}" ${tipAttr(A.icon + " " + A.name, A.desc)}><div class="rw-tag">Artefakt · ${A.rarity}${A.scale ? " · ⚙ motor" : ""}</div><div class="rw-art-ic">${A.icon}</div><div class="rdc-n">${A.name}</div><div class="rw-up-desc">${A.desc}</div></button>`; }).join("");
  const s = showRunScreen(`<header class="run-head"><div><span class="eyebrow">💎 Zaklad</span><h2 class="run-title">Izberi artefakt</h2></div></header><div class="reward-grid">${cards}</div>`);
  s.querySelectorAll(".reward-card").forEach(b => b.addEventListener("click", () => { RUN.artifacts = RUN.artifacts || []; RUN.artifacts.push(b.dataset.id); toast("Artefakt: " + V2.ARTIFACTS[b.dataset.id].name); clearNode(); showRunMap(); }));
}
const RUN_EVENTS = [
  { title: "Starodavni oltar", text: "Daritev bogovom obljublja moč.", choices: [
    { label: "🔮 +1 Naklonjenost (vsako bitko)", apply: () => { RUN.favorStart = (RUN.favorStart || 0) + 1; } },
    { label: "❤ +15 max življenja", apply: () => { RUN.heroLife += 15; } }] },
  { title: "Bojni tabor", text: "Veterani ponujajo urjenje.", choices: [
    { label: "🛡 Vsi šampioni +10 HP", apply: () => { RUN.champHpBonus = (RUN.champHpBonus || 0) + 10; } },
    { label: "✋ +1 karta v začetni roki", apply: () => { RUN.handBonus = (RUN.handBonus || 0) + 1; } }] },
  { title: "Pozabljeno svetišče", text: "Tvegana bližnjica skozi temo.", choices: [
    { label: "⚔ +1 divja karta", apply: () => { const all = randomCardPool(); RUN.deck.push(all[(Math.random() * all.length) | 0]); } },
    { label: "💎 Artefakt, a −10 max življenja", apply: () => { const a = randomArtifactOffer(); if (a) { RUN.artifacts = RUN.artifacts || []; RUN.artifacts.push(a.id); } RUN.heroLife = Math.max(60, RUN.heroLife - 10); } }] },
];
function eventScreen() {
  const ev = RUN_EVENTS[(Math.random() * RUN_EVENTS.length) | 0];
  const choices = ev.choices.map((ch, i) => `<button class="reward-card upgrade" data-i="${i}"><div class="rw-tag">Izbira</div><div class="rw-up-label">${ch.label}</div></button>`).join("");
  const s = showRunScreen(`<header class="run-head"><div><span class="eyebrow">🎲 Dogodek</span><h2 class="run-title">${ev.title}</h2></div></header><p class="run-sub">${ev.text}</p><div class="reward-grid">${choices}</div>`);
  s.querySelectorAll(".reward-card").forEach((b, i) => b.addEventListener("click", () => { ev.choices[i].apply(); toast(ev.choices[i].label); clearNode(); showRunMap(); }));
}
function showArenaMap() {
  if (RUN.draftLeft > 0) return showArenaDraft();
  if (!RUN.energyDone) return showArenaEnergyPick();
  const champs = RUN.deck.filter(id => (CARDS[id] || {}).type === "Champion").length;
  const over = RUN.losses >= 3;
  const hearts = "❤".repeat(3 - RUN.losses) + "🖤".repeat(RUN.losses);
  const diffLab = RUN.wins < 3 ? "Lahko" : RUN.wins < 6 ? "Normalno" : "Težko";
  const s = showRunScreen(`
    <header class="run-head"><div><span class="eyebrow">Arena · ${RUN.wins} zmag</span><h2 class="run-title">${over ? "🏟️ Arena končana" : "Arena"}</h2></div>
      <button class="rules-toggle" id="run-quit">Opusti</button></header>
    <div class="run-statline">🏆 Zmage: <b>${RUN.wins}</b> · Življenja runa: ${hearts} · 🃏 Deck: <b>${RUN.deck.length}</b> (${champs} šampionov)</div>
    ${artStripHtml()}
    ${affinityHtml(RUN.deck)}
    <div class="run-foot">
      <button class="rules-toggle" id="run-deckbtn">Poglej deck</button>
      ${over ? `<button class="btn-primary" id="run-finish">Zaključi</button>` : `<button class="btn-primary" id="run-fight">Začni bitko ${RUN.wins + 1} (${diffLab})</button>`}
    </div>`);
  s.querySelector("#run-quit").addEventListener("click", () => { if (confirm("Opustiš areno?")) { clearRun(); backToMenu(); } });
  s.querySelector("#run-deckbtn").addEventListener("click", () => showRunDeck());
  if (over) s.querySelector("#run-finish").addEventListener("click", () => { clearRun(); backToMenu(); });
  else s.querySelector("#run-fight").addEventListener("click", runLaunch);
}
function showRunDeck(removeMode) {
  const counts = {}; RUN.deck.forEach(id => counts[id] = (counts[id] || 0) + 1);
  const cards = Object.keys(counts).sort().map(id => {
    const d = CARDS[id]; const st = d.pantheon ? PANTHEON_STYLE[d.pantheon] : null;
    const glyph = st ? st.symbol : (ENERGY_STYLE[d.energyType] ? ENERGY_STYLE[d.energyType].glyph : (d.type === "Relic" ? "⚜" : d.type === "Oracle" ? "📜" : "🏛"));
    const cost = d.type === "Champion" ? `⬡${V2.summonCostOf(d)}` : d.type === "Energy" ? "+mana" : `⬡${V2.manaCostOf(d)}`;
    const up = RUN.upgrades && RUN.upgrades[id];
    const upTip = up ? "Nadgradnje: " + (up.hp ? "+" + up.hp + " HP " : "") + (up.dmg ? "+" + up.dmg + " škode " : "") + (up.grants || []).map(g => g.split(":").pop()).join(", ") : "";
    return `<button class="run-deckcard ${removeMode ? "removable" : ""}" data-id="${id}" ${up ? tipAttr(d.name + " ★", upTip) : ""} style="--c-grad:linear-gradient(160deg,${st ? st.grad[0] : "#23233a"},${st ? st.grad[1] : "#3a3a52"})">
      <div class="rdc-art">${artImg(d, "card-art-img")}<span class="card-art-glyph">${glyph}</span><span class="rdc-x">×${counts[id]}</span>${up ? `<span class="rdc-up">★</span>` : ""}</div>
      <div class="rdc-n">${d.name}${up ? " ★" : ""}</div><div class="rdc-m">${d.type} · ${cost}</div></button>`;
  }).join("");
  const s = showRunScreen(`
    <header class="run-head"><div><span class="eyebrow">${removeMode ? "Odstrani karto" : "Tvoj deck"}</span><h2 class="run-title">${RUN.deck.length} kart</h2></div>
      <button class="rules-toggle" id="run-deckback">← Nazaj</button></header>
    ${removeMode ? `<p class="run-sub">Klikni karto, ki jo odstraniš iz decka.</p>` : affinityHtml(RUN.deck)}
    <div class="run-deckgrid">${cards}</div>`);
  s.querySelector("#run-deckback").addEventListener("click", () => removeMode ? showReward(RUN._pendingRewards) : showRunMap());
  if (removeMode) s.querySelectorAll(".run-deckcard").forEach(b => b.addEventListener("click", () => {
    const id = b.dataset.id; const i = RUN.deck.indexOf(id); if (i >= 0) RUN.deck.splice(i, 1);
    RUN._pendingRewards = null; saveRun(); showRunMap();
  }));
}

// nagrade po zmagi
function randomCardPool() {
  // igrljive karte (brez energij, ascension in nadgrajenih klonov)
  return Object.values(CARDS).filter(d => d.type !== "Energy" && d.stage !== "ascended" && !d.upgraded && !d.evolveOnly).map(d => d.id);
}
function genRewards() {
  const all = randomCardPool();
  const pick = arr => arr[(Math.random() * arr.length) | 0];
  // ena karta "v tvojem slogu" (tvoji panteoni ali nevtralna oprema), ena "divja"
  const top = runTopPantheons().slice(0, 3);
  const onColor = all.filter(id => { const d = CARDS[id]; return (d.pantheon && top.includes(d.pantheon)) || d.type === "Equipment"; });
  const upgrades = [
    { t: "upgradeCard", label: "⬆ Nadgradi šampiona", desc: "Izberi šampiona in mu daj trajno novo moč (HP / škodo / sposobnost)." },
    { t: "life", label: "❤ Heroj +25 življenja", desc: "Trajno višja meja življenj." },
    { t: "champhp", label: "🛡 Blagoslov: šampioni +10 HP", desc: "Vsi tvoji šampioni dobijo +10 HP." },
    { t: "hand", label: "✋ +1 karta v začetni roki", desc: "Vsako bitko začneš z eno karto več." },
    { t: "favor", label: "🔮 +1 Naklonjenost na začetku", desc: "Vsako bitko začneš z dodatno Naklonjenostjo." },
    { t: "remove", label: "✂ Odstrani karto", desc: "Stanjšaj deck — odstrani 1 karto." },
  ];
  const c1 = pick(onColor.length ? onColor : all);
  let c2 = pick(all); let g = 0; while (c2 === c1 && g++ < 6) c2 = pick(all);
  const artOffer = randomArtifactOffer();
  // nadgradnja championa je na voljo le, če imaš šampiona; sicer običajni upgrade
  const hasChamp = RUN.deck.some(id => (CARDS[id] || {}).type === "Champion");
  const pool = hasChamp ? upgrades : upgrades.filter(u => u.t !== "upgradeCard");
  const up = () => pool[(Math.random() * pool.length) | 0];
  // Arena: 2 naključni izbiri (lahko 2 karti, 2 upgrada ali mešano); Kampanja: karta + karta + upgrade
  if (RUN.mode === "arena") {
    const bag = [{ t: "card", id: c1, tag: "Karta" }, { t: "card", id: c2, tag: "Karta" }, up()];
    if (artOffer) bag.push(artOffer); else bag.push(up());
    for (let i = bag.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0;[bag[i], bag[j]] = [bag[j], bag[i]]; }
    return bag.slice(0, 2);
  }
  // Kampanja: karta v slogu + divja karta + (artefakt ~55% sicer nadgradnja)
  const third = (artOffer && Math.random() < 0.55) ? artOffer : up();
  return [{ t: "card", id: c1, tag: "V tvojem slogu" }, { t: "card", id: c2, tag: "Divja karta" }, third];
}
function randomArtifactOffer() {
  const owned = new Set(RUN.artifacts || []);
  const pool = Object.keys(V2.ARTIFACTS).filter(id => !owned.has(id));
  if (!pool.length) return null;
  return { t: "artifact", id: pool[(Math.random() * pool.length) | 0] };
}
function artStripHtml() {
  const a = RUN.artifacts || []; if (!a.length) return "";
  return `<div class="run-arts">` + a.map(id => { const A = V2.ARTIFACTS[id]; return A ? `<span class="run-art" ${tipAttr(A.icon + " " + A.name, A.desc)}>${A.icon}</span>` : ""; }).join("") + `</div>`;
}
function showReward(rewards) {
  rewards = rewards || genRewards();
  RUN._pendingRewards = rewards;
  const cardHtml = r => {
    if (r.t === "card") {
      const d = CARDS[r.id]; const st = d.pantheon ? PANTHEON_STYLE[d.pantheon] : null;
      const glyph = st ? st.symbol : (ENERGY_STYLE[d.energyType] ? ENERGY_STYLE[d.energyType].glyph : (d.type === "Relic" ? "⚜" : d.type === "Oracle" ? "📜" : "🏛"));
      const cost = d.type === "Champion" ? `⬡${V2.summonCostOf(d)}` : `⬡${V2.manaCostOf(d)}`;
      const atks = d.type === "Champion" ? atkRowsHtml(d, null) : `<div class="rdc-m">${d.text || d.effect || ""}</div>`;
      return `<button class="reward-card" data-r="card" ${tipAttr(d.name, cardTipText(d))} style="--c-grad:linear-gradient(160deg,${st ? st.grad[0] : "#23233a"},${st ? st.grad[1] : "#3a3a52"})">
        <div class="rw-tag">${r.tag || "Dodaj karto"}</div>
        <div class="rdc-art">${artImg(d, "card-art-img")}<span class="card-art-glyph">${glyph}</span><span class="rdc-x">${cost}</span></div>
        <div class="rdc-n">${d.name}</div><div class="rdc-m">${d.type}${d.type === "Champion" ? " · ❤" + d.hp : ""}</div>${atks}</button>`;
    }
    if (r.t === "artifact") {
      const A = V2.ARTIFACTS[r.id];
      return `<button class="reward-card artifact" data-r="artifact" ${tipAttr(A.icon + " " + A.name, A.desc)}>
        <div class="rw-tag">Artefakt · ${A.rarity}${A.scale ? " · ⚙ motor" : ""}</div>
        <div class="rw-art-ic">${A.icon}</div>
        <div class="rdc-n">${A.name}</div><div class="rw-up-desc">${A.desc}</div></button>`;
    }
    return `<button class="reward-card upgrade" data-r="${r.t}">
      <div class="rw-tag">Nadgradnja</div>
      <div class="rw-up-label">${r.label}</div><div class="rw-up-desc">${r.desc}</div></button>`;
  };
  const s = showRunScreen(`
    <header class="run-head"><div><span class="eyebrow">Zmaga! ${RUN.mode === "arena" ? RUN.wins + " zmag" : (RUN.map && RUN.map.path ? RUN.map.path.length + " osvojenih" : "")}</span><h2 class="run-title">Izberi nagrado</h2></div></header>
    <div class="reward-grid">${rewards.map(cardHtml).join("")}</div>`);
  const btns = s.querySelectorAll(".reward-card");
  rewards.forEach((r, i) => btns[i].addEventListener("click", () => applyReward(r)));
}
function applyReward(r) {
  if (r.t === "card") {
    RUN.deck.push(r.id);
    const addedEnergy = autoAddEnergy(r.id);
    saveRun();
    toast("Dodano: " + CARDS[r.id].name + (addedEnergy.length ? " (+ " + addedEnergy.length + " " + addedEnergy[0] + " energija)" : ""));
    showRunMap(); return;
  }
  if (r.t === "life") { RUN.heroLife += 25; saveRun(); showRunMap(); return; }
  if (r.t === "champhp") { RUN.champHpBonus += 10; saveRun(); showRunMap(); return; }
  if (r.t === "hand") { RUN.handBonus += 1; saveRun(); showRunMap(); return; }
  if (r.t === "favor") { RUN.favorStart += 1; saveRun(); showRunMap(); return; }
  if (r.t === "remove") { showRunDeck(true); return; }
  if (r.t === "upgradeCard") { showUpgradePicker(); return; }
  if (r.t === "artifact") { RUN.artifacts = RUN.artifacts || []; RUN.artifacts.push(r.id); saveRun(); toast("Artefakt: " + V2.ARTIFACTS[r.id].icon + " " + V2.ARTIFACTS[r.id].name); showRunMap(); return; }
}

/* ---------------- Nadgradnja kart (per-champion, trajno v runu) ---------------- */
// možne nadgradnje za danega championa (smiselne glede na to, kar že ima)
function champUpgradeOptions(cardId) {
  const d = CARDS[cardId]; const up = RUN.upgrades[cardId] || { grants: [] };
  const has = kw => (d[kw] || (up.grants || []).includes(kw));
  const opts = [
    { k: "hp", label: "❤ +25 HP", desc: "Trajno +25 najvišjega HP." },
    { k: "dmg", label: "⚔ +10 škode", desc: "Vsi napadi te karte +10 škode." },
  ];
  const extra = [];
  if (!has("lifesteal")) extra.push({ k: "kw:lifesteal", label: "🩸 Krvoses", desc: "Napadi zdravijo to karto za zadano škodo." });
  if (!has("charge")) extra.push({ k: "kw:charge", label: "⚡ Naval", desc: "Lahko napade že v potezi priklica." });
  if (!d.activated && !(up.grants || []).some(g => g.startsWith("ability:")))
    extra.push({ k: "ability:shieldSelf", label: "🛡 Aegis (aktivno)", desc: "Tapni + 1 mana: dvigne Shield." });
  if (!d.activated && !(up.grants || []).some(g => g.startsWith("ability:")))
    extra.push({ k: "ability:healSelf30", label: "❤ Okrevanje (aktivno)", desc: "Tapni + 2 mana: pozdravi 30 HP." });
  // 1 naključni "extra" + 2 osnovni = 3 izbire
  if (extra.length) opts.push(extra[(Math.random() * extra.length) | 0]);
  return opts;
}
function showUpgradePicker() {
  const champIds = [...new Set(RUN.deck.filter(id => (CARDS[id] || {}).type === "Champion"))];
  const cards = champIds.map(id => {
    const d = CARDS[id]; const st = PANTHEON_STYLE[d.pantheon] || { symbol: "✦", grad: ["#333", "#555"] };
    const up = RUN.upgrades[id];
    const mark = up ? `<span class="rdc-x">★${(up.hp ? " +" + up.hp + "HP" : "") + (up.dmg ? " +" + up.dmg + "dmg" : "")}</span>` : "";
    return `<button class="run-deckcard" data-id="${id}" ${tipAttr(d.name, cardTipText(d))} style="--c-grad:linear-gradient(160deg,${st.grad[0]},${st.grad[1]})">
      <div class="rdc-art">${artImg(d, "card-art-img")}<span class="card-art-glyph">${st.symbol}</span>${mark}</div>
      <div class="rdc-n">${d.name}${up ? " ★" : ""}</div><div class="rdc-m">❤${d.hp} · Champion</div></button>`;
  }).join("");
  const s = showRunScreen(`
    <header class="run-head"><div><span class="eyebrow">Nadgradnja</span><h2 class="run-title">Katerega šampiona okrepiš?</h2></div>
      <button class="rules-toggle" id="up-back">← Nazaj</button></header>
    <p class="run-sub">Nadgradnja velja za <b>vse kopije</b> te karte v decku — fokus na en tip šampiona se splača.</p>
    <div class="run-deckgrid">${cards}</div>`);
  s.querySelector("#up-back").addEventListener("click", () => RUN._restMode ? restScreen() : showReward(RUN._pendingRewards));
  s.querySelectorAll(".run-deckcard").forEach(b => b.addEventListener("click", () => showUpgradeOptions(b.dataset.id)));
}
function showUpgradeOptions(cardId) {
  const d = CARDS[cardId]; const opts = champUpgradeOptions(cardId);
  const cardsHtml = opts.map((o, i) => `<button class="reward-card upgrade" data-i="${i}">
    <div class="rw-tag">${d.name}</div><div class="rw-up-label">${o.label}</div><div class="rw-up-desc">${o.desc}</div></button>`).join("");
  const s = showRunScreen(`
    <header class="run-head"><div><span class="eyebrow">Nadgradnja · ${d.name}</span><h2 class="run-title">Izberi moč</h2></div>
      <button class="rules-toggle" id="up-back2">← Nazaj</button></header>
    <div class="reward-grid">${cardsHtml}</div>`);
  s.querySelector("#up-back2").addEventListener("click", () => showUpgradePicker());
  s.querySelectorAll(".reward-card").forEach((b, i) => b.addEventListener("click", () => applyUpgrade(cardId, opts[i])));
}
function applyUpgrade(cardId, opt) {
  const up = RUN.upgrades[cardId] || { hp: 0, dmg: 0, grants: [] };
  if (opt.k === "hp") up.hp = (up.hp || 0) + 25;
  else if (opt.k === "dmg") up.dmg = (up.dmg || 0) + 10;
  else { up.grants = up.grants || []; if (!up.grants.includes(opt.k)) up.grants.push(opt.k); }
  RUN.upgrades[cardId] = up; saveRun();
  toast(CARDS[cardId].name + ": " + opt.label);
  if (RUN._restMode) { RUN._restMode = false; clearNode(); } // ognjišče: nadgradnja napreduje vozel
  showRunMap();
}
// zgradi nadgrajeno definicijo karte in jo registriraj; vrne (morda novi) id
function upgradedCardId(baseId) {
  const up = RUN.upgrades[baseId]; if (!up) return baseId;
  const id = baseId + "#u";
  const c = JSON.parse(JSON.stringify(CARDS[baseId]));
  c.id = id; c._baseId = baseId; c.upgraded = true;
  c.name = c.name + " ★";
  if (up.hp) c.hp += up.hp;
  if (up.dmg) (c.attacks || []).forEach(a => { a.damage = (a.damage || 0) + up.dmg; });
  (up.grants || []).forEach(g => {
    if (g === "kw:lifesteal") c.lifesteal = true;
    else if (g === "kw:charge") c.charge = true;
    else if (g === "ability:shieldSelf") c.activated = { name: "Aegis", cost: ["Any"], effect: "shieldSelf", text: "Tapni + 1 mana: dvigne Shield (−20 naslednji udarec)." };
    else if (g === "ability:healSelf30") c.activated = { name: "Okrevanje", cost: ["Any", "Any"], effect: "healSelf30", text: "Tapni + 2 mana: pozdravi 30 HP." };
  });
  CARDS[id] = c;
  return id;
}

function runLaunch() {
  let aiDeck, diff;
  if (RUN.mode === "arena") {
    const decks = Object.keys(STARTER_DECKS).filter(k => k !== "custom" && k !== "run");
    aiDeck = decks[(Math.random() * decks.length) | 0];
    diff = RUN.wins < 3 ? "easy" : RUN.wins < 6 ? "normal" : "hard";
  } else {
    const node = RUN.map.cols[RUN._node.c][RUN._node.i]; aiDeck = node.ai; diff = node.diff;
  }
  const list = RUN.deck.map(id => upgradedCardId(id)); // vključi per-card nadgradnje
  STARTER_DECKS.run = { id: "run", name: "Tvoj deck", pantheon: STARTER_DECKS[RUN.deckId] ? STARTER_DECKS[RUN.deckId].pantheon : deckPantheon(RUN.deck), blurb: "", style: "Run", list };
  V2.startGame("run", aiDeck, diff);
  G.noDeckout = true; // lean run deck -> brez deckout poraza (samo nehaš vleči)
  const you = G.players[0];
  you.maxLife = RUN.heroLife; you.life = RUN.heroLife;
  you.favor = Math.min(3, RUN.favorStart || 0);
  if (RUN.champHpBonus) [...you.deck, ...you.hand].forEach(i => { if (def(i).type === "Champion") i.maxHp += RUN.champHpBonus; });
  for (let k = 0; k < (RUN.handBonus || 0); k++) { if (you.deck.length) you.hand.push(you.deck.pop()); }
  you.artifacts = (RUN.artifacts || []).slice(); V2.artBattleStart(you); // Artefakti runa
  // Elita / boss: okrepljen nasprotnik
  if (RUN.mode === "campaign" && RUN._node) {
    const node = RUN.map.cols[RUN._node.c][RUN._node.i];
    if (node.elite || node.boss) {
      const ai = G.players[1]; const lifeBump = node.boss ? 40 : 20; const hpBump = node.boss ? 15 : 10;
      ai.maxLife += lifeBump; ai.life += lifeBump;
      [...ai.deck, ...ai.hand].forEach(i => { if (def(i).type === "Champion") i.maxHp += hpBump; });
    }
  }
  runActive = true;
  hideRun(); $("#v2-setup").classList.add("hidden"); $("#v2-game").classList.remove("hidden");
  showFirstPick();
}
function onRunBattleEnd(won) {
  $("#v2-game").classList.add("hidden");
  if (RUN.mode === "arena") {
    if (won) { RUN.wins++; saveRun(); showReward(); }
    else { RUN.losses++; saveRun(); if (RUN.losses >= 3) runGameOver(false); else showArenaMap(); }
    return;
  }
  // kampanja
  if (won) {
    const node = RUN.map.cols[RUN._node.c][RUN._node.i];
    clearNode(); // napreduj po mapi
    if (node.boss) { runGameOver(true); return; }
    showReward(node.elite ? eliteRewards() : undefined); // elita -> zajamčen artefakt
  } else { runGameOver(false); }
}
function eliteRewards() {
  const base = genRewards(); // [karta, karta, tretje]
  const art = randomArtifactOffer();
  if (art) base[base.length - 1] = art; else base[base.length - 1] = { t: "life" };
  return base;
}
function runGameOver(won) {
  const arena = RUN.mode === "arena";
  const title = arena ? (won ? "ARENA — ZMAGA 🏆" : "ARENA KONČANA") : (won ? "ZMAGA KAMPANJE 🏆" : "KAMPANJA KONČANA");
  const sub = arena
    ? `${RUN.wins} zmag pred 3 porazi. Deck je imel ${RUN.deck.length} kart.`
    : (won ? "Premagal si bossa kampanje!" : `Padel si po ${(RUN.map && RUN.map.path ? RUN.map.path.length : 0)} osvojenih vozlih. Deck je dosegel ${RUN.deck.length} kart.`);
  const s = showRunScreen(`
    <div class="run-over">
      <h1 class="victory-title" style="${won ? "" : "background:linear-gradient(180deg,#ffd9d2,#ff6b5e 55%,#7a241d);-webkit-background-clip:text;background-clip:text;color:transparent;"}">${title}</h1>
      <p class="run-sub">${sub}</p>
      <button class="btn-primary" id="run-new">Nazaj v meni</button>
    </div>`);
  clearRun();
  s.querySelector("#run-new").addEventListener("click", backToMenu);
}

/* ---------------- FIRST CHAMPION PICK ---------------- */
function showFirstPick() {
  seenChampUids = new Set(); lastChampFx = {}; prevYouMana = []; seenHandUids = new Set(); firstHandRender = true; // nova bitka -> ponastavi FX sledenje
  const you = G.players[0];
  const titleEl = document.querySelector("#v2-pick .mull-title"); if (titleEl) titleEl.textContent = "Mulligan — obdrži ali zameši roko";
  const subEl = document.querySelector("#v2-pick .mull-sub"); if (subEl) subEl.innerHTML = "Začneš s <b>praznim boardom</b> — vse igraš iz roke. Prvi mulligan je zastonj, vsak naslednji poteguje 1 karto manj.";
  const wrap = $("#v2-pick-cards"); wrap.innerHTML = "";
  you.hand.forEach(inst => {
    const d = def(inst);
    wrap.appendChild(d.type === "Champion" && d.stage === "basic" ? champPreviewCard(d) : handInfoCard(d));
  });
  let actions = document.getElementById("v2-pick-actions");
  if (!actions) { actions = el("div", "mull-actions"); actions.id = "v2-pick-actions"; $("#v2-pick .mulligan-inner").appendChild(actions); }
  actions.innerHTML = "";
  const mulls = you._mulligans || 0;
  const nextCost = mulls === 0 ? "zastonj" : "−" + mulls + (mulls === 1 ? " karta" : " kart");
  const keep = el("button", "mull-btn keep", "✓ Obdrži in začni");
  keep.addEventListener("click", () => { V2.keepHand(); $("#v2-pick").classList.add("hidden"); render(); showTurnBanner("Tvoja poteza", "you"); });
  const mull = el("button", "mull-btn mull", `🔄 Mulligan (${nextCost})`);
  mull.addEventListener("click", () => { V2.mulliganHand(); showFirstPick(); });
  actions.appendChild(keep); actions.appendChild(mull);
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
let lastChampFx = {};   // {uid:{hp,buffs,x,y}} — za smrt/heal/buff FX
let prevYouMana = [];   // za mana tap/dodajanje FX
// ambientne iskre nad bojiščem (čista dekoracija, enkratna injekcija)
function ensureEmbers() {
  const f = document.querySelector(".v2-field");
  if (!f || f.querySelector(".v2-embers")) return;
  const e = el("div", "v2-embers");
  e.innerHTML = "<i></i>".repeat(14);
  f.appendChild(e);
}
function render() {
  if (!G.players.length) return;
  ensureEmbers();
  renderSide($("#v2-opp"), G.players[1], false);
  renderSide($("#v2-you"), G.players[0], true);
  renderHand();
  renderActions();
  renderManaPanel();
  renderLog();
  $("#v2-turn").innerHTML = G.over ? "" : `Poteza ${G.turnCount} · na potezi: <b>${G.turn === 0 ? "Ti" : "Nasprotnik"}</b>`;
  $("#v2-end").style.display = (G.turn === 0 && !G.over) ? "" : "none";
  updateArrow();
  hideDmgPreview();
  fxTrackChamps();
  fxManaChanges();
}
// zazna smrt (poof), zdravljenje (zelen +) in nove buffe (utrip) med renderji
function fxTrackChamps() {
  const all = []; G.players.forEach(pl => pl.board.forEach(c => all.push(c)));
  const curUids = new Set(all.map(c => c.uid));
  Object.keys(lastChampFx).forEach(uid => { if (!curUids.has(uid)) { const f = lastChampFx[uid]; deathPoof(f.x, f.y); SFX.play("death"); } });
  const cur = {};
  all.forEach(c => {
    const eln = findChampEl(c.uid);
    const b = eln ? eln.getBoundingClientRect() : null;
    const pos = b ? { x: b.left + b.width / 2, y: b.top + b.height / 2 } : (lastChampFx[c.uid] || { x: 0, y: 0 });
    const hp = c.maxHp - c.damage;
    const buffs = ["blessing", "shield", "guard"].filter(k => c.status && c.status[k]);
    const prev = lastChampFx[c.uid];
    if (prev && eln) {
      if (hp > prev.hp) { flyDamage(pos.x, pos.y - 14, hp - prev.hp, "heal"); eln.classList.add("fx-heal"); setTimeout(() => eln.classList.remove("fx-heal"), 650); SFX.play("heal"); }
      if (buffs.some(bk => !prev.buffs.includes(bk))) { eln.classList.add("fx-buff"); setTimeout(() => eln.classList.remove("fx-buff"), 750); }
    }
    cur[c.uid] = { hp, buffs, x: pos.x, y: pos.y };
  });
  lastChampFx = cur;
}
function deathPoof(x, y) {
  ensureFx();
  const n = el("div", "v2-poof", "☠");
  n.style.left = x + "px"; n.style.top = y + "px";
  document.getElementById("v2-fx").appendChild(n);
  setTimeout(() => n.remove(), 700);
}
// mana: utrip ob tapanju, pop ob dodajanju (samo igralčeva)
function fxManaChanges() {
  const you = G.players[0]; if (!you) { prevYouMana = []; return; }
  const cur = you.mana.map(m => m.tapped);
  const pips = document.querySelectorAll('#v2-mana .v2-manacard');
  cur.forEach((tapped, i) => {
    const pip = pips[i]; if (!pip) return;
    if (i >= prevYouMana.length) { pip.classList.add("just-added"); setTimeout(() => pip.classList.remove("just-added"), 500); if (prevYouMana.length) SFX.play("energy"); }
    else if (tapped && !prevYouMana[i]) { pip.classList.add("just-tapped"); setTimeout(() => pip.classList.remove("just-tapped"), 420); SFX.play("mana"); }
  });
  prevYouMana = cur;
}

function heroBar(p) {
  const pct = Math.max(0, Math.round(p.life / (p.maxLife || V2.START_LIFE) * 100));
  const st = PANTHEON_STYLE[p.pantheon] || { symbol: "✦", grad: ["#333", "#555"] };
  const hpw = p.heroPower ? `<span class="v2-hero-pw" title="${p.heroPower.text}">★ ${p.heroPower.name}</span>` : "";
  return `<div class="v2-hero">
    <div class="v2-hero-ava" style="--c-grad:linear-gradient(160deg,${st.grad[0]},${st.grad[1]})">${st.symbol}</div>
    <div class="v2-hero-info">
      <span class="v2-hero-name">${p.name} ${hpw}</span>
      <div class="v2-hero-bar"><div class="v2-hero-fill ${p.life <= 40 ? "low" : ""}" style="width:${pct}%"></div>
        <span class="v2-hero-life">❤ ${p.life}</span></div>
    </div>
  </div>`;
}
// kompaktna (read-only) mana vrstica za nasprotnika (v glavi)
// pogled mana žetona: dual (dva glyph-a), nevtralna (✦), navadna
function manaTokenView(m) {
  if (m.types) { const a = ENERGY_STYLE[m.types[0]] || {}, b = ENERGY_STYLE[m.types[1]] || {}; return { glyph: (a.glyph || "✦") + (b.glyph || "✦"), color: a.color || "#cfcfcf", color2: b.color || "#cfcfcf", dual: true, label: m.types.join("/") }; }
  if (m.type === "Any") return { glyph: "✦", color: "#cfcfcf", dual: false, label: "Nevtralna" + (m.temp ? " ⏱" : "") };
  const s = ENERGY_STYLE[m.type] || { color: "#888", glyph: "✦" };
  return { glyph: s.glyph, color: s.color, dual: false, label: m.type };
}
function manaRow(p) {
  const untap = p.mana.filter(m => !m.tapped).length;
  const pips = p.mana.map(m => {
    const v = manaTokenView(m);
    return `<span class="v2-mana ${m.tapped ? "tapped" : ""} ${v.dual ? "dual" : ""}" style="--mc:${v.color}">${v.glyph}</span>`;
  }).join("");
  return `<div class="v2-mana-row"><span class="v2-mana-lab">MANA <b>${untap}</b>/${p.mana.length}</span>${pips}</div>`;
}
// aktivne sinergije (Bond / Zavezništvo) kot chip-i
function synergyChips(p) {
  if (!V2.synergyLabels) return "";
  const labels = V2.synergyLabels(p);
  if (!labels.length) return "";
  return `<div class="v2-syn">` + labels.map(l => {
    const st = l.pantheon ? (PANTHEON_STYLE[l.pantheon] || { symbol: "✦" }) : null;
    const ic = l.kind === "bond" ? (st ? st.symbol : "⚡") : "🤝";
    return `<span class="v2-synchip ${l.kind === "bond" ? "syn-bond" : "syn-ally"}" ${tipAttr((l.kind === "bond" ? "⚡ Bond: " : "🤝 ") + l.name, l.text)}>${ic} ${l.name}</span>`;
  }).join("") + `</div>`;
}
// mana cona v desnem panelu (vedno vidna, ne prekrita z roko)
function renderManaPanel() {
  const host = $("#v2-mana"); if (!host || !G.players[0]) return;
  host.innerHTML = "";
  host.appendChild(renderManaZone(G.players[0]));
}
// interaktivna cona energij — klikni karte energij za plačilo
function renderManaZone(you) {
  const zone = el("div", "v2-manazone");
  const untap = you.mana.filter(m => !m.tapped).length;
  const picking = !!manaPick;
  const lab = picking
    ? `<span class="mz-lab picking">Tapni energije za plačilo: ${costHtml(manaPick.cost)} <b>${manaPick.sel.length}/${manaPick.cost.length}</b></span><button class="mz-cancel">✕</button>`
    : `<span class="mz-lab">ENERGIJE <b>${untap}</b>/${you.mana.length}</span>`;
  const pips = you.mana.map((m, i) => {
    const v = manaTokenView(m);
    const sel = picking && manaPick.sel.includes(i);
    const cls = "v2-manacard" + (m.tapped ? " tapped" : "") + (sel ? " sel" : "") + (v.dual ? " dual" : "") + (picking && (!m.tapped || sel) ? " selectable" : "");
    const tip = m.types ? "Dual energija — plača za " + m.types.join(" ali ") + "." : (m.type === "Any" ? "Nevtralna energija — plača katerikoli tip." : "Na voljo za priklic / napade / efekte.");
    const style = `--mc:${v.color}` + (v.color2 ? `;--mc2:${v.color2}` : "");
    return `<span class="${cls}" data-mi="${i}" style="${style}" ${tipAttr(v.label + " energija", m.tapped ? "Porabljena to potezo." : tip)}>${v.glyph}<small>${m.types ? m.types[0].slice(0, 3) + "/" + m.types[1].slice(0, 3) : (m.type === "Any" ? "ANY" : m.type)}</small></span>`;
  }).join("");
  zone.innerHTML = `${lab}<div class="mz-pips">${pips || '<span class="mz-empty">— igraj energijo iz roke —</span>'}</div>`;
  if (picking) {
    const cx = zone.querySelector(".mz-cancel"); if (cx) cx.addEventListener("click", () => { manaPick = null; render(); });
    zone.querySelectorAll(".v2-manacard").forEach(pip => pip.addEventListener("click", () => {
      const i = +pip.dataset.mi;
      if (you.mana[i].tapped && !manaPick.sel.includes(i)) return;
      const k = manaPick.sel.indexOf(i); if (k >= 0) manaPick.sel.splice(k, 1); else manaPick.sel.push(i);
      if (manaSelValid(manaPick.sel, manaPick.cost, manaPick.lughAny)) { const cb = manaPick.onPaid, idx = manaPick.sel.slice(); manaPick = null; cb(idx); }
      else render();
    }));
  }
  return zone;
}

function artBattleStrip(p) {
  if (!p.artifacts || !p.artifacts.length) return "";
  const bonus = p.artBonus && p.artBonus.atkFlat ? `<span class="art-bonus" ${tipAttr("Skalirana škoda", "Artefakt-motorji so do zdaj v tej bitki dodali +" + p.artBonus.atkFlat + " škode vsem napadom.")}>+${p.artBonus.atkFlat}⚔</span>` : "";
  return `<div class="v2-arts">` + p.artifacts.map(id => { const A = V2.ARTIFACTS[id]; return A ? `<span class="v2-art${A.scale ? " scale" : ""}" ${tipAttr(A.icon + " " + A.name, A.desc)}>${A.icon}</span>` : ""; }).join("") + bonus + `</div>`;
}
function renderSide(container, p, isYou) {
  container.innerHTML = "";
  const row = el("div", "v2-board-row");
  if (!p.board.length) row.appendChild(el("div", "v2-empty", isYou ? "Tvoj board je prazen" : "Brez branilcev — napadljiv obraz!"));
  p.board.forEach(c => row.appendChild(boardChamp(c, p, isYou)));
  // razpored simetričen: nasprotnik = glava zgoraj + board; ti = board + noga (heroj + energije v eni vrstici)
  if (isYou) {
    container.appendChild(row);
    const footer = el("div", "v2-you-footer");
    const hb = el("div", "v2-head");
    hb.innerHTML = heroBar(p) + `<div class="v2-meta">Deck ${p.deck.length} · Roka ${p.hand.length}</div>` + synergyChips(p) + artBattleStrip(p);
    footer.appendChild(hb);
    container.appendChild(footer); // mana cona je zdaj v desnem panelu (#v2-mana), da je ne prekriva roka
  } else {
    const head = el("div", "v2-head");
    head.innerHTML = heroBar(p) + `<div class="v2-meta">Deck ${p.deck.length} · Roka ${p.hand.length}</div>` + synergyChips(p) + manaRow(p);
    container.appendChild(head);
    container.appendChild(row);
    const heroEl = head.querySelector(".v2-hero");
    if (heroEl) {
      const canFace = G.turn === 0 && !G.over && selAttacker && selAtkIndex != null && !V2.tauntsOf(p).length;
      if (canFace) heroEl.classList.add("face-targetable");
      heroEl.addEventListener("click", () => {
        if (G.turn === 0 && !G.over && selAttacker && selAtkIndex != null) doAttack({ kind: "face" });
        else toast("Izberi svojega napadalca in napad, nato klikni nasprotnikov lik.");
      });
    }
  }
}

function boardChamp(c, owner, isYou) {
  const d = def(c);
  const st = PANTHEON_STYLE[d.pantheon] || { symbol: "✦", grad: ["#333", "#555"] };
  const life = c.maxHp - c.damage;
  const pct = Math.max(0, Math.round(life / c.maxHp * 100));
  const taunt = V2.isTaunt(c);
  const rar = (RARITY_STYLE && RARITY_STYLE[d.rarity]) || { color: "#9aa0a6", glow: "rgba(154,160,166,0)" };
  const atkVal = Math.max(0, ...(d.attacks || []).map(a => a.damage || 0));
  const node = el("div", "v2-champ rar-" + (d.rarity || "Common").toLowerCase() + (c.tapped ? " tapped" : "") + (c.sick ? " sick" : "") + (d.minion ? " minion" : "") + (taunt ? " taunt" : ""));
  node.style.setProperty("--rar", rar.color); node.style.setProperty("--rar-glow", rar.glow);
  node.dataset.uid = c.uid;
  node.dataset.owner = isYou ? "you" : "opp";
  if (!seenChampUids.has(c.uid)) { node.classList.add("entering"); seenChampUids.add(c.uid); SFX.play("summon"); } // enter-play animacija (enkrat) + zvok
  node.style.setProperty("--c-grad", `linear-gradient(160deg, ${st.grad[0]}, ${st.grad[1]})`);
  const canAtk = isYou && G.turn === 0 && !G.over && V2.canAttack(owner, c);
  if (canAtk) node.classList.add("ready");
  if (selAttacker === c.uid) node.classList.add("selected-att");
  // targetable highlight — pri Tauntu so napadljivi le Taunt branilci
  if (selAttacker && selAtkIndex != null && !isYou) {
    const oppTaunts = V2.tauntsOf(owner).length;
    if (!oppTaunts || taunt) node.classList.add("targetable");
    else node.classList.add("blocked-target");
  }
  if (pendingPlay && ((pendingPlay.need === "ally" && isYou) || (pendingPlay.need === "enemy" && !isYou)))
    node.classList.add(pendingPlay.need === "enemy" ? "targetable" : "target-ally");
  const stChips = statusChips(c);
  // combo/momentum badge: zaporedni napadi istega tipa dajo bonus naslednjemu
  let comboTag = "";
  if (c._comboCount >= 2 && c._comboType) {
    const es = ENERGY_STYLE[c._comboType] || { glyph: "✦", color: "#ffd97a" };
    const nextBonus = Math.min(c._comboCount * 10, 30);
    comboTag = `<span class="v2-tag combo" style="--mc:${es.color}" ${tipAttr("🔥 Combo ×" + c._comboCount, "Zaporedni " + c._comboType + " napadi. Naslednji " + c._comboType + " napad: +" + nextBonus + " škode.")}>🔥${c._comboCount}</span>`;
  }
  const tauntTag = taunt ? `<span class="v2-tag taunt" ${tipAttr("🛡 Taunt (Zid)", "Nasprotnik mora najprej napasti tega branilca, preden lahko udari ostale ali obraz.")}>🛡</span>` : "";
  const decayTag = d.decay ? `<span class="v2-tag decay" ${tipAttr("☠ Razpad " + d.decay + "/potezo", "Vsak konec poteze izgubi " + d.decay + " HP in sčasoma umre.")}>☠${d.decay}</span>` : "";
  const evolveTag = d.evolve ? `<span class="v2-tag evolve" ${tipAttr("⬆ Evolucija " + (c._evolve || 0) + "/" + d.evolve.need, "Uri (Train) " + d.evolve.need + "×, da se razvije v " + (d.evolve.name || "močnejšo verzijo") + ".")}>⬆${c._evolve || 0}/${d.evolve.need}</span>` : "";
  node.innerHTML = `
    <div class="v2-champ-art">${artImg(d, "champ-art-img")}<span class="v2-champ-sym">${st.symbol}</span>
      <span class="v2-champ-gem atk" ${tipAttr("Napad", "Najmočnejši napad tega šampiona.")}>${atkVal}</span>
      <span class="v2-champ-hp v2-champ-gem hp${life <= c.maxHp * 0.35 ? " low" : ""}">${life}</span>
      ${c.sick ? `<span class="v2-tag sick">💤</span>` : ""}${c.tapped ? `<span class="v2-tag tap">↻</span>` : ""}${tauntTag}${decayTag}${evolveTag}${comboTag}
      ${stChips ? `<div class="v2-champ-statusbar">${stChips}</div>` : ""}</div>
    <div class="v2-champ-body">
      <div class="v2-champ-name" ${tipAttr(d.name, cardTipText(d))}>${d.name}</div>
      <div class="v2-hpbar"><div class="v2-hpfill ${pct <= 35 ? "low" : ""}" style="width:${pct}%"></div></div>
      ${atkRowsHtml(d, isYou ? owner : null)}
      <div class="v2-status">${kwMini(d)}${equipChips(c)}</div>
    </div>`;
  node.addEventListener("click", () => onChampClick(c, owner, isYou));
  return node;
}
// vrstice napadov: cena (mana glyphi) + damage; označi plačljive (tvoja poteza)
function atkRowsHtml(d, owner) {
  if (!d.attacks || !d.attacks.length) return "";
  return `<div class="v2-atks">` + d.attacks.map(a => {
    const payable = owner && G.turn === 0 && !G.over && V2.canPay(owner, a.cost, d.id === "celtic-lugh");
    return `<div class="v2-atk${payable ? " ok" : ""}${a.scale ? " motor" : ""}" ${tipAttr(a.name, atkTipText(a))}><span class="v2-atk-cost">${costHtml(a.cost)}</span><span class="v2-atk-dmg">${a.damage}${a.scale ? "⚙" : ""}</span></div>`;
  }).join("") + `</div>`;
}
const STATUS_BUFFS = ["blessing", "shield", "guard"];
const STATUS_SHORT = { burn: "Ožig", freeze: "Zmrznjen", stun: "Omama", curse: "Prekletstvo", blessing: "Blagoslov", shield: "Shield", poison: "Strup", guard: "Garda" };
const STATUS_CHIP = { burn: "Ožig", freeze: "Zmrz.", stun: "Omama", curse: "Kletev", blessing: "Blag.", shield: "Shield", poison: "Strup", guard: "Garda" };
function statusChips(c) {
  const s = c.status || {}; const out = [];
  const map = { burn: "🔥", freeze: "❄️", stun: "💫", curse: "💀", blessing: "✨", shield: "🛡️", poison: "☠️", guard: "⛨" };
  // badge-i z ikono IN kratko oznako — VSI vidni; polna razlaga v tooltipu (hover/dvoklik)
  for (const k in map) if (s[k]) {
    const t = STATUS_TEXT[k] || [k, ""];
    const kind = STATUS_BUFFS.includes(k) ? "buff" : "debuff";
    const n = (typeof s[k] === "number" && s[k] > 1) ? `<b>${s[k]}</b>` : "";
    out.push(`<span class="v2-st ${kind}" ${tipAttr(t[0], (STATUS_SHORT[k] || k) + " — " + t[1])}>${map[k]}${n}<i>${STATUS_CHIP[k] || k}</i></span>`);
  }
  return out.join("");
}
function kwIcon(kw, glyph) { const t = KEYWORD_TEXT[kw] || [kw, ""]; return `<span class="v2-kwi" ${tipAttr(t[0], t[1])}>${glyph}</span>`; }
function kwMini(d) {
  const ic = [];
  if (d.charge) ic.push(kwIcon("charge", "⚡")); if (d.lifesteal) ic.push(kwIcon("lifesteal", "🩸")); if (d.overload) ic.push(kwIcon("overload", "⛓"));
  if (d.onEnter) ic.push(kwIcon("onEnter", "➹")); if (d.onDefeat) ic.push(kwIcon("onDefeat", "☠"));
  if (d.activated) ic.push(`<span class="v2-kwi" ${tipAttr("⚡ " + d.activated.name, d.activated.text)}>✦</span>`); if (d.dodge) ic.push(kwIcon("dodge", "💨"));
  return ic.length ? `<span class="v2-kw">${ic.join("")}</span>` : "";
}
// chip-i pritrjene opreme (orožje/oklep) + razlaga; kw doda granted keywords
function equipChips(c) {
  const out = [];
  [["weapon", c.weapon, "🗡️"], ["armor", c.armor, "🛡️"]].forEach(([slot, id, gl]) => {
    if (!id) return; const e = CARDS[id];
    out.push(`<span class="v2-equip ${slot}" ${tipAttr(gl + " " + e.name, e.text)}>${gl}</span>`);
  });
  return out.join("");
}

function renderHand() {
  const you = G.players[0];
  const h = $("#v2-hand"); h.innerHTML = "";
  const n = you.hand.length, center = (n - 1) / 2;
  let drawIdx = 0; // zaporedje na novo vlečenih kart (za zamik animacije)
  you.hand.forEach((inst, idx) => {
    const d = def(inst);
    const st = d.pantheon ? PANTHEON_STYLE[d.pantheon] : null;
    const rar = (RARITY_STYLE && RARITY_STYLE[d.rarity]) || { color: "#9aa0a6", glow: "rgba(154,160,166,0)" };
    const node = el("div", "v2-handcard rar-" + (d.rarity || "Common").toLowerCase());
    node.setAttribute("data-tip-title", d.name); node.setAttribute("data-tip", cardTipText(d));
    node.style.setProperty("--c-grad", st ? `linear-gradient(160deg, ${st.grad[0]}, ${st.grad[1]})` : "linear-gradient(160deg,#2a2a3a,#444)");
    node.style.setProperty("--rar", rar.color); node.style.setProperty("--rar-glow", rar.glow);
    // pahljača (fan): rahla rotacija + spust proti robovom
    const off = idx - center;
    node.style.setProperty("--fan-rot", Math.max(-11, Math.min(11, off * 3.2)) + "deg");
    node.style.setProperty("--fan-y", (Math.abs(off) * 5) + "px");
    // mana dragulj
    let gem;
    if (d.type === "Energy") gem = `<span class="v2-gem energy" title="Energija">+</span>`;
    else gem = `<span class="v2-gem">${d.type === "Champion" ? V2.summonCostOf(d) : V2.manaCostOf(d)}</span>`;
    const playable = isPlayable(inst);
    if (playable) node.classList.add("playable");
    let glyph = st ? st.symbol : (ENERGY_STYLE[d.energyType] ? ENERGY_STYLE[d.energyType].glyph : "✦");
    node.innerHTML = `${gem}<div class="v2-hc-art">${artImg(d, "card-art-img")}<span class="card-art-glyph">${glyph}</span></div>
      <div class="v2-hc-body"><div class="v2-hc-name">${d.name}</div>
      <div class="v2-hc-meta">${d.type === "Equipment" ? (d.slot === "armor" ? "Oklep" : "Orožje") : d.type}${d.type === "Champion" ? " ❤" + d.hp : ""}</div>
      ${d.type === "Champion" ? atkRowsHtml(d, null) : ""}</div>`;
    // card-draw animacija: nove karte (še neviden uid) zletijo iz decka v roko
    if (inst.uid != null && !seenHandUids.has(inst.uid)) {
      seenHandUids.add(inst.uid);
      if (!firstHandRender) { node.classList.add("drawn"); node.style.setProperty("--draw-i", drawIdx++); SFX.play("draw"); }
    }
    node.addEventListener("pointerdown", (e) => startHandDrag(inst, node, e));
    h.appendChild(node);
  });
  firstHandRender = false; // od zdaj naprej animiramo le na novo vlečene karte
  $("#v2-hand").classList.toggle("dim", G.turn !== 0 || G.over);
}
function isPlayable(inst) {
  const you = G.players[0]; const d = def(inst);
  if (G.turn !== 0 || G.over || G.pendingBlock || manaPick) return false;
  if (d.type === "Energy") return !you.playedEnergyThisTurn;
  if (d.type === "Champion") return d.stage === "basic" && you.board.length < V2.BOARD_MAX && V2.canPay(you, Array.from({ length: V2.summonCostOf(d) }, () => "Any"));
  if (["Oracle", "Relic", "Realm", "Equipment"].includes(d.type)) {
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

  // ročna izbira mane -> sedaj v coni energij POD boardom
  if (manaPick) {
    panel.appendChild(el("div", "hint", `Tapni energije <b>pod svojim boardom</b> za plačilo: ${costHtml(manaPick.cost)}.`));
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
      if (V2.tauntsOf(G.players[1]).length) panel.appendChild(el("div", "hint taunt-hint", `🛡 Nasprotnik ima <b>zid (Taunt)</b> — najprej premagaj branilce z 🛡 (obraz in ostali so zaščiteni).`));
      d.attacks.forEach((atk, i) => {
        const can = V2.canPay(you, atk.cost, d.id === "celtic-lugh");
        const b = el("button", "action-btn attack" + (selAtkIndex === i ? " sel" : "") + (atk.basic ? " basic-atk" : "") + (atk.effect || atk.noFace || atk.scale ? " has-fx" : ""));
        const tag = atk.basic ? `<span class="atk-tag flex">katerakoli ⬡</span>` : `<span class="atk-tag">tarčni</span>`;
        const restrict = atk.noFace ? `<span class="atk-tag nf">le bitja</span>` : "";
        const fx = atk.effect && EFFECT_TEXT[atk.effect] ? `<span class="atk-fx">✦</span>` : "";
        const motor = atk.scale ? `<span class="atk-tag motor">⚙ motor</span>` : "";
        b.innerHTML = `${atk.name} ${tag}${restrict}${motor}${fx} <span class="ab-cost">${atk.damage}${atk.scale ? "+⚙" : ""} dmg · ${costHtml(atk.cost)}</span>`;
        b.disabled = !can;
        b.setAttribute("data-tip-title", atk.name); b.setAttribute("data-tip", atkTipText(atk));
        b.addEventListener("click", () => { selAtkIndex = i; toast(atk.noFace ? "Klikni nasprotnikovega ŠAMPIONA (ta napad ne gre v obraz)." : "Klikni nasprotnikovega šampiona ali NJEGOV OBRAZ."); render(); });
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
        ab.setAttribute("data-tip-title", "⚡ " + a.name); ab.setAttribute("data-tip", (EFFECT_TEXT[a.effect] || a.text));
        ab.addEventListener("click", () => doActivate());
        panel.appendChild(ab);
      }
      const cancel = el("button", "action-btn", "Prekliči");
      cancel.addEventListener("click", () => { selAttacker = null; selAtkIndex = null; render(); });
      panel.appendChild(cancel);
      // gumb za napad na obraz (če je izbran napad, ki sme v obraz)
      if (selAtkIndex != null && !(d.attacks[selAtkIndex] && d.attacks[selAtkIndex].noFace)) {
        const face = el("button", "action-btn attack", "⚔ Napadi OBRAZ nasprotnika");
        face.addEventListener("click", () => doAttack({ kind: "face" }));
        panel.appendChild(face);
      }
    }
  } else {
    panel.appendChild(el("div", "hint", "Klikni svojega <b>netapnjenega</b> šampiona za napad, ali igraj karto iz roke (energija / priklic)."));
    // Hero Power
    if (you.heroPower) {
      const hpw = you.heroPower;
      const canHP = !you.heroPowerUsed && V2.canPay(you, Array.from({ length: hpw.cost }, () => "Any"));
      const b = el("button", "action-btn hero-power" + (you.heroPowerUsed ? " used" : ""));
      b.innerHTML = `★ ${hpw.name} <span class="ab-cost">⬡${hpw.cost}</span>`;
      b.title = hpw.text;
      b.setAttribute("data-tip-title", "★ " + hpw.name); b.setAttribute("data-tip", hpw.text + "\n(1× na potezo)");
      b.disabled = !canHP;
      b.addEventListener("click", doHeroPower);
      panel.appendChild(b);
    }
    // Naklonjenost toggle
    if (you.favor > 0 || you._favorArmed) {
      const armed = you._favorArmed && you.favor > 0;
      const fb = el("button", "action-btn favor" + (armed ? " armed" : ""), `🔮 Naklonjenost ${you.favor}/3 ${armed ? "✦" : ""}`);
      fb.addEventListener("click", () => { you._favorArmed = !you._favorArmed; render(); });
      panel.appendChild(fb);
    }
  }
}
function doHeroPower() {
  const you = G.players[0]; const hpw = you.heroPower; if (!hpw) return;
  payThen(Array.from({ length: hpw.cost }, () => "Any"), false, idx => {
    const r = V2.useHeroPower(you, idx);
    if (!r.ok) toast(r.msg || "Ni mogoče."); else SFX.play("hero");
    manaPick = null; render(); checkOver();
  });
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
function kCombos(arr, k) {
  const res = [];
  (function rec(start, combo) {
    if (combo.length === k) { res.push(combo.slice()); return; }
    for (let i = start; i < arr.length; i++) { combo.push(arr[i]); rec(i + 1, combo); combo.pop(); }
  })(0, []);
  return res;
}
function payThen(cost, lughAny, onPaid) {
  const you = G.players[0];
  if (!V2.canPay(you, cost, lughAny)) { toast("Premalo mane."); return; }
  const untapped = you.mana.map((m, i) => i).filter(i => !you.mana[i].tapped);
  // moraš porabiti vso netapnjeno mano -> samodejno
  if (untapped.length === cost.length) { onPaid(untapped); return; }
  // sicer: če vse veljavne izbire pustijo ISTI preostanek tipov, je izbira nepomembna -> samodejno
  const combos = kCombos(untapped, cost.length).filter(c => manaSelValid(c, cost, lughAny));
  if (combos.length) {
    const remSig = c => { const u = new Set(c); return you.mana.filter((m, i) => !m.tapped && !u.has(i)).map(m => m.type).sort().join("|"); };
    const sigs = new Set(combos.map(remSig));
    if (sigs.size === 1) { onPaid(combos[0]); return; } // npr. 2 enaki energiji & cena 2, ali edina veljavna izbira
  }
  manaPick = { cost, lughAny, sel: [], onPaid };
  toast("Izberi mano za plačilo (" + cost.length + ").");
  render();
}
function manaSelValid(sel, cost, lughAny) {
  return V2.canPaySelection(G.players[0], sel, cost, lughAny); // podpira dual / nevtralno mano
}

/* ---------------- DRAG-TO-PLAY (Hearthstone-style) ---------------- */
let dragState = null;
function startHandDrag(inst, node, e) {
  if (e.button != null && e.button !== 0) return;            // samo levi gumb
  if (G.turn !== 0 || G.over || manaPick || pendingPlay) { return; }
  e.preventDefault();
  dragState = { inst, node, x0: e.clientX, y0: e.clientY, dragging: false, ghost: null, need: V2.cardNeedsTarget(def(inst)) };
  window.addEventListener("pointermove", onDragMove);
  window.addEventListener("pointerup", onDragUp, { once: true });
}
function onDragMove(e) {
  const ds = dragState; if (!ds) return;
  if (!ds.dragging) {
    if (Math.hypot(e.clientX - ds.x0, e.clientY - ds.y0) < 8) return; // prag
    beginDrag();
  }
  if (ds.ghost) { ds.ghost.style.left = e.clientX + "px"; ds.ghost.style.top = e.clientY + "px"; }
  updateDropHover(e.clientX, e.clientY);
}
function beginDrag() {
  const ds = dragState; const d = def(ds.inst);
  ds.dragging = true;
  const r = ds.node.getBoundingClientRect();
  const g = ds.node.cloneNode(true);
  g.className = "v2-handcard v2-drag-ghost rar-" + (d.rarity || "Common").toLowerCase();
  g.style.cssText = "";
  g.style.setProperty("--rar", ds.node.style.getPropertyValue("--rar"));
  g.style.setProperty("--rar-glow", ds.node.style.getPropertyValue("--rar-glow"));
  g.style.setProperty("--c-grad", ds.node.style.getPropertyValue("--c-grad"));
  g.style.width = r.width + "px";
  document.body.appendChild(g);
  ds.ghost = g;
  ds.node.classList.add("dragging-src");
  document.body.classList.add("v2-dragging");
  // označi spustne cone
  if (ds.need === "enemy") document.querySelectorAll('.v2-champ[data-owner="opp"]').forEach(c => c.classList.add("drop-ok"));
  else if (ds.need === "ally") document.querySelectorAll('.v2-champ[data-owner="you"]').forEach(c => c.classList.add("drop-ok"));
  else { const f = document.querySelector(".v2-field"); if (f) f.classList.add("drop-zone"); }
}
function updateDropHover(x, y) {
  const ds = dragState; if (!ds || !ds.dragging) return;
  document.querySelectorAll(".drop-hot").forEach(e => e.classList.remove("drop-hot"));
  if (ds.ghost) ds.ghost.style.visibility = "hidden";
  const under = document.elementFromPoint(x, y);
  if (ds.ghost) ds.ghost.style.visibility = "";
  if (!under) return;
  if (ds.need) {
    const champEl = under.closest(".v2-champ");
    if (champEl && ((ds.need === "enemy" && champEl.dataset.owner === "opp") || (ds.need === "ally" && champEl.dataset.owner === "you")))
      champEl.classList.add("drop-hot");
  } else {
    const f = under.closest(".v2-field"); if (f) f.classList.add("drop-hot");
  }
}
function onDragUp(e) {
  window.removeEventListener("pointermove", onDragMove);
  const ds = dragState; dragState = null;
  if (!ds) return;
  const wasDrag = ds.dragging;
  cleanupDrag(ds);
  if (!wasDrag) { onHandClick(ds.inst); return; }            // ni se premaknilo -> klik
  dropPlay(ds.inst, e.clientX, e.clientY);
}
function cleanupDrag(ds) {
  if (ds.ghost) ds.ghost.remove();
  if (ds.node) ds.node.classList.remove("dragging-src");
  document.body.classList.remove("v2-dragging");
  document.querySelectorAll(".drop-zone, .drop-hot, .drop-ok").forEach(e => e.classList.remove("drop-zone", "drop-hot", "drop-ok"));
}
// spusti karto na (x,y): določi cono/tarčo in odigraj (uporabi obstoječo logiko)
function dropPlay(inst, x, y) {
  const you = G.players[0]; const d = def(inst);
  if (G.turn !== 0 || G.over || manaPick) return;
  const under = document.elementFromPoint(x, y);
  const overField = !!(under && under.closest(".v2-field"));
  const champEl = under && under.closest(".v2-champ");
  if (d.type === "Energy") {
    if (!overField && !(under && under.closest(".v2-manazone"))) { toast("Spusti energijo na bojišče."); return; }
    const r = V2.playEnergy(you, inst); if (!r.ok && r.msg) toast(r.msg); render(); return;
  }
  if (d.type === "Champion") {
    if (!overField) return;                                  // spuščeno mimo -> prekliči tiho
    if (d.stage !== "basic") { toast("Ascension karte ne moreš priklicati."); return; }
    if (you.board.length >= V2.BOARD_MAX) { toast("Board je poln."); return; }
    const cost = Array.from({ length: V2.summonCostOf(d) }, () => "Any");
    payThen(cost, false, idx => { const r = V2.summon(you, inst, idx); if (!r.ok) toast(r.msg || "Ni mogoče."); manaPick = null; render(); });
    return;
  }
  if (["Oracle", "Relic", "Realm", "Equipment"].includes(d.type)) {
    const need = V2.cardNeedsTarget(d);
    if (need) {
      let targetUid = null;
      if (champEl && ((need === "enemy" && champEl.dataset.owner === "opp") || (need === "ally" && champEl.dataset.owner === "you")))
        targetUid = Number(champEl.dataset.uid);
      if (targetUid == null) { toast(need === "enemy" ? "Spusti na NASPROTNIKOVEGA šampiona." : "Spusti na SVOJEGA šampiona."); return; }
      const cost = Array.from({ length: V2.manaCostOf(d) }, () => "Any");
      payThen(cost, false, idx => { const r = V2.playCard(you, inst, { targetUid, manaIdx: idx }); manaPick = null; if (!r.ok) { toast(r.msg || "Ni mogoče."); render(); return; } playedCardFx(d, targetUid); });
      return;
    }
    if (!overField) return;
    const cost = Array.from({ length: V2.manaCostOf(d) }, () => "Any");
    payThen(cost, false, idx => { const r = V2.playCard(you, inst, { manaIdx: idx }); manaPick = null; if (!r.ok) { toast(r.msg || "Ni mogoče."); render(); return; } playedCardFx(d, null); });
    return;
  }
}
// po uspešno odigrani karti: urok -> projektil, nato render (+ konec igre npr. faceDmg lethal)
function playedCardFx(d, targetUid) {
  if (d.type === "Oracle") { SFX.play("spell"); castSpellFx(true, d, targetUid, () => { render(); checkOver(); }); }
  else { render(); checkOver(); }
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
  if (["Oracle", "Relic", "Realm", "Equipment"].includes(d.type)) {
    const need = V2.cardNeedsTarget(d);
    if (need) {
      if (need === "ally" && !you.board.length) { toast("Nimaš šampiona za opremo."); return; }
      pendingPlay = { inst, need };
      selAttacker = null; selAtkIndex = null;
      toast(need === "enemy" ? "Izberi nasprotnikovega šampiona." : (d.type === "Equipment" ? "Izberi šampiona za opremo." : "Izberi svojega šampiona."));
      render();
      return;
    }
    const cost = Array.from({ length: V2.manaCostOf(d) }, () => "Any");
    payThen(cost, false, idx => { const r = V2.playCard(you, inst, { manaIdx: idx }); manaPick = null; if (!r.ok) { toast(r.msg || "Ni mogoče."); render(); return; } playedCardFx(d, null); });
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
      payThen(cost, false, idx => { const r = V2.playCard(G.players[0], inst, { targetUid, manaIdx: idx }); manaPick = null; if (!r.ok) { toast(r.msg || "Ni mogoče."); render(); return; } playedCardFx(d, targetUid); });
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
  if (target.kind === "face" && atk && atk.noFace) { toast("Ta napad lahko cilja le bitja, ne obraza."); return; }
  const attUid = selAttacker, atkIdx = selAtkIndex;
  payThen(atk.cost, def(c).id === "celtic-lugh", idx => {
    const targetEl = target.kind === "champ" ? findChampEl(target.uid) : heroElOf("opp");
    const r = V2.attack(you, attUid, atkIdx, target, idx);
    if (!r.ok) { toast(r.msg || "Napad ni mogoč."); manaPick = null; render(); return; }
    selAttacker = null; selAtkIndex = null; manaPick = null;
    updateArrow();
    animateStrike(attUid, targetEl, r.dmg, r.dodged, r.retal);
    setTimeout(() => { render(); checkOver(); }, 300);
  });
}

$("#v2-end") && document.addEventListener("DOMContentLoaded", () => {});

/* ---------------- AI TURN ---------------- */
function endHumanTurn() {
  if (G.turn !== 0 || G.over) return;
  selAttacker = null; selAtkIndex = null;
  V2.endTurn(); render(); checkOver();
  if (!G.over) setTimeout(runAiTurn, 500);
}
function runAiTurn() {
  if (G.over) { checkOver(); return; }
  aiBusy = true;
  showTurnBanner("Poteza nasprotnika", "opp");
  const ai = G.players[1];
  const e = ai.hand.find(i => def(i).type === "Energy"); if (e) V2.playEnergy(ai, e);
  render();
  setTimeout(aiSummon, 550);
}
function aiSummon() {
  if (G.over) { aiBusy = false; checkOver(); return; }
  const ai = G.players[1], you = G.players[0];
  if (ai.board.length < V2.BOARD_MAX) {
    const affordable = ai.hand.filter(i => def(i).type === "Champion" && def(i).stage === "basic" && V2.canPay(ai, Array.from({ length: V2.summonCostOf(def(i)) }, () => "Any")));
    // sinergija: raje prevladujoč panteon (Bond); pod pritiskom raje Taunt/obrambni zid
    const boardPan = {}; ai.board.forEach(x => { const p = def(x).pantheon; if (p) boardPan[p] = (boardPan[p] || 0) + 1; });
    const behind = ai.life < you.life || you.board.reduce((s, x) => s + aiChampThreat(x), 0) >= ai.life * 0.5;
    affordable.sort((a, b) => {
      if (behind) { const ta = def(a).taunt ? 1 : 0, tb = def(b).taunt ? 1 : 0; if (ta !== tb) return tb - ta; }
      return ((boardPan[def(b).pantheon] || 0) - (boardPan[def(a).pantheon] || 0)) || (V2.summonCostOf(def(b)) - V2.summonCostOf(def(a)));
    });
    const c = affordable[0];
    if (c) { const dd = def(c); revealCard(dd, "Nasprotnik prikliče", () => { V2.summon(ai, c); render(); setTimeout(aiSummon, 550); }); return; }
  }
  setTimeout(aiSpells, 400);
}
function aiSpells() {
  if (G.over) { aiBusy = false; checkOver(); return; }
  const ai = G.players[1], you = G.players[0];
  // odigraj en smiseln Oracle/Relic/Realm, če je mana in tarča
  const inst = ai.hand.find(i => {
    const d = def(i); if (!["Oracle", "Relic", "Realm", "Equipment"].includes(d.type)) return false;
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
    revealCard(dd, "Nasprotnik igra", () => {
      V2.playCard(ai, inst, { targetUid });
      if (dd.type === "Oracle") { SFX.play("spell"); castSpellFx(false, dd, targetUid, () => { render(); checkOver(); if (!G.over) setTimeout(aiSpells, 550); }); }
      else { render(); setTimeout(aiSpells, 550); }
    });
    return; // morda še en
  }
  setTimeout(aiAbilities, 400);
}
/* ---------- AI strateško ocenjevanje (dirka vs. trguj) ---------- */
let aiPosture = "trade"; // "lethal" | "face" | "trade" — določi se pred napadom
function aiHpOf(c) { return c.maxHp - c.damage; }
function aiChampFaceDmg(c) { // koliko škode ta bitje lahko potisne v OBRAZ (najboljši dovoljeni napad)
  const ai = G.players[1]; let best = 0;
  (def(c).attacks || []).forEach(a => { if (a.noFace) return; if (!V2.canPay(ai, a.cost, def(c).id === "celtic-lugh")) return; const pv = V2.previewFace(c, ai, a); if (pv && pv.dmg > best) best = pv.dmg; });
  return best;
}
function aiChampThreat(c) { let best = 0; (def(c).attacks || []).forEach(a => { if ((a.damage || 0) > best) best = a.damage || 0; }); return best; }
function aiBestAtkVs(c, t) { // najboljši (indeks, škoda) napad bitja c proti bitju t
  const ai = G.players[1]; let bi = null, bd = -1;
  (def(c).attacks || []).forEach((a, i) => { if (!V2.canPay(ai, a.cost, def(c).id === "celtic-lugh")) return; const pv = V2.previewDamage(c, ai, t, a); const d = pv ? pv.dmg : (a.damage || 0); if (d > bd) { bd = d; bi = i; } });
  return { i: bi, dmg: bd };
}
function aiDecidePosture() {
  const ai = G.players[1], you = G.players[0];
  const myClock = ai.board.filter(x => V2.canAttack(ai, x)).reduce((s, x) => s + aiChampFaceDmg(x), 0);
  if (V2.tauntsOf(you).length === 0 && myClock >= you.life) return "lethal";      // lahko ubijem to potezo
  const theirClock = you.board.reduce((s, x) => s + aiChampThreat(x), 0);
  const youTTK = myClock > 0 ? Math.ceil(you.life / myClock) : 99;
  const meTTK = theirClock > 0 ? Math.ceil(ai.life / theirClock) : 99;
  return (youTTK <= meTTK) ? "face" : "trade";                                     // zmagujem tekmo -> dirkaj; sicer stabiliziraj
}
function aiAbilities() {
  if (G.over) { aiBusy = false; checkOver(); return; }
  const ai = G.players[1], opp = G.players[0];
  const hpw = ai.heroPower;
  if (hpw && !ai.heroPowerUsed && V2.canPay(ai, Array.from({ length: hpw.cost }, () => "Any"))) {
    let use = false;
    if (hpw.kind === "heroHeal") use = ai.life < ai.maxLife * 0.6;
    else if (hpw.kind === "chain") use = opp.board.length >= 2 || (opp.board.length === 1 && aiHpOf(opp.board[0]) <= hpw.value);
    else if (hpw.kind === "heroAttack") use = !opp.board.some(c => !c.tapped) || opp.life <= hpw.value + 25; // pritiskaj obraz proti lethalu
    else if (hpw.kind === "shieldAll") use = ai.board.length >= 2 && opp.board.length >= 1;
    if (use) { V2.useHeroPower(ai); SFX.play("hero"); render(); setTimeout(aiAbilities, 600); return; }
  }
  // EVOLVE: uri šampiona, kadar ne gre za lethal in ostane dovolj mane za napade
  if (aiDecidePosture() !== "lethal") {
    const trainee = ai.board.find(x => V2.canActivate && V2.canActivate(ai, x) && (def(x).activated || {}).effect === "evolve" &&
      ai.mana.filter(m => !m.tapped).length >= ((def(x).activated.cost || []).length + 2));
    if (trainee) { V2.activateAbility(ai, trainee.uid); SFX.play("hero"); render(); setTimeout(aiAbilities, 500); return; }
  }
  // obramba: heal poškodovanega; Fortify (zid), ko je AI pod pritiskom
  const underPressure = ai.life < ai.maxLife * 0.5 || opp.board.reduce((s, x) => s + aiChampThreat(x), 0) >= ai.life * 0.5;
  const c = ai.board.find(x => V2.canActivate && V2.canActivate(ai, x) && def(x).activated &&
    (def(x).activated.effect === "fortify" ? underPressure
      : ["healSelf30", "guard", "shieldSelf", "healBoard20"].includes(def(x).activated.effect) && aiHpOf(x) / x.maxHp < 0.55));
  if (c) { V2.activateAbility(ai, c.uid); render(); setTimeout(aiAbilities, 500); return; }
  aiPosture = aiDecidePosture();
  setTimeout(() => aiAttack(ai.board.filter(x => V2.canAttack(ai, x))), 650);
}
function aiAttack(queue) {
  if (G.over) { aiBusy = false; checkOver(); return; }
  const ai = G.players[1], you = G.players[0];
  if (!queue.length) { V2.endTurn(); aiBusy = false; render(); checkOver(); if (!G.over) showTurnBanner("Tvoja poteza", "you"); return; }
  const c = queue.shift();
  if (!V2.canAttack(ai, c)) { aiAttack(queue); return; }
  const taunts = V2.tauntsOf(you);
  const faceAtk = aiBestAttack(c, true); // najboljši napad, ki sme v obraz
  let target = null, atkIdx = null;
  if (taunts.length) {
    // razbij zid: fokusiraj Taunt, ki ga lahko ubiješ; sicer najšibkejšega
    let pick = null, pi = null;
    taunts.forEach(t => { if (pick) return; const a = aiBestAtkVs(c, t); if (a.i != null && a.dmg >= aiHpOf(t)) { pick = t; pi = a.i; } });
    if (!pick) { const t = taunts.slice().sort((a, b) => aiHpOf(a) - aiHpOf(b))[0]; const a = aiBestAtkVs(c, t); pick = t; pi = a.i; }
    if (pick && pi != null) { target = { kind: "champ", uid: pick.uid }; atkIdx = pi; }
  } else if ((aiPosture === "lethal" || aiPosture === "face") && faceAtk) {
    target = { kind: "face" }; atkIdx = faceAtk.i;                 // DIRKA / LETHAL — pritisni obraz
  } else if (you.board.length) {
    // TRADE — odstrani največjo grožnjo (najprej ubijljivo, sicer čip)
    const threats = you.board.slice().sort((a, b) => aiChampThreat(b) - aiChampThreat(a));
    let pick = null, pi = null;
    threats.forEach(t => { if (pick) return; const a = aiBestAtkVs(c, t); if (a.i != null && a.dmg >= aiHpOf(t)) { pick = t; pi = a.i; } });
    if (!pick) { const t = threats[0]; const a = aiBestAtkVs(c, t); if (a.i != null) { pick = t; pi = a.i; } }
    if (pick && pi != null) { target = { kind: "champ", uid: pick.uid }; atkIdx = pi; }
    else if (faceAtk) { target = { kind: "face" }; atkIdx = faceAtk.i; }
  } else if (faceAtk) {
    target = { kind: "face" }; atkIdx = faceAtk.i;
  }
  // napadalec brez face-opcije (noFace), a bi šel v obraz -> preusmeri na bitje
  if (target && target.kind === "face" && !faceAtk && you.board.length) {
    const a = aiBestAtkVs(c, you.board[0]); if (a.i != null) { target = { kind: "champ", uid: you.board[0].uid }; atkIdx = a.i; }
  }
  if (target == null || atkIdx == null) { aiAttack(queue); return; }
  const targetEl = target.kind === "champ" ? findChampEl(target.uid) : heroElOf("you");
  const res = V2.attack(ai, c.uid, atkIdx, target);
  if (!res || !res.ok) { aiAttack(queue); return; }
  animateStrike(c.uid, targetEl, res.dmg, res.dodged, res.retal);
  setTimeout(() => {
    render(); checkOver();
    if (G.over) { aiBusy = false; return; }
    setTimeout(() => aiAttack(queue), 600);
  }, 340);
}
function aiBestAttack(c, face) {
  const ai = G.players[1];
  let best = null;
  (def(c).attacks || []).forEach((atk, i) => {
    if (face && atk.noFace) return; // proti obrazu preskoči napade, ki smejo le na bitja
    if (!V2.canPay(ai, atk.cost, def(c).id === "celtic-lugh")) return;
    const dmg = atk.damage || 0;
    const score = dmg + (atk.effect ? 0.5 : 0); // ob enaki škodi raje napad z učinkom
    if (!best || score > best.score) best = { i, dmg, score };
  });
  return best;
}

/* obramba face poteka prek Taunt zidu (glej engine attack) — star blokirni modal je opuščen */

/* ---------------- END / OVERLAY ---------------- */
function checkOver() {
  if (!G.over) return;
  render();
  SFX.play(G.winner === 0 ? "victory" : "defeat");
  if (runActive) {
    runActive = false;
    const won = G.winner === 0;
    setTimeout(() => onRunBattleEnd(won), 1100);
    return;
  }
  setTimeout(() => showGameOverOverlay(G.winner === 0), 700);
}
// slavnostna zmagovalna/poraz scena (hitra igra; run ima svoj zaključek)
function showGameOverOverlay(won) {
  if (document.getElementById("v2-gameover")) return;
  const o = el("div", "v2-gameover " + (won ? "won" : "lost"));
  o.id = "v2-gameover";
  o.innerHTML = `
    <div class="go-rays"></div>
    <div class="go-inner">
      <div class="go-medal">${won ? "🏆" : "💀"}</div>
      <h1 class="go-title">${won ? "ZMAGA" : "PORAZ"}</h1>
      <p class="go-sub">${won ? "Nasprotnikov heroj je padel. Panteon slavi tvoje ime." : "Tvoj heroj je padel. A legende se vračajo…"}</p>
      <button class="btn-primary" id="go-menu">Nazaj v meni</button>
    </div>`;
  document.body.appendChild(o);
  requestAnimationFrame(() => o.classList.add("show"));
  o.querySelector("#go-menu").addEventListener("click", () => {
    o.remove();
    $("#v2-game").classList.add("hidden");
    backToMenu();
  });
}

/* ---------------- BOOT ---------------- */
window.addEventListener("DOMContentLoaded", () => {
  ensureFx();
  ensureSoundBtn();
  initTooltips();
  buildSetup();
  $("#v2-end").addEventListener("click", endHumanTurn);
  // odkleni zvok ob prvi interakciji (avtoplay pravila brskalnika)
  window.addEventListener("pointerdown", () => SFX.unlock(), { once: true });
  // klik zvok na gumbih
  document.addEventListener("click", (e) => { if (e.target.closest("button, .mode-card, .deck-card, .reward-card, .mull-btn, .run-deckcard, .reward-card")) SFX.play("click"); });
  // Dnevnik: zložljiv, privzeto zaprt
  const logPanel = document.querySelector(".log-panel");
  if (logPanel) {
    logPanel.classList.add("collapsed");
    const h = logPanel.querySelector("h4");
    if (h) { h.style.cursor = "pointer"; h.addEventListener("click", () => logPanel.classList.toggle("collapsed")); }
  }
  document.addEventListener("mousemove", (e) => {
    arrowPos = { x: e.clientX, y: e.clientY };
    if (arrowActive()) { updateArrow(); updateDmgPreview(); }
    else hideDmgPreview();
  });
});

// debug/test hook
window.__run = { end: (won) => { runActive = false; onRunBattleEnd(won); }, get state() { return RUN; } };
