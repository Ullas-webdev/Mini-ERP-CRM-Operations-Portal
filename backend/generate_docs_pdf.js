const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const doc = new PDFDocument({
  margin: 50,
  size: 'A4',
  bufferPages: true,
});

const outputPath = path.join(__dirname, '../docs/PROJECT_DOCUMENTATION.pdf');
const writeStream = fs.createWriteStream(outputPath);
doc.pipe(writeStream);

// Colors
const PRIMARY = '#0284c7';   // Sky 600
const SECONDARY = '#0f172a'; // Slate 900
const TEXT_DARK = '#334155'; // Slate 700
const ACCENT = '#4f46e5';    // Indigo 600
const LIGHT_BG = '#f8fafc';  // Slate 50

// Header Function
function addHeader(title, subtitle) {
  doc.rect(0, 0, 595.28, 110).fill(SECONDARY);
  doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold').text('MINI ERP + CRM OPERATIONS PORTAL', 50, 30);
  doc.fillColor(PRIMARY).fontSize(14).font('Helvetica-Bold').text(title.toUpperCase(), 50, 58);
  if (subtitle) {
    doc.fillColor('#94a3b8').fontSize(9).font('Helvetica').text(subtitle, 50, 78);
  }
  doc.y = 130;
}

// Section Heading
function addSection(title) {
  doc.moveDown(0.8);
  const y = doc.y;
  doc.rect(50, y, 4, 18).fill(PRIMARY);
  doc.fillColor(SECONDARY).fontSize(14).font('Helvetica-Bold').text(title, 62, y + 2);
  doc.moveDown(0.6);
  doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(0.6);
}

// Subheading
function addSubSection(title) {
  doc.moveDown(0.4);
  doc.fillColor(ACCENT).fontSize(11).font('Helvetica-Bold').text(title);
  doc.moveDown(0.3);
}

// Body Text
function addParagraph(text) {
  doc.fillColor(TEXT_DARK).fontSize(9.5).font('Helvetica').text(text, { align: 'justify', lineGap: 3 });
  doc.moveDown(0.4);
}

// Bullet Point
function addBullet(title, text) {
  doc.fillColor(SECONDARY).fontSize(9.5).font('Helvetica-Bold').text(`•  ${title}: `, { continued: true });
  doc.fillColor(TEXT_DARK).font('Helvetica').text(text, { lineGap: 2 });
  doc.moveDown(0.3);
}

// Code Box
function addCodeBlock(code) {
  const y = doc.y;
  const height = doc.heightOfString(code, { width: 475, font: 'Courier', fontSize: 8.5 }) + 16;
  
  if (y + height > 750) doc.addPage();
  
  doc.rect(50, doc.y, 495, height).fill('#0f172a');
  doc.fillColor('#38bdf8').fontSize(8.5).font('Courier').text(code, 60, doc.y - height + 8, { width: 475 });
  doc.moveDown(0.8);
}

// --- PAGE 1 ---
addHeader('Technical Architecture & Setup Guide', 'Comprehensive Documentation Report — System Design, Deployment & Operations');

addSection('1. How the Server Was Set Up');
addParagraph('The backend service for the Mini ERP + CRM Operations Portal is architected as a modular, enterprise-grade Node.js & Express REST API using TypeScript. It enforces clean separation of concerns across routes, controllers, middleware, models, and utility layers.');

addSubSection('Core Architecture & Technology Stack');
addBullet('Framework', 'Express.js v4 with TypeScript (v5.3) for type safety and autocompletion.');
addBullet('Database Layer', 'Prisma ORM (v5.10) with PostgreSQL for strict schema enforcement, automated migrations, and seed scripts.');
addBullet('Authentication', 'JWT Access & Refresh token rotation with bcrypt password hashing (10 salt rounds).');
addBullet('Validation & Parsing', 'Zod schema validation middleware for input sanitization and payload verification.');
addBullet('Logging System', 'Pino structured JSON logger with request tracing (x-request-id correlation UUIDs).');

addSubSection('Middleware & Security Pipeline');
addBullet('Helmet Security', 'Configures HTTP response headers to protect against clickjacking, XSS, and MIME sniffing.');
addBullet('CORS Protection', 'Strict origin allowlist validation enforcing allowed cross-origin web client requests.');
addBullet('Rate Limiter', 'Express-rate-limit gating authentication endpoints to prevent brute-force attacks.');
addBullet('Audit Logging', 'Asynchronous background logging capturing security access attempts (403 Forbidden) and critical CRUD operations.');

doc.addPage();

// --- PAGE 2 ---
addHeader('Environment & Execution Guide', 'Managing Credentials & Running Local Development');

addSection('2. How Environment Variables Are Managed');
addParagraph('Environment variables are strictly validated on server boot using a Zod schema in backend/src/config/env.ts. If any required key is missing or invalid, the application immediately throws a descriptive startup error and halts.');

