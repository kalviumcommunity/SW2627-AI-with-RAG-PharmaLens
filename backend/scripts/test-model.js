const { GoogleGenAI } = require('@google/genai');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

async function run() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  // Just try embedding-001
  try {
    const res = await ai.models.embedContent({
      model: 'gemini-embedding-2',
      contents: 'test'
    });
    console.log('gemini-embedding-2 SUCCESS');
    console.log('Dimensions:', res.embeddings[0].values.length);
  } catch(e) {
    console.log('gemini-embedding-2 FAILED:', e.message);
  }
}
run();
