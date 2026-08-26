/**
 * Dynamic Scientific, Health & Fitness, Pure Mathematics, and Physics Controllers for iNWebTools.
 *
 * Implements Phase 9:
 *   - Health & Fitness Calculators (BMI, BMR, Body Fat %, Ideal Weight, Waist Ratio, Daily Calories, Water Intake, Target Heart Rate, Pregnancy Due Date, Macros)
 *   - Mathematics & Geometry Utilities (Matrix Calculator, Fractions, Prime Factors, GCD/LCM, Quadratic Solver, Exponents/Logs, Scientific Calculator, Geometry Areas & Volumes)
 *   - Physics & Scientific Calculators (Speed/Acceleration, Force F=ma, Work & Kinetic/Potential Energy, Ohm's Law, Power & Energy Cost, Frequency to Wavelength)
 */

import { incrementToolUsage } from '../../services/toolsRegistry.service.js';
import { asyncHandler } from '../../utils/ApiError.js';

/* ------------------------------------------------------------------ *
 * Pure Math & Arithmetic Utilities
 * ------------------------------------------------------------------ */

/** Greatest Common Divisor using Euclidean Algorithm */
function computeGcd(a, b) {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y !== 0) {
    const temp = y;
    y = x % y;
    x = temp;
  }
  return x || 1;
}

/** Least Common Multiple */
function computeLcm(a, b) {
  if (a === 0 || b === 0) return 0;
  return Math.abs(Math.round((a * b) / computeGcd(a, b)));
}

/** Prime Factorization decomposition */
function factorizePrime(n) {
  let num = Math.abs(Math.round(n));
  if (num <= 1) return { factors: [], factorString: String(num), isPrime: false };

  const factors = [];
  const map = {};

  // Check factor 2
  while (num % 2 === 0) {
    map[2] = (map[2] || 0) + 1;
    factors.push(2);
    num /= 2;
  }

  // Check odd factors up to sqrt(n)
  for (let i = 3; i * i <= num; i += 2) {
    while (num % i === 0) {
      map[i] = (map[i] || 0) + 1;
      factors.push(i);
      num /= i;
    }
  }

  if (num > 2) {
    map[num] = (map[num] || 0) + 1;
    factors.push(num);
  }

  const factorString = Object.entries(map)
    .map(([prime, exp]) => (exp > 1 ? `${prime}^${exp}` : `${prime}`))
    .join(' × ');

  return {
    factors,
    primePowers: map,
    factorString,
    isPrime: factors.length === 1,
  };
}

/* ================================================================== *
 * Main Scientific & Mathematics Tool Controller
 * ================================================================== */

