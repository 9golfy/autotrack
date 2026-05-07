"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";

const ChatGroupDetailScreen = dynamic(
  () => import("@/modules/autohealth/chat-groups").then((m) => m.ChatGroupDetailScreen),
  { ssr: false, loading: () => null },
);

export default function AdminGroupDetailPage() {
  const params = useParams<{ groupId: string }>();
  return <ChatGroupDetailScreen groupId={params.groupId} />;
}
