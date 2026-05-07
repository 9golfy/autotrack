"use client";

import dynamic from "next/dynamic";

const DashboardScreen = dynamic(
  () => import("@/modules/autohealth/dashboard").then((m) => m.DashboardScreen),
  { ssr: false, loading: () => null },
);

export default function AdminDashboardPage() {
  return <DashboardScreen />;
}
