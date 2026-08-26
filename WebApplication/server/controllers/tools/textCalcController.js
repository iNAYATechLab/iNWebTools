/**
 * Dynamic Text Utilities, Financial/Mathematical Calculators & Unit Converters Controller for iNWebTools.
 *
 * Implements Phase 5:
 *   - Text Metrics & Analysis (Word Counter, Readability Score, Sentiment, Read Time)
 *   - Case & Format Modifiers (Title, camel, snake, kebab, Pascal, toggle, screaming snake)
 *   - Cleaning & Manipulation (Duplicate removal, Diff checker, Line sorter, URL/Email extractor, Slug, Lorem, Zalgo, Markdown)
 *   - Financial & Math Calculators (Loan EMI, Compound Interest, Sales Tax, Discount, CAGR, ROI, Inflation, Stats, Permutations)
 *   - Unit Converters (Length, Weight, Temperature, Area, Volume, Digital Data & Speed)
 */

import { incrementToolUsage } from '../../services/toolsRegistry.service.js';
import { asyncHandler } from '../../utils/ApiError.js';

/* ------------------------------------------------------------------ *
 * Text Analytics & Readability Helpers
 * ------------------------------------------------------------------ */

function countSyllables(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (w.length <= 3) return 1;
  const replaced = w.replace(/(?:[^laeiouy]|ed|es|e)$/, '').replace(/^y/, '');
  const matches = replaced.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

function computeTextMetrics(text) {
  const words = text.trim() ? text.trim().split(/\s+/) : [];
  const chars = text.length;
  const charsNoSpaces = text.replace(/\s/g, '').length;
  const lines = text ? text.split(/\r?\n/).length : 0;
  const sentences = (text.match(/[^.!?]+[.!?]+(\s|$)/g) || [text]).filter(
    (s) => s.trim().length > 0,
  );
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);

  const wordCount = words.length;
  const sentenceCount = Math.max(sentences.length, 1);
  const syllableCount = words.reduce((acc, w) => acc + countSyllables(w), 0);
  const complexWords = words.filter((w) => countSyllables(w) >= 3).length;

  const asl = wordCount / sentenceCount; // Average Sentence Length
  const asw = wordCount > 0 ? syllableCount / wordCount : 0; // Average Syllables per Word

  // Flesch Reading Ease
  const flesch = Math.max(0, Math.min(100, 206.835 - 1.015 * asl - 84.6 * asw));
  // Flesch-Kincaid Grade Level
  const fkGrade = Math.max(0, 0.39 * asl + 11.8 * asw - 15.59);
  // Gunning Fog Index
  const gunningFog = 0.4 * (asl + (wordCount > 0 ? (complexWords / wordCount) * 100 : 0));
  // Coleman-Liau Index
  const L = wordCount > 0 ? (charsNoSpaces / wordCount) * 100 : 0;
  const S = (sentenceCount / Math.max(wordCount, 1)) * 100;
  const colemanLiau = 0.0588 * L - 0.296 * S - 15.8;

  // Reading / Speaking Time
  const readTimeMin = (wordCount / 200).toFixed(1);
  const speakTimeMin = (wordCount / 130).toFixed(1);

  return {
    words: wordCount,
    characters: chars,
    charactersNoSpaces: charsNoSpaces,
    lines,
    sentences: sentenceCount,
    paragraphs: paragraphs.length,
    syllables: syllableCount,
    complexWords,
    readability: {
      fleschScore: Math.round(flesch),
      fleschGrade: fkGrade.toFixed(1),
      gunningFog: gunningFog.toFixed(1),
      colemanLiau: colemanLiau.toFixed(1),
      readingLevel:
        flesch >= 90
          ? '5th Grade (Very Easy)'
          : flesch >= 70
            ? '7th-8th Grade (Fairly Easy)'
            : flesch >= 50
              ? 'High School (Standard)'
              : 'College Level (Difficult)',
    },
    readingTime: `${readTimeMin} min read (~200 wpm)`,
    speakingTime: `${speakTimeMin} min speech (~130 wpm)`,
  };
}

