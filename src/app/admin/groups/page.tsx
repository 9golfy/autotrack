"use client";

import dynamic from "next/dynamic";

const ChatGroupDetailScreen = dynamic(
  () => import("@/modules/autohealth/chat-groups").then((m) => m.ChatGroupDetailScreen),
  { ssr: false, loading: () => null },
);

const defaultGroupId = "Cc7dba355a1ec758b48ed0acd10bae9c5";

export default function AdminGroupsPage() {
  return <ChatGroupDetailScreen groupId={defaultGroupId} />;
}
