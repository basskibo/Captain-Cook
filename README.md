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
| 📷 **Slikaj frižider** | Fotografiši frižider ili pult, a AI (Gemini vision) prepozna namirnice i ponudi da ih označi. |
| 🎙️ **Glasovni unos** | Reci „imam dva jajeta, malo sira i crnog luka“ i namirnice se označe (Web Speech API + AI razume padeže). |
| 🥕 **Namirnice** | ~80 predefinisanih namirnica u 7 kategorija + dodavanje svojih. Pretraga radi i bez kvačica (`sargarepa` → Šargarepa). |
| 🧑‍🍳 **Moj ukus** | Trajni profil: ishrana (posno, vege, keto…), alergije (nikad u receptu), šta ne voliš, ljutina, omiljene kuhinje i oprema (airfryer, rerna…). |
| ⚙️ **Podešavanja obroka** | Doručak / ručak / večera / užina / desert (automatski po dobu dana), vreme pripreme, broj porcija, „samo ono što imam“ i posebne želje. |
| ⚡ **Streaming** | Recepti se pojavljuju jedan po jedan, čim ih AI napiše. Prvi stiže za ~2 s. |
| 🍳 **Animacija kuvanja** | Dok AI razmišlja, tvoje namirnice skaču iz tiganja iznad plamena. |
| 📸 **Fotografije jela** | AI daje engleski naziv jela, a uz recept stiže prava fotografija sa Pexels-a (ilustrativna, sa potpisom autora). |
| 📖 **Recepti** | Sastojci (šta imaš / šta treba dokupiti), koraci koje štikliraš dok kuvaš, savet šefa, „Još predloga“ bez ponavljanja. |
| ⚖️ **Broj porcija** | Promeni porcije u receptu i količine se odmah preračunaju (razlomci, opsezi, lepo zaokruženi grami), bez novog AI poziva. |
| 👨‍🍳 **Režim kuvanja** | Ceo ekran, korak po korak (prevlačenje levo/desno), ekran se ne gasi (Wake Lock). Trajanja iz koraka („kuvaj 10 minuta“) postaju dugme za tajmer sa zvukom, vibracijom i obaveštenjem. |
| 🛒 **Lista za kupovinu** | Jednim tapom sve što fali ide na listu. Štikliranje, deljenje (WhatsApp/Viber) i „Prebaci kupljeno u frižider“. |
| 💬 **Pitaj kuvara** | Chat u receptu: „nemam pavlaku, čime da zamenim?“, „može li u airfryer?“. Kuvar zna recept i tvoj ukus, odgovori stižu uživo. |
| ☁️ **Sinhronizacija** | Opciono preko Upstash Redis-a: izmene na jednom uređaju stižu na drugi (pri otvaranju i povratku u aplikaciju). Novija izmena pobeđuje. |
| 💛 **Sačuvano** | Omiljeni recepti na jedan tap, deljenje preko Web Share / clipboard-a. |
| 📱 **Mobile-first PWA** | Dodaj na početni ekran, svetla/tamna tema, podrška za iPhone notch (safe-area). |

Podaci se čuvaju lokalno u browseru (`localStorage`). Uz opcionu Upstash Redis bazu, namirnice, sačuvani recepti, lista za kupovinu i profil se **sinhronizuju između uređaja** (telefon ↔ laptop).

## 🚀 Pokretanje lokalno

```bash
npm install
cp .env.example .env   # popuni vrednosti
npm run dev
```

> 💡 Nemaš API ključ? Postavi `AI_PROVIDER=mock` i aplikacija vraća probne recepte, idealno za rad na UI-ju.
>
> 🧪 U dev modu `?noanim` u URL-u isključuje animacije (korisno za automatsko testiranje).

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
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | | Upstash Redis za sinhronizaciju (postavlja ih Vercel integracija). Rade i `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`. |
| `PEXELS_API_KEY` | | Prave fotografije jela. Besplatan ključ: <https://www.pexels.com/api/>. Bez njega se prikazuje emoji. |

\* potreban je ključ za bar jednog provajdera.

