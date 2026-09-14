import { Router } from 'express';
import { ragService, RagQueryOptions } from '../services/rag.service';
import { usageService } from '../services/usage.service';

const router = Router();

router.get('/usage', async (req, res) => {
  try {
    const stats = await usageService.getUsageStats();
    return res.status(200).json(stats);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/query', async (req, res) => {
  const { prompt, systemInstruction, context, sessionId, documentId } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Valid prompt string is required.' });
  }

  try {
    const result = await ragService.processQuery(prompt, {
      systemInstruction,
      context,
      sessionId,
      documentId
    });

    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/stream', async (req, res) => {
  const { prompt, systemInstruction, context, sessionId, documentId } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Valid prompt string is required.' });
  }

  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  let isClientDisconnected = false;
  req.on('close', () => {
    isClientDisconnected = true;
    console.log('Client disconnected from SSE stream');
  });

  try {
    const result = await ragService.processStreamQuery(
      prompt,
      { systemInstruction, context, sessionId, documentId },
      (chunk) => {
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      },
      () => isClientDisconnected
    );

    if (!isClientDisconnected) {
      res.write(`data: ${JSON.stringify({ done: true, usage: result.usage, sources: result.sources, isRefusal: result.isRefusal })}\n\n`);
      res.end();
    }
  } catch (error: any) {
    if (!isClientDisconnected) {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
});

export const ragRoutes = router;
