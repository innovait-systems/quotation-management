const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
const envPath = path.join(__dirname, '..', '.env');

console.log('🔄 Swapping database engine to SQLite...');

// 1. Convert schema.prisma
if (fs.existsSync(schemaPath)) {
  let content = fs.readFileSync(schemaPath, 'utf8');

  // Change datasource provider
  content = content.replace(/provider\s*=\s*"postgresql"/g, 'provider = "sqlite"');

  // Strip postgres decimal modifiers
  content = content.replace(/\s*@db\.Decimal\(\d+,\s*\d+\)/g, '');

  fs.writeFileSync(schemaPath, content, 'utf8');
  console.log('✓ prisma/schema.prisma successfully updated to SQLite format.');
} else {
  console.error('✗ Could not find prisma/schema.prisma');
}

// 2. Convert .env
if (fs.existsSync(envPath)) {
  let envContent = fs.readFileSync(envPath, 'utf8');

  // Change DATABASE_URL to sqlite local file
  envContent = envContent.replace(
    /DATABASE_URL\s*=\s*".*"/g,
    'DATABASE_URL="file:./dev.db"'
  );

  fs.writeFileSync(envPath, envContent, 'utf8');
  console.log('✓ server/.env updated with DATABASE_URL="file:./dev.db"');
} else {
  console.error('✗ Could not find server/.env');
}

console.log('🎉 SQLite conversion script finished successfully!');
