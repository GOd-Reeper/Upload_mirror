# DATABASE STRUCTURE

> Aligned with Main_project.md specifications

---

## Tables Overview

| Table                    | Purpose                                      |
| ------------------------ | -------------------------------------------- |
| `supabase_accounts`      | Store Supabase project credentials & limits  |
| `series`                 | TV series / Movie metadata                   |
| `seasons`                | Season info for TV series                    |
| `episodes`               | Episode/Movie metadata & final master URL    |
| `episode_quality_folders`| Quality folder allocations (1080p, 720p, etc)|
| `upload_jobs`            | Track upload progress, retries, status       |
| `system_logs`            | Internal logging (no PII)                    |

---

## 1. `supabase_accounts`

Stores Supabase project credentials and storage tracking.

| Column             | Type             | Description                              |
| ------------------ | ---------------- | ---------------------------------------- |
| `id`               | uuid (pk)        | Account identifier                       |
| `name`             | text             | Optional label/nickname                  |
| `project_url`      | text             | Supabase project URL                     |
| `s3_endpoint`      | text             | S3-compatible endpoint                   |
| `bucket_name`      | text             | Storage bucket name                      |
| `s3_access_key`    | text (encrypted) | S3 access key (AES-256-GCM)              |
| `s3_secret_key`    | text (encrypted) | S3 secret key (AES-256-GCM)              |
| `service_role_key` | text (encrypted) | For bucket creation (AES-256-GCM)        |
| `storage_limit_mb` | int              | Max storage (e.g., 1000 MB for free tier)|
| `used_storage_mb`  | int              | Current usage (updated on upload)        |
| `priority`         | int              | Allocation priority (lower = preferred)  |
| `is_active`        | boolean          | Enable/disable account                   |
| `created_at`       | tmimestamp        | Creation timestamp                       |

**Encryption Format:** `{iv, tag, ciphertext}` JSON blob using AES-256-GCM

---

## 2. `series`

Stores TV series or movie collection metadata.

| Column        | Type            | Description                |
| ------------- | --------------- | -------------------------- |
| `id`          | uuid (pk)       | Series identifier          |
| `title`       | text            | Series/Movie title         |
| `type`        | text            | 'tv' or 'movie'            |
| `description` | text (optional) | Synopsis                   |
| `poster_url`  | text (optional) | Cover image URL            |
| `created_at`  | timestamp       | Creation timestamp         |

---

## 3. `seasons`

Stores season information for TV series.

| Column          | Type               | Description              |
| --------------- | ------------------ | ------------------------ |
| `id`            | uuid (pk)          | Season identifier        |
| `series_id`     | uuid (fk → series) | Parent series            |
| `season_number` | int                | Season number (1, 2, 3…) |
| `title`         | text (optional)    | Season title             |
| `created_at`    | timestamp          | Creation timestamp       |

---

## 4. `episodes`

Stores episode/movie metadata and final playable URL.

| Column           | Type               | Description                        |
| ---------------- | ------------------ | ---------------------------------- |
| `id`             | uuid (pk)          | Episode identifier                 |
| `series_id`      | uuid (fk → series) | Parent series                      |
| `season_id`      | uuid (fk → seasons)| Parent season (optional for movies)|
| `episode_number` | int                | Episode number (1, 2, 3…)          |
| `title`          | text               | Episode title                      |
| `description`    | text (optional)    | Episode synopsis                   |
| `duration`       | int (optional)     | Duration in seconds                |
| `total_size_mb`  | int                | Total size of all quality folders  |
| `master_url`     | text               | Final master.m3u8 playable URL     |
| `poster_url`     | text (optional)    | Episode thumbnail                  |
| `status`         | text               | 'pending' / 'uploading' / 'done' / 'failed' |
| `created_at`     | timestamp          | Creation timestamp                 |

---

## 5. `episode_quality_folders`

Tracks each quality folder (1080p, 720p, audio_subs) and its assigned storage account.

