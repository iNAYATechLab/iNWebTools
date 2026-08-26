/**
 * Tools Router — exposes registry lookups and tool execution endpoints
 * for Document, Spreadsheet, PDF, Image, Audio, Video, Developer, Security, Text, Calculators, SEO/Webmaster, Design/CSS, AI/Productivity & Math/Science.
 */

import { Router } from 'express';

import { executeTool, getRegistry, getTool } from '../controllers/tools/documentImageController.js';
import { executeMediaTool } from '../controllers/tools/mediaController.js';
import { executeDeveloperTool } from '../controllers/tools/developerController.js';
import { executeSecurityNetworkTool } from '../controllers/tools/securityNetworkController.js';
import { executeTextCalcTool } from '../controllers/tools/textCalcController.js';
import { executeSeoWebmasterTool } from '../controllers/tools/seoWebmasterController.js';
import { executeDesignTool } from '../controllers/tools/designController.js';
import { executeProductivityTool } from '../controllers/tools/productivityController.js';
import { executeScienceMathTool } from '../controllers/tools/scienceMathController.js';
import { uploadToolFiles } from '../middlewares/toolUpload.js';
import { getToolBySlug } from '../services/toolsRegistry.service.js';

export const toolsRouter = Router();

// Public lookups
toolsRouter.get('/registry', getRegistry);
toolsRouter.get('/:slug', getTool);

// Unified Tool execution handler (dispatches based on tool module)
toolsRouter.post('/execute/:slug', uploadToolFiles, async (req, res, next) => {
  try {
    const { slug } = req.params;
    const tool = await getToolBySlug(slug);

    if (tool && tool.module === 'audio-video') {
      return executeMediaTool(req, res, next);
    }
    if (tool && tool.module === 'developer-code') {
      return executeDeveloperTool(req, res, next);
    }
    if (tool && tool.module === 'security-network') {
      return executeSecurityNetworkTool(req, res, next);
    }
    if (tool && tool.module === 'text-calculators') {
      return executeTextCalcTool(req, res, next);
    }
    if (tool && tool.module === 'seo-webmaster') {
      return executeSeoWebmasterTool(req, res, next);
    }
    if (tool && tool.module === 'color-design') {
      return executeDesignTool(req, res, next);
    }
    if (tool && tool.module === 'ai-productivity') {
      return executeProductivityTool(req, res, next);
    }
    if (tool && tool.module === 'math-science') {
      return executeScienceMathTool(req, res, next);
    }
    return executeTool(req, res, next);
  } catch (err) {
    next(err);
  }
});

toolsRouter.post('/process', uploadToolFiles, async (req, res, next) => {
  req.params.slug = req.body?.toolSlug || 'csv-to-json';
  const tool = await getToolBySlug(req.params.slug);
  if (tool && tool.module === 'audio-video') {
    return executeMediaTool(req, res, next);
  }
  if (tool && tool.module === 'developer-code') {
    return executeDeveloperTool(req, res, next);
  }
  if (tool && tool.module === 'security-network') {
    return executeSecurityNetworkTool(req, res, next);
  }
  if (tool && tool.module === 'text-calculators') {
    return executeTextCalcTool(req, res, next);
  }
  if (tool && tool.module === 'seo-webmaster') {
    return executeSeoWebmasterTool(req, res, next);
  }
  if (tool && tool.module === 'color-design') {
    return executeDesignTool(req, res, next);
  }
  if (tool && tool.module === 'ai-productivity') {
    return executeProductivityTool(req, res, next);
  }
  if (tool && tool.module === 'math-science') {
    return executeScienceMathTool(req, res, next);
  }
  return executeTool(req, res, next);
});
