# ⚔️ Mythic Clash: Wars of Pantheons

Mitološka strateška igra s kartami v brskalniku. Šest panteonov — **grški, nordijski, rimski, egipčanski, slovanski in keltski** — se spopade v areni. Bogovi, heroji, pošasti, relikvije in božanske energije. Pokémon-style igralni slog, popolnoma originalna vsebina, brez zaščitenih izrazov.

Igra teče v celoti v brskalniku, brez strežnika in brez zunanjih knjižnic. Pripravljena za **GitHub Pages**.

---

## 🎮 Igraj

Igra je single-player proti preprostemu AI nasprotniku. Izbereš svoj starter deck, AI dobi enega od ostalih, in bitka se začne.

**Cilj:** zberi **3 točke slave (Glory)** — ali pripravi nasprotnika do tega, da ostane brez bojevnikov ali kart v decku.

---

## 📜 Pravila (na kratko)

1. Vsak igralec ima deck **40 kart** in na začetku potegne **7 kart**.
2. V roki moraš imeti vsaj enega osnovnega bojevnika (Champion) — sicer se roka samodejno premeša.
3. Imaš **enega aktivnega bojevnika** in do **5 bojevnikov v rezervi**.
4. Na svojem turnu lahko:
   - postaviš osnovnega bojevnika v rezervo,
   - pripneš **eno Divine Energy** (na turn),
   - igraš **Relic** in **Oracle** karte,
   - izvedeš **Ascension** (če bojevnik ni bil postavljen ta turn),
   - **retreataš** aktivnega (plačaš strošek umika v energiji),
   - **napadeš** z aktivnim bojevnikom.
5. **Napad konča tvoj turn.**
6. Ko bojevniku HP pade na 0, je premagan → nasprotnik dobi **1 Glory**, ti pa izbereš novega aktivnega iz rezerve (klik na rezervno karto).
7. **Weakness** = napad tega tipa naredi **+20** škode. **Resistance** = **−20** škode.
8. **Omen Roll** = naključni 50/50 (Favorable / Dark Omen) za posebne učinke.

### Status efekti
| Status | Učinek |
|---|---|
| 🔥 Burn | −10 HP na koncu tvojega turna |
| ❄️ Freeze | ne more retreatati; 50 % možnost odprave na začetku turna |
| 💫 Stun | ne more napasti naslednji turn |
| 💀 Curse | napadi naredijo −10 škode |
| ✨ Blessing | napadi naredijo +10 škode (2 turna) |
| 🛡️ Shield | naslednja prejeta škoda −20 |
| ☠️ Poison | −10 HP na koncu turna, vsak turn +10 več |

---

## 🃏 Starter decki

- **Olympus Strike** — grški, uravnotežen, card draw, Sky napadi.
- **Ragnarok Fury** — nordijski, agresiven, veliko škode in nekaj tveganja.
- **Sands of Eternity** — egipčanski, healing, curse, revive.
- **Forest of Spirits** — slovansko-keltski, statusi, narava, nadzor tempa.

Vsak deck ima točno 40 kart (16 Champion / 14 Energy / 6 Oracle / 3 Relic / 1 Realm).

---

## 🚀 Zagon lokalno

Ker je vse statično, **lahko index.html samo odpreš v brskalniku** (dvojni klik). Če bi kdaj uporabljal `fetch` na lokalne datoteke, pa raje poženi lokalni strežnik:

```bash
# Python 3
python -m http.server 8000
# nato odpri http://localhost:8000
```

Trenutna verzija ne potrebuje strežnika — dovolj je odpreti `index.html`.

---

## 🌐 Objava na GitHub Pages

1. Ustvari nov repo na GitHubu (npr. `mythic-clash`).
2. Naloži vse datoteke v koren repozitorija:
   `index.html`, `style.css`, `cards.js`, `decks.js`, `engine.js`, `script.js`, `README.md`.
3. V repu pojdi na **Settings → Pages**.
4. Pod **Source** izberi **Deploy from a branch**, branch **main**, mapa **/(root)**.
5. Shrani. Po nekaj minutah bo igra dostopna na:
   `https://<tvoje-uporabnisko-ime>.github.io/mythic-clash/`

---

## 🗂️ Struktura projekta

```
mythic-clash/
├── index.html      # DOM struktura + povezava skript
├── style.css       # temna mitološka tema, gradienti, animacije
├── cards.js        # baza 81 kart (6 panteonov) + slogi/redkosti
├── decks.js        # 4 starter decki (40 kart vsak)
├── engine.js       # igralna logika (state, napadi, statusi, AI)
├── script.js       # UI render + interakcija
└── README.md
```

Vrstni red nalaganja skript je pomemben: `cards.js → decks.js → engine.js → script.js`.

---

## ✨ Funkcije

- 81 kart, 48 bojevnikov, 6 panteonov, 3 Ascension oblike.
- Poln sistem energij (10 tipov), weakness/resistance, statusi, relikvije, oracle in realm karte.
- Igralen AI nasprotnik z zakasnitvami med potezami.
- Modal s podrobnim prikazom karte.
- Dnevnik bitke, victory screen s statistiko.
- Responsive layout, animacije napada, shake ob škodi, glow pri igralnih kartah.
- Placeholder vizualni sistem (gradient + simbol panteona) — pripravljeno za kasnejše prave ilustracije.

---

## 🔮 Naslednji koraki (TODO)

- Prave ilustracije kart (glej `ASSET-PROMPTS.md` za poimenovanje).
- Deck builder in zbirka kart.
- Booster packs in odpiranje paketov.
- Multiplayer in ranked mode.
- Zvočni efekti in glasba.
- Campaign / story mode.
- Dodatni panteoni: japonski, azteški, hindujski, mezopotamski.

---

## 📝 Credits

Inspired by public-domain world mythologies. All characters are interpreted from mythological sources. No copyrighted trading card IP is used.
