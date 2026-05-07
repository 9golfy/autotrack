import { ChatGroupDetailScreen } from "@/modules/autohealth/chat-groups";

const defaultGroupId = "Cc7dba355a1ec758b48ed0acd10bae9c5";

export default function AdminGroupsPage() {
  return <ChatGroupDetailScreen groupId={defaultGroupId} />;
}
