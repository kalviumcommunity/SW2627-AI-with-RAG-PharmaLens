const { llmService } = require('./src/services/llm.service');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

async function run() {
  try {
    const texts = ['This is chunk 1.', 'This is chunk 2.'];
    const embeddings = await llmService.generateEmbeddings(texts);
    console.log(`Returned ${embeddings.length} embeddings`);
    if (embeddings.length > 0) {
      console.log(`First embedding length: ${embeddings[0].length}`);
    }
  } catch(e) {
    console.log('FAILED:', e.message);
  }
}
run();
