/**
 * Shared in-memory cache สำหรับ group members
 * เก็บใน module-level variable เพื่อให้ GET และ PATCH route ใช้ instance เดียวกัน
 */

export type CachedMember = {
  userId: string;
  displayName: string;
  pictureUrl: string | null;
  role: string | null;
};

type CacheEntry = {
  members: CachedMember[];
  expiresAt: number;
};

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 นาที

// ใช้ globalThis เพื่อให้ Next.js dev hot-reload ไม่สร้าง Map ใหม่ทุกครั้ง
const g = globalThis as typeof globalThis & {
  __groupMembersCache?: Map<string, CacheEntry>;
};

if (!g.__groupMembersCache) {
  g.__groupMembersCache = new Map<string, CacheEntry>();
}

const cache = g.__groupMembersCache;

export function getCachedMembers(groupId: string): CachedMember[] | null {
  const entry = cache.get(groupId);
  if (!entry || Date.now() > entry.expiresAt) {
    cache.delete(groupId);
    return null;
  }
  return entry.members;
}

export function setCachedMembers(groupId: string, members: CachedMember[]): void {
  cache.set(groupId, { members, expiresAt: Date.now() + CACHE_TTL_MS });
}

export function bustGroupCache(groupId: string): void {
  cache.delete(groupId);
}

/** อัปเดต role ของ member คนเดียวใน cache โดยไม่ต้อง refetch ทั้งหมด */
export function updateMemberRoleInCache(groupId: string, userId: string, role: string): void {
  const entry = cache.get(groupId);
  if (!entry) return;

  const updated = entry.members.map((m) =>
    m.userId === userId ? { ...m, role } : m,
  );
  cache.set(groupId, { ...entry, members: updated });
}
