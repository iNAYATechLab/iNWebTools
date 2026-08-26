# Phase 9 — Health & Fitness, Pure Mathematics, Geometry & Physics Utilities

## 1. Executive Summary
Phase 9 delivers **24 high-precision scientific, mathematical, physical, and medical computation engines** for **iNWebTools**. With Phase 9 fully integrated, the platform now hosts **242 production-ready tools** across **10 distinct specialized modules**.

---

## 2. Phase 9 Tool Catalog (24 Tools)

### 2.1 Health & Fitness Calculators (10 Tools)
| Slug | Tool Name | Core Engine / Formula | Default Output |
|---|---|---|---|
| `bmi-calculator` | BMI (Body Mass Index) Calculator | WHO classification ($BMI = \frac{kg}{m^2}$), BMI Prime, healthy range | JSON / Metadata |
| `bmr-calculator` | BMR (Basal Metabolic Rate) Calculator | Mifflin-St Jeor & Revised Harris-Benedict baseline metabolic burn | JSON / Metadata |
| `body-fat-percentage-calculator` | Body Fat Percentage Calculator | US Navy circumference method for fat mass & lean mass | JSON / Metadata |
| `ideal-body-weight-calculator` | Ideal Body Weight (IBW) Calculator | Devine, Robinson, Miller, and Hamwi medical consensus formulas | JSON / Metadata |
| `waist-to-height-hip-ratio-calculator` | Waist-to-Height/Hip Ratio Calculator | Visceral fat distribution (WHR/WHtR) and cardiovascular risk metrics | JSON / Metadata |
| `daily-calorie-intake-calculator` | Daily Calorie Intake Calculator | TDEE energy expenditure, mild/extreme deficit/surplus timelines | JSON / Metadata |
| `water-intake-calculator` | Daily Water Intake Calculator | Mass, exercise duration, and climate-adjusted hydration volumes | JSON / Metadata |
| `target-heart-rate-calculator` | Target Heart Rate Calculator | Karvonen HRR formula and 5 aerobic/anaerobic intensity training zones | JSON / Metadata |
| `pregnancy-due-date-calculator` | Pregnancy Due Date Calculator | Naegele's rule for EDD, gestational age in weeks/days, and trimesters | JSON / Metadata |
| `macro-nutrient-calculator` | Macro Nutrient Calculator | Protein, Carbohydrate, and Fat gram distributions by diet protocol | JSON / Metadata |

### 2.2 Mathematics & Geometry Utilities (8 Tools)
| Slug | Tool Name | Core Engine / Formula | Default Output |
|---|---|---|---|
| `matrix-calculator` | Matrix Calculator | 2x2 & 3x3 Determinant ($\det A$), Inversion ($A^{-1}$), Product ($A \times B$), Transpose | JSON / Metadata |
| `fraction-calculator` | Fraction Calculator & Simplifier | Arithmetic ($+, -, \times, \div$), lowest term GCD simplification & mixed fractions | JSON / Metadata |
| `prime-factorization-tool` | Prime Factorization & Divisor Finder | Canonical prime exponent tree factorization & complete divisor list | JSON / Metadata |
| `gcd-lcm-calculator` | GCD & LCM Calculator | Step-by-step Euclidean algorithm for multi-integer sets | JSON / Metadata |
| `quadratic-equation-solver` | Quadratic Equation Solver | Discriminant ($\Delta = b^2 - 4ac$), real/complex roots, vertex & axis | JSON / Metadata |
| `exponential-logarithm-calculator` | Exponential & Logarithm Calculator | Natural log ($\ln$), $\log_{10}$, $\log_2$, custom base logs, powers ($x^y$), roots | JSON / Metadata |
| `scientific-calculator-online` | Scientific Calculator Online | Interactive keypad (sin, cos, tan, rad/deg, factorial, constants $\pi, e$) | JSON / Metadata |
| `geometry-area-volume-calculator` | Geometry Area, Volume & Perimeter | 2D/3D shapes: Circle, Sphere, Cylinder, Rectangle, Cone, Pyramid | JSON / Metadata |

### 2.3 Physics & Scientific Calculators (6 Tools)
| Slug | Tool Name | Core Engine / Formula | Default Output |
|---|---|---|---|
| `speed-velocity-acceleration-calculator` | Speed, Velocity & Acceleration Calculator | Kinematics equations ($v = u + at$, $s = ut + \frac{1}{2}at^2$, $v^2 = u^2 + 2as$) | JSON / Metadata |
| `force-newton-calculator` | Force ($F=ma$) & Newton Calculator | Newton's 2nd Law in Newtons (N), dynes, pounds-force (lbf), and momentum | JSON / Metadata |
| `work-energy-calculator` | Work & Energy Calculator | Kinetic Energy ($E_k = \frac{1}{2}mv^2$) and Potential Energy ($E_p = mgh$) | JSON / Metadata |
| `ohms-law-calculator` | Ohm's Law Calculator | Voltage ($V=IR$), Current ($I$), Resistance ($R$), and Power ($P=VI$) | JSON / Metadata |
| `power-energy-cost-calculator` | Electricity Power & Energy Cost | kWh consumption, daily/monthly/annual electricity cost & CO₂ footprint | JSON / Metadata |
| `frequency-wavelength-converter` | Frequency to Wavelength Converter | $\lambda = \frac{c}{f}$, photon energy in Joules/eV, EM spectrum band classification | JSON / Metadata |

---

## 3. Architecture & Verification
- **Backend Controller:** `WebApplication/server/controllers/tools/scienceMathController.js`
- **Registry & Routing:** `WebApplication/server/config/toolsRegistry.json` & `WebApplication/server/routes/tools.routes.js`
- **Frontend Hub & Workbench:** `WebApplication/client/src/components/tools/ScienceMath/`
  - `ScienceMathExplorer.tsx`
  - `ScienceMathToolView.tsx`
  - `BmiVisualGauge.tsx`
  - `ScientificKeypad.tsx`
  - `MatrixWorkbench.tsx`
  - `KinematicsFormulaCard.tsx`
- **Automated Tests:** 256 passed (183 server + 73 client across 22 test files).
- **TypeScript & ESLint:** 0 errors, 0 warnings.
- **Total Tools Active:** 242 tools across 10 modules.
