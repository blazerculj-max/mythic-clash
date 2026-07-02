/* Mythic Clash — nastavitve (⚙): glasnost, hitrost animacij, celozaslonski način, jezik.
   Naloži se ZA scriptv2.js (uporablja SFX in T). Vse izbire so shranjene v localStorage. */
(function () {
  const TT = window.T || ((sl) => sl);

  /* Hitrost animacij: "fast" prepolovi vse UI zamike (setTimeout) in pospeši CSS animacije. */
  const realSetTimeout = window.setTimeout.bind(window);
  function applySpeed(fast) {
    if (fast) {
      window.setTimeout = (fn, d, ...a) => realSetTimeout(fn, Math.max(40, (d || 0) * 0.45), ...a);
      document.body.classList.add("mc-fast");
    } else {
      window.setTimeout = realSetTimeout;
      document.body.classList.remove("mc-fast");
    }
  }
  let speedFast = false;
  try { speedFast = localStorage.getItem("mc-speed") === "fast"; } catch (_) {}

  function saveSpeed() { try { localStorage.setItem("mc-speed", speedFast ? "fast" : "normal"); } catch (_) {} }

  function panel() {
    let p = document.querySelector("#mc-settings");
    if (p) return p;
    p = document.createElement("div"); p.id = "mc-settings"; p.className = "hidden";
    p.innerHTML = `
      <div class="mcs-box">
        <h3>⚙ ${TT("Nastavitve", "Settings")}</h3>
        <label class="mcs-row">${TT("Glasnost zvokov", "Sound volume")}
          <input type="range" id="mcs-vol" min="0" max="100" step="5">
          <span id="mcs-volval"></span></label>
        <div class="mcs-row">${TT("Hitrost animacij", "Animation speed")}
          <div class="mcs-seg">
            <button type="button" id="mcs-sp-n">${TT("Normalno", "Normal")}</button>
            <button type="button" id="mcs-sp-f">${TT("Hitro", "Fast")}</button>
          </div></div>
        <div class="mcs-row">${TT("Jezik", "Language")}
          <div class="mcs-seg">
            <button type="button" id="mcs-lang-sl">Slovenščina</button>
            <button type="button" id="mcs-lang-en">English</button>
          </div></div>
        <div class="mcs-row"><button type="button" id="mcs-fs" class="mcs-wide">⛶ ${TT("Celozaslonski način", "Fullscreen")}</button></div>
        <button type="button" id="mcs-close" class="mcs-close">${TT("Zapri", "Close")}</button>
      </div>`;
    document.body.appendChild(p);
    p.addEventListener("click", (e) => { if (e.target === p) hide(); });
    const vol = p.querySelector("#mcs-vol"), volval = p.querySelector("#mcs-volval");
    const updVol = () => { volval.textContent = vol.value + "%"; };
    vol.value = Math.round(((typeof SFX !== "undefined" && SFX.vol != null) ? SFX.vol : 0.7) * 100); updVol();
    vol.addEventListener("input", () => {
      updVol();
      if (typeof SFX !== "undefined") {
        SFX.vol = vol.value / 100;
        if (SFX.muted && vol.value > 0) { SFX.setMuted(false); const sb = document.querySelector("#mc-sound"); if (sb) { sb.textContent = "🔊"; sb.classList.remove("muted"); } }
        try { localStorage.setItem("mc-vol", String(SFX.vol)); } catch (_) {}
        SFX.play("click");
      }
    });
    const updSeg = () => {
      p.querySelector("#mcs-sp-n").classList.toggle("on", !speedFast);
      p.querySelector("#mcs-sp-f").classList.toggle("on", speedFast);
      p.querySelector("#mcs-lang-sl").classList.toggle("on", window.MC_LANG !== "en");
      p.querySelector("#mcs-lang-en").classList.toggle("on", window.MC_LANG === "en");
    };
    p.querySelector("#mcs-sp-n").addEventListener("click", () => { speedFast = false; applySpeed(false); saveSpeed(); updSeg(); });
    p.querySelector("#mcs-sp-f").addEventListener("click", () => { speedFast = true; applySpeed(true); saveSpeed(); updSeg(); });
    const langTo = (l) => {
      if (window.MC_LANG === l) return;
      const G = window.V2 && V2.G; const gm = document.querySelector("#v2-game");
      if (G && !G.over && gm && !gm.classList.contains("hidden")) {
        if (!confirm(TT("Zamenjava jezika ponovno naloži igro — trenutna bitka bo izgubljena. Nadaljujem?",
          "Switching language reloads the page — the current battle will be lost. Continue?"))) return;
      }
      if (window.mcSetLang) mcSetLang(l);
    };
    p.querySelector("#mcs-lang-sl").addEventListener("click", () => langTo("sl"));
    p.querySelector("#mcs-lang-en").addEventListener("click", () => langTo("en"));
    p.querySelector("#mcs-fs").addEventListener("click", () => {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      else document.documentElement.requestFullscreen().catch(() => {});
    });
    p.querySelector("#mcs-close").addEventListener("click", hide);
    updSeg();
    return p;
  }
  function show() { panel().classList.remove("hidden"); }
  function hide() { const p = document.querySelector("#mc-settings"); if (p) p.classList.add("hidden"); }

  document.addEventListener("DOMContentLoaded", () => {
    applySpeed(speedFast);
    const b = document.createElement("button");
    b.id = "mc-settings-btn"; b.type = "button"; b.textContent = "⚙";
    b.title = TT("Nastavitve", "Settings");
    b.addEventListener("click", () => { const p = panel(); p.classList.contains("hidden") ? show() : hide(); });
    document.body.appendChild(b);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") hide(); });
  });
})();
