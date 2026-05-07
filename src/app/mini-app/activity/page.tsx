import { AutoTrackActivityScreen } from "@/modules/autotrack/activity";

export default async function MiniAppActivityPage(props: PageProps<"/mini-app/activity">) {
  const searchParams = await props.searchParams;
  const groupId = typeof searchParams.groupId === "string" ? searchParams.groupId : null;

  return <AutoTrackActivityScreen selectedGroupId={groupId} />;
}
