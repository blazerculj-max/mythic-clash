/* ============================================================================
   MYTHIC CLASH — premium.js
   Vizualni dodatki (brez posega v logiko igre):
   1. Ozadje arene glede na panteon igralčevega decka (realm-*.png)
   2. Lebdeče iskrice (embers) — izklopljene ob prefers-reduced-motion
   Za revert: odstrani <script src="premium.js"> v index.html.
============================================================================ */
(function () {
  "use strict";

  /* ---------- 1. OZADJE ARENE ---------- */
  var REALM_BY_PANTHEON = {
    Greek: "realm-olympus",
    Norse: "realm-asgard",
    Egyptian: "realm-duat",
    Slavic: "realm-grove",
    Roman: "realm-forum",
    Celtic: "realm-grove",
  };

  function pantheonOf(deckId) {
    try {
      if (typeof STARTER_DECKS !== "undefined") {
        if (STARTER_DECKS[deckId] && STARTER_DECKS[deckId].pantheon) return STARTER_DECKS[deckId].pantheon;
        // kampanja/arena: RUN hrani izvorni deckId
        if ((deckId === "run" || deckId === "custom") &&
            typeof RUN !== "undefined" && RUN && RUN.deckId &&
            STARTER_DECKS[RUN.deckId]) {
          return STARTER_DECKS[RUN.deckId].pantheon;
        }
      }
    } catch (e) { /* ignore */ }
    return null;
  }

  function ensureBgEl() {
    var game = document.getElementById("v2-game");
    if (!game) return null;
    var bg = document.getElementById("arena-bg");
    if (!bg) {
      bg = document.createElement("div");
      bg.id = "arena-bg";
      game.insertBefore(bg, game.firstChild);
    }
    return bg;
  }

  function setArenaBg(deckId) {
    var bg = ensureBgEl();
    if (!bg) return;
    var p = pantheonOf(deckId);
    var img = REALM_BY_PANTHEON[p] || "realm-olympus";
    bg.classList.remove("on");
    bg.style.backgroundImage = 'url("art/' + img + '.png")';
    // rahel fade-in po nalaganju slike
    var pre = new Image();
    pre.onload = function () { bg.classList.add("on"); };
    pre.onerror = function () { bg.classList.add("on"); };
    pre.src = "art/" + img + ".png";
  }

  function patchStartGame() {
    try {
      if (typeof V2 === "undefined" || !V2 || typeof V2.startGame !== "function") return false;
      if (V2.__premiumPatched) return true;
      var orig = V2.startGame;
      V2.startGame = function (playerDeck) {
        try { setArenaBg(playerDeck); } catch (e) { /* videz ne sme podreti igre */ }
        return orig.apply(this, arguments);
      };
      V2.__premiumPatched = true;
      return true;
    } catch (e) { return false; }
  }

  /* ---------- 2. ISKRICE ---------- */
  function spawnEmbers() {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (document.querySelector(".fx-embers")) return;
    var box = document.createElement("div");
    box.className = "fx-embers";
    box.setAttribute("aria-hidden", "true");
    var n = Math.min(26, Math.max(14, Math.floor(window.innerWidth / 60)));
    for (var i = 0; i < n; i++) {
      var s = document.createElement("span");
      var size = (2 + Math.random() * 4).toFixed(1);
      s.style.setProperty("--s", size + "px");
      s.style.setProperty("--d", (9 + Math.random() * 10).toFixed(1) + "s");
      s.style.setProperty("--dl", (-Math.random() * 18).toFixed(1) + "s");
      s.style.setProperty("--x", ((Math.random() * 120 - 60) | 0) + "px");
      s.style.setProperty("--o", (0.25 + Math.random() * 0.45).toFixed(2));
      s.style.left = (Math.random() * 100).toFixed(1) + "%";
      box.appendChild(s);
    }
    document.body.appendChild(box);
  }

  /* ---------- INIT ---------- */
  function init() {
    if (!patchStartGame()) {
      // enginev2.js še ni pripravljen — poskusi ponovno
      var tries = 0;
      var t = setInterval(function () {
        if (patchStartGame() || ++tries > 20) clearInterval(t);
      }, 200);
    }
    spawnEmbers();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
