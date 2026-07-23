## Supabase HLS Upload System
Privacy-first, multi-account uploader — production-ready blueprint.

Use this as a quick, skimmable implementation spec covering architecture, data, flows, APIs, security, resilience, deployment, and testing.

### Quick map
- Flow summary
- Architecture
- Data model
- UX/flows
- APIs
- Sequence
- Allocation
- m3u8 rewrite
- Security
- Resilience
- Deployment
- Testing
- Rollout

### 1) Flow summary
User picks local HLS folders → frontend sends folder metadata → backend allocates quality folders to Supabase accounts → backend streams uploads via S3 API → backend rewrites and uploads final master.m3u8 → backend returns final playable URLs. Secrets stay encrypted; no client direct uploads.

### 2) Architecture
- Frontend (Next.js + Tailwind): folder picker, validation, progress UI, results.
- Backend API (Fastify/FastAPI): coordinator, encryption, upload engine, m3u8 rewrite.
- Database (external Postgres): metadata, encrypted credentials, allocations.
- Worker/Queue (BullMQ + Redis or background tasks): heavy uploads, retries.
- Storage: multiple Supabase projects via S3-compatible endpoints.
- Proxy/CDN: Cloudflare recommended to mask backend IP.
- CI/CD & hosting: Railway / Fly / Hetzner (+ Cloudflare DNS/proxy).
- Monitoring: internal logs only (no PII), alerts for failures/storage.

### 3) Data model (core)
- supabase_accounts: id, name, project_url, s3_endpoint, bucket_name, encrypted keys (s3_access_key, s3_secret_key, service_role_key), storage_limit_mb, used_storage_mb, priority, is_active, created_at.
- series: id, title, description, poster_url, created_at.
- episodes: id, series_id, season_id?, episode_number, title, duration, total_size_mb, master_url, status, created_at.
- episode_quality_folders: id, episode_id, folder_name (1080/720/audio_subs), resolution, size_mb, file_count, assigned_account_id, base_path, m3u8_url, created_at.
- upload_jobs: id, episode_id, folder_id, account_id, status (queued/processing/done/failed), bytes_uploaded, retries, last_error, started_at, finished_at.
- system_logs: id, log_type, message, created_at (no IP/UA).
- Encryption format: AES-256-GCM JSON blobs {iv, tag, ciphertext}.

### 4) UX / frontend flows
- Pages: `/upload` (webkitdirectory picker, tree, structure validation incl. master.m3u8 and quality folders, size estimate); `/accounts` (admin adds Supabase accounts, project_url + S3 keys + optional service_role key for bucket creation); `/series` (list); `/episode/:id` (status, quality list, playable master URL, upload history).
- Global: modal for encryption consent and privacy policy.
- Interaction: select episode folder → enumerate files/sizes → send metadata only to `/api/upload/init` → receive allocation plan → user confirms → Start upload → stream files → show per-folder/per-file progress + ETA → surface final master.m3u8 URL + playback test.

### 5) API surface
- POST `/api/accounts/add`          — add Supabase account (secrets server-side).
- POST `/api/accounts/validate`     — validate S3 + optional service_role keys.
- POST `/api/upload/init`           — submit folder metadata; returns allocation plan.
- POST `/api/upload/start`          — begin upload job; returns job id.
- POST `/api/upload/:jobId/chunk`   — upload chunk/file (if chunking).
- POST `/api/upload/:jobId/finish`  — finalize upload.
- GET  `/api/jobs/:jobId/status`    — job status/progress.
- GET  `/api/series`                — list series.
- GET  `/api/episode/:id`           — episode metadata and master URL.
- Notes: admin endpoints need auth (basic API token). Upload flow can use ephemeral session tokens. Rate limit everything.

### 6) End-to-end sequence
**A) Account onboarding**  
- Admin supplies project_url, s3_access_key, s3_secret_key, optional service_role_key.  
- Backend encrypts and stores keys.  
- If service_role_key: ensure bucket exists via `supabase.storage.createBucket` (e.g., `hls_media` or `media_{account_id}`).  
- Verify S3 access with LIST/HEAD.

