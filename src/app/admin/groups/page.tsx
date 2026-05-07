"use client";

import dynamic from "next/dynamic";

const ChatGroupDetailScreen = dynamic(
  () => import("@/modules/autohealth/chat-groups").then((m) => ({ default: m.ChatGroupDetailScreen })),
  { ssr: false },
);

const defaultGroupId = "Cc7dba355a1ec758b48ed0acd10bae9c5";

export default function AdminGroupsPage() {
  return <ChatGroupDetailScreen groupId={defaultGroupId} />;
}
