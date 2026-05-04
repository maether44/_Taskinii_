const FOOD_EMOJIS = {
  apple: "🍎", banana: "🍌", orange: "🍊", grapes: "🍇", strawberries: "🍓",
  blueberries: "🫐", chicken_breast: "🍗", chicken_thigh: "🍗", ground_beef: "🥩",
  salmon: "🐟", tuna: "🐟", eggs: "🥚", greek_yogurt: "🥛", cottage_cheese: "🧀",
  cheddar_cheese: "🧀", milk: "🥛", almonds: "🌰", peanuts: "🥜", walnuts: "🌰",
  rice_white: "🍚", brown_rice: "🍚", quinoa: "🌾", oatmeal: "🥣",
  bread_whole_wheat: "🍞", pasta: "🍝", potatoes: "🥔", sweet_potato: "🍠",
  broccoli: "🥦", spinach: "🥬", lettuce: "🥬", carrots: "🥕", tomatoes: "🍅",
  cucumber: "🥒", avocado: "🥑", olive_oil: "🫒", butter: "🧈", honey: "🍯",
  sugar: "🍬", salt: "🧂", black_pepper: "🌶️", garlic: "🧄", onions: "🧅",
  beef_steak: "🥩", pork_chop: "🥩", turkey_breast: "🦃", shrimp: "🦐",
  lobster: "🦞", cod: "🐟", lentils: "🫘", chickpeas: "🫘", black_beans: "🫘",
  kidney_beans: "🫘", peanut_butter: "🥜", almond_butter: "🌰",
  chia_seeds: "🌱", flax_seeds: "🌱", pumpkin_seeds: "🌱", sunflower_seeds: "🌻",
  cashews: "🌰", pistachios: "🌰", raisins: "🍇", dates: "🌴",
  dark_chocolate: "🍫", coffee: "☕", green_tea: "🍵", water: "💧",
  tamales: "🫔", couscous: "🌾", falafel: "🧆", hummus: "🫕", pita_bread: "🫓",
  sushi: "🍣", ramen: "🍜", tofu: "🧊", tempeh: "🫘", edamame: "🫛",
  miso: "🍲", curry: "🍛", dal: "🍲", naan: "🫓", pad_thai: "🍜",
  bok_choy: "🥬", mozzarella: "🧀", feta: "🧀", yogurt: "🥛",
  cider_vinegar: "🍶", soy_sauce: "🍶", sesame_oil: "🫒", ginger: "🫚",
  turmeric: "🟡", cornmeal: "🌽", polenta: "🌽", millet: "🌾", amaranth: "🌾",
  kale: "🥬", purple_cabbage: "🥬", bell_pepper: "🫑", zucchini: "🥒",
  eggplant: "🍆", mushrooms: "🍄", corn: "🌽",
  tiramisu: "🍰", cheesecake: "🍰", brownie: "🍫", chocolate_cake: "🎂",
  vanilla_cake: "🎂", carrot_cake: "🎂", ice_cream: "🍦", donut: "🍩",
  croissant: "🥐", pizza: "🍕", hamburger: "🍔", hot_dog: "🌭",
  sandwich: "🥪", french_fries: "🍟", chicken_sandwich: "🥪", taco: "🌮",
  burrito: "🌯", enchilada: "🫔", quesadilla: "🧀", lasagna: "🍝",
  spaghetti: "🍝", spaghetti_bolognese: "🍝", meatball: "🍖", risotto: "🍚",
  steak: "🥩", grilled_chicken: "🍗", fried_chicken: "🍗", turkey: "🦃",
  roasted_vegetables: "🥗", mashed_potatoes: "🥔", baked_beans: "🫘",
  coleslaw: "🥗", caesar_salad: "🥗", greek_salad: "🥗", garden_salad: "🥗",
  avocado_toast: "🥑", scrambled_eggs: "🍳", omelette: "🍳",
  pancakes: "🥞", waffles: "🧇", french_toast: "🍞",
  granola: "🥣", granola_bar: "🥣", protein_bar: "💪", energy_bar: "⚡",
  trail_mix: "🥜", popcorn: "🍿", chips: "🍟", pretzels: "🥨",
  crackers: "🍘", cookie: "🍪", chocolate_chip_cookie: "🍪", oatmeal_cookie: "🍪",
  candy: "🍬", chocolate: "🍫", milk_chocolate: "🍫",
  nuts: "🥜", pork_chop_comp: "🥩",
};

