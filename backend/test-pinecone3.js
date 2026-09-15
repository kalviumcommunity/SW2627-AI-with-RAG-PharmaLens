const { Pinecone } = require('@pinecone-database/pinecone');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

async function run() {
  const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
  const index = pc.index('pharmalens-gemini');

  try {
    console.log("Upserting 3072-dimension vector into 768-dimension index...");
    await index.upsert([{ id: "test-dimension", values: new Array(3072).fill(0.1) }]);
    console.log("SUCCESS");
  } catch(e) {
    console.log('FAILED:', e.message);
  }
}
run();
