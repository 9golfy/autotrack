export function hasValidDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";

  return (
    databaseUrl.startsWith("postgresql://") || databaseUrl.startsWith("postgres://")
  );
}

export function getDatabaseSetupMessage() {
  return "Set DATABASE_URL in .env to a real Supabase Postgres connection string.";
}

export function hasValidSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";

  return url.startsWith("https://") && publishableKey.length > 0;
}
