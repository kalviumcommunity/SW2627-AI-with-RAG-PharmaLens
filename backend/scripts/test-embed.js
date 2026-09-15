const { GoogleGenAI } = require('@google/genai');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

async function run() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const res = await ai.models.embedContent({
      model: 'gemini-embedding-001',
      contents: ['hello', 'world']
    });
    console.log(res);
  } catch(e) {
    console.log('FAILED:', e.message);
  }
}
run();