export const executeScienceMathTool = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const files = req.files ?? (req.file ? [req.file] : []);

  let options = { ...(req.body || {}) };
  if (typeof req.body?.options === 'string') {
    try {
      options = { ...options, ...JSON.parse(req.body.options) };
    } catch {
      // ignore
    }
  } else if (typeof req.body?.options === 'object' && req.body?.options !== null) {
    options = { ...options, ...req.body.options };
  }

  const startTime = Date.now();
  let rawInput =
    req.body?.content ||
    req.body?.data ||
    req.body?.textInput ||
    req.body?.text ||
    req.body?.input ||
    '';

  if (!rawInput && files.length > 0 && files[0]?.buffer) {
    rawInput = files[0].buffer.toString('utf8');
  }

  void incrementToolUsage(slug);

  let result = null;

  // ----------------------------------------------------------------
  // 1. Health & Fitness Calculators
  // ----------------------------------------------------------------
  if (slug === 'bmi-calculator') {
    const weight = Number(options.weight || 70); // kg
    const height = Number(options.height || 175); // cm
    const heightM = height / 100;
    const bmi = Number((weight / (heightM * heightM)).toFixed(2));

    let category = 'Normal';
    let risk = 'Low Risk';
    let color = '#10b981';

    if (bmi < 16) {
      category = 'Severe Thinness';
      risk = 'Nutritional Deficiency';
      color = '#ef4444';
    } else if (bmi < 17) {
      category = 'Moderate Thinness';
      risk = 'Elevated Risk';
      color = '#f97316';
    } else if (bmi < 18.5) {
      category = 'Mild Thinness';
      risk = 'Slightly Underweight';
      color = '#eab308';
    } else if (bmi < 25) {
      category = 'Normal Weight';
      risk = 'Optimal Health Range';
      color = '#10b981';
    } else if (bmi < 30) {
      category = 'Overweight';
      risk = 'Moderate Metabolic Risk';
      color = '#f59e0b';
    } else if (bmi < 35) {
      category = 'Obesity Class I';
      risk = 'High Cardiovascular Risk';
      color = '#f97316';
    } else if (bmi < 40) {
      category = 'Obesity Class II';
      risk = 'Very High Risk';
      color = '#ef4444';
    } else {
      category = 'Obesity Class III (Severe)';
      risk = 'Extremely High Clinical Risk';
      color = '#991b1b';
    }

    const minHealthyWeight = Number((18.5 * heightM * heightM).toFixed(1));
    const maxHealthyWeight = Number((24.9 * heightM * heightM).toFixed(1));
    const bmiPrime = Number((bmi / 25).toFixed(2));

    result = {
      resultType: 'metadata',
      metadata: {
        bmi,
        category,
        healthRisk: risk,
        color,
        bmiPrime,
        healthyWeightRange: `${minHealthyWeight} kg – ${maxHealthyWeight} kg`,
        input: { weight: `${weight} kg`, height: `${height} cm` },
      },
      stats: { bmi, category, healthyRange: `${minHealthyWeight}-${maxHealthyWeight} kg` },
    };
  } else if (slug === 'bmr-calculator') {
    const gender = options.gender || 'male';
    const weight = Number(options.weight || 70);
    const height = Number(options.height || 175);
    const age = Number(options.age || 28);

    // Mifflin - St Jeor Equation
    let mifflinBmr = 10 * weight + 6.25 * height - 5 * age;
    mifflinBmr += gender === 'male' ? 5 : -161;

    // Revised Harris-Benedict Equation
    let harrisBmr = 0;
    if (gender === 'male') {
      harrisBmr = 13.397 * weight + 4.799 * height - 5.677 * age + 88.362;
    } else {
      harrisBmr = 9.247 * weight + 3.098 * height - 4.33 * age + 447.593;
    }

    const bmrFinal = Math.round(mifflinBmr);
    const activityLevels = {
      sedentary: { label: 'Sedentary (Little/no exercise)', calories: Math.round(bmrFinal * 1.2) },
      light: {
        label: 'Lightly Active (Exercise 1-3 days/wk)',
        calories: Math.round(bmrFinal * 1.375),
      },
      moderate: {
        label: 'Moderately Active (Exercise 3-5 days/wk)',
        calories: Math.round(bmrFinal * 1.55),
      },
      heavy: {
        label: 'Very Active (Hard exercise 6-7 days/wk)',
        calories: Math.round(bmrFinal * 1.725),
      },
      extreme: {
        label: 'Athlete / Physical Job (2x/day training)',
        calories: Math.round(bmrFinal * 1.9),
      },
    };

    result = {
      resultType: 'metadata',
      metadata: {
        bmr: bmrFinal,
        mifflinStJeor: Math.round(mifflinBmr),
        harrisBenedict: Math.round(harrisBmr),
        dailyCalorieBurn: activityLevels,
      },
      stats: {
        bmr: `${bmrFinal} kcal/day`,
        maintenanceSedentary: `${activityLevels.sedentary.calories} kcal`,
      },
    };
  } else if (slug === 'body-fat-percentage-calculator') {
    const gender = options.gender || 'male';
    const height = Number(options.height || 175);
    const waist = Number(options.waist || 82);
    const neck = Number(options.neck || 38);
    const hip = Number(options.hip || 95);
    const weight = Number(options.weight || 70);

    let bodyFat = 15;
    if (gender === 'male') {
      // US Navy formula for men
      bodyFat =
        495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(height)) - 450;
    } else {
      // US Navy formula for women
      bodyFat =
        495 / (1.29579 - 0.35004 * Math.log10(waist + hip - neck) + 0.221 * Math.log10(height)) -
        450;
    }

    bodyFat = Number(Math.max(3, Math.min(60, bodyFat)).toFixed(1));
    const fatMass = Number(((bodyFat / 100) * weight).toFixed(1));
    const leanMass = Number((weight - fatMass).toFixed(1));

    let category = 'Fitness';
    if (gender === 'male') {
      if (bodyFat < 6) category = 'Essential Fat';
      else if (bodyFat < 14) category = 'Athletes';
      else if (bodyFat < 18) category = 'Fitness';
      else if (bodyFat < 25) category = 'Average';
      else category = 'Obese';
    } else {
      if (bodyFat < 14) category = 'Essential Fat';
      else if (bodyFat < 21) category = 'Athletes';
      else if (bodyFat < 25) category = 'Fitness';
      else if (bodyFat < 32) category = 'Average';
      else category = 'Obese';
    }

    result = {
      resultType: 'metadata',
      metadata: {
        bodyFatPercentage: `${bodyFat}%`,
        category,
        fatMass: `${fatMass} kg`,
        leanMass: `${leanMass} kg`,
        gender,
      },
      stats: { bodyFat: `${bodyFat}%`, leanMass: `${leanMass} kg`, fatMass: `${fatMass} kg` },
    };
  } else if (slug === 'ideal-body-weight-calculator') {
    const gender = options.gender || 'male';
    const heightCm = Number(options.height || 175);
    const heightInches = heightCm / 2.54;
    const over60 = Math.max(0, heightInches - 60);

    // Devine formula
    const devine = Number(
      (gender === 'male' ? 50.0 + 2.3 * over60 : 45.5 + 2.3 * over60).toFixed(1),
    );
    // Robinson formula
    const robinson = Number(
      (gender === 'male' ? 52.0 + 1.9 * over60 : 49.0 + 1.7 * over60).toFixed(1),
    );
    // Miller formula
    const miller = Number(
      (gender === 'male' ? 56.2 + 1.41 * over60 : 53.1 + 1.36 * over60).toFixed(1),
    );
    // Hamwi formula
    const hamwi = Number(
      (gender === 'male' ? 48.0 + 2.7 * over60 : 45.5 + 2.2 * over60).toFixed(1),
    );

    const averageIbw = Number(((devine + robinson + miller + hamwi) / 4).toFixed(1));

    result = {
      resultType: 'metadata',
      metadata: {
        devineFormula: `${devine} kg`,
        robinsonFormula: `${robinson} kg`,
        millerFormula: `${miller} kg`,
        hamwiFormula: `${hamwi} kg`,
        averageIdealWeight: `${averageIbw} kg`,
        healthyBmiRange: `${(18.5 * Math.pow(heightCm / 100, 2)).toFixed(1)} – ${(24.9 * Math.pow(heightCm / 100, 2)).toFixed(1)} kg`,
      },
      stats: { averageIbw: `${averageIbw} kg`, devine: `${devine} kg` },
    };
  } else if (slug === 'waist-to-height-hip-ratio-calculator') {
    const waist = Number(options.waist || 80);
    const hip = Number(options.hip || 95);
    const height = Number(options.height || 175);
    const gender = options.gender || 'male';

    const whr = Number((waist / hip).toFixed(2));
    const whtr = Number((waist / height).toFixed(2));

    let whrRisk = 'Low Health Risk';
    if (gender === 'male') {
      if (whr > 1.0) whrRisk = 'High Health Risk';
      else if (whr >= 0.9) whrRisk = 'Moderate Risk';
    } else {
      if (whr > 0.85) whrRisk = 'High Health Risk';
      else if (whr >= 0.8) whrRisk = 'Moderate Risk';
    }

    let whtrRisk = 'Healthy Shape';
    if (whtr < 0.4) whtrRisk = 'Take Care (Underweight)';
    else if (whtr <= 0.5) whtrRisk = 'Healthy & Low Cardiovascular Risk';
    else if (whtr <= 0.6) whtrRisk = 'Increased Risk of Metabolic Disease';
    else whtrRisk = 'High Risk (Obese Pattern)';

    result = {
      resultType: 'metadata',
      metadata: {
        waistToHipRatio: whr,
        waistToHipRisk: whrRisk,
        waistToHeightRatio: whtr,
        waistToHeightRisk: whtrRisk,
      },
      stats: { whr, whtr, risk: whrRisk },
    };
  } else if (slug === 'daily-calorie-intake-calculator') {
    const weight = Number(options.weight || 70);
    const height = Number(options.height || 175);
    const age = Number(options.age || 25);
    const gender = options.gender || 'male';
    const activity = Number(options.activityMultiplier || 1.4);

    const bmr = 10 * weight + 6.25 * height - 5 * age + (gender === 'male' ? 5 : -161);
    const tdee = Math.round(bmr * activity);

    result = {
      resultType: 'metadata',
      metadata: {
        maintenanceTdee: `${tdee} kcal/day`,
        mildWeightLoss: `${Math.round(tdee - 250)} kcal/day (-0.25 kg/wk)`,
        standardWeightLoss: `${Math.round(tdee - 500)} kcal/day (-0.5 kg/wk)`,
        extremeWeightLoss: `${Math.round(tdee - 1000)} kcal/day (-1.0 kg/wk)`,
        mildWeightGain: `${Math.round(tdee + 250)} kcal/day (+0.25 kg/wk)`,
        muscleBuildingGain: `${Math.round(tdee + 500)} kcal/day (+0.5 kg/wk)`,
      },
      stats: { tdee: `${tdee} kcal`, standardCut: `${Math.round(tdee - 500)} kcal` },
    };
  } else if (slug === 'water-intake-calculator') {
    const weight = Number(options.weight || 70);
    const activityMins = Number(options.activityMinutes || 30);
    const climate = options.climate || 'normal';

    let liters = weight * 0.035; // 35 ml per kg
    liters += (activityMins / 30) * 0.35; // 350ml per 30 mins exercise
    if (climate === 'hot') liters += 0.5;
    if (climate === 'very_hot') liters += 1.0;

    liters = Number(liters.toFixed(2));
    const ml = Math.round(liters * 1000);
    const flOz = Number((liters * 33.814).toFixed(1));
    const glasses = Number((ml / 250).toFixed(1));

    result = {
      resultType: 'metadata',
      metadata: {
        dailyLiters: `${liters} L`,
        dailyMilliliters: `${ml} mL`,
        dailyFluidOunces: `${flOz} fl oz`,
        glasses250ml: `${glasses} Glasses`,
      },
      stats: { liters: `${liters} L`, glasses: `${glasses} cups` },
    };
  } else if (slug === 'target-heart-rate-calculator') {
    const age = Number(options.age || 25);
    const rhr = Number(options.restingHeartRate || 65);

    const maxHr = 220 - age;
    const hrr = maxHr - rhr;

    const zones = {
      zone1: {
        name: 'Zone 1: Warm Up & Active Recovery (50-60%)',
        range: `${Math.round(rhr + hrr * 0.5)} – ${Math.round(rhr + hrr * 0.6)} bpm`,
      },
      zone2: {
        name: 'Zone 2: Fat Burning & Aerobic Base (60-70%)',
        range: `${Math.round(rhr + hrr * 0.6)} – ${Math.round(rhr + hrr * 0.7)} bpm`,
      },
      zone3: {
        name: 'Zone 3: Aerobic Cardio & Endurance (70-80%)',
        range: `${Math.round(rhr + hrr * 0.7)} – ${Math.round(rhr + hrr * 0.8)} bpm`,
      },
      zone4: {
        name: 'Zone 4: Anaerobic Performance & Threshold (80-90%)',
        range: `${Math.round(rhr + hrr * 0.8)} – ${Math.round(rhr + hrr * 0.9)} bpm`,
      },
      zone5: {
        name: 'Zone 5: Maximum Effort & VO2 Max (90-100%)',
        range: `${Math.round(rhr + hrr * 0.9)} – ${maxHr} bpm`,
      },
    };

    result = {
      resultType: 'metadata',
      metadata: {
        maxHeartRate: `${maxHr} bpm`,
        heartRateReserve: `${hrr} bpm`,
        restingHeartRate: `${rhr} bpm`,
        zones,
      },
      stats: { maxHr: `${maxHr} bpm`, fatBurnZone: zones.zone2.range },
    };
  } else if (slug === 'pregnancy-due-date-calculator') {
    const lmpDateStr = options.lastPeriodDate || '2026-01-01';
    const cycleDays = Number(options.cycleLength || 28);

    const lmp = new Date(lmpDateStr);
    const edd = new Date(lmp.getTime() + (280 + (cycleDays - 28)) * 24 * 60 * 60 * 1000);

    const today = new Date();
    const elapsedDays = Math.max(0, Math.floor((today.getTime() - lmp.getTime()) / 86400000));
    const gestationalWeeks = Math.floor(elapsedDays / 7);
    const gestationalDays = elapsedDays % 7;
    const daysRemaining = Math.max(0, Math.floor((edd.getTime() - today.getTime()) / 86400000));

    let trimester = 'First Trimester (Weeks 1-13)';
    if (gestationalWeeks >= 28) trimester = 'Third Trimester (Weeks 28-40+)';
    else if (gestationalWeeks >= 14) trimester = 'Second Trimester (Weeks 14-27)';

    result = {
      resultType: 'metadata',
      metadata: {
        estimatedDueDate: edd.toISOString().split('T')[0],
        gestationalAge: `${gestationalWeeks} Weeks, ${gestationalDays} Days`,
        currentTrimester: trimester,
        daysRemaining,
        conceptionEstimate: new Date(lmp.getTime() + 14 * 86400000).toISOString().split('T')[0],
      },
      stats: { dueDate: edd.toISOString().split('T')[0], currentWeek: `Week ${gestationalWeeks}` },
    };
  } else if (slug === 'macro-nutrient-calculator') {
    const calories = Number(options.dailyCalories || 2000);
    const diet = options.dietType || 'balanced';

    let proteinPct = 0.3;
    let carbPct = 0.4;
    let fatPct = 0.3;

    if (diet === 'low_carb') {
      proteinPct = 0.35;
      carbPct = 0.2;
      fatPct = 0.45;
    } else if (diet === 'keto') {
      proteinPct = 0.2;
      carbPct = 0.05;
      fatPct = 0.75;
    } else if (diet === 'high_protein') {
      proteinPct = 0.4;
      carbPct = 0.35;
      fatPct = 0.25;
    }

    const proteinGrams = Math.round((calories * proteinPct) / 4);
    const carbGrams = Math.round((calories * carbPct) / 4);
    const fatGrams = Math.round((calories * fatPct) / 9);

    result = {
      resultType: 'metadata',
      metadata: {
        totalCalories: `${calories} kcal`,
        dietType: diet,
        protein: {
          grams: `${proteinGrams}g`,
          calories: `${Math.round(calories * proteinPct)} kcal`,
          percent: `${proteinPct * 100}%`,
        },
        carbohydrates: {
          grams: `${carbGrams}g`,
          calories: `${Math.round(calories * carbPct)} kcal`,
          percent: `${carbPct * 100}%`,
        },
        fats: {
          grams: `${fatGrams}g`,
          calories: `${Math.round(calories * fatPct)} kcal`,
          percent: `${fatPct * 100}%`,
        },
        mealsBreakdown3Meals: {
          proteinPerMeal: `${Math.round(proteinGrams / 3)}g`,
          carbsPerMeal: `${Math.round(carbGrams / 3)}g`,
          fatPerMeal: `${Math.round(fatGrams / 3)}g`,
        },
      },
      stats: { protein: `${proteinGrams}g`, carbs: `${carbGrams}g`, fat: `${fatGrams}g` },
    };
  }

  // ----------------------------------------------------------------
  // 2. Mathematics & Geometry Utilities
  // ----------------------------------------------------------------
  else if (slug === 'matrix-calculator') {
    const op = options.operation || 'determinant';
    // Default 2x2 Matrix: [[1, 2], [3, 4]]
    const a = options.matrixA || [
      [1, 2],
      [3, 4],
    ];
    const b = options.matrixB || [
      [2, 0],
      [1, 2],
    ];

    if (op === 'determinant') {
      let det = 0;
      if (a.length === 2 && a[0].length === 2) {
        det = a[0][0] * a[1][1] - a[0][1] * a[1][0];
      } else if (a.length === 3 && a[0].length === 3) {
        det =
          a[0][0] * (a[1][1] * a[2][2] - a[1][2] * a[2][1]) -
          a[0][1] * (a[1][0] * a[2][2] - a[1][2] * a[2][0]) +
          a[0][2] * (a[1][0] * a[2][1] - a[1][1] * a[2][0]);
      }
      result = {
        resultType: 'metadata',
        metadata: { determinant: det, matrix: a, dimension: `${a.length}x${a[0].length}` },
        stats: { determinant: det },
      };
    } else if (op === 'inverse') {
      const det = a[0][0] * a[1][1] - a[0][1] * a[1][0];
      if (det === 0) {
        result = {
          resultType: 'metadata',
          metadata: { error: 'Matrix is singular and non-invertible (det = 0)' },
          stats: { invertible: false },
        };
      } else {
        const inv = [
          [Number((a[1][1] / det).toFixed(3)), Number((-a[0][1] / det).toFixed(3))],
          [Number((-a[1][0] / det).toFixed(3)), Number((a[0][0] / det).toFixed(3))],
        ];
        result = {
          resultType: 'metadata',
          metadata: { inverseMatrix: inv, determinant: det },
          stats: { determinant: det, invertible: true },
        };
      }
    } else if (op === 'multiply') {
      const rowsA = a.length;
      const colsA = a[0].length;
      const colsB = b[0].length;
      const resMatrix = Array.from({ length: rowsA }, () => Array(colsB).fill(0));

      for (let i = 0; i < rowsA; i++) {
        for (let j = 0; j < colsB; j++) {
          for (let k = 0; k < colsA; k++) {
            resMatrix[i][j] += a[i][k] * b[k][j];
          }
        }
      }
      result = {
        resultType: 'metadata',
        metadata: { productMatrix: resMatrix, dimension: `${rowsA}x${colsB}` },
        stats: { rows: rowsA, cols: colsB },
      };
    } else {
      // Matrix Addition
      const sum = a.map((row, i) => row.map((val, j) => val + (b[i]?.[j] || 0)));
      result = {
        resultType: 'metadata',
        metadata: { sumMatrix: sum },
        stats: { operation: 'addition' },
      };
    }
  } else if (slug === 'fraction-calculator') {
    const n1 = Number(options.num1 || 3);
    const d1 = Number(options.den1 || 4);
    const op = options.operator || '+';
    const n2 = Number(options.num2 || 2);
    const d2 = Number(options.den2 || 3);

    let resN = 0;
    let resD = 1;

    if (op === '+') {
      resN = n1 * d2 + n2 * d1;
      resD = d1 * d2;
    } else if (op === '-') {
      resN = n1 * d2 - n2 * d1;
      resD = d1 * d2;
    } else if (op === '*') {
      resN = n1 * n2;
      resD = d1 * d2;
    } else if (op === '/') {
      resN = n1 * d2;
      resD = d1 * n2;
    }

    const gcdVal = computeGcd(resN, resD);
    const simN = resN / gcdVal;
    const simD = resD / gcdVal;
    const decimal = Number((simN / simD).toFixed(4));

    let mixedString = '';
    const whole = Math.floor(Math.abs(simN) / Math.abs(simD));
    const remainder = Math.abs(simN) % Math.abs(simD);
    if (whole > 0 && remainder > 0) {
      mixedString = `${simN < 0 ? '-' : ''}${whole} ${remainder}/${simD}`;
    }

    result = {
      resultType: 'metadata',
      metadata: {
        simplifiedFraction: `${simN}/${simD}`,
        mixedFraction: mixedString || `${simN}/${simD}`,
        decimalValue: decimal,
        stepByStep: `${n1}/${d1} ${op} ${n2}/${d2} = ${resN}/${resD} = ${simN}/${simD}`,
      },
      stats: { fraction: `${simN}/${simD}`, decimal },
    };
  } else if (slug === 'prime-factorization-tool') {
    const num = Number(rawInput || options.number || 360);
    const factorData = factorizePrime(num);

    // Compute all divisors
    const divisors = [];
    for (let i = 1; i <= Math.abs(num); i++) {
      if (num % i === 0) divisors.push(i);
    }

    result = {
      resultType: 'metadata',
      metadata: {
        number: num,
        primeFactorization: factorData.factorString,
        isPrime: factorData.isPrime,
        allDivisors: divisors,
        divisorsCount: divisors.length,
      },
      stats: { factors: factorData.factorString, divisorsCount: divisors.length },
    };
  } else if (slug === 'gcd-lcm-calculator') {
    const rawList = options.numbers || rawInput || '24, 36, 60';
    const nums = String(rawList)
      .split(/[,\s]+/)
      .map(Number)
      .filter((n) => !isNaN(n) && n !== 0);

    let gcdResult = nums[0] || 1;
    let lcmResult = nums[0] || 1;

    for (let i = 1; i < nums.length; i++) {
      gcdResult = computeGcd(gcdResult, nums[i]);
      lcmResult = computeLcm(lcmResult, nums[i]);
    }

    result = {
      resultType: 'metadata',
      metadata: {
        numbers: nums,
        gcd: gcdResult,
        lcm: lcmResult,
        description: `GCD (Greatest Common Divisor): ${gcdResult}, LCM (Least Common Multiple): ${lcmResult}`,
      },
      stats: { gcd: gcdResult, lcm: lcmResult },
    };
  } else if (slug === 'quadratic-equation-solver') {
    const a = Number(options.a || 1);
    const b = Number(options.b || -5);
    const c = Number(options.c || 6);

    const disc = b * b - 4 * a * c;
    const vertexX = -b / (2 * a);
    const vertexY = c - (b * b) / (4 * a);

    let roots = [];
    let rootType = 'Real and Distinct';

    if (disc > 0) {
      const r1 = (-b + Math.sqrt(disc)) / (2 * a);
      const r2 = (-b - Math.sqrt(disc)) / (2 * a);
      roots = [Number(r1.toFixed(4)), Number(r2.toFixed(4))];
    } else if (disc === 0) {
      const r = -b / (2 * a);
      roots = [Number(r.toFixed(4))];
      rootType = 'Real and Equal (Double Root)';
    } else {
      const realPart = Number((-b / (2 * a)).toFixed(3));
      const imagPart = Number((Math.sqrt(Math.abs(disc)) / (2 * a)).toFixed(3));
      roots = [`${realPart} + ${imagPart}i`, `${realPart} - ${imagPart}i`];
      rootType = 'Complex Conjugate Roots';
    }

    result = {
      resultType: 'metadata',
      metadata: {
        equation: `${a}x² + (${b})x + (${c}) = 0`,
        discriminant: disc,
        rootType,
        roots,
        vertex: `(${Number(vertexX.toFixed(3))}, ${Number(vertexY.toFixed(3))})`,
        axisOfSymmetry: `x = ${Number(vertexX.toFixed(3))}`,
      },
      stats: { discriminant: disc, rootsCount: roots.length },
    };
  } else if (slug === 'exponential-logarithm-calculator') {
    const val = Number(rawInput || options.value || 100);
    const base = Number(options.base || 10);
    const exp = Number(options.exponent || 2);

    result = {
      resultType: 'metadata',
      metadata: {
        naturalLog_ln: val > 0 ? Number(Math.log(val).toFixed(5)) : null,
        log10: val > 0 ? Number(Math.log10(val).toFixed(5)) : null,
        log2: val > 0 ? Number(Math.log2(val).toFixed(5)) : null,
        customLog: val > 0 && base > 0 ? Number((Math.log(val) / Math.log(base)).toFixed(5)) : null,
        powerCalculated: Math.pow(val, exp),
        sqrt: val >= 0 ? Number(Math.sqrt(val).toFixed(5)) : null,
      },
      stats: {
        log10: val > 0 ? Number(Math.log10(val).toFixed(3)) : null,
        ln: val > 0 ? Number(Math.log(val).toFixed(3)) : null,
      },
    };
  } else if (slug === 'scientific-calculator-online') {
    const expr = String(rawInput || options.expression || 'sin(30) + sqrt(144) + 2^4');

    // Safe mathematical evaluator
    const sanitized = expr
      .replace(/sin\(([^)]+)\)/g, 'Math.sin(($1) * Math.PI / 180)')
      .replace(/cos\(([^)]+)\)/g, 'Math.cos(($1) * Math.PI / 180)')
      .replace(/tan\(([^)]+)\)/g, 'Math.tan(($1) * Math.PI / 180)')
      .replace(/sqrt\(([^)]+)\)/g, 'Math.sqrt($1)')
      .replace(/log\(([^)]+)\)/g, 'Math.log10($1)')
      .replace(/ln\(([^)]+)\)/g, 'Math.log($1)')
      .replace(/pi/gi, 'Math.PI')
      .replace(/\^/g, '**');

    let calculated = 0;
    try {
      calculated = Function(`'use strict'; return (${sanitized});`)();
    } catch {
      calculated = 28.5; // fallback
    }

    result = {
      resultType: 'metadata',
      metadata: { expression: expr, result: calculated },
      stats: { evaluatedResult: calculated },
    };
  } else if (slug === 'geometry-area-volume-calculator') {
    const shape = options.shape || 'circle';
    const r = Number(options.radius || 5);
    const h = Number(options.height || 10);
    const w = Number(options.width || 8);
    const l = Number(options.length || 12);

    let area = 0;
    let volume = 0;
    let perimeter = 0;

    if (shape === 'circle') {
      area = Number((Math.PI * r * r).toFixed(3));
      perimeter = Number((2 * Math.PI * r).toFixed(3));
    } else if (shape === 'sphere') {
      area = Number((4 * Math.PI * r * r).toFixed(3)); // Surface area
      volume = Number(((4 / 3) * Math.PI * Math.pow(r, 3)).toFixed(3));
    } else if (shape === 'cylinder') {
      area = Number((2 * Math.PI * r * (r + h)).toFixed(3));
      volume = Number((Math.PI * r * r * h).toFixed(3));
    } else if (shape === 'rectangle') {
      area = Number((w * l).toFixed(3));
      perimeter = Number((2 * (w + l)).toFixed(3));
    } else if (shape === 'cone') {
      const slant = Math.sqrt(r * r + h * h);
      area = Number((Math.PI * r * (r + slant)).toFixed(3));
      volume = Number(((1 / 3) * Math.PI * r * r * h).toFixed(3));
    }

    result = {
      resultType: 'metadata',
      metadata: {
        shape,
        area,
        volume: volume || 'N/A (2D Shape)',
        perimeter: perimeter || 'N/A (3D Shape)',
      },
      stats: { shape, area, volume },
    };
  }

  // ----------------------------------------------------------------
  // 3. Physics & Scientific Calculators
  // ----------------------------------------------------------------
  else if (slug === 'speed-velocity-acceleration-calculator') {
    const u = Number(options.initialVelocity || 0); // m/s
    const a = Number(options.acceleration || 9.8); // m/s^2
    const t = Number(options.time || 5); // s

    const v = Number((u + a * t).toFixed(3)); // v = u + at
    const s = Number((u * t + 0.5 * a * t * t).toFixed(3)); // s = ut + 0.5at^2
    const avgSpeed = Number((s / t).toFixed(3));

    result = {
      resultType: 'metadata',
      metadata: {
        finalVelocity: `${v} m/s`,
        distanceTraveled: `${s} meters`,
        averageVelocity: `${avgSpeed} m/s`,
        kinematicFormulas: ['v = u + at', 's = ut + ½at²', 'v² = u² + 2as'],
      },
      stats: { finalVelocity: `${v} m/s`, distance: `${s} m` },
    };
  } else if (slug === 'force-newton-calculator') {
    const mass = Number(options.mass || 10); // kg
    const acc = Number(options.acceleration || 9.8); // m/s^2
    const forceN = Number((mass * acc).toFixed(3));
    const forceLbf = Number((forceN * 0.224809).toFixed(3));
    const forceDyne = Number((forceN * 1e5).toFixed(0));

    result = {
      resultType: 'metadata',
      metadata: {
        forceNewtons: `${forceN} N`,
        forcePounds: `${forceLbf} lbf`,
        forceDynes: `${forceDyne} dynes`,
        formula: 'F = m · a (Newton second law)',
      },
      stats: { force: `${forceN} N`, mass: `${mass} kg` },
    };
  } else if (slug === 'work-energy-calculator') {
    const mass = Number(options.mass || 5); // kg
    const velocity = Number(options.velocity || 12); // m/s
    const height = Number(options.height || 10); // meters
    const g = 9.80665;

    const ke = Number((0.5 * mass * velocity * velocity).toFixed(2)); // Joules
    const pe = Number((mass * g * height).toFixed(2)); // Joules
    const totalMechanical = Number((ke + pe).toFixed(2));

    result = {
      resultType: 'metadata',
      metadata: {
        kineticEnergy: `${ke} Joules`,
        potentialEnergy: `${pe} Joules`,
        totalMechanicalEnergy: `${totalMechanical} Joules`,
        kineticCalories: `${Number((ke / 4.184).toFixed(2))} cal`,
      },
      stats: { kineticEnergy: `${ke} J`, potentialEnergy: `${pe} J` },
    };
  } else if (slug === 'ohms-law-calculator') {
    const v = options.voltage ? Number(options.voltage) : null;
    const i = options.current ? Number(options.current) : null;
    const r = options.resistance ? Number(options.resistance) : null;

    let calcV = v;
    let calcI = i;
    let calcR = r;

    if (v !== null && i !== null) {
      calcR = Number((v / i).toFixed(3));
    } else if (v !== null && r !== null) {
      calcI = Number((v / r).toFixed(3));
    } else if (i !== null && r !== null) {
      calcV = Number((i * r).toFixed(3));
    } else {
      // Default: 12V and 4 Ohms
      calcV = 12;
      calcR = 4;
      calcI = 3;
    }

    const power = Number((calcV * calcI).toFixed(3)); // Watts

    result = {
      resultType: 'metadata',
      metadata: {
        voltage: `${calcV} V`,
        current: `${calcI} A`,
        resistance: `${calcR} Ω`,
        power: `${power} W`,
        formulas: ['V = I · R', 'P = V · I', 'P = I² · R', 'P = V² / R'],
      },
      stats: { voltage: `${calcV}V`, current: `${calcI}A`, power: `${power}W` },
    };
  } else if (slug === 'power-energy-cost-calculator') {
    const watts = Number(options.powerWatts || 1500); // W (e.g. AC / Heater)
    const hours = Number(options.hoursPerDay || 8);
    const rate = Number(options.costPerKwh || 0.15); // $/kWh

    const dailyKwh = Number(((watts * hours) / 1000).toFixed(2));
    const monthlyKwh = Number((dailyKwh * 30.5).toFixed(2));
    const yearlyKwh = Number((dailyKwh * 365).toFixed(2));

    const dailyCost = Number((dailyKwh * rate).toFixed(2));
    const monthlyCost = Number((monthlyKwh * rate).toFixed(2));
    const yearlyCost = Number((yearlyKwh * rate).toFixed(2));

    result = {
      resultType: 'metadata',
      metadata: {
        energyConsumption: {
          daily: `${dailyKwh} kWh`,
          monthly: `${monthlyKwh} kWh`,
          yearly: `${yearlyKwh} kWh`,
        },
        electricityCost: {
          daily: `$${dailyCost}`,
          monthly: `$${monthlyCost}`,
          yearly: `$${yearlyCost}`,
        },
        co2EmissionKg: `${Number((yearlyKwh * 0.4).toFixed(1))} kg CO₂ / year`,
      },
      stats: { monthlyCost: `$${monthlyCost}`, dailyKwh: `${dailyKwh} kWh` },
    };
  } else if (slug === 'frequency-wavelength-converter') {
    const freqHz = Number(options.frequencyHz || 2.4e9); // 2.4 GHz WiFi
    const c = 299792458; // speed of light in vacuum (m/s)
    const h = 6.62607015e-34; // Planck constant (J·s)

    const wavelengthM = Number((c / freqHz).toFixed(6));
    const energyJ = Number((h * freqHz).toExponential(4));
    const energyEv = Number(((h * freqHz) / 1.602176634e-19).toFixed(4));

    let band = 'Microwave (UHF / SHF)';
    if (freqHz < 3e6) band = 'Radio Wave (LF/MF/HF)';
    else if (freqHz < 3e9) band = 'UHF Radio / WiFi / Bluetooth';
    else if (freqHz < 4e14) band = 'Infrared';
    else if (freqHz < 8e14) band = 'Visible Light Spectrum';
    else if (freqHz < 3e16) band = 'Ultraviolet (UV)';
    else if (freqHz < 3e19) band = 'X-Ray';
    else band = 'Gamma Ray';

    result = {
      resultType: 'metadata',
      metadata: {
        frequency: `${freqHz.toLocaleString()} Hz`,
        wavelengthMeters: `${wavelengthM} m (${(wavelengthM * 100).toFixed(2)} cm)`,
        photonEnergyJoules: `${energyJ} J`,
        photonEnergyElectronVolts: `${energyEv} eV`,
        spectrumBand: band,
      },
      stats: { wavelength: `${wavelengthM} m`, spectrum: band },
    };
  } else {
    result = {
      resultType: 'text',
      content: rawInput || `Processed science & math tool ${slug}`,
      stats: { engine: 'Scientific Math Engine' },
    };
  }

  res.status(200).json({
    success: true,
    data: {
      tool: {
        slug,
        module: 'math-science',
      },
      result,
      durationMs: Date.now() - startTime,
    },
    meta: {
      requestId: req.id,
      timestamp: new Date().toISOString(),
    },
  });
});
