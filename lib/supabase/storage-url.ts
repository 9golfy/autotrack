const DEFAULT_STORAGE_BUCKET = "line-media";

function trimSlashes(value: string) {
  return value.replace(/^\/+|\/+$/g, "");
}

function getStorageV1Base(value: string) {
  const base = value.replace(/\/+$/g, "");
  const storageV1Index = base.indexOf("/storage/v1");

  if (storageV1Index >= 0) {
    return base.slice(0, storageV1Index + "/storage/v1".length);
  }

  return base;
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

  const restBase = getStorageV1Base(endpoint);

  try {
    const parsed = new URL(restBase);
    const storageHostSuffix = ".storage.supabase.co";

    if (parsed.hostname.endsWith(storageHostSuffix)) {
      const projectRef = parsed.hostname.slice(0, -storageHostSuffix.length);
      parsed.hostname = `${projectRef}.supabase.co`;
    }

    return parsed.toString().replace(/\/+$/g, "");
  } catch {
    return restBase;
  }
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

  const base = getStorageV1Base(publicBase);

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