**B) Upload init**  
- Frontend computes per-folder sizes/counts; POST `/api/upload/init` with series title, episode number, folders [{name, size_bytes, file_count, sample m3u8 paths}].  
- Backend creates `episodes` (pending) and `episode_quality_folders` (pending); runs allocation (Section 7); returns plan + warnings if capacity is insufficient.  
- Frontend shows allocation; user confirms.

**C) Upload execution**  
- Frontend streams each folder (multipart or chunked) to `/api/upload/:jobId/chunk`.  
- Backend streams directly to Supabase S3 using assigned account creds in memory; use multipart for large files.  
- Backend updates `upload_jobs` and `episode_quality_folders` as files land.  
- On folder completion: compute `m3u8_url`, mark folder done.  
- After all folders: rewrite master.m3u8 with absolute variant/audio/sub URLs; upload rewritten master to chosen account (often audio_subs/small-file account); set `episodes.master_url`; mark episode done; return master URL.

**D) Abort, retry, resume**  
- `upload_jobs` stores state; `/api/jobs/:jobId/status` supports resume.  
- Resume from last uploaded file/chunk.  
- Exponential backoff for transient S3 errors; track retries.

### 7) Allocation algorithm (simple, robust)
- Order `supabase_accounts` by priority, then by remaining_space_mb.
- Walk folders largest → smallest; pick first account with remaining_space_mb ≥ folder.size_mb.
- Assign and tentatively decrement used_storage_mb; if none fits, flag as needs paid account or split.
- Commit assignments in a transaction; return plan.
- Nightly reconciliation: sum storage.objects per account to correct used_storage_mb.

### 8) Master.m3u8 rewrite rules
- For every variant and EXT-X-MEDIA entry, replace relative URIs with absolute:  
  `https://{project}.supabase.co/storage/v1/object/public/{bucket}/{base_path}/{subpath}`
- Keep variant playlists co-located with their segments; relative segment paths stay valid when playlist + segments share a bucket. If moving variants across accounts, keep playlist and segments together.
- Upload rewritten master.m3u8; set cache headers if public.

### 9) Security and privacy checklist
- No client-side secrets; never expose S3/service_role keys.
- Encrypt s3_access_key, s3_secret_key, service_role_key with AES-256-GCM.
- Store encryption key in env or secrets manager (K8s secret, Docker secret, Vault).
- Enforce HTTPS; prefer Cloudflare proxy to mask backend IP.
- Do not log client IP/UA or filenames; log job ids, errors, storage stats only.
- Use short-lived upload session tokens.
- Provide admin endpoint for key rotation; rotate service_role keys periodically.
- Prefer external Postgres (not the same Supabase project) for isolation.

### 10) Resilience and performance
- Stream uploads; avoid disk; fall back to temp files + multipart for very large assets.
- Limit concurrent uploads per account to avoid throttling.
- Queue uploads (Redis/BullMQ) for concurrency and retries.
- Apply backpressure: cap queue length and reject when overloaded.
- Support chunked uploads for flaky networks with resume.
- Nightly reconciliation for storage usage.
- Monitoring: health endpoints, job metrics, Sentry; alerts when storage nears limits.

### 11) Deployment and hosting
- Dev/private: run backend locally; keep Supabase private.
- Public (free-friendly): Railway/Render backend, Cloudflare proxy, Vercel (or same backend host) for frontend; Postgres on Neon/Railway/Heroku.
- Prod: Fly.io or Hetzner VPS; Cloudflare in front to mask backend IP.

### 12) Testing and QA
- Unit: allocation edge cases (many small files; one oversized folder).
- Integration: end-to-end upload of sample episode including m3u8 rewrite.
- Load: concurrent uploads to simulate multiple users.
- Privacy: confirm Supabase sees only backend/proxy IP.
- Security: verify secrets are unreadable without the encryption key.

### 13) Rollout steps
- Scaffold Next.js frontend + Fastify backend.
- Implement DB schema (Prisma + migrations).
- Build account onboarding (encrypt keys, ensure bucket exists).
- Implement upload/init + allocation + DB rows.
- Implement streaming uploader to S3 targets.
- Implement master.m3u8 rewrite + upload final master.
- Add worker queue + retry logic.
- Add Cloudflare proxy; verify privacy.
- Add monitoring + nightly reconciliation.
- Perform security review and penetration test.