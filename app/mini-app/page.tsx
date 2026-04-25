import { MiniAppReport } from "@/app/_components/mini-app-report";

export default async function MiniAppPage(props: PageProps<"/mini-app">) {
  const searchParams = await props.searchParams;
  const selectedGroupId =
    typeof searchParams.groupId === "string" ? searchParams.groupId : null;

  return <MiniAppReport selectedGroupId={selectedGroupId} />;
}
