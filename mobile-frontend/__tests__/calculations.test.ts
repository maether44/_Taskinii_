import {
  normalizeGoal,
  dobToAge,
  dobToISO,
  calcBMR,
  calcCalTarget,
  calcMacroTargets,
  calcProtein,
  calcBMI,
  bmiStatus,
} from '../lib/calculations';

describe('normalizeGoal', () => {
  it('maps fat_loss → lose_fat', () => {
    expect(normalizeGoal('fat_loss')).toBe('lose_fat');
  });

  it('maps muscle → gain_muscle', () => {
    expect(normalizeGoal('muscle')).toBe('gain_muscle');
  });

  it('maps muscle_gain → gain_muscle', () => {
    expect(normalizeGoal('muscle_gain')).toBe('gain_muscle');
  });

  it('passes through unknown goals unchanged', () => {
    expect(normalizeGoal('maintain')).toBe('maintain');
    expect(normalizeGoal('gain_weight')).toBe('gain_weight');
  });
});

describe('dobToAge', () => {
  it('returns null for invalid input', () => {
    expect(dobToAge(null)).toBeNull();
    expect(dobToAge('')).toBeNull();
    expect(dobToAge('abc')).toBeNull();
  });

  it('calculates age from DD/MM/YYYY', () => {
    const year = new Date().getFullYear();
    const age = dobToAge(`01/01/${year - 25}`);
    // Could be 24 or 25 depending on today's date
    expect(age).toBeGreaterThanOrEqual(24);
    expect(age).toBeLessThanOrEqual(25);
  });
});

describe('dobToISO', () => {
  it('converts DD/MM/YYYY to YYYY-MM-DD', () => {
    expect(dobToISO('15/03/1998')).toBe('1998-03-15');
  });

  it('returns null for invalid input', () => {
    expect(dobToISO(null)).toBeNull();
    expect(dobToISO('short')).toBeNull();
  });
});

describe('calcBMR', () => {
  it('calculates male BMR using Mifflin-St Jeor', () => {
    const year = new Date().getFullYear();
    const bmr = calcBMR({ gender: 'male', weight: '80', height: '180', dob: `01/01/${year - 25}` });
    expect(bmr).toBeGreaterThan(1600);
    expect(bmr).toBeLessThan(2000);
  });

  it('calculates female BMR (lower than male)', () => {
    const year = new Date().getFullYear();
    const male = calcBMR({ gender: 'male', weight: '70', height: '170', dob: `01/01/${year - 30}` });
    const female = calcBMR({ gender: 'female', weight: '70', height: '170', dob: `01/01/${year - 30}` });
    expect(female).toBeLessThan(male);
  });

  it('returns 0 when inputs are missing', () => {
    expect(calcBMR({ gender: 'male', weight: '', height: '180', dob: '01/01/1998' })).toBe(0);
  });
});

describe('calcCalTarget', () => {
  it('subtracts 400 for lose_fat', () => {
    expect(calcCalTarget(2000, 'fat_loss')).toBe(1600);
  });

  it('adds 200 for gain_muscle', () => {
    expect(calcCalTarget(2000, 'muscle')).toBe(2200);
  });

  it('adds 400 for gain_weight', () => {
    expect(calcCalTarget(2000, 'gain_weight')).toBe(2400);
  });

  it('returns TDEE for maintain', () => {
    expect(calcCalTarget(2000, 'maintain')).toBe(2000);
  });

  it('returns 0 when TDEE is 0', () => {
    expect(calcCalTarget(0, 'maintain')).toBe(0);
  });
});

describe('calcMacroTargets', () => {
  it('returns protein/carbs/fat targets in grams', () => {
    const result = calcMacroTargets(2000, 'maintain');
    expect(result.protein_target).toBeGreaterThan(0);
    expect(result.carbs_target).toBeGreaterThan(0);
    expect(result.fat_target).toBeGreaterThan(0);
  });

  it('gives higher protein for lose_fat', () => {
    const loseFat = calcMacroTargets(2000, 'fat_loss');
    const maintain = calcMacroTargets(2000, 'maintain');
    expect(loseFat.protein_target).toBeGreaterThan(maintain.protein_target);
  });
});

describe('calcProtein', () => {
  it('returns weight × 2', () => {
    expect(calcProtein('75')).toBe(150);
  });

  it('returns 0 for invalid weight', () => {
    expect(calcProtein('')).toBe(0);
  });
});

describe('calcBMI', () => {
  it('calculates BMI correctly', () => {
    // 80kg, 180cm → 80 / (1.8^2) = 24.7
    expect(calcBMI('80', '180')).toBe('24.7');
  });

  it('returns null for missing inputs', () => {
    expect(calcBMI('', '180')).toBeNull();
  });
});

describe('bmiStatus', () => {
  it('classifies BMI ranges correctly', () => {
    expect(bmiStatus(17)).toBe('Underweight');
    expect(bmiStatus(22)).toContain('Normal');
    expect(bmiStatus(27)).toBe('Overweight');
    expect(bmiStatus(32)).toBe('Obese');
  });

  it('returns empty string for falsy input', () => {
    expect(bmiStatus(null)).toBe('');
  });
});
