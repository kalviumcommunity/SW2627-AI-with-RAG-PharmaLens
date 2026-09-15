const { Pinecone } = require('@pinecone-database/pinecone');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

async function run() {
  const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const index = pc.index('pharmalens-gemini');

  try {
    console.log("Trying array syntax...");
    await index.upsert([{ id: "test-2", values: new Array(768).fill(0.2) }]);
    console.log("SUCCESS array syntax");
  } catch(e) {
    console.log('Array syntax FAILED:', e.message);
  }
}
run();
