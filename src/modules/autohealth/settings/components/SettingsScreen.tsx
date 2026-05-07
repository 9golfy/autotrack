import { ConsoleShell } from "@/modules/autohealth/chat-groups/components/GroupConsole";

export default function SettingsPage() {
  return (
    <ConsoleShell title="การตั้งค่า" subtitle="">
      <section className="border border-slate-200 bg-white p-8">
        <h2 className="text-lg font-semibold text-slate-950">การตั้งค่า</h2>
      </section>
    </ConsoleShell>
  );
}
