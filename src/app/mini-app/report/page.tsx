import { AutoTrackReportScreen } from "@/modules/autotrack/report";

export default async function MiniAppReportPage(props: PageProps<"/mini-app/report">) {
  const searchParams = await props.searchParams;
  const groupId = typeof searchParams.groupId === "string" ? searchParams.groupId : null;

  return <AutoTrackReportScreen selectedGroupId={groupId} />;
}
