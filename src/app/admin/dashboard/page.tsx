"use client";

import dynamic from "next/dynamic";

const DashboardScreen = dynamic(
  () => import("@/modules/autohealth/dashboard").then((m) => ({ default: m.DashboardScreen })),
  { ssr: false },
);

export default function AdminDashboardPage() {
  return <DashboardScreen />;
}
