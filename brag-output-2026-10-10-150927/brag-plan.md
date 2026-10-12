# Captain Cook: brag plan

**What:** A personal AI cook in your pocket. Tap what's in your kitchen and get three dishes with step-by-step recipes.
**For:** Anyone standing at an open fridge at 7pm asking „Šta da skuvam?“
**Sets it apart:** It's a real, polished mobile PWA, not a chat box. Picking ingredients takes a few taps, recipes stream in while ingredients jump in a frying pan, and cooking mode turns „dinstajte oko 8 minuta“ into a timer button.
**Funniest claim:** The app's own loading copy: „Seckam luk (bez suza)…“, „Listam bakine sveske…“
**Visual hook:** The app's own button line „Šta da skuvam?“, set huge in Bricolage Grotesque, with the five real ingredient emoji popping in above it.
**Real UI:** A recording of the real app (Next.js dev server, recipes replayed from a real Gemini response) in an iPhone frame: pantry chips → options sheet → frying pan → 3 recipe cards → recipe → cooking mode → timer.
**Tone:** `default`: punchy, playful, clean. Cream `#f7f3ee`, orange gradient `#f0562b → #ff9f43`, ink `#1d1a17`; Bricolage Grotesque (display) + Geist (body), the app's own fonts.
**Share caption:** see share-copy.txt

## Storyboard (21s, 1920×1080, 30fps)

| # | Time | Scene | Caption (left side) |
|---|---|---|---|
| 1 | 0.0–2.6 | **Hook.** 🧅🍅🫑🥚🧀 pop in one by one; „Šta da skuvam?“ slams in huge, centered | — |
| 2 | 2.6–7.4 | Title slides left and shrinks into the caption slot. Phone rises in on the right. Real taps: Crni luk, Paradajz, Paprika, scroll, Jaja, Sir; the button counter climbs to 5 | **Označi šta imaš.** |
| 3 | 7.4–10.2 | Tap „Šta da skuvam?“ → options sheet → „Predloži mi jela“ → frying pan tosses *your* ingredients | **Seckam luk (bez suza)…** (the app's own loading line) |
| 4 | 10.2–14.2 | Three recipe cards stream in → tap the šakšuka → recipe opens and scrolls | **Tri jela od onoga što imaš.** |
| 5 | 14.2–18.0 | „Počni kuvanje“ → cooking mode → tap „Pokreni tajmer 8 min“ → „Tajmer radi · 7:59“ | **Piše „8 minuta“? Evo tajmera.** |
| 6 | 18.0–21.0 | **Outro.** Dip to cream; app icon, „Captain Cook“, „Lični AI kuvar u džepu.“, small „Web app · dodaj na početni ekran“ | — |

Transitions: soft. Captions swap by dipping out first and then in (no crossfades of text); the phone stays put and the recording cuts underneath it.

## Sound
A warm 112-BPM pluck/marimba groove in C major, built in numpy: soft kick, shaker, a bass line, and a marimba motif. Taps are quiet marimba notes from the scale, sitting under the music. The pan gets a filtered-noise sizzle with the same room reverb, the timer gets a soft two-note bell (G–C), and the outro resolves on a C major chord that rings out.
