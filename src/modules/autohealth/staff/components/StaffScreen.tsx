import { ConsoleShell } from "@/modules/autohealth/chat-groups/components/GroupConsole";

const staff = [
  { id: "S-2001", firstname: "กมลวรรณ", surname: "ใจดี", telephone: "086-111-2222", email: "kamonwan@example.com" },
  { id: "S-2002", firstname: "วีรชัย", surname: "มั่นคง", telephone: "086-333-4444", email: "weerachai@example.com" },
  { id: "S-2003", firstname: "พรทิพย์", surname: "รักดี", telephone: "086-555-6666", email: "porntip@example.com" },
];

export default function StaffPage() {
  return (
    <ConsoleShell title="รายชื่อเจ้าหน้าที่" subtitle="">
      <section className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-950">รายชื่อเจ้าหน้าที่</h2>
          <button type="button" className="bg-[#1D4ED8] px-4 py-2 text-sm font-semibold text-white">
            + เพิ่มเจ้าหน้าที่
          </button>
        </div>

        <section className="overflow-hidden border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-left">
            <thead className="bg-slate-50">
              <tr className="text-xs font-semibold uppercase text-slate-500">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Firstname</th>
                <th className="px-4 py-3">Surename</th>
                <th className="px-4 py-3">Telephone</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">View</th>
                <th className="px-4 py-3">Edit</th>
                <th className="px-4 py-3">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staff.map((person) => (
                <tr key={person.id} className="text-sm text-slate-700">
                  <td className="px-4 py-4 font-semibold text-slate-950">{person.id}</td>
                  <td className="px-4 py-4">{person.firstname}</td>
                  <td className="px-4 py-4">{person.surname}</td>
                  <td className="px-4 py-4">{person.telephone}</td>
                  <td className="px-4 py-4">{person.email}</td>
                  <td className="px-4 py-4"><button className="text-[#1D4ED8]" type="button">View</button></td>
                  <td className="px-4 py-4"><button className="text-slate-700" type="button">Edit</button></td>
                  <td className="px-4 py-4"><button className="text-rose-600" type="button">Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </section>
    </ConsoleShell>
  );
}
