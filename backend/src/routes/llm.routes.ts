import { Router } from 'express';
import { llmService } from '../services/llm.service';
import { buildRagPrompt } from '../utils/promptBuilder';
import { historyService } from '../services/history.service';

const router = Router();

router.post('/test', async (req, res) => {
  const { prompt, systemInstruction, context, sessionId } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Valid prompt string is required.' });
  }

  try {
    const newMessages = buildRagPrompt({
      userQuestion: prompt,
      systemInstruction,
      context,
    });

    let finalMessages = newMessages;

    if (sessionId) {
      const existing = historyService.getHistory(sessionId);
      if (existing.length === 0) {
        newMessages.forEach(msg => historyService.addMessage(sessionId, msg));
      } else {
        // Just append the new user question
        historyService.addMessage(sessionId, newMessages[newMessages.length - 1]);
      }
      finalMessages = historyService.getHistory(sessionId);
    }

    const result = await llmService.getCompletion(finalMessages);

    if (sessionId && result.answer) {
      historyService.addMessage(sessionId, {
        role: 'assistant',
        content: result.answer,
      });
    }

    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/stream', async (req, res) => {
  const { prompt, systemInstruction, context, sessionId } = req.body;

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
    const newMessages = buildRagPrompt({
      userQuestion: prompt,
      systemInstruction,
      context,
    });

    let finalMessages = newMessages;

    if (sessionId) {
      const existing = historyService.getHistory(sessionId);
      if (existing.length === 0) {
        newMessages.forEach(msg => historyService.addMessage(sessionId, msg));
      } else {
        historyService.addMessage(sessionId, newMessages[newMessages.length - 1]);
      }
      finalMessages = historyService.getHistory(sessionId);
    }

    const result = await llmService.streamCompletion(finalMessages, (chunk) => {
      if (isClientDisconnected) return;
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    });

    if (sessionId && result.answer && !isClientDisconnected) {
      historyService.addMessage(sessionId, {
        role: 'assistant',
        content: result.answer,
      });
    }

    if (!isClientDisconnected) {
      res.write(`data: ${JSON.stringify({ done: true, usage: result.usage })}\n\n`);
      res.end();
    }
  } catch (error: any) {
    if (!isClientDisconnected) {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
});

export const llmRoutes = router;
