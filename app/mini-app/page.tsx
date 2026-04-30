import MiniAppIndex from "@/app/_components/mini-app-index";
import { MiniAppActivities } from "@/app/_components/mini-app-activities";
import { MiniAppReport } from "@/app/_components/mini-app-report";
import { MiniAppSettings } from "@/app/_components/mini-app-settings";

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
    return <MiniAppReport selectedGroupId={groupId} />;
  }

  if (view === "stat" || view === "activities") {
    return <MiniAppActivities selectedGroupId={groupId} />;
  }

  if (view === "settings") {
    return <MiniAppSettings selectedGroupId={groupId} />;
  }

  return <MiniAppIndex selectedGroupId={groupId} />;
}
