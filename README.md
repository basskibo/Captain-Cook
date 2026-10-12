<div align="center">

# 👨‍🍳 Captain Cook

**Lični AI kuvar u džepu.** Označi šta imaš u kuhinji, a Captain Cook predloži tri jela sa receptom korak po korak.

Next.js 16 · React 19 · Tailwind CSS 4 · Motion · Gemini / Claude Haiku · Vercel

</div>

---

## ✨ Funkcije

| | |
|---|---|
| 👤 **Nalozi** | Registracija emailom i lozinkom (scrypt heš, potpisan httpOnly cookie 60 dana). Bez naloga se biraju namirnice i vodi lista lokalno; AI predlozi, skeniranje i chat traže nalog. Dnevni AI limit po nalogu, zaštita od pogađanja lozinke. |
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
| 👨‍🍳 **Režim kuvanja** | Ceo ekran, korak po korak (prevlačenje levo/desno), ekran se ne gasi (Wake Lock). Trajanja iz koraka („kuvaj 10 minuta“) postaju dugme za tajmer sa zvukom, vibracijom i obaveštenjem, ili za **sistemski tajmer telefona** (Android direktno, iPhone preko prečice „Captain Tajmer“). |
| 🛒 **Lista za kupovinu** | Jednim tapom sve što fali ide na listu. Štikliranje, slanje u Beleške (Notes), WhatsApp ili Viber i „Prebaci kupljeno u frižider“. |
| 💬 **Pitaj kuvara** | Chat u receptu: „nemam pavlaku, čime da zamenim?“, „može li u airfryer?“. Kuvar zna recept i tvoj ukus, odgovori stižu uživo. |
| ☁️ **Sinhronizacija** | Podaci naloga (namirnice, sačuvana jela, lista, „Moj ukus“) stižu na svaki uređaj na kom se prijaviš. Novija izmena pobeđuje; ono što je gost uradio pre prijave spaja se sa nalogom. |
| 📴 **Offline** | Service worker kešira aplikaciju: sačuvani recepti, lista za kupovinu i tajmeri rade i bez interneta. |
| 💛 **Sačuvano** | Omiljeni recepti na jedan tap, deljenje preko Web Share / clipboard-a. |
| 📱 **Mobile-first PWA** | Dodaj na početni ekran, svetla/tamna tema, podrška za iPhone notch (safe-area). |
| 🖥️ **Desktop raspored** | Na širokom ekranu: bočni meni, namirnice u dve kolone sa panelom „U frižideru“, recepti u mreži, prozori umesto panela odozdo i recept u dve kolone. |

Gost čuva podatke lokalno u browseru. Sa nalogom se namirnice, sačuvani recepti, lista za kupovinu i profil čuvaju u Upstash Redis bazi i **sinhronizuju između uređaja**.

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
| `SESSION_SECRET` | ✅ | Nasumičan string za potpis sesija: `openssl rand -hex 32`. Promena odjavljuje sve korisnike. |
| `AI_PROVIDER` | | `gemini`, `anthropic` ili `mock`. Ako je prazno, bira se provajder čiji ključ postoji. |
| `GEMINI_API_KEY` | ✅* | Besplatan ključ: <https://aistudio.google.com/apikey> |
| `GEMINI_MODEL` | | Podrazumevano `gemini-flash-latest` (alias koji uvek prati aktuelni Flash model) |
| `GEMINI_FALLBACK_MODEL` | | Rezervni model kad je glavni preopterećen. Podrazumevano `gemini-flash-lite-latest` |
| `ANTHROPIC_API_KEY` | ✅* | Ključ sa <https://console.anthropic.com> |
| `ANTHROPIC_MODEL` | | Podrazumevano `claude-haiku-5-5` |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | ✅ (produkcija) | Upstash Redis: nalozi, sinhronizacija i limiti (postavlja ih Vercel integracija). Rade i `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`. |
| `AI_DAILY_LIMIT` | | Najviše AI poziva dnevno **po nalogu** (recepti + skeniranje + chat), podrazumevano `30`. Resetuje se u ponoć po beogradskom vremenu. |
| `PEXELS_API_KEY` | | Prave fotografije jela. Besplatan ključ: <https://www.pexels.com/api/>. Bez njega se prikazuje emoji. |

