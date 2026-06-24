# 🎨 ASSET PROMPTS — Mythic Clash

Ta dokument je za generiranje **ilustracij kart** v ChatGPT (ali katerem koli image generatorju). Vsebuje:

1. **Pravila poimenovanja datotek** (zelo pomembno — da jih kasneje samodejno povežemo v igro).
2. **Skupni "master" stil prompt** (da so vse karte vizualno enotne).
3. **Konkreten prompt za vsakega od 48 bojevnikov**, ki ga samo kopiraš.

---

## 1) 📁 PRAVILA POIMENOVANJA (OBVEZNO)

Vsaka slika se mora imenovati **točno po `id` karte**, končnica `.png`, vse z malimi črkami.

```
art/<id>.png
```

Primeri:
- Zeus → `art/greek-zeus.png`
- Thor, Storm Unleashed → `art/norse-thor-asc.png`
- Baba Yaga → `art/slavic-babayaga.png`

> Ko boš imel slike, jih daj v mapo **`art/`** v repozitoriju. V naslednji iteraciji bom dodal kodo, ki sliko `art/<id>.png` samodejno prikaže namesto placeholder simbola. **Ne preimenuj idjev** — točno ti idji so že zapisani v `cards.js`.

### Priporočene specifikacije slike
- Format: **PNG**, kvadrat **1024×1024** (ali 832×1216 portret, če želiš višje karte).
- Brez besedila na sliki (ime in statistika so že na kartici v igri).
- Osrednji motiv, malo praznega roba — okvir doda igra.
- Konsistenten "card art" zoom: lik v zgornjih 2/3, ne preveč oddaljen.

---

## 2) 🖌️ MASTER STIL PROMPT (prilepi pred vsak prompt ali enkrat na začetku seje)

```
Ustvarjaš ilustracije za originalno mitološko zbirateljsko card igro "Mythic Clash".
Enoten stil za vse karte:
- semi-realistic painterly fantasy trading-card illustration, dramatic rim lighting, dark moody background, rich saturated colors, high detail, epic heroic framing, centered subject
- NO text, NO logos, NO card frame, NO borders, NO watermark — samo ilustracija lika/bitja
- square 1:1 composition, subject in upper two-thirds
- cinematic, mythic, premium TCG art quality
Vsak panteon ima svojo barvno paleto (povem jo pri vsaki karti).
```

### Barvne palete po panteonih (za enotnost)
| Panteon | Razpoloženje / paleta |
|---|---|
| **Greek** ⚡ | globoka modra & srebrno-zlata, nebo, strele, marmor |
| **Norse** ❄ | ledeno modro-zelena, megla, sneg, rune, hladna kovina |
| **Roman** 🦅 | rdeče-bordo & bron, legije, ogenj, disciplina |
| **Egyptian** ☀ | zlato & peščeno rumena, sonce, hieroglifi, lapis |
| **Slavic** 🌲 | gozdno zelena & temno les, megla, narava, ogenj |
| **Celtic** 🌙 | vijolična & srebrno-modra, megla, luna, druidski simboli |

---

## 3) 🃏 PROMPTI ZA BOJEVNIKE (48)

Za vsako karto: ime datoteke + prompt. Stil iz točke (2) velja povrhu.

### ⚡ GREEK — paleta: globoka modra & srebrno-zlata

- **`art/greek-zeus.png`** — Zeus, kralj bogov, mogočen bradati starec, strele v rokah, vihar in nebo za njim, orlovska prezenca, modro-zlata svetloba.
- **`art/greek-athena.png`** — Athena, boginja modrosti in vojne, čelada, sulica in ščit z gorgonsko glavo, sova ob njej, hladna inteligentna drža.
- **`art/greek-heracles.png`** — Heracles kot smrtni junak, mišičast, levja koža čez ramena, kij, prah arene.
- **`art/greek-heracles-asc.png`** — Heracles po dvanajstih nalogah, vzvišena oblika, žareče telo, božanska aura, zmagovita poza (ascended, močnejši, bolj epski).
- **`art/greek-medusa.png`** — Medusa, gorgona, lasje iz kač, kamniti pogled, zelenkasto-modra koža, nevarna lepota.
- **`art/greek-pegasus.png`** — Pegasus, beli krilati konj, vzpenja se v nebo, morska pena in strele ob izvoru.
- **`art/greek-hydra.png`** — Hydra, večglava vodna pošast, strupene glave na dolgih vratih, močvirje, grozeča.
- **`art/greek-oracle.png`** — Oracle of Delphi, zakrita prerokinja, hlapi iz tal, vizije, zlata svetloba, mistično.

### ❄ NORSE — paleta: ledeno modro-zelena, megla, rune

- **`art/norse-thor.png`** — Thor, rdečelasi bog groma, dviga kladivo Mjölnir, strele, snežni vihar.
- **`art/norse-thor-asc.png`** — Thor Storm Unleashed, popolna moč, vihar ovija telo, žareče oči, kataklizmična energija (ascended, mythic).
- **`art/norse-odin.png`** — Odin, enooki popotnik, sivi plašč, sulica Gungnir, dva krokarja, modra megla.
- **`art/norse-loki.png`** — Loki, prevarant, zvit nasmešek, zeleno-zlati odtenki, plameni in iluzije okoli njega.
- **`art/norse-freyja.png`** — Freyja, boginja, plašč iz sokoljega perja, ogrlica Brísingamen, mačke ob njej, žalostna lepota.
- **`art/norse-fenrir.png`** — Fenrir, ogromni volk, raztrgane verige, divje oči, sneg in tema.
- **`art/norse-valkyrie.png`** — Valkira, bojevnica s krili in sulico, oklep, izbira padle, ledena svetloba.
- **`art/norse-frostgiant.png`** — Frost Giant, ogromen ledeni velikan, modro-bela koža, led in mraz, prastara moč.

