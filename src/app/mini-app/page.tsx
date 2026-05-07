import { AutoTrackActivityScreen } from "@/modules/autotrack/activity";
import { AutoTrackHomeScreen } from "@/modules/autotrack/home";
import { AutoTrackReportScreen } from "@/modules/autotrack/report";
import { AutoTrackSettingsScreen } from "@/modules/autotrack/settings";

type MiniAppPageProps = {
  searchParams?: Promise<{
    view?: string;
    groupId?: string;
  }>;
};

export default async function MiniAppPage({ searchParams }: MiniAppPageProps) {
  const params = await searchParams;
  const view = params?.view;
  const groupId = params?.groupId ?? null;

  if (view === "report" || view === "stats") {
    return <AutoTrackReportScreen selectedGroupId={groupId} />;
  }

  if (view === "stat" || view === "activities") {
    return <AutoTrackActivityScreen selectedGroupId={groupId} />;
  }

  if (view === "settings") {
    return <AutoTrackSettingsScreen selectedGroupId={groupId} />;
  }

  return <AutoTrackHomeScreen selectedGroupId={groupId} />;
}
