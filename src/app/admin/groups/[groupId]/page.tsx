"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";

const ChatGroupDetailScreen = dynamic(
  () => import("@/modules/autohealth/chat-groups").then((m) => ({ default: m.ChatGroupDetailScreen })),
  { ssr: false },
);

export default function AdminGroupDetailPage() {
  const params = useParams<{ groupId: string }>();
  return <ChatGroupDetailScreen groupId={params.groupId} />;
}
