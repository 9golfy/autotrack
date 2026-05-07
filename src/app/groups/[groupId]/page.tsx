import { redirect } from "next/navigation";

export default async function GroupDetailRedirectPage(props: PageProps<"/groups/[groupId]">) {
  const params = await props.params;

  redirect(`/admin/groups/${params.groupId}`);
}
