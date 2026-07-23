# UPLOAD_MIRROR - Architecture & Deployment Guide

> Complete system architecture, how uploads work, and free deployment options.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Project Architecture](#2-project-architecture)
3. [How Uploads Work](#3-how-uploads-work)
4. [Backend Options](#4-backend-options)
5. [Free Hosting Options](#5-free-hosting-options)
6. [Database Setup](#6-database-setup)
7. [Security](#7-security)
8. [Deployment Guide](#8-deployment-guide)
9. [Cost Analysis](#9-cost-analysis)

---

## 1. System Overview

### What UPLOAD_MIRROR Does

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           UPLOAD_MIRROR SYSTEM                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   LOCAL HLS FILES              UPLOAD_MIRROR              SUPABASE STORAGE  │
│   ──────────────────           ─────────────              ────────────────  │
│                                                                             │
│   Chainsaw_Man/                                           Account 1 (1GB)   │
│   └── EP01/                    ┌──────────────┐           ├── 1080/         │
│       ├── 1080/ ──────────────►│              │──────────►├── 720/          │
│       ├── 720/  ──────────────►│   Backend    │           └── 360/          │
│       ├── 480/  ──────────────►│   Server     │                             │
│       ├── 360/  ──────────────►│              │           Account 2 (1GB)   │
│       ├── 240/  ──────────────►│  (Allocates  │──────────►├── 480/          │
│       ├── 144/  ──────────────►│   & Uploads) │           ├── 240/          │
│       ├── aud-sbs/ ───────────►│              │           ├── 144/          │
│       └── master.m3u8          └──────────────┘           └── aud-sbs/      │
│           (manual upload)              │                                    │
│                                        │                                    │
│                                        ▼                                    │
│                               ┌──────────────┐                              │
│                               │   Database   │                              │
│                               │  (Postgres)  │                              │
│                               │              │                              │
│                               │ - Accounts   │                              │
│                               │ - Series     │                              │
│                               │ - Episodes   │                              │
│                               │ - URLs       │                              │
│                               └──────────────┘                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Core Flow Summary

```
1. USER selects episode folder (EP01/)
2. SYSTEM scans all quality folders, calculates sizes
3. SYSTEM runs allocation algorithm (bin-packing)
4. SYSTEM shows allocation plan to user
5. USER confirms → SYSTEM uploads files to assigned Supabase accounts
6. SYSTEM generates URLs for each quality folder
7. USER manually edits & uploads master.m3u8 with correct URLs
```

---

## 2. Project Architecture

### Recommended Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                        TECH STACK                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  FRONTEND (Next.js 15 App Router)                               │
│  ├── React 19                                                   │
│  ├── TypeScript                                                 │
│  ├── Tailwind CSS + shadcn/ui                                   │
│  ├── TanStack Query (data fetching)                             │
│  ├── Zustand (state management)                                 │
│  └── webkitdirectory API (folder selection)                     │
│                                                                 │
│  BACKEND (Same Next.js or Separate)                             │
│  ├── Next.js API Routes (simple) OR                             │
│  ├── Fastify/Express (advanced)                                 │
│  ├── Prisma ORM (database)                                      │
│  ├── AWS SDK v3 (S3 uploads)                                    │
│  └── node-cron (scheduled tasks)                                │
│                                                                 │
│  DATABASE                                                       │
│  └── PostgreSQL (Supabase UPLOADER_MQ project)                  │
│                                                                 │
│  STORAGE                                                        │
│  └── Multiple Supabase projects (S3-compatible)                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Folder Structure

```
upload-mirror/
├── app/                          # Next.js App Router
│   ├── (dashboard)/              # Dashboard layout group
│   │   ├── accounts/             # Account management
│   │   │   ├── page.tsx          # List accounts
│   │   │   └── [id]/page.tsx     # Edit account
│   │   ├── series/               # Series management
│   │   │   ├── page.tsx          # List series
│   │   │   └── [id]/page.tsx     # Series details
│   │   ├── upload/               # Upload interface
│   │   │   ├── page.tsx          # Folder picker & allocation
│   │   │   └── [jobId]/page.tsx  # Upload progress
│   │   ├── storage/              # Storage browser
│   │   │   └── page.tsx          # View bucket files
│   │   └── layout.tsx            # Dashboard layout with sidebar
│   ├── api/                      # API Routes
│   │   ├── accounts/
│   │   │   ├── route.ts          # GET (list), POST (create)
│   │   │   └── [id]/route.ts     # GET, PUT, DELETE
│   │   ├── series/
│   │   │   └── route.ts
│   │   ├── upload/
│   │   │   ├── init/route.ts     # POST - scan & allocate
│   │   │   ├── start/route.ts    # POST - begin upload
│   │   │   └── [jobId]/
│   │   │       ├── status/route.ts
│   │   │       └── chunk/route.ts
│   │   └── storage/
│   │       └── [accountId]/route.ts  # List bucket files
│   ├── layout.tsx
│   ├── page.tsx                  # Landing/redirect
│   └── globals.css
├── components/
│   ├── ui/                       # shadcn components
│   ├── accounts/
│   │   ├── AccountCard.tsx
│   │   ├── AccountForm.tsx
│   │   └── StorageBar.tsx
│   ├── upload/
│   │   ├── FolderPicker.tsx
│   │   ├── AllocationPreview.tsx
│   │   ├── UploadProgress.tsx
│   │   └── UrlGenerator.tsx
│   └── storage/
│       └── FileBrowser.tsx
├── lib/
│   ├── db/
│   │   └── prisma.ts             # Prisma client
│   ├── s3/
│   │   ├── client.ts             # S3 client factory
│   │   └── upload.ts             # Upload utilities
│   ├── crypto/
│   │   └── encrypt.ts            # AES-256-GCM encryption
│   ├── allocation/
│   │   └── bin-packing.ts        # Allocation algorithm
│   └── utils/
│       ├── folder-scanner.ts     # Scan folder sizes
│       └── url-generator.ts      # Generate public URLs
├── prisma/
│   └── schema.prisma             # Database schema
├── public/
├── .env.local                    # Environment variables
├── next.config.ts
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## 3. How Uploads Work

### Step-by-Step Upload Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          COMPLETE UPLOAD FLOW                               │
└─────────────────────────────────────────────────────────────────────────────┘

STEP 1: FOLDER SELECTION (Frontend)
═══════════════════════════════════
┌─────────────────────────────────────┐
│ User clicks "Select Folder"         │
│                                     │
│ Browser: <input webkitdirectory>    │
│                                     │
│ Selected: C:\HLS\Chainsaw_Man\EP01\ │
└─────────────────────────────────────┘
           │
           ▼
STEP 2: FOLDER SCANNING (Frontend)
══════════════════════════════════
┌─────────────────────────────────────┐
│ JavaScript scans all files:         │
│                                     │
│ for (file of selectedFiles) {       │
│   folderName = file.webkitRelative  │
│     .split('/')[0]                  │
│   folders[folderName].size += file.size │
│   folders[folderName].files.push(file)  │
│ }                                   │
│                                     │
│ Result:                             │
│ {                                   │
│   "1080": { size: 598MB, count: 148 }│
│   "720":  { size: 290MB, count: 148 }│
│   ...                               │
│ }                                   │
└─────────────────────────────────────┘
           │
           ▼
STEP 3: SEND METADATA TO BACKEND
════════════════════════════════
┌─────────────────────────────────────┐
│ POST /api/upload/init               │
│                                     │
│ Body: {                             │
│   seriesId: "uuid",                 │
│   seasonId: "uuid",                 │
│   episodeNumber: 1,                 │
│   episodeTitle: "EP01",             │
│   folders: [                        │
│     { name: "1080", size: 598000000,│
│       fileCount: 148 },             │
│     { name: "720", size: 290000000, │
│       fileCount: 148 },             │
│     ...                             │
│   ]                                 │
│ }                                   │
│                                     │
│ NOTE: Only metadata sent, not files!│
└─────────────────────────────────────┘
           │
           ▼
STEP 4: ALLOCATION ALGORITHM (Backend)
══════════════════════════════════════
┌─────────────────────────────────────┐
│ 1. Fetch available accounts from DB │
│                                     │
│ 2. Run bin-packing algorithm:       │
│    - Sort folders by size (desc)    │
│    - For each folder, find best     │
│      account that fits              │
│    - Maximize account usage         │
│                                     │
│ 3. Create database records:         │
│    - episodes (status: pending)     │
│    - episode_quality_folders        │
│    - upload_jobs (status: queued)   │
│                                     │
│ 4. Return allocation plan           │
└─────────────────────────────────────┘
           │
           ▼
STEP 5: USER CONFIRMS (Frontend)
════════════════════════════════
┌─────────────────────────────────────┐
│ ┌─────────────────────────────────┐ │
│ │ ALLOCATION PREVIEW              │ │
│ │                                 │ │
│ │ Account 1: 1080 + 720 + 360     │ │
│ │ Account 2: 480 + 240 + aud-sbs  │ │
│ │                                 │ │
│ │ Total: 1.1 GB across 2 accounts │ │
│ │                                 │ │
│ │ [Cancel]  [Start Upload]        │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
           │
           ▼
STEP 6: UPLOAD EXECUTION (Frontend → Backend → Supabase)
════════════════════════════════════════════════════════

METHOD A: Direct from Browser (Simpler)
───────────────────────────────────────
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Browser ───────────────────────────────────► Supabase S3   │
│           (direct upload with presigned URL)                │
│                                                             │
│  Flow:                                                      │
│  1. Frontend requests presigned URL from backend            │
│  2. Backend generates presigned URL using account creds     │
│  3. Frontend uploads directly to Supabase S3                │
│  4. Frontend notifies backend on completion                 │
│                                                             │
│  Pros: Fast, no bandwidth through backend                   │
│  Cons: Needs presigned URLs, client handles uploads         │
│                                                             │
└─────────────────────────────────────────────────────────────┘

METHOD B: Through Backend (More Secure)
───────────────────────────────────────
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Browser ──────► Backend ──────► Supabase S3                │
│          (chunks)       (stream)                            │
│                                                             │
│  Flow:                                                      │
│  1. Frontend sends file in chunks to backend                │
│  2. Backend streams chunks directly to Supabase S3          │
│  3. Backend updates progress in database                    │
│  4. No credentials exposed to frontend                      │
│                                                             │
│  Pros: Credentials never leave server                       │
│  Cons: Backend bandwidth used, slower                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘

RECOMMENDED: Method A (Direct) for speed, with presigned URLs
           │
           ▼
STEP 7: PROGRESS TRACKING
═════════════════════════
┌─────────────────────────────────────┐
│ Frontend polls /api/upload/[id]/status │
│ OR uses WebSocket for real-time     │
│                                     │
│ Response: {                         │
│   status: "uploading",              │
│   folders: [                        │
│     { name: "1080",                 │
│       uploaded: 45,                 │
│       total: 148,                   │
│       bytesUploaded: 280000000 }    │
│   ],                                │
│   overallProgress: 42               │
│ }                                   │
└─────────────────────────────────────┘
           │
           ▼
STEP 8: COMPLETION & URL GENERATION
═══════════════════════════════════
┌─────────────────────────────────────┐
│ When all files uploaded:            │
│                                     │
│ 1. Update episode status = "done"   │
│ 2. Generate public URLs:            │
│                                     │
│ 1080.m3u8 URL:                      │
│ https://[project].supabase.co/      │
│   storage/v1/object/public/         │
│   hls_media/Chainsaw_Man/S1/EP01/   │
│   1080/1080.m3u8                    │
│                                     │
│ 3. Store URLs in                    │
│    episode_quality_folders.m3u8_url │
│                                     │
│ 4. Show URL reference to user       │
└─────────────────────────────────────┘
           │
           ▼
STEP 9: MASTER.M3U8 (Manual)
════════════════════════════
┌─────────────────────────────────────┐
│ System provides URL reference:      │
│                                     │
│ "Replace paths in master.m3u8:"     │
│                                     │
│ 1080/1080.m3u8 →                    │
│   https://acc1.supabase.co/.../1080/│
│                                     │
│ aud-sbs/audio_eng.m3u8 →            │
│   https://acc2.supabase.co/.../     │
│                                     │
│ User edits master.m3u8 locally      │
│ User uploads to chosen location     │
│ User provides final master URL      │
└─────────────────────────────────────┘
```

### Upload Code Example

```typescript
// lib/s3/upload.ts

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Create S3 client for a Supabase account
export function createS3Client(account: SupabaseAccount): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: account.s3_endpoint,
    credentials: {
      accessKeyId: decrypt(account.s3_access_key),
      secretAccessKey: decrypt(account.s3_secret_key),
    },
    forcePathStyle: true,
  });
}

// Generate presigned URL for direct upload
export async function getPresignedUploadUrl(
  account: SupabaseAccount,
  key: string,
  contentType: string
): Promise<string> {
  const client = createS3Client(account);
  
  const command = new PutObjectCommand({
    Bucket: account.bucket_name,
    Key: key,
    ContentType: contentType,
  });
  
  // URL valid for 1 hour
  return getSignedUrl(client, command, { expiresIn: 3600 });
}

// Frontend uploads directly to this URL
// fetch(presignedUrl, { method: 'PUT', body: file })
```

---

## 4. Backend Options

### Option A: Next.js API Routes (Recommended for Simplicity)

```
┌─────────────────────────────────────┐
│ NEXT.JS FULL-STACK                  │
├─────────────────────────────────────┤
│                                     │
│ Frontend + Backend in ONE project   │
│                                     │
│ Pros:                               │
│ ✅ Simple deployment (one service)  │
│ ✅ Shared types & code              │
│ ✅ Easy to get started              │
│ ✅ Free hosting on Vercel           │
│                                     │
│ Cons:                               │
│ ⚠️ Vercel has 10s timeout (free)    │
│ ⚠️ Limited for long-running tasks   │
│ ⚠️ No background jobs               │
│                                     │
│ Best for:                           │
│ → Direct browser uploads            │
│ → Presigned URL approach            │
│                                     │
└─────────────────────────────────────┘
```

### Option B: Separate Backend (For Advanced Features)

```
┌─────────────────────────────────────┐
│ SEPARATE BACKEND                    │
├─────────────────────────────────────┤
│                                     │
│ Frontend: Next.js on Vercel         │
│ Backend: Fastify on Railway/Render  │
│                                     │
│ Pros:                               │
│ ✅ No timeout limits                 │
│ ✅ Background jobs support          │
│ ✅ Can process uploads server-side  │
│ ✅ WebSocket support                │
│                                     │
│ Cons:                               │
│ ⚠️ More complex deployment          │
│ ⚠️ CORS configuration needed        │
│ ⚠️ Two services to manage           │
│                                     │
│ Best for:                           │
│ → Server-side upload processing     │
│ → Queue-based uploads               │
│ → Real-time progress via WebSocket  │
│                                     │
└─────────────────────────────────────┘
```

### Recommendation Based on Your Use Case

```
YOUR SITUATION:
- Personal tool (not public)
- Upload from your own computer
- Files are local to you

RECOMMENDATION: Next.js Full-Stack with Direct Uploads

Why:
1. You select folders from YOUR browser
2. Files upload directly from YOUR browser to Supabase
3. Backend only handles coordination & database
4. No need for server to process large files
5. Free hosting on Vercel works perfectly
```

---

## 5. Free Hosting Options

### Complete Free Stack

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FREE HOSTING STACK                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SERVICE          PROVIDER        FREE TIER                   LIMITS        │
│  ───────────────────────────────────────────────────────────────────────── │
│                                                                             │
│  Frontend +       Vercel          Forever free               100GB BW/mo   │
│  API Routes                       Hobby plan                 10s timeout   │
│                                                                             │
│  Database         Supabase        Forever free               500MB DB      │
│                   (UPLOADER_MQ)   2 projects                 1GB storage   │
│                                                                             │
│  Storage          Supabase        1GB per project            Rate limits   │
│                   (Multiple)      Unlimited projects*                      │
│                                                                             │
│  Alternative      Railway         $5 free credit/mo          500 hours     │
│  Backend          Render          750 hours free/mo          Sleeps        │
│                   Fly.io          3 shared VMs free          256MB RAM     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

*Supabase allows multiple free projects - perfect for multi-account storage!
```

### Detailed Hosting Options

#### 1. Vercel (Recommended for Frontend)

```
┌─────────────────────────────────────┐
│ VERCEL                              │
├─────────────────────────────────────┤
│ Website: vercel.com                 │
│                                     │
│ Free Tier:                          │
│ ├── Unlimited deployments           │
│ ├── 100GB bandwidth/month           │
│ ├── Automatic HTTPS                 │
│ ├── Edge functions                  │
│ └── GitHub integration              │
│                                     │
│ Limitations:                        │
│ ├── 10 second function timeout      │
│ ├── 4.5MB request body limit        │
│ └── No persistent connections       │
│                                     │
│ Perfect for:                        │
│ ✅ Next.js frontend                 │
│ ✅ API routes (coordination)        │
│ ✅ Presigned URL generation         │
│                                     │
│ Deploy command:                     │
│ $ npx vercel                        │
└─────────────────────────────────────┘
```

#### 2. Railway (Alternative Backend)

```
┌─────────────────────────────────────┐
│ RAILWAY                             │
├─────────────────────────────────────┤
│ Website: railway.app                │
│                                     │
│ Free Tier:                          │
│ ├── $5 free credits/month           │
│ ├── ~500 hours runtime              │
│ ├── 512MB RAM                       │
│ ├── No sleep (always on)            │
│ └── Built-in PostgreSQL             │
│                                     │
│ Perfect for:                        │
│ ✅ Separate backend server          │
│ ✅ Background jobs                  │
│ ✅ Long-running processes           │
│ ✅ WebSocket connections            │
│                                     │
│ Deploy:                             │
│ Connect GitHub → Auto deploy        │
└─────────────────────────────────────┘
```

#### 3. Render (Alternative)

```
┌─────────────────────────────────────┐
│ RENDER                              │
├─────────────────────────────────────┤
│ Website: render.com                 │
│                                     │
│ Free Tier:                          │
│ ├── 750 hours/month                 │
│ ├── 512MB RAM                       │
│ ├── Auto-sleep after 15 min        │
│ └── Free PostgreSQL (90 days)       │
│                                     │
│ Limitation:                         │
│ ⚠️ Service sleeps when inactive     │
│ ⚠️ Cold start delay (~30s)          │
│                                     │
│ Perfect for:                        │
│ ✅ Personal projects                │
│ ✅ Infrequent use                   │
└─────────────────────────────────────┘
```

#### 4. Fly.io (Alternative)

```
┌─────────────────────────────────────┐
│ FLY.IO                              │
├─────────────────────────────────────┤
│ Website: fly.io                     │
│                                     │
│ Free Tier:                          │
│ ├── 3 shared-cpu VMs                │
│ ├── 256MB RAM each                  │
│ ├── 3GB persistent storage          │
│ └── 160GB outbound bandwidth        │
│                                     │
│ Perfect for:                        │
│ ✅ Docker deployments               │
│ ✅ Global edge deployment           │
│ ✅ Persistent connections           │
└─────────────────────────────────────┘
```

### Recommended Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    RECOMMENDED FREE ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                          ┌──────────────┐                                   │
│                          │   VERCEL     │                                   │
│                          │  (Frontend)  │                                   │
│                          │  + API Routes│                                   │
│                          └──────┬───────┘                                   │
│                                 │                                           │
│                    ┌────────────┼────────────┐                              │
│                    │            │            │                              │
│                    ▼            ▼            ▼                              │
│            ┌───────────┐ ┌───────────┐ ┌───────────┐                        │
│            │ Supabase  │ │ Supabase  │ │ Supabase  │                        │
│            │ Account 1 │ │ Account 2 │ │ Account 3 │  ... (Storage)         │
│            │  (1GB)    │ │  (1GB)    │ │  (1GB)    │                        │
│            └───────────┘ └───────────┘ └───────────┘                        │
│                                                                             │
│                                 │                                           │
│                                 ▼                                           │
│                          ┌───────────┐                                      │
│                          │ Supabase  │                                      │
│                          │UPLOADER_MQ│  (Database - PostgreSQL)             │
│                          │  (500MB)  │                                      │
│                          └───────────┘                                      │
│                                                                             │
│  TOTAL COST: $0/month                                                       │
│  STORAGE: Unlimited (add more Supabase projects as needed)                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Database Setup

### Already Created!

Your database is already set up in Supabase project `UPLOADER_MQ`:

```
Project ID: eaenpunkundwnxfnmsel
Region: ap-northeast-2
Database URL: postgresql://postgres:[password]@db.eaenpunkundwnxfnmsel.supabase.co:5432/postgres

Tables Created:
✅ supabase_accounts
✅ series
✅ seasons
✅ episodes
✅ episode_quality_folders
✅ upload_jobs
✅ system_logs
```

### Prisma Configuration

```prisma
// prisma/schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// Models will map to existing tables
// Use `prisma db pull` to introspect existing schema
```

### Environment Variables

```env
# .env.local

# Database (Supabase UPLOADER_MQ)
DATABASE_URL="postgresql://postgres:[password]@db.eaenpunkundwnxfnmsel.supabase.co:5432/postgres"

# Encryption key for credentials (generate random 32-byte hex)
ENCRYPTION_KEY="your-32-byte-hex-key-here"

# Optional: For presigned URLs
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## 7. Security

### Credential Encryption

```typescript
// lib/crypto/encrypt.ts

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');

interface EncryptedData {
  iv: string;
  tag: string;
  ciphertext: string;
}

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  
  let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
  ciphertext += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  const result: EncryptedData = {
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    ciphertext
  };
  
  return JSON.stringify(result);
}

export function decrypt(encryptedJson: string): string {
  const { iv, tag, ciphertext }: EncryptedData = JSON.parse(encryptedJson);
  
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    KEY,
    Buffer.from(iv, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  
  let plaintext = decipher.update(ciphertext, 'hex', 'utf8');
  plaintext += decipher.final('utf8');
  
  return plaintext;
}
```

### Security Checklist

```
✅ Credentials encrypted at rest (AES-256-GCM)
✅ Encryption key in environment variable
✅ No credentials sent to frontend
✅ Presigned URLs expire (1 hour)
✅ Database credentials in env vars
✅ HTTPS enforced (Vercel default)
```

---

## 8. Deployment Guide

### Step-by-Step Deployment

```
DEPLOYMENT STEPS
════════════════

STEP 1: Prepare Repository
──────────────────────────
$ git init
$ git add .
$ git commit -m "Initial commit"
$ git remote add origin https://github.com/you/upload-mirror.git
$ git push -u origin main


STEP 2: Set Up Vercel
─────────────────────
1. Go to vercel.com
2. Sign in with GitHub
3. Click "Import Project"
4. Select your repository
5. Configure:
   - Framework: Next.js (auto-detected)
   - Root Directory: ./
   - Build Command: npm run build
   - Output Directory: .next


STEP 3: Add Environment Variables
─────────────────────────────────
In Vercel Dashboard → Settings → Environment Variables:

DATABASE_URL = "postgresql://postgres:xxx@db.eaenpunkundwnxfnmsel.supabase.co:5432/postgres"
ENCRYPTION_KEY = "generate-a-32-byte-hex-key"

Generate encryption key:
$ node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"


STEP 4: Deploy
──────────────
$ npx vercel --prod

Or: Push to main branch → Auto deploy


STEP 5: Verify
──────────────
1. Visit your-app.vercel.app
2. Test account creation
3. Test folder scanning
4. Test upload to Supabase
```

### Local Development

```bash
# Clone and install
git clone https://github.com/you/upload-mirror.git
cd upload-mirror
npm install

# Set up environment
cp .env.example .env.local
# Edit .env.local with your values

# Pull Prisma schema from existing DB
npx prisma db pull
npx prisma generate

# Run development server
npm run dev

# Open http://localhost:3000
```

---

## 9. Cost Analysis

### Free Tier Breakdown

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MONTHLY COST ANALYSIS                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SERVICE                USAGE                 COST                          │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Vercel (Frontend)      Hobby plan            $0                            │
│  ├── Bandwidth          < 100GB               Free                          │
│  └── Deployments        Unlimited             Free                          │
│                                                                             │
│  Supabase DB            UPLOADER_MQ           $0                            │
│  ├── Database           < 500MB               Free                          │
│  └── API requests       Unlimited             Free                          │
│                                                                             │
│  Supabase Storage       Per account           $0                            │
│  ├── Each account       1GB                   Free                          │
│  └── 10 accounts        10GB total            Free                          │
│  └── 100 accounts       100GB total           Free                          │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│  TOTAL MONTHLY COST                           $0                            │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  STORAGE CAPACITY:                                                          │
│  ├── 10 accounts  = 10 GB   (~9 episodes)                                  │
│  ├── 50 accounts  = 50 GB   (~45 episodes)                                 │
│  └── 100 accounts = 100 GB  (~90 episodes)                                 │
│                                                                             │
│  Note: Creating Supabase accounts is free and unlimited!                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### When You Might Need to Pay

```
PAID UPGRADES (Only if needed):

1. Vercel Pro ($20/mo)
   - If you need longer function timeouts
   - If bandwidth exceeds 100GB/mo

2. Supabase Pro ($25/mo per project)
   - If you need > 1GB storage per account
   - If you need more API requests
   - If you need more database storage

3. For your use case:
   → You probably NEVER need to pay
   → Just create more free Supabase accounts for more storage
```

---

## Quick Start Checklist

```
□ Step 1: Clone/create Next.js project
□ Step 2: Set up Prisma with existing database
□ Step 3: Create account management UI
□ Step 4: Create upload interface with folder picker
□ Step 5: Implement allocation algorithm
□ Step 6: Implement S3 upload with presigned URLs
□ Step 7: Create progress tracking
□ Step 8: Create storage browser
□ Step 9: Deploy to Vercel
□ Step 10: Add your Supabase accounts
□ Step 11: Start uploading!
```

---

## Next Steps

Ready to build? Let's start with **Step 1: Account Management**

This includes:
1. UI to add/edit/delete Supabase accounts
2. Encryption of credentials before storing
3. Test connection to verify S3 access
4. Display storage usage

Say "Let's build it" and I'll create the code! 🚀

