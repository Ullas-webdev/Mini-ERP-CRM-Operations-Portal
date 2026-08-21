const { execSync } = require('child_process');
const fs = require('fs');

// Ensure DATABASE_URL is set, falling back to local SQLite file
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./dev.db';
}

console.log('⚙️ Starting Backend Build Process...');
console.log('📌 DATABASE_URL:', process.env.DATABASE_URL);

// Clean dist directory
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
}

try {
  console.log('🔄 1. Generating Prisma Client...');
  execSync('npx prisma generate', { stdio: 'inherit', env: process.env });

  console.log('🔄 2. Pushing Prisma Schema to Database...');
  execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit', env: process.env });

  console.log('🌱 3. Seeding Initial Demo Records...');
  try {
    execSync('npx ts-node prisma/seed.ts', { stdio: 'inherit', env: process.env });
  } catch (seedErr) {
    console.warn('⚠️ Seeding failed or already seeded:', seedErr.message);
  }

  console.log('🔨 4. Compiling TypeScript...');
  execSync('npx tsc', { stdio: 'inherit', env: process.env });

  console.log('✅ Backend build & database setup completed successfully!\n');
} catch (err) {
  console.error('❌ Build failed:', err.message);
  process.exit(1);
}
