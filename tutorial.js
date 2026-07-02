/* Mythic Clash — Vodnik (tutorial): voden prvi boj s sprotnimi namigi.
   Naloži se ZA scriptv2.js; uporablja njegove globalne funkcije (startV2, render …).
   Koraki se samodejno premikajo glede na stanje igre (V2.G) ali z gumbom "Naprej". */
(function () {
  const TT = window.T || ((sl) => sl);
  let TUT = null; // { step, timer }

  const STEPS = [
    {
      // 0 — dobrodošlica (na mulligan zaslonu)
      text: () => TT(
        "<b>Dobrodošel v Mythic Clash!</b><br>Cilj: spravi nasprotnikovega heroja s <b>150 življenj na 0</b>. Najprej mulligan — če ti roka ni všeč, jo lahko zamešaš. Za začetek kar klikni <b>✓ Obdrži in začni</b>.",
        "<b>Welcome to Mythic Clash!</b><br>Goal: bring the enemy hero from <b>150 life to 0</b>. First the mulligan — if you don't like your hand you can reshuffle it. For now just click <b>✓ Keep and start</b>."),
      check: () => gameStarted(),
    },
    {
      // 1 — energija
      text: () => TT(
        "<b>1/6 · Energija</b><br>Energije so tvoje gorivo. Klikni <b>energijsko karto</b> v roki (modra cena +), da jo položiš — vsaka poteza ena. Z njimi plačuješ priklice in napade.",
        "<b>1/6 · Energy</b><br>Energies are your fuel. Click an <b>energy card</b> in your hand (blue + cost) to play it — one per turn. They pay for summons and attacks."),
      check: () => you() && you().mana.length >= 1,
      glow: () => handCardEl(d => d.type === "Energy"),
    },
    {
      // 2 — priklic
      text: () => TT(
        "<b>2/6 · Priklic</b><br>Zdaj prikliči šampiona: klikni <b>karto šampiona</b> v roki in plačaj njeno ceno (⬡). Šampion prvo potezo »spi« (💤) — napade lahko naslednjo, razen če ima ⚡ Naval.",
        "<b>2/6 · Summon</b><br>Now summon a champion: click a <b>champion card</b> in your hand and pay its cost (⬡). A champion \"sleeps\" (💤) its first turn — it can attack next turn, unless it has ⚡ Charge."),
      check: () => you() && you().board.length >= 1,
      glow: () => handCardEl(d => d.type === "Champion"),
    },
    {
      // 3 — konec poteze (prva)
      text: () => TT(
        "<b>3/6 · Konec poteze</b><br>Sveži šampioni še ne morejo napasti, zato zaključi potezo z zlatim gumbom <b>Končaj potezo</b>. Nasprotnik bo odigral svojo — opazuj dnevnik desno.",
        "<b>3/6 · End turn</b><br>Fresh champions can't attack yet, so end your turn with the golden <b>End turn</b> button. The opponent will play theirs — watch the log on the right."),
      check: () => turnCount() >= 2,
      glow: () => document.querySelector("#v2-end"),
    },
    {
      // 4 — napad
      text: () => TT(
        "<b>4/6 · Napad</b><br>Klikni svojega <b>budnega šampiona</b> in izberi napad v panelu Akcije. <b>Osnovni</b> napad plačaš s katerokoli energijo; <b>tarčni</b> zahteva točno določeno, a nosi učinek (ožig, zmrznitev …). Nato klikni tarčo — šampiona ali heroja. Pazi: branilec z obrambo vrne del škode!",
        "<b>4/6 · Attack</b><br>Click your <b>awake champion</b> and pick an attack in the Actions panel. A <b>basic</b> attack accepts any energy; a <b>targeted</b> one needs a specific type but carries an effect (burn, freeze …). Then click the target — a champion or the hero. Careful: a defender with defense retaliates!"),
      check: () => you() && you().board.some(c => c.tapped) ,
    },
    {
      // 5 — taunt in statusi
      text: () => TT(
        "<b>5/6 · Zid in statusi</b><br>Šampion z zlatim obročem <b>🛡 ZID (Taunt)</b> ščiti ostale — njega moraš premagati najprej. Barvni čipi na kartah so statusi (🔥 ožig, ❄ zmrznjen, ✨ blagoslov …) — <b>zadrži miško</b> nad čim koli in dobiš razlago.",
        "<b>5/6 · Wall and statuses</b><br>A champion with the golden <b>🛡 WALL (Taunt)</b> ring protects the others — you must defeat it first. Colored chips on cards are statuses (🔥 burn, ❄ frozen, ✨ blessing …) — <b>hover</b> over anything for an explanation."),
      next: true,
    },
    {
      // 6 — hero power + zaključek vodenja
      text: () => TT(
        "<b>6/6 · Moč heroja</b><br>V panelu Akcije imaš tudi <b>★ moč heroja</b> — enkrat na potezo, plačaš z mano. Preizkusi jo! To je vse, kar potrebuješ — dokončaj bitko. Srečno! ⚔",
        "<b>6/6 · Hero power</b><br>The Actions panel also has your <b>★ hero power</b> — once per turn, paid with mana. Try it! That's all you need — finish the battle. Good luck! ⚔"),
      next: true,
    },
  ];

  function you() { const G = window.V2 && V2.G; return G && G.players && G.players[0]; }
  function turnCount() { const G = window.V2 && V2.G; return (G && G.turnCount) || 0; }
  function gameStarted() {
    const pk = document.querySelector("#v2-pick");
    const gm = document.querySelector("#v2-game");
    return gm && !gm.classList.contains("hidden") && (!pk || pk.classList.contains("hidden"));
  }
  function handCardEl(pred) {
    const p = you(); if (!p) return null;
    const idx = p.hand.findIndex(i => pred(V2.def(i)));
    if (idx < 0) return null;
    return document.querySelectorAll("#v2-hand .v2-handcard")[idx] || null;
  }

  function coachEl() {
    let c = document.querySelector("#tut-coach");
    if (!c) {
      c = document.createElement("div"); c.id = "tut-coach";
      c.innerHTML = `<div class="tut-owl">🦉</div><div class="tut-body"><div class="tut-text"></div><div class="tut-foot"><span class="tut-dots"></span><button class="tut-next" type="button"></button><button class="tut-skip" type="button"></button></div></div>`;
      document.body.appendChild(c);
      c.querySelector(".tut-next").addEventListener("click", () => advance());
      c.querySelector(".tut-skip").addEventListener("click", () => endTutorial());
    }
    return c;
  }
  function clearGlow() { document.querySelectorAll(".tut-glow").forEach(e => e.classList.remove("tut-glow")); }
  function showStep() {
    if (!TUT) return;
    const st = STEPS[TUT.step];
    if (!st) { endTutorial(); return; }
    const c = coachEl();
    c.classList.remove("hidden");
    c.querySelector(".tut-text").innerHTML = st.text();
    c.querySelector(".tut-dots").textContent = "●".repeat(TUT.step + 1) + "○".repeat(STEPS.length - TUT.step - 1);
    c.querySelector(".tut-next").style.display = st.next ? "" : "none";
    c.querySelector(".tut-next").textContent = TUT.step === STEPS.length - 1 ? TT("Razumem, gremo!", "Got it, let's go!") : TT("Naprej", "Next");
    c.querySelector(".tut-skip").textContent = TT("Preskoči vodnik", "Skip tutorial");
  }
  function advance() { if (!TUT) return; TUT.step++; clearGlow(); if (TUT.step >= STEPS.length) { endTutorial(); return; } showStep(); }
  function tick() {
    if (!TUT) return;
    const G = window.V2 && V2.G;
    if (G && G.over) { endTutorial(); return; }
    const st = STEPS[TUT.step];
    if (!st) { endTutorial(); return; }
    // osveži poudarek (render() lahko zamenja DOM vozlišča)
    clearGlow();
    if (st.glow && (!st.check || !st.check())) { const e = st.glow(); if (e) e.classList.add("tut-glow"); }
    if (st.check && st.check()) advance();
  }
  function endTutorial() {
    if (TUT && TUT.timer) clearInterval(TUT.timer);
    TUT = null; clearGlow();
    const c = document.querySelector("#tut-coach"); if (c) c.classList.add("hidden");
  }

  window.startTutorial = function () {
    // lahek nasprotnik, olympus za igralca (pregleden, ikoničen)
    try {
      chosenDeck = "olympus"; chosenDiff = "easy";
      startV2();
    } catch (_) {
      V2.startGame("olympus", "tirnanog", "easy");
      document.querySelector("#v2-setup").classList.add("hidden");
      document.querySelector("#v2-game").classList.remove("hidden");
      if (typeof showFirstPick === "function") showFirstPick();
    }
    TUT = { step: 0, timer: setInterval(tick, 450) };
    showStep();
  };
})();
