/**
 * Tools Router — exposes registry lookups and tool execution endpoints.
 */

import { Router } from 'express';

import { executeTool, getRegistry, getTool } from '../controllers/tools/documentImageController.js';
import { uploadToolFiles } from '../middlewares/toolUpload.js';

export const toolsRouter = Router();

// Public lookups
toolsRouter.get('/registry', getRegistry);
toolsRouter.get('/:slug', getTool);

// Tool execution handler (accepts multipart file uploads + JSON options)
toolsRouter.post('/execute/:slug', uploadToolFiles, executeTool);
toolsRouter.post('/process', uploadToolFiles, (req, res, next) => {
  req.params.slug = req.body?.toolSlug || 'csv-to-json';
  executeTool(req, res, next);
});
