# iNWebTools — Enterprise Homepage & Super Admin Portal Architecture

## 1. Professional Mega-SaaS Homepage UI Design

The homepage (`WebApplication/client/src/pages/Home.tsx`) has been transformed into a modern, high-converting enterprise portal:

### A. Hero Section & Real-Time Telemetry
- **Gradient Backdrop**: Modern dark aesthetic with ambient glow effects.
- **Headline**: Bilingual support (`1,070+ Free Online Web Tools` / `১,০৭০+ ফ্রী অনলাইন ওয়েব টুলস ও কনভার্টার`).
- **Telemetry Counter Badges**: Live counters showcasing `242+ Active Tools`, `10 Enterprise Suites`, `100% Client Privacy`, and `0$ Free Forever`.
- **Global Command Palette Search**: Quick launch bar triggered by `Ctrl+K` (`⌘K` on macOS) with instant bilingual search across all 242+ tools.
- **Quick Search Tags**: One-click tags for high-traffic tools (`Audio to Text`, `PDF to Word`, `Remove BG`, `JSON Types`, `BMI Calc`, `QR Code`).

### B. Top 12 Trending & Popular Tools Ribbon
Interactive cards for the 12 most frequently used tools:
1. **Audio to Text** (Whisper ASR Model)
2. **PDF to Word Converter**
3. **Image Background Remover**
4. **JSON to TypeScript & Schema Validator**
5. **Image Resizer & Optimizer**
6. **BMI & Body Composition Calculator**
7. **QR Code Generator & Styling Studio**
8. **Physics Motion & Velocity Suite**
9. **CSS Gradient & Mesh Studio**
10. **Word, Character & Readability Analyzer**
11. **AES-256 Cryptography Suite**
12. **Dynamic XML Sitemap Generator**

### C. Category Matrix Grid (8 Categories & 25 Sub-categories)
- Clean card architecture with custom category icons, subcategory pills, and tool counts.
- Seamless toggle between **Category Matrix** and **Instant Voice Transcriber** embed.

### D. User Experience & SEO Rich Content
- **Recently Used Tools**: Automatically stores visited tools in browser `localStorage` (`inwebtools_recent_tools`) and displays quick jump links.
- **Platform Feature Highlights**: WASM client processing, zero data logging, responsive mobile design, and bilingual support.
- **SEO Rich Text FAQ Section**: Collapsible bilingual FAQs with structured questions and answers.

---

## 2. Super Admin System Setup & Dashboard Portal

### A. Database & CLI Seeder
- **CLI Script**: `WebApplication/server/scripts/seedSuperAdmin.js`
  ```bash
  node server/scripts/seedSuperAdmin.js [username] [email] [password] [fullName]
  ```
- **API Setup Endpoint**: `POST /api/admin/setup-super-admin`
  - Allows first-time provisioning or updates with `ADMIN_SETUP_SECRET` / `JWT_SECRET`.
  - Hashes passwords using bcrypt (cost 12), sets `role = 'super_admin'`, logs audit trail, and issues JWT access/refresh tokens.

### B. Super Admin Dashboard Routes & Features
- `/AdminDashboard/Overview` (`SystemOverview.tsx`):
  - User and tool KPI aggregates.
  - Live server telemetry (Node version, Memory RSS/Heap, Process Uptime, Database status).
  - Quick operations (Sync Registry, User Governance, Ad Manager).
- `/AdminDashboard/Tools/MasterManager` (`MasterToolsManager.tsx`):
  - Searchable, filterable table for all tools across all 10 modules.
  - Inline toggles for `status` (`published`/`draft`/`archived`), `isFeatured` (★), and `isPremium` (🔒).
  - Tool metadata modal editor (name, tagline, description, tags).
- `/AdminDashboard/Monetization/AdManager` (`AdMonetizationManager.tsx`):
  - Google AdSense Publisher ID injection (`ca-pub-XXXXXXXXXXXXXXXX`).
  - Ad placement switches (Header Top Banner, In-Content / Tool Canvas, Sidebar Skyscraper, Auto-Ads).
  - AdBlocker polite notice banner.
  - Global Header script tags injection & custom sponsor HTML block.
- `/AdminDashboard/Users/RoleManager` (`UserRoleManager.tsx`):
  - User management table with search and role filter.
  - Role promotion/demotion (`super_admin`, `admin`, `user`).
  - Active/Banned status toggle and user deletion.
  - Guarded against self-demotion, self-banning, and self-deletion.

---

## 3. Security & Role-Based Access Control (RBAC)

- **Express Middlewares**: `requireAuth`, `requireAdmin`, and `requireRole('super_admin')`.
- **JWT Protection**: Short-lived access tokens (30m) and rotating refresh tokens (7d).
- **Audit Logging**: Every administrative action (role change, user ban, tool edit, setting update) is recorded in `admin_audit_log`.
