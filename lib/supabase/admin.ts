import { createClient } from "@supabase/supabase-js";
import { StorageClient } from "@supabase/storage-js";

import { getStorageRestEndpoint } from "@/lib/supabase/storage-url";

let supabaseAdminClient:
  | ReturnType<typeof createClient>
  | null = null;
let supabaseStorageClient: StorageClient | null = null;

export function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  if (!supabaseAdminClient) {
    supabaseAdminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return supabaseAdminClient;
}

export function getSupabaseStorageClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const storageEndpoint = getStorageRestEndpoint();

  if (!storageEndpoint || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_STORAGE_ENDPOINT or SUPABASE_SERVICE_ROLE_KEY");
  }

  if (!supabaseStorageClient) {
    supabaseStorageClient = new StorageClient(storageEndpoint, {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    });
  }

  return supabaseStorageClient;
}
