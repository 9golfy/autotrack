import type { MemberRecord } from "../types";

export async function fetchMembers() {
  const response = await fetch("/api/members", { cache: "no-store" });

  if (!response.ok) {
    throw new Error("Unable to load members");
  }

  return (await response.json()) as { members: MemberRecord[] };
}

export async function deleteMember(id: string) {
  const response = await fetch(`/api/members/${id}`, { method: "DELETE" });

  if (!response.ok) {
    throw new Error("Unable to delete member");
  }
}
