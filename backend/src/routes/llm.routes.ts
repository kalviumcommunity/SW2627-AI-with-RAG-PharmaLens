import { Router } from 'express';
import { llmService } from '../services/llm.service';
import { buildRagPrompt } from '../utils/promptBuilder';
import { historyService } from '../services/history.service';

import { vectorService } from '../services/vector.service';

import { rerankChunks } from '../utils/reranker';

const router = Router();

// Helper to retrieve context
async function retrieveContext(prompt: string, documentId?: string): Promise<string> {
  try {
    const queryVector = await llmService.generateEmbeddings([prompt]);
    if (queryVector.length === 0) return '';

    const filter = documentId ? { documentId } : undefined;
    // Stage 1: Recall a larger pool (topK = 10)
    const matches = await vectorService.queryVectors(queryVector[0], 10, filter);
    
    // Filter matches that are mathematically relevant
    const relevantMatches = matches.filter(m => m.score && m.score >= 0.4);
    if (relevantMatches.length === 0) return '';

    // Stage 2: Lexical Re-Ranking (boost keyword matches and take top 3)
    const finalChunks = rerankChunks(prompt, relevantMatches, 3);

    // Build context string from metadata
    const contextStr = finalChunks.map(m => `Source: ${m.metadata.filename}\n${m.metadata.text}`).join('\n\n');
    return contextStr;
  } catch (err) {
    console.error('Retrieval error:', err);
    return ''; // Fail gracefully if Pinecone is down or not set
  }
}

router.post('/test', async (req, res) => {
  const { prompt, systemInstruction, context, sessionId, documentId } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Valid prompt string is required.' });
  }

  try {
    const retrievedContext = await retrieveContext(prompt, documentId);
    const finalContext = context ? `${context}\n\n${retrievedContext}` : retrievedContext;

    const newMessages = buildRagPrompt({
      userQuestion: prompt,
      systemInstruction,
      context: finalContext,
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
    const retrievedContext = await retrieveContext(prompt, documentId);
    const finalContext = context ? `${context}\n\n${retrievedContext}` : retrievedContext;

    const newMessages = buildRagPrompt({
      userQuestion: prompt,
      systemInstruction,
      context: finalContext,
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
