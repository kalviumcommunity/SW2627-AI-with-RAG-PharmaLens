const { vectorService } = require('./src/services/vector.service');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

async function run() {
  await vectorService.init(); // init if needed
  try {
    console.log("Upserting 1 record");
    await vectorService.upsertVectors([
      { id: "test-1", values: new Array(768).fill(0.1), metadata: { text: "test" } }
    ]);
    console.log("SUCCESS");
  } catch(e) {
    console.log('FAILED:', e.message);
  }
}
run();