### 🦅 ROMAN — paleta: rdeče-bordo & bron

- **`art/roman-mars.png`** — Mars, bog vojne, bronast oklep, rdeč plašč, sulica, legije za njim, ogenj.
- **`art/roman-minerva.png`** — Minerva, taktična boginja, čelada, zvitki in zemljevidi, sova, disciplinirana drža.
- **`art/roman-romulus.png`** — Romulus, ustanovitelj-kralj, kraljevski plašč, riše obzidje, volkovska prezenca.
- **`art/roman-legionnaire.png`** — rimski legionar v formaciji, scutum ščit, gladius, zid ščitov za njim.
- **`art/roman-augur.png`** — Imperial Augur, svečenik prerokovanja, ptice na nebu, lituus palica, somrak.
- **`art/roman-janus.png`** — Janus, bog z dvema obrazoma (en gleda nazaj, en naprej), vrata, ključi.
- **`art/roman-vulcan.png`** — Vulcan, bog kovačev, kovaška peč, kladivo, žareča kovina, iskre.
- **`art/roman-wolf.png`** — Capitoline Wolf, volkulja, ki doji dva dečka, bron, mitska prizorišča.

### ☀ EGYPTIAN — paleta: zlato & peščeno rumena, lapis

- **`art/egypt-ra.png`** — Ra, sončni bog z glavo sokola in sončnim diskom, solarna barka, žareče sonce.
- **`art/egypt-anubis.png`** — Anubis, bog z glavo šakala, tehtnica src, mračna grobnica, zlato in črnina.
- **`art/egypt-anubis-asc.png`** — Anubis Judge of Souls, vzvišen, drži tehtnico med svetovi, žareči hieroglifi, mogočno (ascended).
- **`art/egypt-isis.png`** — Isis, boginja z razprtimi krili, magija obnove, zlata svetloba, materinska prezenca.
- **`art/egypt-osiris.png`** — Osiris, zeleni kralj podzemlja, povit, žezlo in bič, vstajenje iz smrti.
- **`art/egypt-horus.png`** — Horus, bog z glavo sokola, oko Horusa, sonce in luna, maščevalec.
- **`art/egypt-bastet.png`** — Bastet, mačja boginja, elegantna varuhinja doma, zlat nakit, nočna svetloba.
- **`art/egypt-sphinx.png`** — Sphinx, mitska zver s človeško glavo in levjim telesom, puščava, uganke, zvezde.
- **`art/egypt-scarab.png`** — Scarab Guardian, sveti hrošč skarabej, ki kotali sončni disk, zlat sijaj.

### 🌲 SLAVIC — paleta: gozdno zelena & temno les

- **`art/slavic-perun.png`** — Perun, slovanski bog groma, sekira, hrast, strele, brada, mogočen.
- **`art/slavic-veles.png`** — Veles, bog podzemlja in kača/zmaj globin, temne vode, rogovi, prastara moč.
- **`art/slavic-morana.png`** — Morana, boginja zime in smrti, ledeni pajčolan, ovenelo rastje, bleda.
- **`art/slavic-svarog.png`** — Svarog, nebeški kovač ognja, plameni, naковalo, iskre, žareča kovina.
- **`art/slavic-vesna.png`** — Vesna, boginja pomladi, cvetje, topla svetloba, taljenje snega, mlada.
- **`art/slavic-leshy.png`** — Leshy, gozdni duh, telo iz drevja in mahu, ogromen, oči kot luči v gozdu.
- **`art/slavic-rusalka.png`** — Rusalka, vodni duh, bleda lepota, mokri lasje, rečna megla, mamljivo nevarna.
- **`art/slavic-babayaga.png`** — Baba Yaga, starodavna čarovnica, koča na kurjih nogah v ozadju, možnar, gozd.

### 🌙 CELTIC — paleta: vijolična & srebrno-modra, megla

- **`art/celtic-cernunnos.png`** — Cernunnos, rogati bog narave, jelenovi rogovi, gozdne živali, med svetovoma.
- **`art/celtic-morrigan.png`** — The Morrigan, boginja bitke, vrane, črna krila, krvavo bojišče, megla.
- **`art/celtic-brigid.png`** — Brigid, boginja plamena in navdiha, sveti ogenj, kovaštvo in poezija, toplo svetlo.
- **`art/celtic-lugh.png`** — Lugh, mnogo-spreten bog, sulica svetlobe, sijoč, gospodar vseh veščin.
- **`art/celtic-cuchulainn.png`** — Cu Chulainn, junak v bojni blaznosti, sulica Gáe Bolg, divji pogled, kelt­ski vzorci.
- **`art/celtic-druid.png`** — Druid of the Grove, druid v kapuci, hrast in kamni, megla, runski simboli.
- **`art/celtic-banshee.png`** — Banshee, jokajoči duh, bled pajčolan, sablast krik, nočna megla.
- **`art/celtic-faerie.png`** — Faerie Trickster, vilinsko bitje, drobna krila, vragolast nasmešek, čarobni svetlikajoči prah.

---

## 4) (neobvezno) Ostale karte

Če boš želel kasneje še ilustracije za **Relic / Oracle / Realm** karte, mi reci — pripravim enak seznam z idji. Trenutno se te kartice prikažejo z gradientom + simbolom in delujejo brez slik.

---

## 5) Kako jih boš uporabil

1. Generiraj slike po zgornjih promptih.
2. Poimenuj **točno** kot `<id>.png`.
3. Daj jih v mapo `art/` v repozitoriju.
4. Reci mi *"slike so v art/"* in dodam kodo, ki jih samodejno naloži v karte (s fallbackom na obstoječi placeholder, če slika manjka).
