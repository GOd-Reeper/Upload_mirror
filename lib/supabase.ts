import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Main Supabase client for UPLOADER_MQ (database & auth)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Create client only if we have valid credentials
let supabase: SupabaseClient;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
  // Create a mock client for development without env vars
  console.warn("⚠️ Supabase credentials not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY");
  supabase = {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
      signInWithPassword: async () => ({ error: new Error("Supabase not configured") }),
      signUp: async () => ({ error: new Error("Supabase not configured") }),
      signOut: async () => { },
    },
    from: () => ({
      select: () => ({
        order: () => ({ data: [], error: null }),
        eq: () => ({ single: () => ({ data: null, error: null }), data: [], error: null }),
        single: () => ({ data: null, error: null }),
        data: [],
        error: null
      }),
      insert: () => ({ select: () => ({ single: () => ({ data: null, error: new Error("Supabase not configured") }) }) }),
      update: () => ({ eq: () => ({ select: () => ({ single: () => ({ data: null, error: new Error("Supabase not configured") }) }) }) }),
      delete: () => ({ eq: () => ({ error: new Error("Supabase not configured") }) }),
    }),
  } as unknown as SupabaseClient;
}

export { supabase };

// Types for our database tables
export type AccountStatus = 'useable' | 'paused' | 'full';

export interface SupabaseAccount {
  id: string;
  name: string | null;
  project_url: string;
  s3_endpoint: string;
  bucket_name: string;
  s3_access_key: string;
  s3_secret_key: string;
  service_role_key: string | null;
  storage_limit_mb: number;
  used_storage_mb: number;
  is_active: boolean;
  is_useable: boolean;
  is_paused: boolean;
  status: AccountStatus;
  created_at: string;
}

export type SeriesStatus = 'PENDING' | 'ONGOING' | 'COMPLETED';

export interface Series {
  id: string;
  title: string;
  type: "tv" | "movie";
  description: string | null;
  poster_url: string | null;
  seas_count: string | null;
  ep_count: string | null;
  status: SeriesStatus;
  created_at: string;
}

export interface Season {
  id: string;
  series_id: string;
  season_number: number;
  title: string | null;
  created_at: string;
}

export interface Episode {
  id: string;
  series_id: string;
  season_id: string | null;
  episode_number: number;
  title: string;
  description: string | null;
  duration: number | null;
  total_size_mb: number;
  master_url: string | null;
  poster_url: string | null;
  status: "pending" | "uploading" | "done" | "failed";
  created_at: string;
}

export interface EpisodeQualityFolder {
  id: string;
  episode_id: string;
  folder_name: string;
  resolution: string | null;
  type: "video" | "audio_subs";
  size_mb: number;
  file_count: number;
  assigned_account_id: string | null;
  base_path: string;
  m3u8_url: string | null;
  created_at: string;
}

export interface UploadJob {
  id: string;
  episode_id: string;
  folder_id: string;
  account_id: string;
  status: "queued" | "processing" | "done" | "failed";
  bytes_uploaded: number;
  total_bytes: number;
  retries: number;
  last_error: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

// Database operations
export const db = {
  // Accounts
  accounts: {
    async getAll(): Promise<SupabaseAccount[]> {
      const { data, error } = await supabase
        .from("supabase_accounts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },

    async getById(id: string): Promise<SupabaseAccount | null> {
      const { data, error } = await supabase
        .from("supabase_accounts")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },

    async create(account: Omit<SupabaseAccount, "id" | "created_at">): Promise<SupabaseAccount> {
      const { data, error } = await supabase
        .from("supabase_accounts")
        .insert(account)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async update(id: string, account: Partial<SupabaseAccount>): Promise<SupabaseAccount> {
      const { data, error } = await supabase
        .from("supabase_accounts")
        .update(account)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async delete(id: string): Promise<void> {
      const { error } = await supabase
        .from("supabase_accounts")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },

    async getAvailable(): Promise<SupabaseAccount[]> {
      const { data, error } = await supabase
        .from("supabase_accounts")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  },

  // Series
  series: {
    async getAll(): Promise<Series[]> {
      const { data, error } = await supabase
        .from("series")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },

    async create(series: Omit<Series, "id" | "created_at">): Promise<Series> {
      const { data, error } = await supabase
        .from("series")
        .insert(series)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
  },

  // Episodes
  episodes: {
    async getBySeries(seriesId: string): Promise<Episode[]> {
      const { data, error } = await supabase
        .from("episodes")
        .select("*")
        .eq("series_id", seriesId)
        .order("episode_number", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  },
};

