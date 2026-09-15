const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../../.env');
const envExamplePath = path.join(__dirname, '../../.env.example');

if (!fs.existsSync(envPath)) {
  console.log('\n=========================================');
  console.log('⚠️  NO .env FILE FOUND!');
  console.log('=========================================');
  
  if (fs.existsSync(envExamplePath)) {
    console.log('Copying .env.example to .env ...');
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ Created .env file successfully.');
  }

  console.log('\n❌ SERVER STOPPED.');
  console.log('Please open the new `.env` file in the root directory and add your API keys:');
  console.log(' - GEMINI_API_KEY');
  console.log(' - PINECONE_API_KEY');
  console.log('\nOnce you have added them, run `npm run dev` again.');
  console.log('=========================================\n');
  process.exit(1);
}