addSubSection('Required Environment Variables Schema');
addCodeBlock(
`# Database Connection (Neon Postgres / Local PostgreSQL)
DATABASE_URL="postgresql://user:pass@ep-hostname.aws.neon.tech/neondb?sslmode=require"

# JWT Security Secrets (Must be at least 32 characters long)
JWT_SECRET="prod-access-secret-key-min-32-chars-long!!"
JWT_REFRESH_SECRET="prod-refresh-secret-key-min-32-chars-long!!"

# Application Configuration
NODE_ENV="production"
PORT=10000
CORS_ORIGIN="https://mini-erp-crm-operations-portal.vercel.app"

# Frontend Environment Variable (Vite)
VITE_API_BASE_URL="https://mini-erp-crm-operations-portal-z3uy.onrender.com/api/v1/health"`
);

addSection('3. How to Run the Project Locally');
addParagraph('To run the Mini ERP + CRM Portal locally on your development machine, follow these step-by-step instructions:');

addSubSection('Step 1: Clone Repository & Install Dependencies');
addCodeBlock(
`# Clone repository
git clone https://github.com/Ullas-webdev/Mini-ERP-CRM-Operations-Portal.git
cd Mini-ERP-CRM-Operations-Portal

# Install Root & Subpackage Dependencies
npm install
cd backend && npm install
cd ../frontend && npm install`
);

addSubSection('Step 2: Initialize Database & Seed Demo Data');
addCodeBlock(
`# In /backend directory:
npx prisma db push
npx prisma db seed`
);

addSubSection('Step 3: Start Development Servers');
addCodeBlock(
`# Start Backend Server (runs on http://localhost:10000)
cd backend && npm run dev

# Start Frontend Vite App (runs on http://localhost:5173)
cd frontend && npm run dev`
);

addSubSection('Step 4: Demo Login Credentials');
addBullet('Admin User', 'Email: admin@demo.com | Password: Demo@123');
addBullet('Sales User', 'Email: sales@demo.com | Password: Demo@123');
addBullet('Warehouse User', 'Email: warehouse@demo.com | Password: Demo@123');
addBullet('Accounts User', 'Email: accounts@demo.com | Password: Demo@123');

doc.addPage();

// --- PAGE 3 ---
addHeader('Deployment Strategy & Assumptions', 'Production Deployment Pipeline & Business Logic Specs');

addSection('4. How to Deploy the Project');
addParagraph('The project is pre-configured for deployment across Neon (PostgreSQL), Render (Web Service), and Vercel (Frontend SPA).');

addSubSection('A. Database Deployment (Neon)');
addBullet('Create Project', 'Log in to neon.tech, create a project named mini-erp-db, and select PostgreSQL.');
addBullet('Connection String', 'Copy the pooled connection string (with ?sslmode=require).');
addBullet('Run Migrations', 'Execute `npx prisma db push` and `npx prisma db seed` against the Neon URL.');

addSubSection('B. Backend Deployment (Render)');
addBullet('Service Type', 'Create a new Web Service on render.com connected to the GitHub repository.');
addBullet('Build Command', '`npm install && npx prisma generate && ./node_modules/.bin/tsc`');
addBullet('Start Command', '`node dist/server.js`');
addBullet('Environment Keys', 'Add DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET, CORS_ORIGIN, and NODE_ENV=production.');

addSubSection('C. Frontend Deployment (Vercel)');
addBullet('Import Repo', 'Import repository into vercel.com with root directory set to `frontend`.');
addBullet('Environment Variable', 'Set `VITE_API_BASE_URL` to your Render backend URL (e.g. https://...onrender.com/api/v1).');

addSection('5. Assumptions Made');
addParagraph('During the implementation of the business domain requirements, the following technical and operational assumptions were established:');

addBullet('Challan Cancellation', 'Reversing or cancelling a confirmed Sales Delivery Challan automatically restores all deducted line item quantities back to product stock inventory via stock movement ledger entries.');
addBullet('Price Snapshotting', 'Unit prices are snapshot at the moment of Challan creation so future product price updates do not retroactively alter historic delivery invoices.');
addBullet('Lockout Policy', 'User accounts lock out after 5 consecutive failed login attempts for 15 minutes to mitigate brute-force risks.');
addBullet('Challan Numbering', 'Auto-generated sequentially using format `CH-YYYY-XXXX` (e.g., CH-2026-0001).');
addBullet('Warehouse Single Location', 'Each product SKU is mapped to a primary warehouse storage location string (e.g. Rack A-12).');

// Footer Page Numbers
const pages = doc.bufferedPageRange();
for (let i = 0; i < pages.count; i++) {
  doc.switchToPage(i);
  doc.fillColor('#94a3b8').fontSize(8).font('Helvetica').text(
    `Page ${i + 1} of ${pages.count} — Mini ERP + CRM Operations Portal Documentation`,
    50,
    780,
    { align: 'center', width: 495 }
  );
}

doc.end();
console.log('PDF documentation successfully generated at: ' + outputPath);
