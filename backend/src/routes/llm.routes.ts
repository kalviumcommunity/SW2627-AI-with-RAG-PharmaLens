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

export const llmRoutes = router;
