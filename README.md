# Pro Suite — AI Subscription Sharing Management System

A comprehensive SaaS management platform for selling, delivering, and managing shared AI/software subscriptions. Built with React, TypeScript, Tailwind CSS, and Lovable Cloud (Supabase).

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

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Blank page after upload | Ensure `index.html` is in the root of `public_html/` |
| 404 on page refresh | Add the `.htaccess` file with rewrite rules (see above) |
| API errors in console | Verify your `.env` variables are baked into the build (they're embedded at build time) |
| Login not working | Ensure your backend allows your domain in CORS/auth settings |

### Important Notes

- Environment variables prefixed with `VITE_` are **embedded at build time**, not read at runtime. You must rebuild after changing them.
- If using a custom domain, make sure to add it to your backend's allowed redirect URLs for authentication to work.

---

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite 5
- **Styling**: Tailwind CSS v3, shadcn/ui components
- **Backend**: Lovable Cloud (Supabase) — PostgreSQL, Auth, Edge Functions
- **Charts**: Recharts
- **State**: TanStack React Query

---

## License

Private — All rights reserved.
