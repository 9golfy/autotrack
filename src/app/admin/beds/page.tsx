"use client";

import dynamic from "next/dynamic";

const BedsScreen = dynamic(
  () => import("@/modules/autohealth/beds").then((m) => ({ default: m.BedsScreen })),
  { ssr: false },
);

export default function AdminBedsPage() {
  return <BedsScreen />;
}
