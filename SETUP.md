# UPLOAD_MIRROR - Setup Guide

## Quick Setup

### 1. Create Environment File

Create a `.env` file in the project root with:

```env
# Supabase UPLOADER_MQ (Database & Auth)
NEXT_PUBLIC_SUPABASE_URL=https://eaenpunkundwnxfnmsel.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhZW5wdW5rdW5kd254Zm5tc2VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyNzg1NTQsImV4cCI6MjA4MDg1NDU1NH0.ojhkKND7bON-0hHpO9cS1bXimpHQIBhashiZs7ShkRY
```

### 2. Restart Development Server

After creating the `.env` file, restart the server:

```bash
npm run dev
```

### 3. Create an Account

1. Open http://localhost:3000 (or the port shown)
2. Click "Sign up" to create an account
3. Use any email/password (Supabase auth)
4. Check email for verification link (if email confirmation is enabled)

### 4. Add Storage Accounts

After login:
1. Go to "Accounts" in the navbar
2. Click "Add Account"
3. Fill in your Supabase storage credentials:
   - **Name**: Any label (e.g., "Storage-1")
   - **Project URL**: Your Supabase project URL
   - **S3 Endpoint**: Usually `{project_url}/storage/v1/s3`
   - **Bucket Name**: The storage bucket name
   - **S3 Access Key**: From Supabase project settings
   - **S3 Secret Key**: From Supabase project settings
   - **Storage Limit**: 1000 (for 1GB free tier)
4. Click "Test" to verify connection
5. Click "Add Account"

---

## Getting S3 Credentials from Supabase

For each storage account:

1. Go to Supabase Dashboard → Your Project
2. Navigate to **Settings** → **API**
3. Copy your project URL
4. Navigate to **Storage** → **S3 Access Keys**
5. Create a new access key if needed
6. Copy the Access Key ID and Secret Access Key

---

## Features

- ✅ Dark theme with #00baba accent
- ✅ Supabase Authentication
- ✅ Account Management (Add/Edit/Delete)
- ✅ Storage Usage Tracking
- ✅ Connection Testing
- ✅ Storage Browser
- ✅ Folder Scanning (for uploads)
- ✅ Responsive Design

---

## Project Structure

```
upload-mirror/
├── app/
│   ├── dashboard/
│   │   ├── accounts/     # Account management
│   │   ├── upload/       # Upload interface
│   │   ├── storage/      # Storage browser
│   │   └── series/       # Series library
│   ├── login/            # Auth page
│   └── api/              # API routes
├── components/
│   ├── ui/               # Reusable UI components
│   ├── layout/           # Layout components
│   └── accounts/         # Account-specific components
├── lib/
│   ├── supabase.ts       # Supabase client
│   └── utils.ts          # Utility functions
└── .env                  # Environment variables
```

---

## Running the App

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

