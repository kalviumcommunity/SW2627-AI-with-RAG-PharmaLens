import dotenv from 'dotenv';
dotenv.config();

import { llmService } from '../src/services/llm.service';
import { ragService } from '../src/services/rag.service';
import { vectorService } from '../src/services/vector.service';
import { env } from '../src/config/env';

const TEST_QUERIES = [
  "What are the side effects of this medication?",
  "What is the recommended dosage for adults?",
  "Can I take this on an empty stomach?",
  "Tell me a joke about a penguin." // Deliberate failure test
];

async function evaluateAnswerQuality(query: string, answer: string, context: string) {
  const prompt = `You are an expert RAG (Retrieval-Augmented Generation) evaluator.
Evaluate the following generated answer based on the provided context and the original query.

You must output ONLY a valid JSON object with the following structure:
{
  "faithfulnessScore": <number between 0-10>,
  "relevanceScore": <number between 0-10>,
  "reasoning": "<brief explanation>"
}

### SCORING RUBRIC ###
1. FAITHFULNESS (0-10): Is the answer strictly derived from the context? 
   - Score 10 if every claim is fully supported by the context.
   - Score 0 if the answer invents facts (hallucination) or uses outside knowledge.
2. RELEVANCE (0-10): Does the answer directly address the user's query?
   - Score 10 if it perfectly and concisely answers the query.
   - Score 0 if it goes completely off-topic or fails to answer the question.
   - If the context does not contain the answer, and the AI correctly refused to answer (e.g., "I couldn't find sufficient evidence..."), score RELEVANCE as 10 (since refusing an impossible query is highly relevant and correct).

### DATA ###
Query: "${query}"
Context: "${context}"
Generated Answer: "${answer}"`;

  try {
    const result = await llmService.getCompletion([
      { role: 'user', content: prompt }
    ]);
    
    // Parse the JSON output
    const jsonMatch = result.answer?.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("LLM failed to output valid JSON for evaluation.");
    }
  } catch (err: any) {
    console.error(`Evaluation failed: ${err.message}`);
    return { faithfulnessScore: 0, relevanceScore: 0, reasoning: "Evaluation failed" };
  }
}

async function runQualityEvaluation() {
  console.log('🧪 Starting RAG Answer Quality Evaluation Harness...\n');

  if (!env.pineconeApiKey || !env.pineconeIndex || !env.openAiApiKey) {
    console.error('❌ Missing credentials in .env');
    process.exit(1);
  }

  console.log('⏳ Initializing Vector DB connection...');
  await vectorService.initializeDatabase();
  console.log('✅ Connected to Pinecone.\n');

  let totalQueries = 0;
  let totalFaithfulness = 0;
  let totalRelevance = 0;

  for (const query of TEST_QUERIES) {
    totalQueries++;
    console.log(`\n======================================================`);
    console.log(`🔎 TEST QUERY [${totalQueries}]: "${query}"`);
    console.log(`======================================================`);

    try {
      console.log(`  [1] Generating Answer via RAG Pipeline...`);
      const ragResult = await ragService.processQuery(query, {});
      
      const contextStr = ragResult.sources.map(s => s.text).join('\n\n') || "No context found.";

      console.log(`\n  🤖 RAG ANSWER:\n  "${ragResult.answer}"\n`);
      
      console.log(`  [2] Grading Answer (LLM-as-a-Judge)...`);
      const score = await evaluateAnswerQuality(query, ragResult.answer || '', contextStr);

      console.log(`\n  ✅ SCORING RESULT:`);
      console.log(`      Faithfulness: ${score.faithfulnessScore} / 10`);
      console.log(`      Relevance:    ${score.relevanceScore} / 10`);
      console.log(`      Reasoning:    ${score.reasoning}`);

      totalFaithfulness += score.faithfulnessScore;
      totalRelevance += score.relevanceScore;

    } catch (err: any) {
      console.error(`  ❌ Error processing query: ${err.message}`);
    }
  }

  console.log(`\n======================================================`);
  console.log(`📊 OVERALL QUALITY REPORT`);
  console.log(`======================================================`);
  console.log(`Average Faithfulness: ${(totalFaithfulness / totalQueries).toFixed(1)} / 10`);
  console.log(`Average Relevance:    ${(totalRelevance / totalQueries).toFixed(1)} / 10`);
  console.log(`======================================================`);
  
  process.exit(0);
}

runQualityEvaluation();
