import { AutoTrackSettingsScreen } from "@/modules/autotrack/settings";

export default async function MiniAppSettingsPage(props: PageProps<"/mini-app/settings">) {
  const searchParams = await props.searchParams;
  const groupId = typeof searchParams.groupId === "string" ? searchParams.groupId : null;

  return <AutoTrackSettingsScreen selectedGroupId={groupId} />;
}
