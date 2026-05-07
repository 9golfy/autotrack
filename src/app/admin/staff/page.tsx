"use client";

import dynamic from "next/dynamic";

const StaffScreen = dynamic(
  () => import("@/modules/autohealth/staff").then((m) => ({ default: m.StaffScreen })),
  { ssr: false },
);

export default function AdminStaffPage() {
  return <StaffScreen />;
}