\* potreban je ključ za bar jednog provajdera.

**Napomene**
- Bez Redis-a (lokalni razvoj) nalozi i brojači žive u memoriji servera i nestaju pri restartu. Na Vercelu je Redis obavezan.
- Prijava se zaključava na 15 min posle 10 pogrešnih lozinki za isti email; najviše 5 novih naloga na sat po IP adresi.
- Besplatan Gemini tier ume da vrati `503 high demand` ili `429`. Aplikacija tada odmah prelazi na rezervni model.
- `GEMINI_THINKING` (podrazumevano `low`) smanjuje „razmišljanje“ modela radi bržeg odgovora.

## ▲ Deploy na Vercel

1. Importuj GitHub repo na [vercel.com/new](https://vercel.com/new). Framework se prepoznaje automatski.
2. **Storage → Marketplace → Upstash (Redis) → Create** (besplatni plan) i poveži bazu sa projektom. Vercel sam dodaje `KV_REST_API_URL` i `KV_REST_API_TOKEN`.
3. **Settings → Environment Variables:** dodaj `SESSION_SECRET`, `AI_PROVIDER`, API ključ i (opciono) `AI_DAILY_LIMIT`, `PEXELS_API_KEY`.
4. Deploy 🎉 i na telefonu otvori sajt → *Share → Add to Home Screen*.

Za lokalni rad sa pravom bazom prekopiraj `KV_REST_API_URL` i `KV_REST_API_TOKEN` u `.env`.

### ⏰ Sistemski tajmer na iPhone-u (jednom)

Safari ne može sam da pokrene tajmer u aplikaciji Sat, pa to radi preko Prečica:

1. **Prečice** → **+** → radnja **Pokreni tajmer** (Start Timer).
2. Trajanje: **Ulaz u prečicu** (Shortcut Input), jedinica: **sekunde**.
3. Nazovi prečicu tačno **Captain Tajmer**.

Dugme „Na telefonu“ u režimu kuvanja zatim pokreće pravi iOS tajmer, koji radi i kad je ekran zaključan.

## 🗂️ Struktura

```
public/
└── sw.js                       # service worker (offline)
src/
├── app/
│   ├── api/auth/route.ts       # trenutni korisnik (GET), odjava (DELETE)
│   ├── api/auth/register/      # registracija
│   ├── api/auth/login/         # prijava
│   ├── api/auth/account/       # brisanje naloga
│   ├── api/recipes/route.ts    # recepti kao NDJSON stream (zaštićeno sesijom, zod validacija)
│   ├── api/scan/route.ts       # prepoznavanje namirnica sa slike / iz teksta
│   ├── api/chat/route.ts       # „Pitaj kuvara“ (tekstualni stream)
│   ├── api/sync/route.ts       # sinhronizacija između uređaja (Redis hash)
│   ├── api/usage/route.ts      # dnevna potrošnja AI poziva
│   ├── layout.tsx · page.tsx
│   └── manifest.ts · icon.svg · apple-icon.tsx
├── components/
│   ├── app-shell.tsx           # AuthProvider + kuhinja
│   ├── auth-sheet.tsx          # prijava / registracija
│   ├── account-sheet.tsx       # nalog: AI potrošnja, odjava, brisanje
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
    ├── use-media-query.ts      # mobilni / desktop prikaz
    ├── use-online.ts           # online/offline status
    ├── use-speech.ts           # prepoznavanje govora (sr-RS)
    ├── scale.ts                # preračunavanje količina za broj porcija
    ├── resize-image.ts         # smanjivanje fotografije u browseru pre slanja
    ├── auth.ts · auth-client.tsx # sesije (server) i auth kontekst (klijent)
    ├── users.ts                # nalozi (scrypt lozinke)
    ├── kv.ts                   # Redis ili memorija (lokalni razvoj)
    ├── limits.ts               # zaštita prijave + dnevni AI limit po nalogu
    ├── images.ts               # Pexels pretraga fotografija jela
    ├── ingredients.ts          # predefinisane namirnice
    ├── phone-timer.ts          # sistemski tajmer (iOS Prečice / Android intent)
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