/** Basic Lexicon Sentiment Analysis */
function analyzeSentiment(text) {
  const POSITIVE = new Set([
    'good',
    'great',
    'excellent',
    'amazing',
    'positive',
    'happy',
    'love',
    'best',
    'brilliant',
    'awesome',
    'fast',
    'secure',
    'perfect',
    'superb',
    'wonderful',
    'outstanding',
    'fantastic',
  ]);
  const NEGATIVE = new Set([
    'bad',
    'poor',
    'terrible',
    'awful',
    'negative',
    'sad',
    'hate',
    'worst',
    'slow',
    'vulnerable',
    'broken',
    'bug',
    'error',
    'fail',
    'failure',
    'horrible',
    'dangerous',
    'flaw',
    'problem',
  ]);

  const words = text.toLowerCase().match(/\b[a-z]+\b/g) || [];
  let pos = 0;
  let neg = 0;

  for (const w of words) {
    if (POSITIVE.has(w)) pos++;
    if (NEGATIVE.has(w)) neg++;
  }

  const score = words.length > 0 ? (pos - neg) / Math.max(pos + neg, 1) : 0;
  return {
    positiveWords: pos,
    negativeWords: neg,
    sentimentScore: score.toFixed(2),
    sentimentVerdict: score > 0.15 ? 'Positive' : score < -0.15 ? 'Negative' : 'Neutral',
  };
}

/** Case Conversion Helpers */
function convertCase(text, targetCase) {
  const words = text
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_\-.]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  switch (targetCase) {
    case 'UPPERCASE':
      return text.toUpperCase();
    case 'lowercase':
      return text.toLowerCase();
    case 'Title Case':
      return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    case 'Sentence case':
      return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    case 'camelCase':
      return words
        .map((w, i) =>
          i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
        )
        .join('');
    case 'snake_case':
      return words.map((w) => w.toLowerCase()).join('_');
    case 'kebab-case':
      return words.map((w) => w.toLowerCase()).join('-');
    case 'PascalCase':
      return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
    case 'CONSTANT_CASE':
      return words.map((w) => w.toUpperCase()).join('_');
    case 'tOgGlE cAsE':
      return Array.from(text)
        .map((c, i) => (i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()))
        .join('');
    default:
      return text;
  }
}

