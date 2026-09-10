import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { llmRoutes } from './routes/llm.routes';
import { documentRoutes } from './routes/document.routes';
import { env } from './config/env';

dotenv.config();

const app = express();
const port = env.port;

app.use(cors());
app.use(express.json());

// Health endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Register routes
app.use('/api/llm', llmRoutes);
app.use('/api/documents', documentRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
