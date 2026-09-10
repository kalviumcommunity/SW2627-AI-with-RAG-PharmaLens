import { Router } from 'express';
import { llmService } from '../services/llm.service';

const router = Router();

router.post('/test', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Valid prompt string is required.' });
  }

  try {
    const answer = await llmService.getCompletion(prompt);
    return res.status(200).json({ answer });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export const llmRoutes = router;