**Napomene**
- Promena `APP_PIN`-a automatski odjavljuje sve uređaje.
- Besplatan Gemini tier ume da vrati `503 high demand` ili `429`. Aplikacija tada odmah prelazi na rezervni model.
- `GEMINI_THINKING` (podrazumevano `low`) smanjuje „razmišljanje“ modela radi bržeg odgovora.

## ▲ Deploy na Vercel

1. Importuj GitHub repo na [vercel.com/new](https://vercel.com/new). Framework se prepoznaje automatski.
2. **Settings → Environment Variables:** dodaj `APP_PIN`, `SESSION_SECRET`, `AI_PROVIDER`, API ključ i (opciono) `PEXELS_API_KEY`.
3. Deploy 🎉 i na telefonu otvori sajt → *Share → Add to Home Screen*.

### ☁️ Sinhronizacija (opciono, besplatno)

1. Na Vercelu: **Storage → Marketplace → Upstash (Redis) → Create**, besplatni plan.
2. Poveži bazu sa projektom. Vercel sam dodaje `KV_REST_API_URL` i `KV_REST_API_TOKEN`.
3. Redeploy. U zaglavlju se pojavljuje zeleni oblak ☁️ kad sinhronizacija radi.

Za lokalni rad prekopiraj te dve vrednosti u `.env`.

## 🗂️ Struktura

```
src/
├── app/
│   ├── api/auth/route.ts       # PIN provera i sesija (GET / POST / DELETE)
│   ├── api/recipes/route.ts    # recepti kao NDJSON stream (zaštićeno sesijom, zod validacija)
│   ├── api/scan/route.ts       # prepoznavanje namirnica sa slike / iz teksta
│   ├── api/chat/route.ts       # „Pitaj kuvara“ (tekstualni stream)
│   ├── api/sync/route.ts       # sinhronizacija između uređaja (Redis hash)
│   ├── layout.tsx · page.tsx
│   └── manifest.ts · icon.svg · apple-icon.tsx
├── components/
│   ├── app-shell.tsx           # splash → PIN → kuhinja
│   ├── pin-gate.tsx            # PIN tastatura
│   ├── kitchen.tsx             # glavni ekran, tabovi, generisanje
│   ├── pantry-view.tsx         # izbor i dodavanje namirnica
│   ├── options-sheet.tsx       # podešavanja obroka
│   ├── scan-sheet.tsx          # skeniranje frižidera
│   ├── cooking-animation.tsx   # animacija tiganja dok AI radi
│   ├── cooking-mode.tsx        # režim kuvanja korak po korak
│   ├── timer-tray.tsx          # aktivni tajmeri
│   ├── shopping-view.tsx       # lista za kupovinu
│   ├── profile-sheet.tsx       # „Moj ukus“ profil
│   ├── chef-chat.tsx           # chat sa kuvarom u receptu
│   ├── recipe-card.tsx · recipe-detail.tsx
│   ├── dish-image.tsx          # fotografija jela sa fade-in efektom
│   └── sheet.tsx               # bottom sheet (drag-to-close)
└── lib/
    ├── ai/provider.ts          # Gemini / Anthropic / mock: streaming, slike, fallback
    ├── ai/recipes.ts           # prompt i validacija recepata
    ├── ai/scan.ts              # prepoznavanje namirnica
    ├── ai/chat.ts              # chat o receptu
    ├── ndjson.ts               # čitanje NDJSON strima u browseru
    ├── use-speech.ts           # prepoznavanje govora (sr-RS)
    ├── scale.ts                # preračunavanje količina za broj porcija
    ├── resize-image.ts         # smanjivanje fotografije u browseru pre slanja
    ├── auth.ts                 # HMAC sesija, rate limit
    ├── images.ts               # Pexels pretraga fotografija jela
    ├── ingredients.ts          # predefinisane namirnice
    ├── timers.ts               # globalni tajmeri + prepoznavanje trajanja u tekstu
    ├── redis.ts                # minimalni Upstash REST klijent
    ├── sync.ts                 # klijentska sinhronizacija + status
    ├── types.ts
    └── use-persistent-state.ts # useState + localStorage (+ opciona sinhronizacija)
```

## 📜 Skripte

| Komanda | Opis |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run start` | Pokretanje build-a |
| `npm run lint` | ESLint |
