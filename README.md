# Pro Suite — AI Subscription Sharing Management System

A comprehensive SaaS management platform for selling, delivering, and managing shared AI/software subscriptions. Built with React, TypeScript, Tailwind CSS, and Supabase.

---

## Features

- 🔐 Role-based access control (Admin, Sales Rep, Support Expert, CRM, Accountant, Accounts Creator)
- 📦 Product & variant management with duration pricing
- 🛒 Full order lifecycle (draft → payment → delivery → completed)
- 💳 Payment verification workflow
- 🔑 Software account inventory & seat management
- 👥 Client management with trust tags & team assignments
- 🔄 Subscription renewals, reminders & termination workflows
- 📊 Analytics dashboard with revenue charts
- 📝 WhatsApp message templates with variable engine
- 📋 Audit logging & permission matrix
- 📤 CSV export & bulk actions

---

## Local Development Setup

### Prerequisites

- **Node.js** v18+ (recommended: v20+)
- **npm** or **bun** package manager
- **Git**

### Steps

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd <project-folder>

# 2. Install dependencies
npm install
# or
bun install

# 3. Create environment file
#    Create a .env file in the root directory with:
cat > .env << 'EOF'
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here
VITE_SUPABASE_PROJECT_ID=your-project-ref
EOF

# 4. Start the development server
npm run dev

# 5. Open in browser
#    Visit http://localhost:8080
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Your backend API URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your public/anon API key |
| `VITE_SUPABASE_PROJECT_ID` | Your backend project ID |

> ⚠️ Never commit your `.env` file to version control. It is already in `.gitignore`.

---

## Production Build

```bash
# Build for production
npm run build

# Preview the production build locally
npm run preview
```

The build output will be in the `dist/` folder.

---

## Deploy to Namecheap cPanel Hosting

### Option 1: Static File Upload (Recommended)

Since this is a single-page application (SPA), you only need static file hosting.

#### Step 1: Build the project

```bash
npm run build
```

#### Step 2: Upload files to cPanel

1. Log into your **Namecheap cPanel** dashboard
2. Open **File Manager**
3. Navigate to `public_html/` (or the subdirectory for your domain)
4. **Delete** any existing files (backup first if needed)
5. **Upload** the entire contents of the `dist/` folder into `public_html/`
   - You can zip the `dist/` folder, upload the zip, then extract it in cPanel

#### Step 3: Configure SPA routing with .htaccess

Create a `.htaccess` file inside `public_html/` with this content:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # If the requested file or directory exists, serve it directly
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d

  # Otherwise, redirect all requests to index.html
  RewriteRule ^ index.html [QSL,L]
</IfModule>

# Enable gzip compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css application/javascript application/json image/svg+xml
</IfModule>

# Cache static assets for 1 year
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  ExpiresByType font/woff2 "access plus 1 year"
</IfModule>
```

> 🔑 The `.htaccess` rewrite rules are **critical** — without them, refreshing any page other than `/` will show a 404 error.

#### Step 4: Verify

Visit your domain. You should see the login page. Try navigating to `/dashboard` and refreshing — it should work correctly.

---

### Option 2: Deploy to a Subdirectory

If you want to host the app at `yourdomain.com/app/` instead of the root:

1. Edit `vite.config.ts` and add `base: '/app/'`:

```ts
export default defineConfig({
  base: '/app/',
  // ... rest of config
});
```

2. Update your React Router to use `basename`:

```tsx
<BrowserRouter basename="/app">
```

3. Build and upload the `dist/` contents to `public_html/app/`
4. Place the `.htaccess` file inside the `app/` directory, updating `RewriteBase /app/`

---

### Option 3: Using cPanel Terminal (SSH)

If your Namecheap plan supports SSH access:

```bash
# SSH into your server
ssh username@your-server-ip

# Navigate to public directory
cd public_html

# Clone the repo (or upload via git)
git clone <your-repo-url> .

# Install Node.js via nvm (if not available)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20

# Install dependencies & build
npm install
npm run build

