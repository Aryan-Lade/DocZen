<div align="center">

# 📄 DocZen

### The all-in-one document workspace — merge, convert, compress, protect & read your files in one place.

<br/>

![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?style=for-the-badge&logo=express&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-Sequelize-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

<br/>

**25+ document tools · JWT auth · File library · Activity history · OCR · Offline language detection**

</div>

---

## 🌟 Overview

**DocZen** is a full-stack **Document Management & Processing System**. It gives users a single, secure workspace to run everyday document operations — combining, splitting, converting, compressing, protecting, watermarking and extracting text from PDFs, images and Office files — all behind a clean, authenticated web app.

The backend exposes a modular REST API (each tool is its own controller + route), and the frontend renders **every tool from a single config-driven registry**, so new tools appear in the UI the moment they're added to the catalog.

```
🔐 Sign up  →  🧰 Pick a tool  →  📤 Upload file(s)  →  ⚙️ Process on server  →  📥 Download result
                                                                         ↳ 📝 Logged to Activity history
```

---

## ✨ Feature Highlights

<table>
<tr>
<td width="33%" valign="top">

### 🔐 Accounts & Security
- JWT authentication (30-day tokens)
- Register / Login / Logout
- Profile update & change password
- Forgot / reset password flow
- Delete account
- Per-user **storage quota** (1 GB default)
- `bcrypt` password hashing (12 rounds)

</td>
<td width="33%" valign="top">

### 🗂️ File Library
- Upload up to **20 files** at once
- Personal document store (per owner)
- Rename, download & delete files
- Auto-categorization (pdf / image / word / excel / ppt / text)
- Storage-usage statistics
- Soft-delete support

</td>
<td width="33%" valign="top">

### 📊 Activity & Insights
- Every operation logged
- Success / failed / pending status
- Operation, filename & size tracked
- Clearable activity history
- Dashboard stats & usage overview

</td>
</tr>
</table>

---

## 🧰 The Toolbox — 25+ Tools

> Rendered dynamically from a central tool registry (`client/src/lib/tools.ts`) — one config drives the entire UI.

### 📄 PDF Tools
| Tool | What it does | Endpoint |
|------|--------------|----------|
| 🔗 **Merge PDF** | Combine multiple PDFs into one | `POST /api/pdf/merge` |
| ✂️ **Split PDF** | Extract page ranges, custom pages, or split every page | `POST /api/pdf/split` |
| 🗜️ **Compress PDF** | Reduce file size (Ghostscript-backed) | `POST /api/pdf/compress` |
| 🔒 **Protect PDF** | Add password encryption | `POST /api/pdf/protect` |
| 🔓 **Unlock PDF** | Remove password from authorized files | `POST /api/pdf/unlock` |
| 🔀 **Reorder Pages** | Rearrange pages into a new order | `POST /api/pdf/reorder` |
| 🔄 **Rotate Pages** | Rotate all or selected pages (90/180/270°) | `POST /api/pdf/rotate` |
| 💧 **Add Watermark** | Stamp positioned text watermark w/ opacity & color | `POST /api/pdf/watermark` |
| 🔢 **Page Numbers** | Numeric or Roman numerals, any corner | `POST /api/pdf/number-pages` |

### 🖼️ Image Tools
| Tool | What it does | Endpoint |
|------|--------------|----------|
| 🖼️ **Compress Image** | Shrink images with quality control | `POST /api/image/compress` |
| 🎨 **Convert Image** | JPG · PNG · WEBP · BMP · TIFF | `POST /api/image/convert` |
| 📸 **PDF → Images** | Convert each PDF page to JPG | `POST /api/image/pdf-to-image` |

### 🔁 File Conversion
| Tool | What it does | Endpoint |
|------|--------------|----------|
| 📄 **Word → PDF** | Convert `.doc` / `.docx` to PDF | `POST /api/convert/office-to-pdf` |
| 📊 **Office → PDF** | Word · Excel · PowerPoint → PDF (LibreOffice) | `POST /api/convert/office-to-pdf` |
| 📝 **PDF → Word** | Convert PDF to editable `.docx` | `POST /api/convert/pdf-to-office` |
| 📝 **Text → PDF** | Turn a `.txt` file into a PDF | `POST /api/convert/text-to-pdf` |
| 🌐 **HTML → PDF** | Convert an HTML file to PDF | `POST /api/convert/html-to-pdf` |

### 🤖 Text & AI
| Tool | What it does | Endpoint |
|------|--------------|----------|
| 👁️ **OCR — Extract Text** | Read text from images & scans (7 languages via Tesseract) | `POST /api/ocr/extract` |
| 🌍 **Language Detection** | Detect **180+ languages** offline from files or pasted text | `POST /api/language/detect` |

---

## 🏗️ Architecture

```
┌──────────────────────────────┐         ┌────────────────────────────────────────────┐
│         CLIENT (Vite)         │         │              SERVER (Express)                │
│  React 18 + TypeScript + RR6  │  HTTPS  │   REST API · JWT · Rate-limited · Helmet     │
│                               │ ◄─────► │                                              │
│  • Dashboard  • Tools         │  /api   │  Controllers ── Routes ── Middlewares        │
│  • ToolRunner • Files         │         │      │                                       │
│  • Activity   • Profile       │         │      ├── auth ── files ── activity           │
│  • Auth (Login/Register)      │         │      ├── pdf  ── image ── ocr                 │
│                               │         │      └── convert ── language                 │
│  Config-driven tool registry  │         │                                              │
└──────────────────────────────┘         │  Sequelize ORM                               │
                                          │      ├── User      ├── Document ── Activity   │
                                          └──────────────┬───────────────────────────────┘
                                                         │
                                                  ┌──────▼──────┐   ┌───────────────────┐
                                                  │   MySQL DB   │   │  System binaries  │
                                                  │  users /     │   │  LibreOffice · gs │
                                                  │  documents / │   │  (Office→PDF,     │
                                                  │  activities  │   │   compression)    │
                                                  └──────────────┘   └───────────────────┘
```

### 🧩 Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18 · TypeScript · React Router 6 · Axios · Vite 5 |
| **Backend** | Node 20 · Express 4 · TypeScript · ts-node-dev |
| **Database** | MySQL · Sequelize ORM |
| **Auth & Security** | JWT · bcryptjs · Helmet · CORS · express-rate-limit · express-validator |
| **Documents** | pdf-lib · pdf-parse · mammoth · docx · sharp · tesseract.js · franc |
| **Uploads** | Multer (disk storage, UUID filenames, 100 MB limit) |
| **DevOps** | Docker (multi-stage) · Railway-ready · morgan logging |

---

## 🛡️ Built-in Security

| Protection | Detail |
|-----------|--------|
| 🔑 **JWT auth** | Bearer tokens, 30-day expiry, protected routes via `protect` middleware |
| 🔒 **Password hashing** | `bcrypt` with 12 salt rounds, excluded from queries by default scope |
| 🚦 **Rate limiting** | Global (200 / 15 min) · Auth (20 / 15 min) · Uploads (50 / 10 min) |
| 🪖 **Helmet** | Secure HTTP headers with cross-origin resource policy |
| ✅ **Validation** | `express-validator` on auth & inputs |
| 📁 **Upload filtering** | MIME allow-list + 100 MB per-file cap |
| 🌐 **CORS** | Locked to configured client origin with credentials |

---

## 🚀 Getting Started

### ✅ Prerequisites
- **Node.js 20+** and **npm**
- **MySQL** database (local or hosted, e.g. Railway)
- *(Optional)* **LibreOffice** → Office/Word to PDF conversion
- *(Optional)* **Ghostscript** → advanced PDF compression & PDF-to-image

### 1️⃣ Clone
```bash
git clone <your-repo-url>
cd DocZen
```

### 2️⃣ Backend
```bash
cd server
cp .env.example .env          # then fill in DB + JWT values
npm install
npm run dev                    # http://localhost:5000
```

### 3️⃣ Frontend
```bash
cd client
cp .env.example .env           # leave VITE_API_URL empty for local dev
npm install
npm run dev                    # http://localhost:5173
```

> 💡 In development, Vite proxies `/api` → `http://localhost:5000`, so no CORS setup is needed locally.

### 🩺 Health check
```bash
curl http://localhost:5000/api/health
# { "success": true, "message": "DocFusion API is running", ... }
```

---

## ⚙️ Environment Variables

<details>
<summary><b>🖥️ Server (<code>server/.env</code>)</b></summary>

```env
NODE_ENV=development
PORT=5000

# MySQL — single URL (recommended) …
DATABASE_URL=mysql://root:password@localhost:3306/docfusion
# … or individual vars
MYSQLHOST=localhost
MYSQLPORT=3306
MYSQLUSER=root
MYSQLPASSWORD=password
MYSQLDATABASE=docfusion
MYSQL_SSL=false

# Auth
JWT_SECRET=change_this_in_production
JWT_EXPIRE=30d

# CORS
CLIENT_URL=http://localhost:5173

# Optional binaries
LIBREOFFICE_PATH=libreoffice
GHOSTSCRIPT_PATH=gs
```
</details>

<details>
<summary><b>🌐 Client (<code>client/.env</code>)</b></summary>

```env
# Leave empty for local dev (Vite proxy handles /api).
# In production, point to your backend:
VITE_API_URL=
```
</details>

---

## 🐳 Docker Deployment

The server ships a **multi-stage Dockerfile** that bundles **LibreOffice + Ghostscript + fonts**, so all conversion tools work out of the box.

```bash
cd server
docker build -t doczen-server .
docker run -p 5000:5000 --env-file .env doczen-server
```

☁️ **Railway-ready** — set `DATABASE_URL` / MySQL vars and `CLIENT_URL`; SSL is auto-enabled for Railway hosts.

---

## 📚 API Reference

<details>
<summary><b>🔐 Auth — <code>/api/auth</code></b></summary>

| Method | Route | Description | Auth |
|--------|-------|-------------|:----:|
| `POST` | `/register` | Create account | – |
| `POST` | `/login` | Log in, receive JWT | – |
| `GET`  | `/me` | Current user | ✅ |
| `PUT`  | `/profile` | Update profile | ✅ |
| `PUT`  | `/change-password` | Change password | ✅ |
| `POST` | `/forgot-password` | Request reset | – |
| `PUT`  | `/reset-password/:token` | Reset password | – |
| `DELETE` | `/account` | Delete account | ✅ |
</details>

<details>
<summary><b>🗂️ Files — <code>/api/files</code></b> · <b>📊 Activity — <code>/api/activity</code></b></summary>

| Method | Route | Description |
|--------|-------|-------------|
| `GET`  | `/files/stats` | Storage & usage stats |
| `POST` | `/files/upload` | Upload up to 20 files |
| `GET`  | `/files` | List documents |
| `GET`  | `/files/:id` | Get one document |
| `PUT`  | `/files/:id/rename` | Rename |
| `DELETE` | `/files/:id` | Delete |
| `GET`  | `/files/:id/download` | Download |
| `GET`  | `/activity` | List activity log |
| `DELETE` | `/activity` | Clear activity log |

*All file & activity routes require authentication.*
</details>

<details>
<summary><b>🧰 Tools — <code>/api/pdf</code> · <code>/api/image</code> · <code>/api/convert</code> · <code>/api/ocr</code> · <code>/api/language</code></b></summary>

See the [Toolbox tables](#-the-toolbox--25-tools) above — every tool maps to one endpoint. All tool routes require authentication and are upload-rate-limited.
</details>

---

## 🗂️ Project Structure

```
DocZen/
├── client/                      # React + Vite frontend
│   └── src/
│       ├── components/          # AuthShell · Dropzone · Layout
│       ├── context/             # AuthContext (JWT session)
│       ├── lib/                 # api.ts (axios) · tools.ts (tool registry)
│       └── pages/               # Dashboard · Tools · ToolRunner · Files
│                                #   Activity · Profile · Login · Register
│
└── server/                      # Express + TypeScript backend
    ├── Dockerfile               # Multi-stage w/ LibreOffice + Ghostscript
    └── src/
        ├── config/              # db.ts (Sequelize/MySQL)
        ├── controllers/         # auth · file · pdf · image · ocr
        │                        #   convert · activity · language
        ├── middlewares/         # auth · error · rateLimiter · upload · validation
        ├── models/              # User · Document · Activity
        ├── routes/              # One router per feature area
        └── index.ts             # App bootstrap & route mounting
```

---

## 🗺️ Data Models

| Model | Key Fields |
|-------|-----------|
| 👤 **User** | `name`, `email`, `password` (hashed), `role`, `storageUsed`, `storageLimit`, reset-token fields |
| 📄 **Document** | `ownerId`, `originalName`, `fileName`, `filePath`, `mimeType`, `size`, `category`, `tags`, `isDeleted` |
| 📝 **Activity** | `userId`, `operation`, `fileName`, `status`, `details`, `fileSize` |

*Relationships:* a **User** has many **Documents** and **Activities** (cascade on delete).

---

## 🧭 Roadmap

- [ ] File sharing & public links
- [ ] Batch/queue processing for large jobs
- [ ] Cloud storage backends (S3-compatible)
- [ ] Admin dashboard & role management
- [ ] E-signatures on PDFs

---

<div align="center">

### 🧾 License

Released under the **MIT License**.

<br/>

**Made with ❤️ using React, Express & TypeScript**

⭐ *Star this repo if DocZen made your document workflow easier!*

</div>
