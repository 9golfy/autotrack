import { GroupDetailDashboard } from "@/app/_components/group-detail-dashboard";

export default async function GroupDetailPage(props: PageProps<"/groups/[groupId]">) {
  const params = await props.params;

  return <GroupDetailDashboard groupId={params.groupId} />;
}
