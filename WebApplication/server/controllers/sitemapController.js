/**
 * Dynamic XML Sitemap Generator for iNWebTools.
 * Maps all registered tools, modules, categories, and static entry points.
 */

import { readSeed } from '../services/categories.service.js';
import { readToolsRegistry } from '../services/toolsRegistry.service.js';
import { asyncHandler } from '../utils/ApiError.js';

export const getSitemapXml = asyncHandler(async (req, res) => {
  const baseUrl =
    process.env.PUBLIC_APP_URL ||
    (req.get('host') ? `${req.protocol}://${req.get('host')}` : 'https://inwebtools.com');
  const nowIso = new Date().toISOString().split('T')[0];

  const toolsRegistry = readToolsRegistry();
  const categoriesRegistry = readSeed();

  const urls = [];

  // 1. Core Platform Landing Pages
  urls.push({ loc: `${baseUrl}/`, priority: '1.0', changefreq: 'daily', lastmod: nowIso });
  urls.push({ loc: `${baseUrl}/tools`, priority: '0.9', changefreq: 'daily', lastmod: nowIso });
  urls.push({ loc: `${baseUrl}/login`, priority: '0.5', changefreq: 'monthly', lastmod: nowIso });
  urls.push({
    loc: `${baseUrl}/register`,
    priority: '0.5',
    changefreq: 'monthly',
    lastmod: nowIso,
  });

  // 2. Direct Modules
  if (toolsRegistry?.modules) {
    for (const mod of toolsRegistry.modules) {
      urls.push({
        loc: `${baseUrl}/tools/${mod.slug}`,
        priority: '0.8',
        changefreq: 'weekly',
        lastmod: nowIso,
      });
    }
  }

  // 3. Category & Subcategory Catalog Trees
  if (categoriesRegistry?.categories) {
    for (const cat of categoriesRegistry.categories) {
      urls.push({
        loc: `${baseUrl}/tools/${cat.slug}`,
        priority: '0.7',
        changefreq: 'weekly',
        lastmod: nowIso,
      });

      if (cat.subcategories) {
        for (const sub of cat.subcategories) {
          urls.push({
            loc: `${baseUrl}/tools/${cat.slug}/${sub.slug}`,
            priority: '0.6',
            changefreq: 'weekly',
            lastmod: nowIso,
          });
        }
      }
    }
  }

  // 4. All Individual Registered Tools
  if (toolsRegistry?.tools) {
    for (const tool of toolsRegistry.tools) {
      urls.push({
        loc: `${baseUrl}/tools/${tool.module}/${tool.slug}`,
        priority: tool.isFeatured ? '0.8' : '0.6',
        changefreq: 'weekly',
        lastmod: nowIso,
      });
    }
  }

  // Build XML String
  const urlTags = urls
    .map(
      (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlTags}
</urlset>`;

  res.header('Content-Type', 'application/xml');
  res.header('Cache-Control', 'public, max-age=3600, s-maxage=86400');
  res.status(200).send(xml);
});

export const getRobotsTxt = asyncHandler(async (req, res) => {
  const baseUrl =
    process.env.PUBLIC_APP_URL ||
    (req.get('host') ? `${req.protocol}://${req.get('host')}` : 'https://inwebtools.com');

  const robots = `User-agent: *
Allow: /
Allow: /tools
Allow: /tools/*
Disallow: /admin
Disallow: /AdminDashboard
Disallow: /api/admin

Sitemap: ${baseUrl}/sitemap.xml
`;

  res.header('Content-Type', 'text/plain');
  res.status(200).send(robots);
});
