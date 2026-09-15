const { GoogleGenAI } = require('@google/genai');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

async function run() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const modelsResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await modelsResponse.json();
    
    const embedModels = data.models.filter(m => m.supportedGenerationMethods.includes('embedContent'));
    console.log('Supported Embedding Models:');
    embedModels.forEach(m => console.log(`- ${m.name}`));
  } catch(e) {
    console.log('List Models FAILED:', e.message);
  }
}
run();
