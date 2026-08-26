import fs from 'fs';

const reg = JSON.parse(
  fs.readFileSync('WebApplication/server/config/toolsRegistry.json', 'utf8'),
);

// 1. Fix module IDs
reg.modules = reg.modules.map((m) => {
  if (!m.id) m.id = m.slug;
  return m;
});

// Add math-science module if not present
if (!reg.modules.some((m) => m.slug === 'math-science')) {
  reg.modules.push({
    id: 'math-science',
    name: 'Health, Mathematics & Scientific Utilities',
    nameBn: 'স্বাস্থ্য, গণিত ও বৈজ্ঞানিক ক্যালকুলেটর',
    slug: 'math-science',
    categorySlug: 'calculators-unit-converters',
    description:
      'Comprehensive health & fitness metrics, pure mathematics, algebra & geometry engines, and physics scientific formula calculators.',
    descriptionBn:
      'স্বাস্থ্য ও ফিটনেস মেট্রিক্স, বীজগণিত, জ্যামিতি ক্যালকুলেটর এবং পদার্থবিজ্ঞানের বৈজ্ঞানিক সূত্র।',
  });
}

const newTools = [
  // 1. Health & Fitness
  {
    name: 'BMI (Body Mass Index) Calculator',
    nameBn: 'বিএমআই (বডি মাস ইনডেক্স) ক্যালকুলেটর',
    slug: 'bmi-calculator',
    module: 'math-science',
    categorySlug: 'calculators-unit-converters',
    subcategorySlug: 'financial-mathematical-calculators',
    description:
      'Calculates Body Mass Index with WHO classification, BMI prime, and healthy weight range.',
    descriptionBn: 'WHO মানদণ্ড অনুযায়ী বিএমআই, সুস্থ ওজন সীমা ও স্বাস্থ্য ঝুঁকি নির্ণয় করুন।',
    icon: 'activity',
    isFeatured: true,
    inputFormats: ['form', 'json'],
    defaultOutput: 'json',
  },
  {
    name: 'BMR (Basal Metabolic Rate) Calculator',
    nameBn: 'বিএমআর (বেসাল মেটাবলিক রেট) ক্যালকুলেটর',
    slug: 'bmr-calculator',
    module: 'math-science',
    categorySlug: 'calculators-unit-converters',
    subcategorySlug: 'financial-mathematical-calculators',
    description:
      'Calculates basal metabolic calorie burn using Mifflin-St Jeor and Revised Harris-Benedict formulas.',
    descriptionBn:
      'মিফলিন ও হ্যারিস-বেনেডিক্ট সূত্রে বিশ্রামে দৈনিক ক্যালরি বার্ন হিসাব করুন।',
    icon: 'zap',
    isFeatured: true,
    inputFormats: ['form', 'json'],
    defaultOutput: 'json',
  },
  {
    name: 'Body Fat Percentage Calculator',
    nameBn: 'বডি ফ্যাট পার্সেন্টেজ ক্যালকুলেটর',
    slug: 'body-fat-percentage-calculator',
    module: 'math-science',
    categorySlug: 'calculators-unit-converters',
    subcategorySlug: 'financial-mathematical-calculators',
    description:
      'Estimates total body fat percentage, fat mass, and lean mass via US Navy circumference method.',
    descriptionBn:
      'ইউএস নেভি পদ্ধতিতে সঠিক বডি ফ্যাট, চর্বি ও চর্বিহীন পেশির ওজন নির্ণয়।',
    icon: 'user',
    isFeatured: false,
    inputFormats: ['form', 'json'],
    defaultOutput: 'json',
  },
  {
    name: 'Ideal Body Weight (IBW) Calculator',
    nameBn: 'আইডিয়াল বডি ওয়েট (আদর্শ ওজন) ক্যালকুলেটর',
    slug: 'ideal-body-weight-calculator',
    module: 'math-science',
    categorySlug: 'calculators-unit-converters',
    subcategorySlug: 'financial-mathematical-calculators',
    description:
      'Calculates ideal target body weight across Devine, Robinson, Miller, and Hamwi medical formulas.',
    descriptionBn:
      'ডিভাইন, রবিনসন ও মিলার চিকিৎসা ফর্মুলায় আপনার উচ্চতার আদর্শ ওজন জানুন।',
    icon: 'heart',
    isFeatured: false,
    inputFormats: ['form', 'json'],
    defaultOutput: 'json',
  },
  {
    name: 'Waist-to-Height & Hip Ratio Calculator',
    nameBn: 'কোমর-উচ্চতা ও কোমর-নিতম্ব অনুপাত ক্যালকুলেটর',
    slug: 'waist-to-height-hip-ratio-calculator',
    module: 'math-science',
    categorySlug: 'calculators-unit-converters',
    subcategorySlug: 'financial-mathematical-calculators',
    description:
      'Evaluates visceral fat distribution, WHR and WHtR for cardiovascular health risk scoring.',
    descriptionBn:
      'হৃদরোগ ও ডায়াবেটিস ঝুঁকি নির্ণয়ে কোমর ও নিতম্বের বৈজ্ঞানিক অনুপাত পরীক্ষা।',
    icon: 'activity',
    isFeatured: false,
    inputFormats: ['form', 'json'],
    defaultOutput: 'json',
  },
  {
    name: 'Daily Calorie Intake Calculator',
    nameBn: 'দৈনিক ক্যালরি গ্রহণ ক্যালকুলেটর',
    slug: 'daily-calorie-intake-calculator',
    module: 'math-science',
    categorySlug: 'calculators-unit-converters',
    subcategorySlug: 'financial-mathematical-calculators',
    description:
      'Computes Total Daily Energy Expenditure (TDEE) and calorie deficits/surpluses for weight management.',
    descriptionBn:
      'ওজন হ্রাস বা বৃদ্ধির জন্য দৈনিক প্রয়োজনীয় ক্যালরি ও টিডিইই নির্ধারণ করুন।',
    icon: 'pie-chart',
    isFeatured: true,
    inputFormats: ['form', 'json'],
    defaultOutput: 'json',
  },
  {
    name: 'Daily Water Intake Calculator',
    nameBn: 'দৈনিক পানি পানের পরিমাণ ক্যালকুলেটর',
    slug: 'water-intake-calculator',
    module: 'math-science',
    categorySlug: 'calculators-unit-converters',
    subcategorySlug: 'financial-mathematical-calculators',
    description:
      'Calculates optimal daily hydration in liters, fluid ounces, and glasses based on body mass and exercise.',
    descriptionBn:
      'ওজন, ব্যায়াম ও আবহাওয়া অনুযায়ী দৈনিক প্রয়োজনীয় পানির পরিমাণ হিসাব করুন।',
    icon: 'droplet',
    isFeatured: false,
    inputFormats: ['form', 'json'],
    defaultOutput: 'json',
  },
  {
    name: 'Target Heart Rate Calculator',
    nameBn: 'টার্গেট হার্ট রেট ও কার্ডিও জোন ক্যালকুলেটর',
    slug: 'target-heart-rate-calculator',
    module: 'math-science',
    categorySlug: 'calculators-unit-converters',
    subcategorySlug: 'financial-mathematical-calculators',
    description:
      'Calculates maximum heart rate, heart rate reserve, and 5 Karvonen training intensity zones.',
    descriptionBn:
      'কার্বোনেন ফর্মুলায় ফ্যাট বার্নিং, কার্ডিও ও পিক পারফরম্যান্সের হার্ট রেট জোন।',
    icon: 'heart',
    isFeatured: false,
    inputFormats: ['form', 'json'],
    defaultOutput: 'json',
  },
  {
    name: 'Pregnancy Due Date Calculator',
    nameBn: 'গর্ভধারণ প্রসবের সম্ভাব্য তারিখ ক্যালকুলেটর',
    slug: 'pregnancy-due-date-calculator',
    module: 'math-science',
    categorySlug: 'calculators-unit-converters',
    subcategorySlug: 'financial-mathematical-calculators',
    description:
      'Estimates expected delivery date (EDD), gestational age, and trimester timeline via Naegele rule.',
    descriptionBn:
      'নেগেলস নিয়মে সম্ভাব্য প্রসব তারিখ, বর্তমান সপ্তাহ ও ট্রাইমেস্টার হিসাব।',
    icon: 'calendar',
    isFeatured: false,
    inputFormats: ['form', 'json'],
    defaultOutput: 'json',
  },
  {
    name: 'Macro Nutrient Calculator (Carbs, Protein, Fat)',
    nameBn: 'ম্যাক্রোনিউট্রিয়েন্ট (প্রোটিন, কার্ব, ফ্যাট) ক্যালকুলেটর',
    slug: 'macro-nutrient-calculator',
    module: 'math-science',
    categorySlug: 'calculators-unit-converters',
    subcategorySlug: 'financial-mathematical-calculators',
    description:
      'Breaks down target calories into protein, carbohydrates, and fats across balanced, keto, and high-protein diets.',
    descriptionBn:
      'ব্যালান্সড, কিটো ও হাই-প্রোটিন ডায়েটের জন্য গ্রাম ও ক্যালরিভিত্তিক ম্যাক্রো বিভাজন।',
    icon: 'layers',
    isFeatured: false,
    inputFormats: ['form', 'json'],
    defaultOutput: 'json',
  },

  // 2. Mathematics & Geometry
  {
    name: 'Matrix Calculator (Addition, Multiply, Determinant, Inverse)',
    nameBn: 'ম্যাট্রিক্স ক্যালকুলেটর (যোগ, গুণ, নির্ণায়ক, বিপরীত)',
    slug: 'matrix-calculator',
    module: 'math-science',
    categorySlug: 'calculators-unit-converters',
    subcategorySlug: 'financial-mathematical-calculators',
    description:
      'Performs 2x2 and 3x3 matrix algebra, determinant, matrix multiplication, inversion, and transpose.',
    descriptionBn:
      '২x২ ও ৩x৩ ম্যাট্রিক্সের নির্ণায়ক, বিপরীত ম্যাট্রিক্স, গুণ ও যোগফল দ্রুত হিসাব।',
    icon: 'grid',
    isFeatured: true,
    inputFormats: ['form', 'json'],
    defaultOutput: 'json',
  },
  {
    name: 'Fraction Calculator & Simplifier',
    nameBn: 'ভগ্নাংশ ক্যালকুলেটর ও সরলীকরণ',
    slug: 'fraction-calculator',
    module: 'math-science',
    categorySlug: 'calculators-unit-converters',
    subcategorySlug: 'financial-mathematical-calculators',
    description:
      'Adds, subtracts, multiplies, divides fractions and simplifies to lowest terms with mixed fraction support.',
    descriptionBn:
      'ভগ্নাংশের যোগ-বিয়োগ, গুণ-ভাগ, মিশ্র ভগ্নাংশ এবং ধাপে ধাপে সরলীকরণ।',
    icon: 'divide',
    isFeatured: false,
    inputFormats: ['form', 'json'],
    defaultOutput: 'json',
  },
  {
    name: 'Prime Factorization & Factor Finder',
    nameBn: 'মৌলিক উৎপাদক ও উৎপাদক নির্ণায়ক',
    slug: 'prime-factorization-tool',
    module: 'math-science',
    categorySlug: 'calculators-unit-converters',
    subcategorySlug: 'financial-mathematical-calculators',
    description:
      'Decomposes any positive integer into its canonical prime factor exponents and lists all divisors.',
    descriptionBn:
      'যেকোনো সংখ্যার মৌলিক উৎপাদক বিশ্লেষণ, ঘাত প্রকাশ ও সকল ভাজক নির্ণয়।',
    icon: 'hash',
    isFeatured: false,
    inputFormats: ['form', 'json', 'text'],
    defaultOutput: 'json',
  },
  {
    name: 'GCD & LCM Calculator',
    nameBn: 'গসাগু (GCD) ও লসাগু (LCM) ক্যালকুলেটর',
    slug: 'gcd-lcm-calculator',
    module: 'math-science',
    categorySlug: 'calculators-unit-converters',
    subcategorySlug: 'financial-mathematical-calculators',
    description:
      'Computes Greatest Common Divisor and Least Common Multiple for multiple numbers via Euclidean method.',
    descriptionBn:
      'ইউক্লিডীয় পদ্ধতিতে একাধিক সংখ্যার গরিষ্ঠ সাধারণ গুণনীয়ক ও লঘিষ্ঠ সাধারণ গুণিতক।',
    icon: 'cpu',
    isFeatured: false,
    inputFormats: ['form', 'json', 'text'],
    defaultOutput: 'json',
  },
  {
    name: 'Quadratic Equation Solver',
    nameBn: 'দ্বিঘাত সমীকরণ সমাধানকারী',
    slug: 'quadratic-equation-solver',
    module: 'math-science',
    categorySlug: 'calculators-unit-converters',
    subcategorySlug: 'financial-mathematical-calculators',
    description:
      'Solves ax² + bx + c = 0 providing discriminant, real/complex roots, parabola vertex, and axis of symmetry.',
    descriptionBn:
      'দ্বিঘাত সমীকরণের নিশ্চয়ক, বাস্তব ও জটিল মূল এবং প্যারাবোলার শীর্ষবিন্দু সমাধান।',
    icon: 'code',
    isFeatured: true,
    inputFormats: ['form', 'json'],
    defaultOutput: 'json',
  },
  {
    name: 'Exponential & Logarithm Calculator',
    nameBn: 'সূচক ও লগারিদম ক্যালকুলেটর',
    slug: 'exponential-logarithm-calculator',
    module: 'math-science',
    categorySlug: 'calculators-unit-converters',
    subcategorySlug: 'financial-mathematical-calculators',
    description:
      'Computes natural logarithm (ln), log10, log2, custom base logs, exponential powers, and nth roots.',
    descriptionBn:
      'ন্যাচারাল লগ (ln), ডেসিমাল লগ (log10), বাইনারি লগ, সূচকীয় ঘাত ও বর্গমূল হিসাব।',
    icon: 'trending-up',
    isFeatured: false,
    inputFormats: ['form', 'json'],
    defaultOutput: 'json',
  },
  {
    name: 'Scientific Calculator Online',
    nameBn: 'অনলাইন সায়েন্টিফিক ক্যালকুলেটর',
    slug: 'scientific-calculator-online',
    module: 'math-science',
    categorySlug: 'calculators-unit-converters',
    subcategorySlug: 'financial-mathematical-calculators',
    description:
      'Interactive full scientific calculator with trigonometric, hyperbolic, logarithmic, and power functions.',
    descriptionBn:
      'ত্রিকোণমিতিক, হাইপারবোলিক, রুট ও বৈজ্ঞানিক সমীকরণ সমাধানের ইন্টারেক্টিভ ক্যালকুলেটর।',
    icon: 'calculator',
    isFeatured: true,
    inputFormats: ['form', 'text'],
    defaultOutput: 'json',
  },
  {
    name: 'Geometry Area, Volume & Perimeter Calculator',
    nameBn: 'জ্যামিতি ক্ষেত্রফল, আয়তন ও পরিসীমা ক্যালকুলেটর',
    slug: 'geometry-area-volume-calculator',
    module: 'math-science',
    categorySlug: 'calculators-unit-converters',
    subcategorySlug: 'financial-mathematical-calculators',
    description:
      'Calculates area, surface area, perimeter, and volume for Circle, Sphere, Cylinder, Rectangle, Cone, and Pyramid.',
    descriptionBn:
      'বৃত্ত, গোলক, বেলন, শঙ্কু ও আয়তক্ষেত্রের ক্ষেত্রফল, পরিসীমা ও আয়তন সূত্রায়ন।',
    icon: 'box',
    isFeatured: true,
    inputFormats: ['form', 'json'],
    defaultOutput: 'json',
  },

  // 3. Physics & Scientific Calculators
  {
    name: 'Speed, Velocity & Acceleration Calculator',
    nameBn: 'গতি, বেগ ও ত্বরণ ক্যালকুলেটর',
    slug: 'speed-velocity-acceleration-calculator',
    module: 'math-science',
    categorySlug: 'calculators-unit-converters',
    subcategorySlug: 'unit-converters',
    description:
      'Solves kinematics equations (v = u + at, s = ut + ½at²) for velocity, displacement, time, and acceleration.',
    descriptionBn:
      'গতিবিদ্যা সূত্র ব্যবহার করে গতিবেগ, সরণ, সময় ও ত্বরণ সমাধান করুন।',
    icon: 'navigation',
    isFeatured: true,
    inputFormats: ['form', 'json'],
    defaultOutput: 'json',
  },
  {
    name: 'Force (F=ma) & Newton Calculator',
    nameBn: 'বল (F=ma) ও নিউটন ক্যালকুলেটর',
    slug: 'force-newton-calculator',
    module: 'math-science',
    categorySlug: 'calculators-unit-converters',
    subcategorySlug: 'unit-converters',
    description:
      "Calculates force in Newtons, dynes, and pounds-force using Newton's second law of motion.",
    descriptionBn:
      'ভর ও ত্বরণ থেকে বল (নিউটন, ডাইন, পাউন্ড-বল) এবং ভরবেগ গণনা করুন।',
    icon: 'target',
    isFeatured: false,
    inputFormats: ['form', 'json'],
    defaultOutput: 'json',
  },
  {
    name: 'Work & Energy (Kinetic & Potential) Calculator',
    nameBn: 'কাজ ও শক্তি (গতিশক্তি ও স্থিতিশক্তি) ক্যালকুলেটর',
    slug: 'work-energy-calculator',
    module: 'math-science',
    categorySlug: 'calculators-unit-converters',
    subcategorySlug: 'unit-converters',
    description:
      'Calculates mechanical work, kinetic energy (½mv²), gravitational potential energy (mgh), and calories.',
    descriptionBn:
      'যান্ত্রিক কাজ, গতিশক্তি এবং মহাকর্ষীয় বিভব শক্তি হিসাব করুন।',
    icon: 'sun',
    isFeatured: false,
    inputFormats: ['form', 'json'],
    defaultOutput: 'json',
  },
  {
    name: "Ohm's Law (Voltage, Current, Resistance) Calculator",
    nameBn: 'ওহমের সূত্র (ভোল্টেজ, কারেন্ট, রোধ) ক্যালকুলেটর',
    slug: 'ohms-law-calculator',
    module: 'math-science',
    categorySlug: 'calculators-unit-converters',
    subcategorySlug: 'financial-mathematical-calculators',
    description:
      "Calculates electrical voltage (V), current (A), resistance (Ω), and electrical power (W) via Ohm's law.",
    descriptionBn:
      'বৈদ্যুতিক বর্তনীর ভোল্টেজ, বিদ্যুৎ প্রবাহ, রোধ এবং ওয়াট শক্তি হিসাব করুন।',
    icon: 'zap',
    isFeatured: true,
    inputFormats: ['form', 'json'],
    defaultOutput: 'json',
  },
  {
    name: 'Power & Electricity Energy Cost Calculator',
    nameBn: 'বিদ্যুৎ বিল ও শক্তি খরচ ক্যালকুলেটর',
    slug: 'power-energy-cost-calculator',
    module: 'math-science',
    categorySlug: 'calculators-unit-converters',
    subcategorySlug: 'financial-mathematical-calculators',
    description:
      'Calculates electrical appliance kWh consumption, daily/monthly/annual power costs, and CO₂ footprint.',
    descriptionBn:
      'বৈদ্যুতিক সরঞ্জামের ওয়াট খরচ, মাসিক বিদ্যুৎ বিল এবং কার্বন নিঃসরণ অনুমান।',
    icon: 'dollar-sign',
    isFeatured: false,
    inputFormats: ['form', 'json'],
    defaultOutput: 'json',
  },
  {
    name: 'Frequency to Wavelength Converter',
    nameBn: 'কম্পাঙ্ক থেকে তরঙ্গদৈর্ঘ্য রূপান্তরকারী',
    slug: 'frequency-wavelength-converter',
    module: 'math-science',
    categorySlug: 'calculators-unit-converters',
    subcategorySlug: 'unit-converters',
    description:
      'Converts electromagnetic frequency to wavelength (λ = c/f), photon energy in eV/Joules, and EM spectrum band.',
    descriptionBn:
      'তড়িচ্চৌম্বক তরঙ্গের কম্পাঙ্ক থেকে তরঙ্গদৈর্ঘ্য, ফোটন শক্তি ও বর্ণালী নির্ধারণ।',
    icon: 'radio',
    isFeatured: false,
    inputFormats: ['form', 'json'],
    defaultOutput: 'json',
  },
];

const existingSlugs = new Set(reg.tools.map((t) => t.slug));
for (const t of newTools) {
  if (!existingSlugs.has(t.slug)) {
    reg.tools.push(t);
  }
}

fs.writeFileSync(
  'WebApplication/server/config/toolsRegistry.json',
  JSON.stringify(reg, null, 2),
  'utf8',
);
console.log(
  'Updated toolsRegistry.json! Total tools:',
  reg.tools.length,
  'Modules:',
  reg.modules.length,
);