const CATEGORY_EMOJIS = {
  fruit: "🍎", protein: "🍖", dairy: "🥛", grain: "🌾", vegetable: "🥬",
  oil: "🫒", spice: "🧂", legume: "🫘", nut: "🥜", sweet: "🍰",
  drink: "🥤", seafood: "🐟", meal: "🍽️",
};

const DEFAULT_PORTIONS = [{ label: "100g", grams: 100 }];

const FOOD_PORTIONS = {
  apple: [
    { label: "1 medium", grams: 182 },
    { label: "1 small", grams: 150 },
    { label: "1 cup sliced", grams: 125 },
    { label: "100g", grams: 100 },
  ],
  banana: [
    { label: "1 medium", grams: 118 },
    { label: "1 large", grams: 136 },
    { label: "100g", grams: 100 },
  ],
  orange: [
    { label: "1 medium", grams: 131 },
    { label: "1 large", grams: 184 },
    { label: "100g", grams: 100 },
  ],
  grapes: [
    { label: "1 cup", grams: 151 },
    { label: "10 grapes", grams: 49 },
    { label: "100g", grams: 100 },
  ],
  strawberries: [
    { label: "1 cup", grams: 152 },
    { label: "1 medium", grams: 12 },
    { label: "100g", grams: 100 },
  ],
  blueberries: [
    { label: "1 cup", grams: 148 },
    { label: "100g", grams: 100 },
  ],
  chicken_breast: [
    { label: "1 breast", grams: 174 },
    { label: "1 palm", grams: 85 },
    { label: "100g", grams: 100 },
  ],
  chicken_thigh: [
    { label: "1 thigh", grams: 116 },
    { label: "100g", grams: 100 },
  ],
  ground_beef: [
    { label: "1 patty", grams: 113 },
    { label: "100g", grams: 100 },
  ],
  salmon: [
    { label: "1 fillet", grams: 178 },
    { label: "100g", grams: 100 },
  ],
  tuna: [
    { label: "1 can", grams: 165 },
    { label: "100g", grams: 100 },
  ],
  eggs: [
    { label: "1 large", grams: 50 },
    { label: "2 large", grams: 100 },
    { label: "3 large", grams: 150 },
    { label: "100g", grams: 100 },
  ],
  greek_yogurt: [
    { label: "1 cup", grams: 245 },
    { label: "170g cup", grams: 170 },
    { label: "100g", grams: 100 },
  ],
  cottage_cheese: [
    { label: "1 cup", grams: 226 },
    { label: "½ cup", grams: 113 },
    { label: "100g", grams: 100 },
  ],
  cheddar_cheese: [
    { label: "1 slice", grams: 28 },
    { label: "1 cup shredded", grams: 113 },
    { label: "100g", grams: 100 },
  ],
  milk: [
    { label: "1 cup (240ml)", grams: 244, displayUnit: "ml" },
    { label: "1 glass (200ml)", grams: 206, displayUnit: "ml" },
    { label: "½ cup (120ml)", grams: 122, displayUnit: "ml" },
    { label: "100ml", grams: 103, displayUnit: "ml" },
  ],
  almonds: [
    { label: "¼ cup", grams: 36 },
    { label: "1 oz (23 nuts)", grams: 28 },
    { label: "100g", grams: 100 },
  ],
  peanuts: [
    { label: "¼ cup", grams: 37 },
    { label: "1 oz", grams: 28 },
    { label: "100g", grams: 100 },
  ],
  walnuts: [
    { label: "¼ cup", grams: 30 },
    { label: "1 oz (14 halves)", grams: 28 },
    { label: "100g", grams: 100 },
  ],
  rice_white: [
    { label: "1 cup cooked", grams: 186 },
    { label: "½ cup cooked", grams: 93 },
    { label: "100g", grams: 100 },
  ],
  brown_rice: [
    { label: "1 cup cooked", grams: 195 },
    { label: "½ cup cooked", grams: 98 },
    { label: "100g", grams: 100 },
  ],
  quinoa: [
    { label: "1 cup cooked", grams: 185 },
    { label: "½ cup cooked", grams: 93 },
    { label: "100g", grams: 100 },
  ],
  oatmeal: [
    { label: "1 cup cooked", grams: 234 },
    { label: "½ cup dry", grams: 40 },
    { label: "100g", grams: 100 },
  ],
  bread_whole_wheat: [
    { label: "1 slice", grams: 30 },
    { label: "2 slices", grams: 60 },
    { label: "100g", grams: 100 },
  ],
  pasta: [
    { label: "1 cup cooked", grams: 140 },
    { label: "½ cup cooked", grams: 70 },
    { label: "100g", grams: 100 },
  ],
  potatoes: [
    { label: "1 medium", grams: 150 },
    { label: "1 large", grams: 300 },
    { label: "100g", grams: 100 },
  ],
  sweet_potato: [
    { label: "1 medium", grams: 114 },
    { label: "1 large", grams: 180 },
    { label: "100g", grams: 100 },
  ],
  broccoli: [
    { label: "1 cup chopped", grams: 91 },
    { label: "1 stalk", grams: 151 },
    { label: "100g", grams: 100 },
  ],
  spinach: [
    { label: "1 cup raw", grams: 30 },
    { label: "1 cup cooked", grams: 180 },
    { label: "100g", grams: 100 },
  ],
  lettuce: [
    { label: "1 cup shredded", grams: 55 },
    { label: "1 leaf", grams: 15 },
    { label: "100g", grams: 100 },
  ],
  carrots: [
    { label: "1 medium", grams: 61 },
    { label: "1 cup chopped", grams: 128 },
    { label: "100g", grams: 100 },
  ],
  tomatoes: [
    { label: "1 medium", grams: 123 },
    { label: "1 cup chopped", grams: 180 },
    { label: "100g", grams: 100 },
  ],
  cucumber: [
    { label: "1 medium", grams: 201 },
    { label: "1 cup sliced", grams: 119 },
    { label: "100g", grams: 100 },
  ],
  avocado: [
    { label: "1 whole", grams: 201 },
    { label: "½ avocado", grams: 100 },
    { label: "100g", grams: 100 },
  ],
  olive_oil: [
    { label: "1 tbsp (15ml)", grams: 14, displayUnit: "ml" },
    { label: "1 tsp (5ml)", grams: 5, displayUnit: "ml" },
    { label: "100ml", grams: 92, displayUnit: "ml" },
  ],
  butter: [
    { label: "1 tbsp", grams: 14 },
    { label: "1 pat", grams: 5 },
    { label: "100g", grams: 100 },
  ],
  honey: [
    { label: "1 tbsp", grams: 21 },
    { label: "1 tsp", grams: 7 },
    { label: "100g", grams: 100 },
  ],
  sugar: [
    { label: "1 tbsp", grams: 13 },
    { label: "1 tsp", grams: 4 },
    { label: "1 cup", grams: 200 },
    { label: "100g", grams: 100 },
  ],
  salt: [
    { label: "1 tsp", grams: 6 },
    { label: "1 pinch", grams: 1 },
  ],
  garlic: [
    { label: "1 clove", grams: 3 },
    { label: "3 cloves", grams: 9 },
    { label: "100g", grams: 100 },
  ],
  onions: [
    { label: "1 medium", grams: 110 },
    { label: "1 cup chopped", grams: 160 },
    { label: "100g", grams: 100 },
  ],
  beef_steak: [
    { label: "1 steak (6oz)", grams: 170 },
    { label: "1 palm", grams: 85 },
    { label: "100g", grams: 100 },
  ],
  pork_chop: [
    { label: "1 chop", grams: 151 },
    { label: "100g", grams: 100 },
  ],
  turkey_breast: [
    { label: "3 slices", grams: 84 },
    { label: "1 serving", grams: 100 },
  ],
  shrimp: [
    { label: "6 large", grams: 84 },
    { label: "1 cup", grams: 145 },
    { label: "100g", grams: 100 },
  ],
  lobster: [
    { label: "1 tail", grams: 145 },
    { label: "100g", grams: 100 },
  ],
  cod: [
    { label: "1 fillet", grams: 180 },
    { label: "100g", grams: 100 },
  ],
  lentils: [
    { label: "1 cup cooked", grams: 198 },
    { label: "½ cup cooked", grams: 99 },
    { label: "100g", grams: 100 },
  ],
  chickpeas: [
    { label: "1 cup cooked", grams: 164 },
    { label: "½ cup cooked", grams: 82 },
    { label: "100g", grams: 100 },
  ],
  black_beans: [
    { label: "1 cup cooked", grams: 172 },
    { label: "½ cup", grams: 86 },
    { label: "100g", grams: 100 },
  ],
  kidney_beans: [
    { label: "1 cup cooked", grams: 177 },
    { label: "½ cup", grams: 89 },
    { label: "100g", grams: 100 },
  ],
  peanut_butter: [
    { label: "1 tbsp", grams: 16 },
    { label: "2 tbsp", grams: 32 },
    { label: "100g", grams: 100 },
  ],
  almond_butter: [
    { label: "1 tbsp", grams: 16 },
    { label: "2 tbsp", grams: 32 },
    { label: "100g", grams: 100 },
  ],
  chia_seeds: [
    { label: "1 tbsp", grams: 12 },
    { label: "2 tbsp", grams: 24 },
    { label: "100g", grams: 100 },
  ],
  flax_seeds: [
    { label: "1 tbsp", grams: 7 },
    { label: "2 tbsp", grams: 14 },
    { label: "100g", grams: 100 },
  ],
  pumpkin_seeds: [
    { label: "¼ cup", grams: 32 },
    { label: "1 oz", grams: 28 },
    { label: "100g", grams: 100 },
  ],
  sunflower_seeds: [
    { label: "¼ cup", grams: 34 },
    { label: "1 oz", grams: 28 },
    { label: "100g", grams: 100 },
  ],
  cashews: [
    { label: "¼ cup", grams: 32 },
    { label: "1 oz (18 nuts)", grams: 28 },
    { label: "100g", grams: 100 },
  ],
  pistachios: [
    { label: "¼ cup", grams: 31 },
    { label: "1 oz (49 nuts)", grams: 28 },
    { label: "100g", grams: 100 },
  ],
  raisins: [
    { label: "¼ cup", grams: 36 },
    { label: "small box", grams: 43 },
    { label: "100g", grams: 100 },
  ],
  dates: [
    { label: "1 date", grams: 24 },
    { label: "3 dates", grams: 72 },
    { label: "100g", grams: 100 },
  ],
  dark_chocolate: [
    { label: "1 square", grams: 10 },
    { label: "1 bar", grams: 40 },
    { label: "100g", grams: 100 },
  ],
  coffee: [
    { label: "1 cup (240ml)", grams: 240, displayUnit: "ml" },
    { label: "1 shot (30ml)", grams: 30, displayUnit: "ml" },
    { label: "1 mug (350ml)", grams: 350, displayUnit: "ml" },
  ],
  green_tea: [
    { label: "1 cup (240ml)", grams: 240, displayUnit: "ml" },
    { label: "1 mug (350ml)", grams: 350, displayUnit: "ml" },
  ],
  water: [
    { label: "1 cup (240ml)", grams: 240, displayUnit: "ml" },
    { label: "1 bottle (500ml)", grams: 500, displayUnit: "ml" },
    { label: "1 glass (250ml)", grams: 250, displayUnit: "ml" },
  ],
  tiramisu: [
    { label: "1 slice", grams: 120 },
    { label: "100g", grams: 100 },
  ],
  cheesecake: [
    { label: "1 slice", grams: 125 },
    { label: "100g", grams: 100 },
  ],
  brownie: [
    { label: "1 piece", grams: 56 },
    { label: "100g", grams: 100 },
  ],
  chocolate_cake: [
    { label: "1 slice", grams: 95 },
    { label: "100g", grams: 100 },
  ],
  vanilla_cake: [
    { label: "1 slice", grams: 95 },
    { label: "100g", grams: 100 },
  ],
  carrot_cake: [
    { label: "1 slice", grams: 110 },
    { label: "100g", grams: 100 },
  ],
  ice_cream: [
    { label: "1 scoop", grams: 66 },
    { label: "1 cup", grams: 132 },
    { label: "100g", grams: 100 },
  ],
  donut: [
    { label: "1 donut", grams: 60 },
    { label: "100g", grams: 100 },
  ],
  croissant: [
    { label: "1 croissant", grams: 57 },
    { label: "100g", grams: 100 },
  ],
  pizza: [
    { label: "1 slice", grams: 107 },
    { label: "2 slices", grams: 214 },
    { label: "100g", grams: 100 },
  ],
  hamburger: [
    { label: "1 burger", grams: 226 },
    { label: "100g", grams: 100 },
  ],
  hot_dog: [
    { label: "1 hot dog", grams: 98 },
    { label: "100g", grams: 100 },
  ],
  sandwich: [
    { label: "1 sandwich", grams: 200 },
    { label: "½ sandwich", grams: 100 },
  ],
  french_fries: [
    { label: "small", grams: 71 },
    { label: "medium", grams: 117 },
    { label: "large", grams: 154 },
    { label: "100g", grams: 100 },
  ],
  chicken_sandwich: [
    { label: "1 sandwich", grams: 170 },
    { label: "100g", grams: 100 },
  ],
  taco: [
    { label: "1 taco", grams: 78 },
    { label: "2 tacos", grams: 156 },
    { label: "100g", grams: 100 },
  ],
  burrito: [
    { label: "1 burrito", grams: 272 },
    { label: "100g", grams: 100 },
  ],
  enchilada: [
    { label: "1 enchilada", grams: 163 },
    { label: "100g", grams: 100 },
  ],
  quesadilla: [
    { label: "1 quesadilla", grams: 184 },
    { label: "100g", grams: 100 },
  ],
  lasagna: [
    { label: "1 serving", grams: 250 },
    { label: "100g", grams: 100 },
  ],
  spaghetti: [
    { label: "1 cup cooked", grams: 140 },
    { label: "1 plate", grams: 250 },
    { label: "100g", grams: 100 },
  ],
  spaghetti_bolognese: [
    { label: "1 plate", grams: 300 },
    { label: "100g", grams: 100 },
  ],
  meatball: [
    { label: "1 meatball", grams: 33 },
    { label: "3 meatballs", grams: 99 },
    { label: "100g", grams: 100 },
  ],
  risotto: [
    { label: "1 serving", grams: 250 },
    { label: "100g", grams: 100 },
  ],
  steak: [
    { label: "1 steak (6oz)", grams: 170 },
    { label: "100g", grams: 100 },
  ],
  grilled_chicken: [
    { label: "1 breast", grams: 174 },
    { label: "1 palm", grams: 85 },
    { label: "100g", grams: 100 },
  ],
  fried_chicken: [
    { label: "1 piece", grams: 130 },
    { label: "100g", grams: 100 },
  ],
  turkey: [
    { label: "3 slices", grams: 84 },
    { label: "100g", grams: 100 },
  ],
  roasted_vegetables: [
    { label: "1 cup", grams: 150 },
    { label: "100g", grams: 100 },
  ],
  mashed_potatoes: [
    { label: "1 cup", grams: 210 },
    { label: "½ cup", grams: 105 },
    { label: "100g", grams: 100 },
  ],
  baked_beans: [
    { label: "1 cup", grams: 254 },
    { label: "½ cup", grams: 127 },
    { label: "100g", grams: 100 },
  ],
  coleslaw: [
    { label: "1 cup", grams: 150 },
    { label: "100g", grams: 100 },
  ],
  caesar_salad: [
    { label: "1 bowl", grams: 200 },
    { label: "100g", grams: 100 },
  ],
  greek_salad: [
    { label: "1 bowl", grams: 200 },
    { label: "100g", grams: 100 },
  ],
  garden_salad: [
    { label: "1 bowl", grams: 200 },
    { label: "100g", grams: 100 },
  ],
  avocado_toast: [
    { label: "1 slice", grams: 130 },
    { label: "100g", grams: 100 },
  ],
  scrambled_eggs: [
    { label: "2 eggs", grams: 122 },
    { label: "3 eggs", grams: 183 },
    { label: "100g", grams: 100 },
  ],
  omelette: [
    { label: "2-egg omelette", grams: 120 },
    { label: "3-egg omelette", grams: 180 },
    { label: "100g", grams: 100 },
  ],
  pancakes: [
    { label: "1 pancake", grams: 38 },
    { label: "3 pancakes", grams: 114 },
    { label: "100g", grams: 100 },
  ],
  waffles: [
    { label: "1 waffle", grams: 75 },
    { label: "100g", grams: 100 },
  ],
  french_toast: [
    { label: "1 slice", grams: 65 },
    { label: "2 slices", grams: 130 },
    { label: "100g", grams: 100 },
  ],
  granola: [
    { label: "½ cup", grams: 61 },
    { label: "¼ cup", grams: 30 },
    { label: "100g", grams: 100 },
  ],
  granola_bar: [
    { label: "1 bar", grams: 42 },
    { label: "100g", grams: 100 },
  ],
  protein_bar: [
    { label: "1 bar", grams: 60 },
    { label: "100g", grams: 100 },
  ],
  energy_bar: [
    { label: "1 bar", grams: 45 },
    { label: "100g", grams: 100 },
  ],
  trail_mix: [
    { label: "¼ cup", grams: 38 },
    { label: "1 oz", grams: 28 },
    { label: "100g", grams: 100 },
  ],
  popcorn: [
    { label: "1 cup popped", grams: 8 },
    { label: "3 cups popped", grams: 24 },
    { label: "100g", grams: 100 },
  ],
  chips: [
    { label: "1 oz (15 chips)", grams: 28 },
    { label: "small bag", grams: 42 },
    { label: "100g", grams: 100 },
  ],
  pretzels: [
    { label: "1 oz", grams: 28 },
    { label: "100g", grams: 100 },
  ],
  crackers: [
    { label: "5 crackers", grams: 16 },
    { label: "10 crackers", grams: 32 },
    { label: "100g", grams: 100 },
  ],
  cookie: [
    { label: "1 cookie", grams: 30 },
    { label: "100g", grams: 100 },
  ],
  chocolate_chip_cookie: [
    { label: "1 cookie", grams: 33 },
    { label: "100g", grams: 100 },
  ],
  oatmeal_cookie: [
    { label: "1 cookie", grams: 30 },
    { label: "100g", grams: 100 },
  ],
  candy: [
    { label: "1 piece", grams: 10 },
    { label: "5 pieces", grams: 50 },
    { label: "100g", grams: 100 },
  ],
  chocolate: [
    { label: "1 bar", grams: 40 },
    { label: "1 square", grams: 10 },
    { label: "100g", grams: 100 },
  ],
  milk_chocolate: [
    { label: "1 bar", grams: 40 },
    { label: "1 square", grams: 10 },
    { label: "100g", grams: 100 },
  ],
  nuts: [
    { label: "¼ cup", grams: 35 },
    { label: "1 oz", grams: 28 },
    { label: "100g", grams: 100 },
  ],
  tamales: [
    { label: "1 tamale", grams: 128 },
    { label: "100g", grams: 100 },
  ],
  couscous: [
    { label: "1 cup cooked", grams: 157 },
    { label: "100g", grams: 100 },
  ],
  falafel: [
    { label: "1 patty", grams: 17 },
    { label: "4 patties", grams: 68 },
    { label: "100g", grams: 100 },
  ],
  hummus: [
    { label: "2 tbsp", grams: 30 },
    { label: "¼ cup", grams: 62 },
    { label: "100g", grams: 100 },
  ],
  pita_bread: [
    { label: "1 pita", grams: 60 },
    { label: "100g", grams: 100 },
  ],
  sushi: [
    { label: "1 piece", grams: 37 },
    { label: "6 pieces", grams: 222 },
    { label: "100g", grams: 100 },
  ],
  ramen: [
    { label: "1 bowl", grams: 300 },
    { label: "1 packet dry", grams: 85 },
    { label: "100g", grams: 100 },
  ],
  tofu: [
    { label: "½ cup", grams: 126 },
    { label: "1 block", grams: 349 },
    { label: "100g", grams: 100 },
  ],
  tempeh: [
    { label: "1 cup", grams: 166 },
    { label: "100g", grams: 100 },
  ],
  edamame: [
    { label: "1 cup", grams: 155 },
    { label: "100g", grams: 100 },
  ],
  miso: [
    { label: "1 tbsp", grams: 17 },
    { label: "1 cup soup", grams: 240, displayUnit: "ml" },
    { label: "100g", grams: 100 },
  ],
  curry: [
    { label: "1 tsp", grams: 2 },
    { label: "1 tbsp", grams: 6 },
    { label: "100g", grams: 100 },
  ],
  dal: [
    { label: "1 cup", grams: 200 },
    { label: "1 bowl", grams: 300 },
    { label: "100g", grams: 100 },
  ],
  naan: [
    { label: "1 piece", grams: 90 },
    { label: "100g", grams: 100 },
  ],
  pad_thai: [
    { label: "1 plate", grams: 300 },
    { label: "100g", grams: 100 },
  ],
  bok_choy: [
    { label: "1 cup", grams: 70 },
    { label: "1 head", grams: 350 },
    { label: "100g", grams: 100 },
  ],
  mozzarella: [
    { label: "1 slice", grams: 28 },
    { label: "1 cup shredded", grams: 113 },
    { label: "100g", grams: 100 },
  ],
  feta: [
    { label: "1 oz", grams: 28 },
    { label: "¼ cup crumbled", grams: 38 },
    { label: "100g", grams: 100 },
  ],
  yogurt: [
    { label: "1 cup", grams: 245 },
    { label: "170g cup", grams: 170 },
    { label: "100g", grams: 100 },
  ],
  cider_vinegar: [
    { label: "1 tbsp (15ml)", grams: 15, displayUnit: "ml" },
    { label: "1 tsp (5ml)", grams: 5, displayUnit: "ml" },
  ],
  soy_sauce: [
    { label: "1 tbsp (15ml)", grams: 18, displayUnit: "ml" },
    { label: "1 tsp (5ml)", grams: 6, displayUnit: "ml" },
    { label: "100ml", grams: 120, displayUnit: "ml" },
  ],
  sesame_oil: [
    { label: "1 tbsp (15ml)", grams: 14, displayUnit: "ml" },
    { label: "1 tsp (5ml)", grams: 5, displayUnit: "ml" },
  ],
  ginger: [
    { label: "1 tbsp grated", grams: 6 },
    { label: "1 inch piece", grams: 11 },
    { label: "100g", grams: 100 },
  ],
  turmeric: [
    { label: "1 tsp", grams: 3 },
    { label: "100g", grams: 100 },
  ],
  black_pepper: [
    { label: "1 tsp", grams: 2 },
    { label: "100g", grams: 100 },
  ],
  cornmeal: [
    { label: "1 cup", grams: 157 },
    { label: "100g", grams: 100 },
  ],
  polenta: [
    { label: "1 cup cooked", grams: 240 },
    { label: "100g", grams: 100 },
  ],
  millet: [
    { label: "1 cup cooked", grams: 174 },
    { label: "100g", grams: 100 },
  ],
  amaranth: [
    { label: "1 cup cooked", grams: 246 },
    { label: "100g", grams: 100 },
  ],
  kale: [
    { label: "1 cup raw", grams: 67 },
    { label: "1 cup cooked", grams: 130 },
    { label: "100g", grams: 100 },
  ],
  purple_cabbage: [
    { label: "1 cup shredded", grams: 89 },
    { label: "100g", grams: 100 },
  ],
  bell_pepper: [
    { label: "1 medium", grams: 119 },
    { label: "1 cup chopped", grams: 149 },
    { label: "100g", grams: 100 },
  ],
  zucchini: [
    { label: "1 medium", grams: 196 },
    { label: "1 cup sliced", grams: 113 },
    { label: "100g", grams: 100 },
  ],
  eggplant: [
    { label: "1 cup cubed", grams: 82 },
    { label: "1 medium", grams: 458 },
    { label: "100g", grams: 100 },
  ],
  mushrooms: [
    { label: "1 cup sliced", grams: 70 },
    { label: "5 medium", grams: 84 },
    { label: "100g", grams: 100 },
  ],
  corn: [
    { label: "1 ear", grams: 90 },
    { label: "1 cup kernels", grams: 145 },
    { label: "100g", grams: 100 },
  ],
};

