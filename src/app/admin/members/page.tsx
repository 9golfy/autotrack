"use client";

import dynamic from "next/dynamic";

const MembersScreen = dynamic(
  () => import("@/modules/autohealth/members").then((m) => m.MembersScreen),
  { ssr: false, loading: () => null },
);

export default function AdminMembersPage() {
  return <MembersScreen />;
}
