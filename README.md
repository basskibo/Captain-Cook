<div align="center">

# 👨‍🍳 Captain Cook

**Lični AI kuvar u džepu.** Označi šta imaš u kuhinji, a Captain Cook predloži tri jela sa receptom korak po korak.

Next.js 16 · React 19 · Tailwind CSS 4 · Motion · Gemini / Claude Haiku · Vercel

</div>

---

## ✨ Funkcije

| | |
|---|---|
| 🔒 **PIN zaštita** | Fensi PIN tastatura pri otvaranju. Provera na serveru, potpisan httpOnly cookie (30 dana), blokada posle 5 pogrešnih pokušaja. AI troše samo oni koji znaju PIN. |
| 🥕 **Namirnice** | ~80 predefinisanih namirnica u 7 kategorija + dodavanje svojih. Pretraga radi i bez kvačica (`sargarepa` → Šargarepa). |
| ⚙️ **Podešavanja obroka** | Doručak / ručak / večera / užina / desert (automatski po dobu dana), vreme pripreme, broj porcija, „samo ono što imam“ i posebne želje. |
| 🍳 **Animacija kuvanja** | Dok AI razmišlja, tvoje namirnice skaču iz tiganja iznad plamena. |
| 📸 **Fotografije jela** | AI daje engleski naziv jela, a uz recept stiže prava fotografija sa Pexels-a (ilustrativna, sa potpisom autora). |
| 📖 **Recepti** | Sastojci (šta imaš / šta treba dokupiti), koraci koje štikliraš dok kuvaš, savet šefa, „Još predloga“ bez ponavljanja. |
| 💛 **Sačuvano** | Omiljeni recepti na jedan tap, deljenje preko Web Share / clipboard-a. |
| 📱 **Mobile-first PWA** | Dodaj na početni ekran, svetla/tamna tema, podrška za iPhone notch (safe-area). |

Namirnice, podešavanja, predlozi i sačuvani recepti čuvaju se lokalno u browseru (`localStorage`), bez baze.

## 🚀 Pokretanje lokalno

```bash
npm install
cp .env.example .env   # popuni vrednosti
npm run dev
```

> 💡 Nemaš API ključ? Postavi `AI_PROVIDER=mock` i aplikacija vraća probne recepte, idealno za rad na UI-ju.

## 🔑 Environment varijable

| Varijabla | Obavezno | Opis |
|---|:---:|---|
| `APP_PIN` | ✅ | PIN za otključavanje (npr. `1234`). Dužina PIN-a određuje broj tačkica. |
| `SESSION_SECRET` | preporučeno | Nasumičan string za potpis cookie-ja: `openssl rand -hex 32` |
| `AI_PROVIDER` | | `gemini`, `anthropic` ili `mock`. Ako je prazno, bira se provajder čiji ključ postoji. |
| `GEMINI_API_KEY` | ✅* | Besplatan ključ: <https://aistudio.google.com/apikey> |
| `GEMINI_MODEL` | | Podrazumevano `gemini-flash-latest` (alias koji uvek prati aktuelni Flash model) |
| `GEMINI_FALLBACK_MODEL` | | Rezervni model kad je glavni preopterećen. Podrazumevano `gemini-flash-lite-latest` |
| `ANTHROPIC_API_KEY` | ✅* | Ključ sa <https://console.anthropic.com> |
| `ANTHROPIC_MODEL` | | Podrazumevano `claude-haiku-5-5` |
| `PEXELS_API_KEY` | | Prave fotografije jela. Besplatan ključ: <https://www.pexels.com/api/>. Bez njega se prikazuje emoji. |

\* potreban je ključ za bar jednog provajdera.

**Napomene**
- Promena `APP_PIN`-a automatski odjavljuje sve uređaje.
- Besplatan Gemini tier ume da vrati `503 high demand`. Aplikacija tada ponovi zahtev, pa pređe na rezervni model.

## ▲ Deploy na Vercel

1. Importuj GitHub repo na [vercel.com/new](https://vercel.com/new). Framework se prepoznaje automatski.
2. **Settings → Environment Variables:** dodaj `APP_PIN`, `SESSION_SECRET`, `AI_PROVIDER`, API ključ i (opciono) `PEXELS_API_KEY`.
3. Deploy 🎉 i na telefonu otvori sajt → *Share → Add to Home Screen*.

## 🗂️ Struktura

```
src/
├── app/
│   ├── api/auth/route.ts       # PIN provera i sesija (GET / POST / DELETE)
│   ├── api/recipes/route.ts    # generisanje recepata (zaštićeno sesijom, zod validacija)
│   ├── layout.tsx · page.tsx
│   └── manifest.ts · icon.svg · apple-icon.tsx
├── components/
│   ├── app-shell.tsx           # splash → PIN → kuhinja
│   ├── pin-gate.tsx            # PIN tastatura
│   ├── kitchen.tsx             # glavni ekran, tabovi, generisanje
│   ├── pantry-view.tsx         # izbor i dodavanje namirnica
│   ├── options-sheet.tsx       # podešavanja obroka
│   ├── cooking-animation.tsx   # animacija tiganja dok AI radi
│   ├── recipe-card.tsx · recipe-detail.tsx
│   ├── dish-image.tsx          # fotografija jela sa fade-in efektom
│   └── sheet.tsx               # bottom sheet (drag-to-close)
└── lib/
    ├── ai.ts                   # Gemini / Anthropic + retry i fallback
    ├── auth.ts                 # HMAC sesija, rate limit
    ├── images.ts               # Pexels pretraga fotografija jela
    ├── ingredients.ts          # predefinisane namirnice
    ├── types.ts
    └── use-persistent-state.ts # useState + localStorage
```

## 📜 Skripte

| Komanda | Opis |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run start` | Pokretanje build-a |
| `npm run lint` | ESLint |
