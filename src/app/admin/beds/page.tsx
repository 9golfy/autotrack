"use client";

import dynamic from "next/dynamic";

const BedsScreen = dynamic(
  () => import("@/modules/autohealth/beds").then((m) => m.BedsScreen),
  { ssr: false, loading: () => null },
);

export default function AdminBedsPage() {
  return <BedsScreen />;
}
