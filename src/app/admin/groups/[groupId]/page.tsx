import { ChatGroupDetailScreen } from "@/modules/autohealth/chat-groups";

export default async function AdminGroupDetailPage(props: PageProps<"/admin/groups/[groupId]">) {
  const params = await props.params;

  return <ChatGroupDetailScreen groupId={params.groupId} />;
}