# Move build files to public_html
cp -r dist/* .

# Clean up source files (optional)
rm -rf src/ node_modules/ package.json
```

---

## Self-Hosted PostgreSQL Setup (Fully Offline / cPanel)

If you want to run this project **completely on your own PostgreSQL database** — either on localhost (no internet needed) or on Namecheap cPanel — follow these steps:

### What You Need

| Component | Cloud (Current) | Self-Hosted |
|-----------|-----------------|-------------|
| Database | Supabase Cloud (managed) | Your own PostgreSQL 15+ |
| Auth | Built-in Auth service | You'll handle auth yourself or use Supabase self-hosted |
| Edge Functions | Auto-deployed | Run locally with Deno or convert to Node.js |
| Frontend | Same | Same |

---

### Option A: Self-Hosted Supabase (Recommended for Full Compatibility)

This gives you the **exact same setup** locally — PostgreSQL + Auth + API — no internet required after initial setup.

#### Step 1: Install Docker

```bash
# Windows/Mac: Download Docker Desktop from https://docker.com
# Linux:
sudo apt install docker.io docker-compose
```

#### Step 2: Clone Supabase locally

```bash
git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker
cp .env.example .env
```

#### Step 3: Start Supabase

```bash
docker compose up -d
```

This starts PostgreSQL, Auth, REST API, and Studio (phpMyAdmin-like UI) on:
- **Studio (DB UI)**: http://localhost:54323
- **API URL**: http://localhost:54321
- **DB Direct**: postgresql://postgres:your-super-secret-and-long-postgres-password@localhost:54322/postgres

#### Step 4: Import the database schema

Export all migration files from `supabase/migrations/` folder and run them in order:

```bash
# Connect to local PostgreSQL
psql postgresql://postgres:your-super-secret-and-long-postgres-password@localhost:54322/postgres

# Run each migration file in order
\i supabase/migrations/0001_initial.sql
\i supabase/migrations/0002_xxx.sql
# ... repeat for all migration files
```

Or run all at once:
```bash
for f in supabase/migrations/*.sql; do
  psql postgresql://postgres:your-super-secret-and-long-postgres-password@localhost:54322/postgres -f "$f"
done
```

#### Step 5: Update `.env` for local

Create a new `.env` file:

```env
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
VITE_SUPABASE_PROJECT_ID=local
```

> 💡 The key above is the default local Supabase anon key. It works out of the box.

#### Step 6: Build and run

```bash
npm install
npm run dev
# Visit http://localhost:8080
```

✅ **Fully offline** — no internet needed after Docker images are downloaded.

---

### Option B: Direct PostgreSQL (Without Supabase)

If you want to use **raw PostgreSQL** (like you do with MySQL + phpMyAdmin), you'll need to replace the Supabase client with direct PostgreSQL queries. This requires significant code changes.

#### Step 1: Install PostgreSQL on localhost

```bash
# Windows: Download from https://www.postgresql.org/downloads/
# Mac:
brew install postgresql@15
# Linux:
sudo apt install postgresql-15
```

#### Step 2: Create the database

```bash
sudo -u postgres psql
CREATE DATABASE prosuite;
CREATE USER prosuite_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE prosuite TO prosuite_user;
\q
```

#### Step 3: Import schema

```bash
# Run all migration files
for f in supabase/migrations/*.sql; do
  psql -U prosuite_user -d prosuite -f "$f"
done
```

> ⚠️ Some migrations use Supabase-specific functions (`auth.uid()`, `auth.users`). You'll need to:
> - Remove or replace RLS policies
> - Create your own `users` table instead of relying on `auth.users`
> - Handle authentication in your backend code (PHP/Node.js)

#### Step 4: Replace Supabase client with a backend API

Since raw PostgreSQL can't be accessed directly from the browser (security risk), you'll need a backend:

**Option 1 — Node.js API (recommended):**
```bash
npm install express pg cors
```

```javascript
// server.js
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const pool = new Pool({
  user: 'prosuite_user',
  host: 'localhost',
  database: 'prosuite',
  password: 'your_password',
  port: 5432,
});

const app = express();
app.use(cors());
app.use(express.json());

// Example: Get all clients
app.get('/api/clients', async (req, res) => {
  const result = await pool.query('SELECT * FROM clients ORDER BY created_at DESC');
  res.json(result.rows);
});

app.listen(3001, () => console.log('API running on port 3001'));
```

**Option 2 — PHP API (if you're comfortable with PHP):**
```php
<?php
// api/clients.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$conn = pg_connect("host=localhost dbname=prosuite user=prosuite_user password=your_password");
$result = pg_query($conn, "SELECT * FROM clients ORDER BY created_at DESC");
echo json_encode(pg_fetch_all($result));
?>
```

> ⚠️ **Important**: This option requires rewriting all `supabase.from('table')` calls in the frontend to `fetch('/api/table')` calls. This is a **major refactor** and not recommended unless you have a specific reason to avoid Supabase.

---

### Option C: PostgreSQL on Namecheap cPanel

Most Namecheap shared hosting plans include PostgreSQL support.

#### Step 1: Create PostgreSQL database in cPanel

1. Login to **cPanel**
2. Go to **PostgreSQL Databases** (under Databases section)
3. Create a new database: `prosuite`
4. Create a new user with a strong password
5. Add user to database with **ALL PRIVILEGES**

#### Step 2: Access via phpPgAdmin

1. In cPanel, click **phpPgAdmin**
2. Login with your database credentials
3. Select your database
4. Go to **SQL** tab
5. Copy-paste each migration file's content and execute

#### Step 3: Set up backend API

Since cPanel supports PHP natively:

```php
<?php
// api/config.php
$db = pg_connect("host=localhost dbname=yourusername_prosuite user=yourusername_dbuser password=your_password");

if (!$db) {
    die(json_encode(['error' => 'Database connection failed']));
}
?>
```

Upload your PHP API files to `public_html/api/` and your built frontend to `public_html/`.

#### Step 4: Update frontend API calls

You would need to change all Supabase calls to point to your PHP API:

```typescript
// Instead of:
const { data } = await supabase.from('clients').select('*');

// Use:
const response = await fetch('https://yourdomain.com/api/clients.php');
const data = await response.json();
```

---

### Which Option Should You Choose?

| Scenario | Best Option |
|----------|-------------|
| 🟢 Want exact same features, locally | **Option A** (Self-hosted Supabase with Docker) |
| 🟡 Already have PostgreSQL, okay with code changes | **Option B** (Direct PostgreSQL + custom API) |
| 🟠 Want to host everything on Namecheap | **Option C** (cPanel PostgreSQL + PHP API) |
| 🔵 Don't want to manage servers at all | **Keep using Supabase Cloud** (current setup) |

> 💡 **Recommendation**: Option A is the easiest path to fully offline/self-hosted. You get the same API, same auth, same everything — just running on your own machine instead of the cloud.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Blank page after upload | Ensure `index.html` is in the root of `public_html/` |
| 404 on page refresh | Add the `.htaccess` file with rewrite rules (see above) |
| API errors in console | Verify your `.env` variables are baked into the build (they're embedded at build time) |
| Login not working | Ensure your backend allows your domain in CORS/auth settings |
| Docker won't start | Ensure Docker Desktop is running and ports 54321-54323 are free |
| Migration errors | Run migrations in order (filename sort). Skip Supabase-specific auth functions if using Option B/C |

### Important Notes

- Environment variables prefixed with `VITE_` are **embedded at build time**, not read at runtime. You must rebuild after changing them.
- If using a custom domain, make sure to add it to your backend's allowed redirect URLs for authentication to work.
- PostgreSQL syntax is 95% similar to MySQL. Main differences: `SERIAL` → `gen_random_uuid()`, `AUTO_INCREMENT` → `DEFAULT`, `LIMIT` works the same.

---

## MySQL vs PostgreSQL — Quick Reference

Since you're coming from MySQL, here's a quick comparison:

| MySQL | PostgreSQL |
|-------|-----------|
| `AUTO_INCREMENT` | `SERIAL` or `gen_random_uuid()` |
| `TINYINT(1)` for boolean | `BOOLEAN` |
| `DATETIME` | `TIMESTAMP WITH TIME ZONE` |
| `ENUM('a','b')` inline | `CREATE TYPE ... AS ENUM(...)` separately |
| `SHOW TABLES` | `\dt` |
| `DESCRIBE table` | `\d table` |
| phpMyAdmin | phpPgAdmin or Supabase Studio |
| `mysqldump` | `pg_dump` |
| `mysql -u root -p` | `psql -U postgres` |

---

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite 5
- **Styling**: Tailwind CSS v3, shadcn/ui components
- **Backend**: Supabase — PostgreSQL, Auth, Edge Functions
- **Charts**: Recharts
- **State**: TanStack React Query

---

## License

Private — All rights reserved.
