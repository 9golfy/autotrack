export function hasValidDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";

  return (
    databaseUrl.startsWith("postgresql://") || databaseUrl.startsWith("postgres://")
  );
}

export function getDatabaseSetupMessage() {
  return "Set DATABASE_URL in .env to a real Supabase Postgres connection string.";
}
