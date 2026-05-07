"use client";

import dynamic from "next/dynamic";

const MembersScreen = dynamic(
  () => import("@/modules/autohealth/members").then((m) => ({ default: m.MembersScreen })),
  { ssr: false },
);

export default function AdminMembersPage() {
  return <MembersScreen />;
}
