"use client";

import dynamic from "next/dynamic";

const StaffScreen = dynamic(
  () => import("@/modules/autohealth/staff").then((m) => m.StaffScreen),
  { ssr: false, loading: () => null },
);

export default function AdminStaffPage() {
  return <StaffScreen />;
}