| Column                | Type                           | Description                           |
| --------------------- | ------------------------------ | ------------------------------------- |
| `id`                  | uuid (pk)                      | Folder record identifier              |
| `episode_id`          | uuid (fk → episodes)           | Parent episode                        |
| `folder_name`         | text                           | '1080', '720', 'audio_subs', etc.     |
| `resolution`          | text (optional)                | '1080p', '720p' (for video folders)   |
| `type`                | text                           | 'video' or 'audio_subs'               |
| `size_mb`             | int                            | Folder size in MB                     |
| `file_count`          | int                            | Number of files in folder             |
| `assigned_account_id` | uuid (fk → supabase_accounts)  | Storage account assignment            |
| `base_path`           | text                           | e.g., `Series/Ep1/1080/`              |
| `m3u8_url`            | text                           | Final playlist URL for this quality   |
| `created_at`          | timestamp                      | Creation timestamp                    |

---

## 6. `upload_jobs`

Tracks individual upload job progress for resilience and retry logic.

| Column           | Type                                  | Description                              |
| ---------------- | ------------------------------------- | ---------------------------------------- |
| `id`             | uuid (pk)                             | Job identifier                           |
| `episode_id`     | uuid (fk → episodes)                  | Parent episode                           |
| `folder_id`      | uuid (fk → episode_quality_folders)   | Quality folder being uploaded            |
| `account_id`     | uuid (fk → supabase_accounts)         | Target storage account                   |
| `status`         | text                                  | 'queued' / 'processing' / 'done' / 'failed' |
| `bytes_uploaded` | bigint                                | Progress tracking                        |
| `total_bytes`    | bigint                                | Total bytes to upload                    |
| `retries`        | int                                   | Retry count (for exponential backoff)    |
| `last_error`     | text (optional)                       | Last error message                       |
| `started_at`     | timestamp (optional)                  | When job started                         |
| `finished_at`    | timestamp (optional)                  | When job completed                       |
| `created_at`     | timestamp                             | Creation timestamp                       |

---

## 7. `system_logs`

Internal logging for monitoring (NO PII - no IP addresses or user agents).

| Column       | Type      | Description                              |
| ------------ | --------- | ---------------------------------------- |
| `id`         | uuid (pk) | Log entry identifier                     |
| `log_type`   | text      | 'info' / 'warning' / 'error' / 'audit'   |
| `job_id`     | uuid (optional) | Related job ID (if applicable)      |
| `message`    | text      | Log message                              |
| `metadata`   | jsonb (optional) | Additional structured data          |
| `created_at` | timestamp | Log timestamp                            |

---

## Relationships Diagram

```
supabase_accounts
       │
       │ (1:N)
       ▼
episode_quality_folders ◄──── upload_jobs
       │                            │
       │ (N:1)                      │ (N:1)
       ▼                            ▼
   episodes ◄───────────────────────┘
       │
       │ (N:1)
       ▼
   seasons
       │
       │ (N:1)
       ▼
    series
```

---

## Indexes (Recommended)

```sql
-- Fast lookups
CREATE INDEX idx_episodes_series_id ON episodes(series_id);
CREATE INDEX idx_episodes_season_id ON episodes(season_id);
CREATE INDEX idx_episodes_status ON episodes(status);

CREATE INDEX idx_quality_folders_episode_id ON episode_quality_folders(episode_id);
CREATE INDEX idx_quality_folders_account_id ON episode_quality_folders(assigned_account_id);

CREATE INDEX idx_upload_jobs_status ON upload_jobs(status);
CREATE INDEX idx_upload_jobs_episode_id ON upload_jobs(episode_id);
CREATE INDEX idx_upload_jobs_account_id ON upload_jobs(account_id);

CREATE INDEX idx_system_logs_type ON system_logs(log_type);
CREATE INDEX idx_system_logs_created_at ON system_logs(created_at);

-- Allocation algorithm (priority + remaining space)
CREATE INDEX idx_accounts_allocation ON supabase_accounts(priority, is_active) 
  WHERE is_active = true;
```

---

## Notes

1. **Encryption:** All sensitive keys (`s3_access_key`, `s3_secret_key`, `service_role_key`) are stored as AES-256-GCM encrypted JSON blobs: `{iv, tag, ciphertext}`

2. **Storage Reconciliation:** Run nightly job to recalculate `used_storage_mb` by summing actual storage.objects per account

3. **Status Flow:**
   - Episodes: `pending` → `uploading` → `done` / `failed`
   - Upload Jobs: `queued` → `processing` → `done` / `failed`

4. **Allocation Priority:** Lower `priority` value = preferred account for allocation

5. **Privacy:** `system_logs` must NEVER contain IP addresses, user agents, or filenames - only job IDs, error messages, and storage stats
