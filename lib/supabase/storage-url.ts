const DEFAULT_STORAGE_BUCKET = "line-media";

function trimSlashes(value: string) {
  return value.replace(/^\/+|\/+$/g, "");
}

export function getStorageEndpoint() {
  return (
    process.env.SUPABASE_STORAGE_ENDPOINT ??
    process.env.NEXT_PUBLIC_SUPABASE_STORAGE_ENDPOINT ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    ""
  ).trim();
}

export function getStorageRestEndpoint() {
  const endpoint = getStorageEndpoint();

  if (!endpoint) {
    return "";
  }

  const base = endpoint.replace(/\/+$/g, "");
  return base.endsWith("/storage/v1/s3") ? base.slice(0, -"/s3".length) : base;
}

export function buildStoragePublicUrl(path: string | null | undefined, bucketName = DEFAULT_STORAGE_BUCKET) {
  if (!path) {
    return null;
  }

  const publicBase =
    process.env.SUPABASE_PUBLIC_STORAGE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    getStorageEndpoint();
  const safePath = trimSlashes(path);
  const safeBucket = trimSlashes(bucketName);

  if (!publicBase) {
    return path;
  }

  const base = publicBase.replace(/\/+$/g, "");

  if (base.endsWith("/storage/v1/s3")) {
    return `${base.slice(0, -"/storage/v1/s3".length)}/storage/v1/object/public/${safeBucket}/${safePath}`;
  }

  if (base.endsWith("/storage/v1")) {
    return `${base}/object/public/${safeBucket}/${safePath}`;
  }

  return `${base}/storage/v1/object/public/${safeBucket}/${safePath}`;
}

export function rewriteStoragePublicUrl(url: string | null | undefined) {
  if (!url) {
    return url ?? null;
  }

  try {
    const parsed = new URL(url);
    const objectPrefix = "/storage/v1/object/public/";
    const s3Prefix = "/storage/v1/s3/";
    const prefix = parsed.pathname.includes(objectPrefix) ? objectPrefix : parsed.pathname.includes(s3Prefix) ? s3Prefix : null;

    if (!prefix) {
      return url;
    }

    const [, rest = ""] = parsed.pathname.split(prefix);
    const [bucketName, ...pathParts] = rest.split("/").filter(Boolean);

    if (!bucketName || pathParts.length === 0) {
      return url;
    }

    return buildStoragePublicUrl(decodeURIComponent(pathParts.join("/")), decodeURIComponent(bucketName)) ?? url;
  } catch {
    return url;
  }
}