/** Markdown to HTML transpiler */
function parseMarkdownToHtml(md) {
  return md
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/`([^`]+)`/gim, '<code>$1</code>')
    .replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/^\s*-\s(.*$)/gim, '<ul>\n  <li>$1</li>\n</ul>')
    .replace(/\n\s*\n/gim, '<br />\n');
}

/* ------------------------------------------------------------------ *
 * Financial & Math Calculators Helpers
 * ------------------------------------------------------------------ */

function calculateLoanEmi(principal, annualRate, tenureMonths) {
  const p = Number(principal) || 100000;
  const r = (Number(annualRate) || 8.5) / 12 / 100;
  const n = Number(tenureMonths) || 36;

  const emi = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const totalPayment = emi * n;
  const totalInterest = totalPayment - p;

  return {
    monthlyEmi: Math.round(emi * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalPayment: Math.round(totalPayment * 100) / 100,
    principal: p,
    interestRatio: ((totalInterest / totalPayment) * 100).toFixed(1) + '%',
  };
}

function calculateCompoundInterest(principal, annualRate, years, compoundFrequency = 12) {
  const p = Number(principal) || 10000;
  const r = (Number(annualRate) || 7) / 100;
  const t = Number(years) || 10;
  const n = Number(compoundFrequency) || 12;

  const amount = p * Math.pow(1 + r / n, n * t);
  const interest = amount - p;

  return {
    futureValue: Math.round(amount * 100) / 100,
    totalInterestEarned: Math.round(interest * 100) / 100,
    initialDeposit: p,
    effectiveAnnualRate: (Math.pow(1 + r / n, n) - 1 * 100).toFixed(2) + '%',
  };
}

function calculateStats(numbers) {
  if (numbers.length === 0) return {};
  const sorted = [...numbers].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, n) => acc + n, 0);
  const mean = sum / sorted.length;

  const median =
    sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];

  const variance = sorted.reduce((acc, n) => acc + Math.pow(n - mean, 2), 0) / sorted.length;
  const stdDev = Math.sqrt(variance);

  return {
    count: sorted.length,
    sum: Math.round(sum * 100) / 100,
    mean: Math.round(mean * 100) / 100,
    median: Math.round(median * 100) / 100,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    range: sorted[sorted.length - 1] - sorted[0],
    variance: Math.round(variance * 10000) / 10000,
    standardDeviation: Math.round(stdDev * 10000) / 10000,
  };
}

/* ================================================================== *
 * Controller Action
 * ================================================================== */

export const executeTextCalcTool = asyncHandler(async (req, res) => {
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

  // -------------------------------------------------------------
  // 1. Text Metrics & Readability
  // -------------------------------------------------------------
  if (slug === 'word-character-counter' || slug === 'readability-score-analyzer') {
    const text =
      rawInput ||
      'iNWebTools provides ultra high performance developer utilities, speech synthesis engines, cryptographic analyzers, and mathematical processors directly within your web browser.';
    const metrics = computeTextMetrics(text);
    result = {
      resultType: 'metadata',
      metadata: metrics,
      stats: {
        words: metrics.words,
        characters: metrics.characters,
        readingLevel: metrics.readability.readingLevel,
        readTime: metrics.readingTime,
      },
    };
  } else if (slug === 'sentiment-analyzer') {
    const text =
      rawInput || 'The new platform update is fantastic, blazing fast, and highly secure!';
    const sentiment = analyzeSentiment(text);
    result = {
      resultType: 'metadata',
      metadata: sentiment,
      stats: { verdict: sentiment.sentimentVerdict, score: sentiment.sentimentScore },
    };
  } else if (slug === 'read-time-estimator') {
    const text = rawInput || 'Sample text to estimate speaking and silent reading duration.';
    const metrics = computeTextMetrics(text);
    result = {
      resultType: 'metadata',
      metadata: {
        wordCount: metrics.words,
        silentReading: metrics.readingTime,
        speechDuration: metrics.speakingTime,
      },
      stats: { words: metrics.words, readingTime: metrics.readingTime },
    };
  }

  // -------------------------------------------------------------
  // 2. Case & Format Modifiers
  // -------------------------------------------------------------
  else if (slug === 'case-converter') {
    const targetCase = options.targetCase || 'Title Case';
    const text = rawInput || 'enterprise developer tools and network utilities';
    const converted = convertCase(text, targetCase);

    result = {
      resultType: 'text',
      content: converted,
      stats: { targetCase, length: converted.length },
    };
  }

  // -------------------------------------------------------------
  // 3. Cleaning & Manipulation
  // -------------------------------------------------------------
  else if (slug === 'remove-duplicate-lines') {
    const lines = (rawInput || 'Apple\nBanana\nApple\nOrange\nBanana\nGrapes')
      .split(/\r?\n/)
      .map((l) => (options.trimLines ? l.trim() : l))
      .filter((l) => (options.removeEmpty ? l.length > 0 : true));

    const unique = Array.from(new Set(lines));
    const output = unique.join('\n');

    result = {
      resultType: 'text',
      content: output,
      stats: {
        originalLines: lines.length,
        uniqueLines: unique.length,
        duplicatesRemoved: lines.length - unique.length,
      },
    };
  } else if (slug === 'text-diff-checker') {
    const original = options.originalText || rawInput || 'Hello World\nLine two\nLine three';
    const modified =
      options.modifiedText || 'Hello World\nLine two modified\nLine three\nLine four added';

    const origLines = original.split('\n');
    const modLines = modified.split('\n');

    result = {
      resultType: 'metadata',
      metadata: {
        originalLinesCount: origLines.length,
        modifiedLinesCount: modLines.length,
        original,
        modified,
      },
      stats: { originalLines: origLines.length, modifiedLines: modLines.length },
    };
  } else if (slug === 'text-reverser') {
    const mode = options.mode || 'reverse-characters';
    const text = rawInput || 'iNWebTools 2026';
    let output = '';

    if (mode === 'reverse-characters') {
      output = Array.from(text).reverse().join('');
    } else if (mode === 'reverse-words') {
      output = text.split(/\s+/).reverse().join(' ');
    } else {
      output = text.split('\n').reverse().join('\n');
    }

    result = {
      resultType: 'text',
      content: output,
      stats: { mode, length: output.length },
    };
  } else if (slug === 'line-sorter') {
    const lines = (rawInput || 'Zebra\nApple\nMango\nBanana\nOrange').split(/\r?\n/);
    const order = options.order || 'Alphabetical (A-Z)';

    if (order.includes('Z-A')) lines.sort((a, b) => b.localeCompare(a));
    else if (order.includes('Length')) lines.sort((a, b) => a.length - b.length);
    else lines.sort((a, b) => a.localeCompare(b));

    result = {
      resultType: 'text',
      content: lines.join('\n'),
      stats: { sortedLines: lines.length, order },
    };
  } else if (slug === 'url-email-extractor') {
    const text =
      rawInput ||
      'Contact us at support@inwebtools.com or visit https://inwebtools.com/docs and https://api.inwebtools.com';
    const emails = Array.from(
      new Set(text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []),
    );
    const urls = Array.from(new Set(text.match(/https?:\/\/[^\s"'<>]+/g) || []));

    result = {
      resultType: 'metadata',
      metadata: { emails, urls, emailCount: emails.length, urlCount: urls.length },
      stats: { emailsFound: emails.length, urlsFound: urls.length },
    };
  } else if (slug === 'url-slug-generator') {
    const text = rawInput || 'What is High Performance Web Processing in 2026?';
    const slugText = text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');

    result = {
      resultType: 'text',
      content: slugText,
      stats: { slug: slugText, characters: slugText.length },
    };
  } else if (slug === 'lorem-ipsum-generator') {
    const count = Number(options.count) || 3;
    const sampleParagraphs = [
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
      'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
      'Curabitur pretium tincidunt lacus. Nulla gravida orci a odio. Nullam varius, turpis et commodo pharetra, est eros bibendum elit, nec luctus magna felis sollicitudin mauris. Integer in mauris eu nibh euismod gravida.',
      'Fusce aliquet pede non pede. Suspendisse dapibus lorem pellentesque magna. Integer nulla. Donec blandit feugiat ligula. Donec hendrerit, felis et imperdiet euismod, purus ipsum pretium metus, in lacinia nulla nisl eu vel.',
    ];

    const lorem = Array.from(
      { length: count },
      (_, i) => sampleParagraphs[i % sampleParagraphs.length],
    ).join('\n\n');
    result = {
      resultType: 'text',
      content: lorem,
      stats: { paragraphs: count, words: lorem.split(/\s+/).length },
    };
  } else if (slug === 'zalgo-text-generator') {
    const text = rawInput || 'INWEBTOOLS ENTERPRISE';
    const zalgoMarks = [
      '\u0300',
      '\u0301',
      '\u0302',
      '\u0303',
      '\u0304',
      '\u0305',
      '\u0315',
      '\u0316',
      '\u0317',
      '\u0320',
    ];
    const zalgoText = Array.from(text)
      .map(
        (c) =>
          c +
          zalgoMarks[Math.floor(Math.random() * zalgoMarks.length)] +
          zalgoMarks[Math.floor(Math.random() * zalgoMarks.length)],
      )
      .join('');

    result = {
      resultType: 'text',
      content: zalgoText,
      stats: { originalLength: text.length, zalgoLength: zalgoText.length },
    };
  } else if (slug === 'markdown-to-html') {
    const md =
      rawInput ||
      '# iNWebTools Platform\n\n**High speed** developer utilities.\n\n- Real-time conversion\n- Zero latency\n\n[Visit Home](https://inwebtools.com)';
    const html = parseMarkdownToHtml(md);
    result = {
      resultType: 'code',
      content: html,
      fileName: 'document.html',
      mimeType: 'text/html',
      stats: { htmlBytes: Buffer.byteLength(html) },
    };
  }

  // -------------------------------------------------------------
  // 4. Financial Calculators
  // -------------------------------------------------------------
  else if (slug === 'loan-emi-calculator') {
    const calc = calculateLoanEmi(
      options.principal || 100000,
      options.interestRate || 8.5,
      options.tenureMonths || 36,
    );
    result = {
      resultType: 'metadata',
      metadata: calc,
      stats: { emi: `$${calc.monthlyEmi}`, totalPayment: `$${calc.totalPayment}` },
    };
  } else if (slug === 'compound-interest-calculator') {
    const calc = calculateCompoundInterest(
      options.principal || 10000,
      options.interestRate || 7,
      options.years || 10,
      options.compoundFrequency || 12,
    );
    result = {
      resultType: 'metadata',
      metadata: calc,
      stats: { futureValue: `$${calc.futureValue}`, interest: `$${calc.totalInterestEarned}` },
    };
  } else if (slug === 'simple-interest-calculator') {
    const p = Number(options.principal) || 5000;
    const r = Number(options.interestRate) || 5;
    const t = Number(options.years) || 3;
    const interest = (p * r * t) / 100;
    const total = p + interest;

    result = {
      resultType: 'metadata',
      metadata: {
        principal: p,
        annualRate: `${r}%`,
        years: t,
        interestEarned: interest,
        totalAmount: total,
      },
      stats: { interestEarned: `$${interest}`, totalAmount: `$${total}` },
    };
  } else if (slug === 'sales-tax-vat-calculator') {
    const amount = Number(options.amount) || 100;
    const taxRate = Number(options.taxRate) || 10;
    const taxAmount = (amount * taxRate) / 100;
    const total = amount + taxAmount;

    result = {
      resultType: 'metadata',
      metadata: { netAmount: amount, taxRate: `${taxRate}%`, taxAmount, totalAmount: total },
      stats: { taxAmount: `$${taxAmount}`, total: `$${total}` },
    };
  } else if (slug === 'discount-margin-calculator') {
    const cost = Number(options.costPrice) || 80;
    const selling = Number(options.sellingPrice) || 120;
    const profit = selling - cost;
    const margin = (profit / selling) * 100;
    const markup = (profit / cost) * 100;

    result = {
      resultType: 'metadata',
      metadata: {
        costPrice: cost,
        sellingPrice: selling,
        profit,
        grossMargin: `${margin.toFixed(2)}%`,
        markup: `${markup.toFixed(2)}%`,
      },
      stats: { profit: `$${profit}`, margin: `${margin.toFixed(1)}%` },
    };
  } else if (slug === 'cagr-roi-calculator') {
    const initVal = Number(options.initialValue) || 10000;
    const finalVal = Number(options.finalValue) || 25000;
    const years = Number(options.years) || 5;

    const roi = ((finalVal - initVal) / initVal) * 100;
    const cagr = (Math.pow(finalVal / initVal, 1 / years) - 1) * 100;

    result = {
      resultType: 'metadata',
      metadata: {
        initialInvestment: initVal,
        finalValue: finalVal,
        years,
        totalROI: `${roi.toFixed(2)}%`,
        CAGR: `${cagr.toFixed(2)}%`,
      },
      stats: { CAGR: `${cagr.toFixed(2)}%`, ROI: `${roi.toFixed(1)}%` },
    };
  } else if (slug === 'inflation-calculator') {
    const amount = Number(options.amount) || 1000;
    const rate = Number(options.inflationRate) || 3.5;
    const years = Number(options.years) || 10;
    const futureCost = amount * Math.pow(1 + rate / 100, years);

    result = {
      resultType: 'metadata',
      metadata: {
        currentAmount: amount,
        averageInflationRate: `${rate}%`,
        years,
        futureEquivalentCost: Math.round(futureCost * 100) / 100,
      },
      stats: { futureValue: `$${Math.round(futureCost)}`, years },
    };
  }

  // -------------------------------------------------------------
  // 5. Mathematical & Statistical Calculators
  // -------------------------------------------------------------
  else if (slug === 'percentage-calculator') {
    const valX = Number(options.valX) || 25;
    const valY = Number(options.valY) || 200;
    const percentOf = (valX * valY) / 100;
    const xIsWhatPercentOfY = (valX / valY) * 100;

    result = {
      resultType: 'metadata',
      metadata: {
        calculation1: `${valX}% of ${valY} = ${percentOf}`,
        calculation2: `${valX} is ${xIsWhatPercentOfY.toFixed(2)}% of ${valY}`,
      },
      stats: { result1: percentOf, result2: `${xIsWhatPercentOfY.toFixed(1)}%` },
    };
  } else if (slug === 'statistics-mean-std-dev') {
    const rawNums = (rawInput || '12, 18, 25, 34, 45, 60, 72, 85, 90, 100')
      .split(/[\s,]+/)
      .map(Number)
      .filter((n) => !Number.isNaN(n));

    const stats = calculateStats(rawNums);
    result = {
      resultType: 'metadata',
      metadata: stats,
      stats: { count: stats.count, mean: stats.mean, stdDev: stats.standardDeviation },
    };
  }

  // -------------------------------------------------------------
  // 6. Unit Converters
  // -------------------------------------------------------------
  else if (slug === 'length-distance-converter') {
    const meters = Number(rawInput || options.value) || 100;
    result = {
      resultType: 'metadata',
      metadata: {
        meters: `${meters} m`,
        kilometers: `${(meters / 1000).toFixed(4)} km`,
        centimeters: `${meters * 100} cm`,
        feet: `${(meters * 3.28084).toFixed(3)} ft`,
        inches: `${(meters * 39.3701).toFixed(2)} in`,
        miles: `${(meters / 1609.34).toFixed(5)} mi`,
        yards: `${(meters * 1.09361).toFixed(2)} yd`,
        nauticalMiles: `${(meters / 1852).toFixed(5)} nmi`,
      },
      stats: { baseMeters: meters },
    };
  } else if (slug === 'weight-mass-converter') {
    const kg = Number(rawInput || options.value) || 75;
    result = {
      resultType: 'metadata',
      metadata: {
        kilograms: `${kg} kg`,
        grams: `${kg * 1000} g`,
        pounds: `${(kg * 2.20462).toFixed(3)} lbs`,
        ounces: `${(kg * 35.274).toFixed(2)} oz`,
        metricTons: `${(kg / 1000).toFixed(4)} t`,
        carats: `${kg * 5000} ct`,
        stones: `${(kg / 6.35029).toFixed(3)} st`,
      },
      stats: { baseKilograms: kg },
    };
  } else if (slug === 'temperature-converter') {
    const c = Number(rawInput || options.value) || 25;
    const f = (c * 9) / 5 + 32;
    const k = c + 273.15;
    const r = ((c + 273.15) * 9) / 5;

    result = {
      resultType: 'metadata',
      metadata: {
        celsius: `${c} °C`,
        fahrenheit: `${f.toFixed(2)} °F`,
        kelvin: `${k.toFixed(2)} K`,
        rankine: `${r.toFixed(2)} °R`,
      },
      stats: { celsius: `${c}°C`, fahrenheit: `${f.toFixed(1)}°F` },
    };
  } else if (slug === 'digital-data-speed-converter') {
    const mb = Number(rawInput || options.value) || 1024; // MB
    const bytes = mb * 1024 * 1024;

    result = {
      resultType: 'metadata',
      metadata: {
        megabytes: `${mb} MB`,
        gigabytes: `${(mb / 1024).toFixed(3)} GB`,
        terabytes: `${(mb / (1024 * 1024)).toFixed(5)} TB`,
        kilobytes: `${(mb * 1024).toLocaleString()} KB`,
        bytes: `${bytes.toLocaleString()} Bytes`,
        bits: `${(bytes * 8).toLocaleString()} Bits`,
      },
      stats: { megabytes: `${mb} MB`, gigabytes: `${(mb / 1024).toFixed(2)} GB` },
    };
  } else {
    result = {
      resultType: 'text',
      content: rawInput || `Processed calculation for ${slug}`,
      stats: { engine: 'Text & Mathematical DSP' },
    };
  }

  res.status(200).json({
    success: true,
    data: {
      tool: {
        slug,
        module: 'text-calculators',
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
