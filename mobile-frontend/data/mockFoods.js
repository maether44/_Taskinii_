// ─── FOOD DATABASE ────────────────────────────────────────────────────────────
// cal=calories per 100g/ml, p=protein, c=carbs, f=fat (grams per 100g)

export const FOODS = [
  // PROTEINS
  { id: 'chicken_breast',  name: 'Chicken Breast',     category: 'Protein',  cal: 165, p: 31, c: 0,  f: 3.6, unit: 'g',  serving: 150 },
  { id: 'eggs',            name: 'Eggs',               category: 'Protein',  cal: 155, p: 13, c: 1.1,f: 11,  unit: 'pc', serving: 2   },
  { id: 'tuna',            name: 'Tuna (canned)',       category: 'Protein',  cal: 116, p: 26, c: 0,  f: 1,   unit: 'g',  serving: 100 },
  { id: 'greek_yogurt',    name: 'Greek Yogurt',        category: 'Protein',  cal: 59,  p: 10, c: 3.6,f: 0.4, unit: 'g',  serving: 200 },
  { id: 'salmon',          name: 'Salmon',              category: 'Protein',  cal: 208, p: 20, c: 0,  f: 13,  unit: 'g',  serving: 150 },
  { id: 'beef_mince',      name: 'Beef Mince (lean)',   category: 'Protein',  cal: 215, p: 26, c: 0,  f: 12,  unit: 'g',  serving: 150 },
  { id: 'whey_protein',    name: 'Whey Protein Shake',  category: 'Protein',  cal: 120, p: 25, c: 3,  f: 2,   unit: 'scoop', serving: 1 },
  { id: 'cottage_cheese',  name: 'Cottage Cheese',      category: 'Protein',  cal: 98,  p: 11, c: 3.4,f: 4.3, unit: 'g',  serving: 200 },

  // CARBS
  { id: 'white_rice',      name: 'White Rice (cooked)', category: 'Carbs',    cal: 130, p: 2.7,c: 28, f: 0.3, unit: 'g',  serving: 200 },
  { id: 'brown_rice',      name: 'Brown Rice (cooked)', category: 'Carbs',    cal: 123, p: 2.7,c: 26, f: 1,   unit: 'g',  serving: 200 },
  { id: 'oats',            name: 'Oats',                category: 'Carbs',    cal: 389, p: 17, c: 66, f: 7,   unit: 'g',  serving: 80  },
  { id: 'bread_whole',     name: 'Whole Wheat Bread',   category: 'Carbs',    cal: 247, p: 13, c: 41, f: 3.4, unit: 'slice', serving: 2 },
  { id: 'sweet_potato',    name: 'Sweet Potato',        category: 'Carbs',    cal: 86,  p: 1.6,c: 20, f: 0.1, unit: 'g',  serving: 200 },
  { id: 'banana',          name: 'Banana',              category: 'Carbs',    cal: 89,  p: 1.1,c: 23, f: 0.3, unit: 'pc', serving: 1   },
  { id: 'pasta',           name: 'Pasta (cooked)',      category: 'Carbs',    cal: 158, p: 5.8,c: 31, f: 0.9, unit: 'g',  serving: 200 },
  { id: 'apple',           name: 'Apple',               category: 'Fruit',    cal: 52,  p: 0.3,c: 14, f: 0.2, unit: 'pc', serving: 1   },

  // FATS & DAIRY
  { id: 'avocado',         name: 'Avocado',             category: 'Fats',     cal: 160, p: 2,  c: 9,  f: 15,  unit: 'g',  serving: 100 },
  { id: 'olive_oil',       name: 'Olive Oil',           category: 'Fats',     cal: 884, p: 0,  c: 0,  f: 100, unit: 'tbsp', serving: 1  },
  { id: 'almond_butter',   name: 'Almond Butter',       category: 'Fats',     cal: 614, p: 21, c: 19, f: 56,  unit: 'tbsp', serving: 2  },
  { id: 'whole_milk',      name: 'Whole Milk',          category: 'Dairy',    cal: 61,  p: 3.2,c: 4.8,f: 3.3, unit: 'ml', serving: 250 },

  // VEGETABLES
  { id: 'broccoli',        name: 'Broccoli',            category: 'Veg',      cal: 34,  p: 2.8,c: 7,  f: 0.4, unit: 'g',  serving: 150 },
  { id: 'spinach',         name: 'Spinach',             category: 'Veg',      cal: 23,  p: 2.9,c: 3.6,f: 0.4, unit: 'g',  serving: 100 },
  { id: 'cucumber',        name: 'Cucumber',            category: 'Veg',      cal: 15,  p: 0.7,c: 3.6,f: 0.1, unit: 'g',  serving: 100 },

  // READY MEALS / SNACKS
  { id: 'protein_bar',     name: 'Protein Bar',         category: 'Snack',    cal: 200, p: 20, c: 22, f: 6,   unit: 'bar', serving: 1  },
  { id: 'almonds',         name: 'Almonds',             category: 'Snack',    cal: 579, p: 21, c: 22, f: 50,  unit: 'g',  serving: 30  },
];

// ─── SAVED MEAL TEMPLATES ─────────────────────────────────────────────────────
export const SAVED_MEALS = [
  {
    id: 'meal_1',
    name: 'High Protein Breakfast',
    items: [
      { foodId: 'eggs',         qty: 2   },
      { foodId: 'oats',         qty: 80  },
      { foodId: 'greek_yogurt', qty: 150 },
    ],
  },
  {
    id: 'meal_2',
    name: 'Chicken & Rice',
    items: [
      { foodId: 'chicken_breast', qty: 200 },
      { foodId: 'white_rice',     qty: 200 },
      { foodId: 'broccoli',       qty: 150 },
    ],
  },
  {
    id: 'meal_3',
    name: 'Post-Workout Shake',
    items: [
      { foodId: 'whey_protein', qty: 1   },
      { foodId: 'banana',       qty: 1   },
      { foodId: 'whole_milk',   qty: 250 },
    ],
  },
];

// ─── TODAY'S MEAL LOG ─────────────────────────────────────────────────────────
export const MEAL_SLOTS = [
  { id: 'breakfast', label: 'Breakfast', icon: '🌅', targetCal: 500  },
  { id: 'lunch',     label: 'Lunch',     icon: '☀️', targetCal: 650  },
  { id: 'dinner',    label: 'Dinner',    icon: '🌙', targetCal: 700  },
  { id: 'snacks',    label: 'Snacks',    icon: '🍎', targetCal: 300  },
];

// Helper: calculate nutrition for a list of { foodId, qty } items
export function calcMealNutrition(items) {
  return items.reduce((acc, item) => {
    const food = FOODS.find(f => f.id === item.foodId);
    if (!food) return acc;
    const ratio = item.qty / (food.unit === 'g' || food.unit === 'ml' ? 100 : 1);
    return {
      cal:  acc.cal  + Math.round(food.cal  * ratio),
      p:    acc.p    + Math.round(food.p    * ratio * 10) / 10,
      c:    acc.c    + Math.round(food.c    * ratio * 10) / 10,
      f:    acc.f    + Math.round(food.f    * ratio * 10) / 10,
    };
  }, { cal: 0, p: 0, c: 0, f: 0 });
}