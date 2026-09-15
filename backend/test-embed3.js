const { llmService } = require('./src/services/llm.service');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

async function run() {
  try {
    const embeddings = await llmService.generateEmbeddings(['test']);
    console.log(`Length: ${embeddings[0].length}`);
  } catch(e) {
    console.log('FAILED:', e.message);
  }
}
run();
