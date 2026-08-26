/**
 * Tools Router — exposes registry lookups and tool execution endpoints
 * for Document, Spreadsheet, PDF, Image, Audio, Video, and Developer modules.
 */

import { Router } from 'express';

import { executeTool, getRegistry, getTool } from '../controllers/tools/documentImageController.js';
import { executeMediaTool } from '../controllers/tools/mediaController.js';
import { executeDeveloperTool } from '../controllers/tools/developerController.js';
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
  return executeTool(req, res, next);
});
