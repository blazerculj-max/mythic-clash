/* Mythic Clash — jezikovni sloj (SL/EN).
   Nalozi se PRED scriptv2.js. T(sl, en) vrne besedilo v izbranem jeziku;
   MC_EN so angleski prevodi velikih slovarjev, ki jih scriptv2 zdruzi po definiciji. */
(function () {
  let lang = "sl";
  try { lang = localStorage.getItem("mc-lang") || "sl"; } catch (_) {}
  if (lang !== "en") lang = "sl";
  window.MC_LANG = lang;
  window.T = function (sl, en) { return (window.MC_LANG === "en" && en != null) ? en : sl; };
  window.mcSetLang = function (l) { try { localStorage.setItem("mc-lang", l); } catch (_) {} location.reload(); };

  /* Angleski prevodi slovarjev iz scriptv2.js (Object.assign po definiciji). */
  window.MC_EN = {
    STATUS_TEXT: {
      burn: ["🔥 Burning", "This champion is on fire — takes damage over time."],
      freeze: ["❄️ Frozen", "Takes +20% damage."],
      stun: ["💫 Stunned", "Takes +10% damage; may miss its attack."],
      curse: ["💀 Curse", "Its attacks deal −15 damage."],
      blessing: ["✨ Blessing", "Its attacks deal +15 damage (a few turns)."],
      shield: ["🛡️ Shield", "Next hit taken −20 damage (then expires)."],
      poison: ["☠️ Poison", "Takes damage over time."],
      guard: ["⛨ Guard stance", "Takes −50% damage until next turn."],
    },
    KEYWORD_TEXT: {
      charge: ["⚡ Charge", "Can attack the turn it is summoned."],
      lifesteal: ["🩸 Lifesteal", "Heals for the damage it deals."],
      overload: ["⛓ Overload", "Stays tapped longer after a heavy attack."],
      onEnter: ["➹ Battlecry", "Triggers an effect when it enters the battlefield."],
      onDefeat: ["☠ Deathrattle", "Triggers an effect when it is defeated."],
      dodge: ["💨 Dodge", "Has a chance to fully evade an attack."],
      pierce: ["🗡️ Pierce", "Attacks ignore the defender's Shield."],
      thorns: ["🌵 Thorns", "The attacker takes damage when striking it."],
    },
    EFFECT_TEXT: {
      stunOmen: "Omen roll: on a favorable omen the defender is stunned.",
      selfShield: "This champion gains Shield.",
      selfDamage20: "Deals full damage, but this champion takes 20 recoil.",
      draw3: "Draw 3 cards.", draw2: "Draw 2 cards.", draw2attach: "Draw 2 cards.",
      healActive60: "Chosen champion +60 HP.", healActive40: "Chosen champion +40 HP.",
      healReserve30: "All your champions +30 HP.", blessActive: "Chosen champion gains Blessing.",
      shieldAll: "All your champions gain Shield.", curseEnemy: "Enemy champion is cursed (−15 damage).",
      burnEnemy: "Enemy champion is set on fire.", freezeEnemy: "Enemy champion is frozen (+20% damage).",
      dmgEnemy30: "Deals 30 damage to an enemy champion.",
      apotheosis: "This turn your scaling payoffs (engines) count double.",
      healSelf30: "This champion +30 HP.", healBoard20: "All your champions +20 HP.",
      healSelf20: "This champion +20 HP.", healBoard15: "All your champions +15 HP.",
      tauntSelf: "This champion gains Taunt (wall) until your next turn.",
      guardSelf: "Guard stance: −50% damage taken until your next turn.",
      drawSelf: "Draw 1 card.",
      shieldSelf: "This champion gains Shield (−20 next hit).",
      guard: "Guard stance: −50% damage taken until next turn.",
      fortify: "Tap: gain Taunt (until next turn) + Shield. Dig in.",
      evolve: "Tap: +1 training. At 3/3 this champion evolves into a stronger form.",
      blessSelf: "This champion gains Blessing.",
      dmgPlus20: "Attached champion deals +20 damage.", dmgReduce20: "Attached champion takes −20 damage.",
      healEndTurn10: "Attached champion heals 10 HP at end of turn.",
    },
    KW_GLOSSARY: {
      curse: "🟣 Curse — the victim deals −15 damage with its attacks.",
      blessing: "🟡 Blessing — +15 damage on attacks (2 turns).",
      burn: "🔥 Burning — −15 HP at the end of every turn.",
      freeze: "❄ Frozen — takes +20% damage; 50% chance to thaw each turn.",
      stun: "💫 Stun — this champion cannot attack this turn.",
      poison: "☠ Poison — increasing damage at every end of turn.",
      shield: "🛡 Shield — the next hit on it is blocked (−20/−30 damage).",
      guard: "🔰 Guard — −50% damage taken until next turn.",
      taunt: "🧱 Taunt (wall) — the opponent must attack this defender first.",
      lifesteal: "🩸 Lifesteal — the attacker heals for the damage dealt.",
      dodge: "💨 Dodge — a chance to fully evade an attack.",
      decay: "⌛ Decay — loses HP at every end of turn.",
      charge: "⚡ Charge — can attack the turn it is summoned.",
    },
    STATUS_SHORT: { burn: "Burning", freeze: "Frozen", stun: "Stunned", curse: "Curse", blessing: "Blessing", shield: "Shield", poison: "Poison", guard: "Guard" },
    STATUS_CHIP: { burn: "Burn", freeze: "Frozen", stun: "Stun", curse: "Curse", blessing: "Bless", shield: "Shield", poison: "Poison", guard: "Guard" },
  };

  /* 🌐 preklopni gumb + prevod statičnih napisov iz index.html */
  document.addEventListener("DOMContentLoaded", function () {
    var b = document.createElement("button");
    b.id = "mc-lang-btn"; b.type = "button";
    b.textContent = lang === "en" ? "🌐 SL" : "🌐 EN";
    b.title = lang === "en" ? "Preklopi v slovenščino" : "Switch to English";
    b.addEventListener("click", function () {
      var G = window.V2 && window.V2.G;
      var gameEl = document.querySelector("#v2-game");
      if (G && !G.over && gameEl && !gameEl.classList.contains("hidden")) {
        if (!confirm(window.T("Zamenjava jezika ponovno naloži igro — trenutna bitka bo izgubljena. Nadaljujem?",
          "Switching language reloads the page — the current battle will be lost. Continue?"))) return;
      }
      window.mcSetLang(lang === "en" ? "sl" : "en");
    });
    document.body.appendChild(b);
    if (lang === "en") {
      var set = function (sel, txt) { var e = document.querySelector(sel); if (e) e.textContent = txt; };
      set(".mana-panel h4", "Your energies");
      set(".action-panel h4", "Actions");
      set(".log-panel h4", "Log");
      set("#v2-end", "End turn");
      var pickT = document.querySelector("#v2-pick .mull-title"); if (pickT) pickT.textContent = "Choose your first champion (free)";
      var pickS = document.querySelector("#v2-pick .mull-sub"); if (pickS) pickS.textContent = "Enter the arena without paying mana.";
    }
  });
})();
