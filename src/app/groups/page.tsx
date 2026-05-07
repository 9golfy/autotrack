import { redirect } from "next/navigation";

export default function GroupsRedirectPage() {
  redirect("/admin/groups");
}
