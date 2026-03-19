/** Auto-categorize food items by name for pantry and shopping list grouping. */

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Produce": [
    "apple", "banana", "orange", "lemon", "lime", "berry", "berries", "strawberry",
    "blueberry", "grape", "mango", "avocado", "tomato", "potato", "onion", "garlic",
    "pepper", "carrot", "celery", "broccoli", "spinach", "lettuce", "kale", "cabbage",
    "cucumber", "zucchini", "squash", "corn", "peas", "beans", "mushroom", "ginger",
    "cilantro", "parsley", "basil", "mint", "thyme", "rosemary", "oregano", "dill",
    "scallion", "shallot", "leek", "arugula", "radish", "beet", "turnip", "fennel",
    "asparagus", "artichoke", "eggplant", "okra", "jalapeno", "chili", "fruit",
    "vegetable", "herb", "salad", "greens", "pineapple", "coconut", "peach", "pear",
    "plum", "cherry", "melon", "watermelon", "cauliflower", "sweet potato",
  ],
  "Protein": [
    "chicken", "beef", "pork", "turkey", "lamb", "fish", "salmon", "tuna", "shrimp",
    "steak", "bacon", "sausage", "ham", "ground", "meat", "tofu", "tempeh", "seitan",
    "egg", "eggs", "crab", "lobster", "scallop", "cod", "tilapia", "anchovy",
    "prosciutto", "pepperoni", "duck", "veal", "bison", "venison",
  ],
  "Dairy": [
    "milk", "cheese", "butter", "cream", "yogurt", "sour cream", "mozzarella",
    "parmesan", "cheddar", "ricotta", "feta", "gouda", "brie", "cottage cheese",
    "whipping cream", "half and half", "ghee", "cream cheese",
  ],
  "Grains & Bread": [
    "rice", "pasta", "bread", "flour", "oat", "oats", "cereal", "tortilla", "noodle",
    "quinoa", "couscous", "barley", "farro", "pita", "bagel", "bun", "roll",
    "cracker", "breadcrumb", "panko", "spaghetti", "penne", "macaroni", "linguine",
    "ramen", "udon", "sourdough", "wheat", "cornmeal", "polenta",
  ],
  "Canned & Jarred": [
    "can of", "canned", "tomato sauce", "tomato paste", "broth", "stock", "soup",
    "coconut milk", "salsa", "pickl", "olive", "jam", "jelly", "peanut butter",
    "almond butter", "tahini", "hummus", "marinara", "diced tomato",
  ],
  "Spices & Seasonings": [
    "salt", "pepper", "cumin", "paprika", "cinnamon", "nutmeg", "turmeric",
    "cayenne", "chili powder", "garlic powder", "onion powder", "italian seasoning",
    "oregano", "thyme", "rosemary", "bay leaf", "curry", "saffron", "cardamom",
    "coriander", "clove", "allspice", "vanilla", "extract",
  ],
  "Oils & Condiments": [
    "oil", "olive oil", "vegetable oil", "sesame oil", "vinegar", "soy sauce",
    "hot sauce", "ketchup", "mustard", "mayo", "mayonnaise", "worcestershire",
    "fish sauce", "oyster sauce", "hoisin", "sriracha", "honey", "maple syrup",
    "dressing", "bbq sauce",
  ],
  "Snacks & Baking": [
    "sugar", "brown sugar", "baking soda", "baking powder", "yeast", "chocolate",
    "cocoa", "chip", "cookie", "cracker", "nut", "almond", "walnut", "pecan",
    "cashew", "peanut", "pistachio", "seed", "raisin", "dried", "granola",
    "protein bar", "popcorn",
  ],
  "Beverages": [
    "water", "juice", "coffee", "tea", "soda", "wine", "beer", "kombucha",
    "smoothie", "lemonade",
  ],
  "Frozen": [
    "frozen", "ice cream", "pizza", "frozen vegetable", "frozen fruit",
  ],
};

export function categorizeFood(name: string): string {
  const lower = name.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) return category;
    }
  }
  return "Other";
}

/** Ordered list of categories for display */
export const CATEGORY_ORDER = [
  "Produce",
  "Protein",
  "Dairy",
  "Grains & Bread",
  "Canned & Jarred",
  "Spices & Seasonings",
  "Oils & Condiments",
  "Snacks & Baking",
  "Beverages",
  "Frozen",
  "Other",
];

/** Icon emoji for each category (used as visual hint) */
export const CATEGORY_ICONS: Record<string, string> = {
  "Produce": "🥬",
  "Protein": "🥩",
  "Dairy": "🧀",
  "Grains & Bread": "🍞",
  "Canned & Jarred": "🥫",
  "Spices & Seasonings": "🧂",
  "Oils & Condiments": "🫒",
  "Snacks & Baking": "🍪",
  "Beverages": "🥤",
  "Frozen": "🧊",
  "Other": "📦",
};
