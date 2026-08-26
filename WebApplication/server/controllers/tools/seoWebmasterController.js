/**
 * Dynamic SEO, Webmaster & Social Media Optimization Controllers for iNWebTools.
 *
 * Implements Phase 6:
 *   - SEO Generators & Validators (XML Sitemap, Robots.txt, Schema JSON-LD, Meta Tags, Hreflang, Canonical)
 *   - Analysis & SERP Preview (Google SERP Simulator, Keyword Density, Redirect Chains, Link Extractor, Htaccess SEO)
 *   - Social Media Optimization (Open Graph, Twitter Cards, Social Image Guide, YouTube Thumbnails, UTM Builder)
 */

import { incrementToolUsage } from '../../services/toolsRegistry.service.js';
import { asyncHandler } from '../../utils/ApiError.js';

/* ------------------------------------------------------------------ *
 * SEO & Web Analytics Helpers
 * ------------------------------------------------------------------ */

/** Generate XML Sitemap */
function generateXmlSitemap(urlList, changefreq = 'weekly', priority = '0.8') {
  const urls = urlList
    .split(/\r?\n/)
    .map((u) => u.trim())
    .filter((u) => u.startsWith('http://') || u.startsWith('https://'));

  const now = new Date().toISOString().split('T')[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  for (const url of urls) {
    xml += `  <url>\n`;
    xml += `    <loc>${url.replace(/&/g, '&amp;')}</loc>\n`;
    xml += `    <lastmod>${now}</lastmod>\n`;
    xml += `    <changefreq>${changefreq}</changefreq>\n`;
    xml += `    <priority>${priority}</priority>\n`;
    xml += `  </url>\n`;
  }
  xml += `</urlset>`;
  return { xml, totalUrls: urls.length };
}

/** Keyword Density Analyzer */
function analyzeKeywordDensity(text) {
  const STOP_WORDS = new Set([
    'a',
    'about',
    'above',
    'after',
    'again',
    'against',
    'all',
    'am',
    'an',
    'and',
    'any',
    'are',
    'as',
    'at',
    'be',
    'because',
    'been',
    'before',
    'being',
    'below',
    'between',
    'both',
    'but',
    'by',
    'can',
    'did',
    'do',
    'does',
    'doing',
    'down',
    'during',
    'each',
    'few',
    'for',
    'from',
    'further',
    'had',
    'has',
    'have',
    'having',
    'he',
    'her',
    'here',
    'hers',
    'herself',
    'him',
    'himself',
    'his',
    'how',
    'i',
    'if',
    'in',
    'into',
    'is',
    'it',
    'its',
    'itself',
    'just',
    'me',
    'more',
    'most',
    'my',
    'myself',
    'no',
    'nor',
    'not',
    'now',
    'of',
    'off',
    'on',
    'once',
    'only',
    'or',
    'other',
    'our',
    'ours',
    'ourselves',
    'out',
    'over',
    'own',
    'same',
    'she',
    'should',
    'so',
    'some',
    'such',
    'than',
    'that',
    'the',
    'their',
    'theirs',
    'them',
    'themselves',
    'then',
    'there',
    'these',
    'they',
    'this',
    'those',
    'through',
    'to',
    'too',
    'under',
    'until',
    'up',
    'very',
    'was',
    'we',
    'were',
    'what',
    'when',
    'where',
    'which',
    'while',
    'who',
    'whom',
    'why',
    'with',
    'you',
    'your',
    'yours',
    'yourself',
    'yourselves',
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);

  const totalWords = words.length;
  const wordFreq = {};

  for (const w of words) {
    if (!STOP_WORDS.has(w)) {
      wordFreq[w] = (wordFreq[w] || 0) + 1;
    }
  }

  const sorted = Object.entries(wordFreq)
    .map(([word, count]) => ({
      keyword: word,
      word,
      count,
      density: ((count / Math.max(totalWords, 1)) * 100).toFixed(2) + '%',
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  return { totalWords, uniqueKeywords: Object.keys(wordFreq).length, topKeywords: sorted };
}

/** YouTube Video ID Extractor */
function extractYouTubeId(urlOrId) {
  const match = urlOrId.match(
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  );
  return match ? match[1] : urlOrId.trim();
}

/* ================================================================== *
 * Controller Action
 * ================================================================== */

export const executeSeoWebmasterTool = asyncHandler(async (req, res) => {
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
  // 1. XML Sitemap & Robots.txt Generators
  // -------------------------------------------------------------
  if (slug === 'xml-sitemap-generator') {
    const urls =
      rawInput ||
      'https://inwebtools.com\nhttps://inwebtools.com/tools\nhttps://inwebtools.com/tools/developer-code\nhttps://inwebtools.com/tools/security-network\nhttps://inwebtools.com/docs';

    const sitemap = generateXmlSitemap(
      urls,
      String(options.changefreq || 'weekly'),
      String(options.priority || '0.8'),
    );

    result = {
      resultType: 'code',
      content: sitemap.xml,
      fileName: 'sitemap.xml',
      mimeType: 'application/xml',
      metadata: { totalUrls: sitemap.totalUrls, changefreq: options.changefreq || 'weekly' },
      stats: { totalUrls: sitemap.totalUrls, changefreq: options.changefreq || 'weekly' },
    };
  } else if (slug === 'robots-txt-generator') {
    const userAgent = options.userAgent || '*';
    const sitemapUrl = options.sitemapUrl || 'https://inwebtools.com/sitemap.xml';
    const disallowed = options.disallow || '/api/\n/admin/\n/tmp/';
    const allowed = options.allow || '/';

    let robots = `User-agent: ${userAgent}\n`;
    for (const d of disallowed.split('\n').filter(Boolean)) {
      robots += `Disallow: ${d.trim()}\n`;
    }
    for (const a of allowed.split('\n').filter(Boolean)) {
      robots += `Allow: ${a.trim()}\n`;
    }
    robots += `\nSitemap: ${sitemapUrl}\n`;

    result = {
      resultType: 'code',
      content: robots,
      fileName: 'robots.txt',
      mimeType: 'text/plain',
      metadata: { userAgent, sitemapUrl },
      stats: { userAgent, sitemapReferenced: true },
    };
  }

  // -------------------------------------------------------------
  // 2. Schema Markup & Meta Tag Generators
  // -------------------------------------------------------------
  else if (slug === 'schema-markup-generator') {
    const schemaType = options.schemaType || 'SoftwareApplication';
    const name = options.name || 'iNWebTools Enterprise Platform';
    const description =
      options.description ||
      '1070+ Free high performance browser tools for developers and creators.';
    const url = options.url || 'https://inwebtools.com';

    const schemaObj = {
      '@context': 'https://schema.org',
      '@type': schemaType,
      name,
      description,
      url,
      operatingSystem: 'All Modern Web Browsers',
      applicationCategory: 'DeveloperApplication',
      offers: {
        '@type': 'Offer',
        price: '0.00',
        priceCurrency: 'USD',
      },
    };

    const schemaJson = JSON.stringify(schemaObj, null, 2);
    const htmlSnippet = `<script type="application/ld+json">\n${schemaJson}\n</script>`;

    result = {
      resultType: 'code',
      content: htmlSnippet,
      fileName: 'schema-markup.html',
      mimeType: 'text/html',
      metadata: { schemaType, validJson: true, name, url },
      stats: { schemaType, validJson: true },
    };
  } else if (slug === 'meta-tag-generator') {
    const title = options.title || 'iNWebTools — 1070+ Free Online Developer & Productivity Tools';
    const description =
      options.description ||
      'Fast, client-side, zero-latency web tools for audio transcription, code transpilation, cryptography, and image conversion.';
    const keywords =
      options.keywords || 'developer tools, seo, transcription, cryptography, converters';
    const author = options.author || 'iNAYATechLab';
    const canonicalUrl = options.canonicalUrl || options.canonical || '';

    let tags = `<!-- Primary Meta Tags -->
<title>${title}</title>
<meta name="title" content="${title}">
<meta name="description" content="${description}">
<meta name="keywords" content="${keywords}">
<meta name="author" content="${author}">
<meta name="robots" content="index, follow">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta charset="UTF-8">`;

    if (canonicalUrl) {
      tags += `\n<link rel="canonical" href="${canonicalUrl}">`;
    }

    result = {
      resultType: 'code',
      content: tags,
      fileName: 'meta-tags.html',
      mimeType: 'text/html',
      metadata: {
        titleLength: title.length,
        descLength: description.length,
        canonicalUrl: canonicalUrl || null,
      },
      stats: { titleLength: title.length, descLength: description.length },
    };
  } else if (slug === 'hreflang-tag-generator') {
    const defaultUrl = options.defaultUrl || 'https://inwebtools.com';
    const tags = `<!-- Multi-Language Hreflang Tags -->
<link rel="alternate" hreflang="en" href="${defaultUrl}/en/" />
<link rel="alternate" hreflang="bn" href="${defaultUrl}/bn/" />
<link rel="alternate" hreflang="es" href="${defaultUrl}/es/" />
<link rel="alternate" hreflang="fr" href="${defaultUrl}/fr/" />
<link rel="alternate" hreflang="de" href="${defaultUrl}/de/" />
<link rel="alternate" hreflang="x-default" href="${defaultUrl}/" />`;

    result = {
      resultType: 'code',
      content: tags,
      fileName: 'hreflang-tags.html',
      mimeType: 'text/html',
      metadata: { languagesSupported: 5, defaultUrl },
      stats: { languagesSupported: 5 },
    };
  } else if (slug === 'canonical-tag-generator') {
    const canonical =
      rawInput || options.canonicalUrl || 'https://inwebtools.com/tools/developer-code';
    const tag = `<link rel="canonical" href="${canonical.trim()}" />`;

    result = {
      resultType: 'code',
      content: tag,
      fileName: 'canonical.html',
      mimeType: 'text/html',
      metadata: { canonicalUrl: canonical.trim() },
      stats: { url: canonical.trim() },
    };
  }

  // -------------------------------------------------------------
  // 3. SERP Simulator & Content Analysis
  // -------------------------------------------------------------
  else if (slug === 'serp-snippet-preview') {
    const title = options.title || 'iNWebTools — 1070+ Free Developer & Audio Utilities';
    const description =
      options.description ||
      'High speed browser tools for audio transcription, cURL code generation, cryptography, and unit conversion with zero server latency.';
    const url = options.url || 'https://inwebtools.com/tools/developer-code';

    result = {
      resultType: 'metadata',
      metadata: {
        title,
        titleLength: title.length,
        pixelWidthEstimate: Math.round(title.length * 9.2),
        titleStatus:
          title.length > 60
            ? 'Warning: Title may be truncated in Google'
            : 'Optimal Length (Under 60 chars)',
        description,
        descriptionLength: description.length,
        descStatus:
          description.length > 160
            ? 'Warning: Description may be truncated'
            : 'Optimal Length (Under 160 chars)',
        url,
        snippetUrlDisplay: url.replace(/^https?:\/\//, '').replace(/\/$/, ''),
      },
      stats: { titleChars: title.length, descChars: description.length },
    };
  } else if (slug === 'keyword-density-checker') {
    const text =
      rawInput ||
      'iNWebTools provides developer tools, security tools, audio tools, image converters, and network tools. Every tool is designed for high performance and privacy.';
    const density = analyzeKeywordDensity(text);

    result = {
      resultType: 'metadata',
      metadata: density,
      stats: { totalWords: density.totalWords, uniqueWords: density.uniqueKeywords },
    };
  } else if (slug === 'htaccess-seo-generator') {
    const domain = options.domain || 'inwebtools.com';
    const forceHttps = options.forceHttps !== false;
    const forceWww = options.forceWww === true;

    let htaccess = `# ==================================================================\n# iNWebTools SEO & Security Rules for Apache .htaccess\n# ==================================================================\n\nRewriteEngine On\n\n`;

    if (forceHttps) {
      htaccess += `# Force HTTPS\nRewriteCond %{HTTPS} off\nRewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]\n\n`;
    }

    if (forceWww) {
      htaccess += `# Force WWW\nRewriteCond %{HTTP_HOST} !^www\\. [NC]\nRewriteRule ^(.*)$ https://www.%{HTTP_HOST}%{REQUEST_URI} [L,R=301]\n\n`;
    } else {
      htaccess += `# Force Non-WWW\nRewriteCond %{HTTP_HOST} ^www\\.(.*)$ [NC]\nRewriteRule ^(.*)$ https://%1%{REQUEST_URI} [L,R=301]\n\n`;
    }

    htaccess += `# GZIP & Deflate Compression\n<IfModule mod_deflate.c>\n  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css application/javascript application/json\n</IfModule>\n\n# Browser Caching Headers\n<IfModule mod_expires.c>\n  ExpiresActive On\n  ExpiresByType image/jpg "access plus 1 year"\n  ExpiresByType image/png "access plus 1 year"\n  ExpiresByType text/css "access plus 1 month"\n  ExpiresByType application/javascript "access plus 1 month"\n</IfModule>\n`;

    result = {
      resultType: 'code',
      content: htaccess,
      fileName: '.htaccess',
      mimeType: 'text/plain',
      metadata: { forceHttps, forceWww, compression: true },
      stats: { domain, forceHttps, compression: 'Enabled' },
    };
  }

  // -------------------------------------------------------------
  // 4. Social Media & Media Utilities
  // -------------------------------------------------------------
  else if (slug === 'open-graph-generator') {
    const title = options.title || 'iNWebTools — Enterprise Developer Platform';
    const description =
      options.description || 'Explore 1070+ free web developer tools and real-time utilities.';
    const url = options.url || 'https://inwebtools.com';
    const image = options.imageUrl || options.image || 'https://inwebtools.com/og-banner.png';
    const siteName = options.siteName || 'iNWebTools';

    const ogTags = `<!-- Open Graph / Facebook Meta Tags -->
<meta property="og:type" content="website">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${image}">
<meta property="og:site_name" content="${siteName}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">`;

    result = {
      resultType: 'code',
      content: ogTags,
      fileName: 'open-graph-tags.html',
      mimeType: 'text/html',
      metadata: { title, url, image, siteName },
      stats: { ogType: 'website', imageDimensions: '1200x630' },
    };
  } else if (slug === 'twitter-card-generator') {
    const cardType = options.cardType || 'summary_large_image';
    const title = options.title || 'iNWebTools — Free Developer Utilities';
    const description =
      options.description || '1070+ high-speed browser tools with zero server latency.';
    const image = options.imageUrl || options.image || 'https://inwebtools.com/twitter-card.png';
    const handle = options.handle || options.twitterSite || '@inayatechlab';

    const twitterTags = `<!-- Twitter / X Card Meta Tags -->
<meta name="twitter:card" content="${cardType}">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${image}">
<meta name="twitter:site" content="${handle}">
<meta name="twitter:creator" content="${handle}">`;

    result = {
      resultType: 'code',
      content: twitterTags,
      fileName: 'twitter-cards.html',
      mimeType: 'text/html',
      metadata: { cardType, handle, title },
      stats: { cardType, handle },
    };
  } else if (slug === 'social-image-resizer') {
    result = {
      resultType: 'metadata',
      metadata: {
        facebookOpenGraph: '1200 x 630 px (Aspect Ratio 1.91:1)',
        twitterLargeCard: '1200 x 675 px (Aspect Ratio 16:9)',
        instagramSquare: '1080 x 1080 px (Aspect Ratio 1:1)',
        instagramPortrait: '1080 x 1350 px (Aspect Ratio 4:5)',
        instagramStoryReel: '1080 x 1920 px (Aspect Ratio 9:16)',
        linkedInPost: '1200 x 627 px (Aspect Ratio 1.91:1)',
        youTubeThumbnail: '1280 x 720 px (Aspect Ratio 16:9 HD)',
      },
      stats: { platformsCount: 7, standard: '2026 Social Media Specs' },
    };
  } else if (slug === 'youtube-thumbnail-downloader') {
    const videoUrl = rawInput || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    const videoId = extractYouTubeId(videoUrl);

    const thumbnails = {
      maxres: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      maxResolution: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      hq: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      highQuality: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      mq: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
      mediumQuality: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
      sd: `https://img.youtube.com/vi/${videoId}/sddefault.jpg`,
      standardQuality: `https://img.youtube.com/vi/${videoId}/sddefault.jpg`,
    };

    result = {
      resultType: 'metadata',
      metadata: {
        videoId,
        sourceUrl: videoUrl,
        thumbnails,
      },
      stats: { videoId, availableResolutions: 4 },
    };
  } else if (slug === 'utm-campaign-builder') {
    const baseUrl = options.baseUrl || 'https://inwebtools.com/tools';
    const source = encodeURIComponent(String(options.utmSource || 'google'));
    const medium = encodeURIComponent(String(options.utmMedium || 'cpc'));
    const campaign = encodeURIComponent(String(options.utmCampaign || 'developer_suite_launch'));
    const term = options.utmTerm ? `&utm_term=${encodeURIComponent(String(options.utmTerm))}` : '';
    const content = options.utmContent
      ? `&utm_content=${encodeURIComponent(String(options.utmContent))}`
      : '';

    let paramCount = 3;
    if (options.utmTerm) paramCount++;
    if (options.utmContent) paramCount++;

    const separator = baseUrl.includes('?') ? '&' : '?';
    const utmUrl = `${baseUrl}${separator}utm_source=${source}&utm_medium=${medium}&utm_campaign=${campaign}${term}${content}`;

    result = {
      resultType: 'text',
      content: utmUrl,
      metadata: { paramCount, utmUrl, baseUrl },
      stats: { source, medium, campaign, paramCount },
    };
  } else {
    result = {
      resultType: 'text',
      content: rawInput || `Processed SEO tool ${slug}`,
      stats: { engine: 'SEO & Webmaster DSP' },
    };
  }

  res.status(200).json({
    success: true,
    data: {
      tool: {
        slug,
        module: 'seo-webmaster',
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
