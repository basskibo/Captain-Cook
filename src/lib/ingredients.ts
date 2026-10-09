export interface Ingredient {
  id: string;
  name: string;
  emoji: string;
}

export interface Category {
  id: string;
  name: string;
  emoji: string;
  items: Ingredient[];
}

function items(list: [string, string][]): Ingredient[] {
  return list.map(([emoji, name]) => ({ id: name.toLowerCase(), name, emoji }));
}

export const CATEGORIES: Category[] = [
  {
    id: "povrce",
    name: "Povrće",
    emoji: "🥕",
    items: items([
      ["🧅", "Crni luk"],
      ["🧄", "Beli luk"],
      ["🥔", "Krompir"],
      ["🥕", "Šargarepa"],
      ["🍅", "Paradajz"],
      ["🫑", "Paprika"],
      ["🥒", "Krastavac"],
      ["🥒", "Tikvica"],
      ["🍆", "Plavi patlidžan"],
      ["🥬", "Kupus"],
      ["🥦", "Brokoli"],
      ["🥬", "Spanać"],
      ["🥗", "Zelena salata"],
      ["🍄", "Šampinjoni"],
      ["🌽", "Kukuruz"],
      ["🫛", "Grašak"],
      ["🌶️", "Ljuta papričica"],
      ["🌿", "Peršun"],
    ]),
  },
  {
    id: "meso",
    name: "Meso i riba",
    emoji: "🍗",
    items: items([
      ["🍗", "Piletina"],
      ["🍗", "Pileći batak"],
      ["🥩", "Svinjetina"],
      ["🥩", "Junetina"],
      ["🍖", "Mleveno meso"],
      ["🥓", "Slanina"],
      ["🌭", "Kobasice"],
      ["🍖", "Šunka"],
      ["🐟", "Tunjevina"],
      ["🐟", "Losos"],
      ["🐟", "Oslić"],
      ["🦐", "Škampi"],
    ]),
  },
  {
    id: "mlecni",
    name: "Jaja i mlečni",
    emoji: "🧀",
    items: items([
      ["🥚", "Jaja"],
      ["🥛", "Mleko"],
      ["🧈", "Puter"],
      ["🧀", "Sir"],
      ["🧀", "Kačkavalj"],
      ["🧀", "Feta sir"],
      ["🧀", "Parmezan"],
      ["🥛", "Pavlaka"],
      ["🥛", "Jogurt"],
      ["🥛", "Slatka pavlaka"],
      ["🧀", "Mocarela"],
    ]),
  },
  {
    id: "zitarice",
    name: "Testo i žitarice",
    emoji: "🍝",
    items: items([
      ["🍝", "Testenina"],
      ["🍚", "Pirinač"],
      ["🍞", "Hleb"],
      ["🌾", "Brašno"],
      ["🥣", "Ovsene pahuljice"],
      ["🌯", "Tortilje"],
      ["🥟", "Kore za pitu"],
      ["🌾", "Palenta"],
      ["🌾", "Kus-kus"],
      ["🍜", "Rezanci"],
    ]),
  },
  {
    id: "mahunarke",
    name: "Mahunarke i konzerve",
    emoji: "🥫",
    items: items([
      ["🫘", "Pasulj"],
      ["🫘", "Sočivo"],
      ["🫘", "Leblebija"],
      ["🥫", "Pelat"],
      ["🥫", "Paradajz pire"],
      ["🥫", "Kukuruz šećerac"],
      ["🫒", "Masline"],
      ["🥜", "Kikiriki puter"],
    ]),
  },
  {
    id: "voce",
    name: "Voće",
    emoji: "🍎",
    items: items([
      ["🍎", "Jabuka"],
      ["🍌", "Banana"],
      ["🍋", "Limun"],
      ["🍊", "Pomorandža"],
      ["🍓", "Jagode"],
      ["🫐", "Borovnice"],
      ["🥑", "Avokado"],
      ["🍐", "Kruška"],
    ]),
  },
  {
    id: "ostalo",
    name: "Začini i ostalo",
    emoji: "🧂",
    items: items([
      ["🫒", "Maslinovo ulje"],
      ["🌶️", "Aleva paprika"],
      ["🌿", "Origano"],
      ["🌿", "Bosiljak"],
      ["🍯", "Med"],
      ["🍬", "Šećer"],
      ["🍫", "Čokolada"],
      ["🥫", "Soja sos"],
      ["🍶", "Sirće"],
      ["🟡", "Senf"],
      ["🥫", "Kečap"],
      ["🥚", "Majonez"],
      ["🌰", "Orasi"],
      ["🧂", "Vegeta"],
    ]),
  },
];

export const ALL_INGREDIENTS = CATEGORIES.flatMap((c) => c.items);

export const STARTER_PANTRY = ["crni luk", "beli luk", "jaja", "krompir", "brašno", "mleko"];
