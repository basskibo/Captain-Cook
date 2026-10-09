export type MealType = "dorucak" | "rucak" | "vecera" | "uzina" | "desert";

export type Difficulty = "lako" | "srednje" | "teško";

export interface RecipeIngredient {
  item: string;
  amount: string;
  have: boolean;
}

export interface Recipe {
  id: string;
  name: string;
  emoji: string;
  description: string;
  timeMinutes: number;
  difficulty: Difficulty;
  servings: number;
  caloriesPerServing?: number;
  ingredients: RecipeIngredient[];
  steps: string[];
  tip?: string;
  image?: RecipeImage;
}

export interface RecipeImage {
  src: string;
  thumb: string;
  alt: string;
  color?: string;
  credit: string;
  creditUrl: string;
}

export interface GenerateRequest {
  ingredients: string[];
  mealType: MealType;
  maxTime: number | null;
  servings: number;
  strict: boolean;
  note?: string;
  exclude?: string[];
  profile?: TasteProfile;
}

export interface ShoppingItem {
  id: string;
  name: string;
  amount?: string;
  recipe?: string;
  done: boolean;
}

export interface TasteProfile {
  diet: string;
  allergies: string[];
  dislikes: string[];
  cuisines: string[];
  equipment: string[];
  spice: "blago" | "srednje" | "ljuto";
}

export const EMPTY_PROFILE: TasteProfile = {
  diet: "",
  allergies: [],
  dislikes: [],
  cuisines: [],
  equipment: [],
  spice: "srednje",
};