export function getEmoji(food) {
  if (!food) return "🍽️";
  const id = (food.id || "").toLowerCase();
  if (FOOD_EMOJIS[id]) return FOOD_EMOJIS[id];

  const name = (food.name || "").toLowerCase();
  for (const [key, emoji] of Object.entries(FOOD_EMOJIS)) {
    if (name.includes(key.replace(/_/g, " "))) return emoji;
  }

  if (/milk|juice|smoothie|shake|latte|cappuccino|espresso|soda|cola|lemonade/.test(name)) return CATEGORY_EMOJIS.drink;
  if (/chicken|beef|pork|lamb|turkey|duck|meat|steak|bacon|sausage/.test(name)) return CATEGORY_EMOJIS.protein;
  if (/fish|salmon|tuna|shrimp|cod|crab|lobster|seafood/.test(name)) return CATEGORY_EMOJIS.seafood;
  if (/cheese|yogurt|cream|butter|whey/.test(name)) return CATEGORY_EMOJIS.dairy;
  if (/rice|bread|pasta|noodle|wheat|oat|cereal|flour|grain/.test(name)) return CATEGORY_EMOJIS.grain;
  if (/bean|lentil|chickpea|pea|soy/.test(name)) return CATEGORY_EMOJIS.legume;
  if (/nut|almond|cashew|walnut|pecan|pistachio|seed/.test(name)) return CATEGORY_EMOJIS.nut;
  if (/oil|vinegar|sauce|dressing|mayo/.test(name)) return CATEGORY_EMOJIS.oil;
  if (/cake|cookie|candy|chocolate|donut|pie|pastry|muffin|brownie/.test(name)) return CATEGORY_EMOJIS.sweet;
  if (/apple|banana|orange|grape|berry|melon|mango|peach|plum|pear|cherry|kiwi|fig|date|fruit/.test(name)) return CATEGORY_EMOJIS.fruit;
  if (/lettuce|spinach|kale|broccoli|carrot|tomato|cucumber|pepper|cabbage|celery|onion|garlic|vegetable|salad/.test(name)) return CATEGORY_EMOJIS.vegetable;

  return "🍽️";
}

export function getPortions(food) {
  if (!food) return DEFAULT_PORTIONS;
  const id = (food.id || "").toLowerCase();
  if (FOOD_PORTIONS[id]) return FOOD_PORTIONS[id];
  return DEFAULT_PORTIONS;
}
