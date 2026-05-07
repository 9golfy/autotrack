"use client";

import dynamic from "next/dynamic";

const SettingsScreen = dynamic(
  () => import("@/modules/autohealth/settings").then((m) => ({ default: m.SettingsScreen })),
  { ssr: false },
);

export default function AdminSettingsPage() {
  return <SettingsScreen />;
}
