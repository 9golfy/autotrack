"use client";

import dynamic from "next/dynamic";

const SettingsScreen = dynamic(
  () => import("@/modules/autohealth/settings").then((m) => m.SettingsScreen),
  { ssr: false, loading: () => null },
);

export default function AdminSettingsPage() {
  return <SettingsScreen />;
}
