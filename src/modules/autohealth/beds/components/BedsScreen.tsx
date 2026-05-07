import { ConsoleShell } from "@/modules/autohealth/chat-groups/components/GroupConsole";

const beds = [
  { room: "A-01", bedId: "BED-A01-01", resident: "คุณไพโรจน์ พันธุศิลป์" },
  { room: "A-01", bedId: "BED-A01-02", resident: null },
  { room: "A-02", bedId: "BED-A02-01", resident: "คุณสมหมาย ใจดี" },
  { room: "A-02", bedId: "BED-A02-02", resident: "คุณสมชาย รักชาติ" },
  { room: "B-01", bedId: "BED-B01-01", resident: null },
  { room: "B-01", bedId: "BED-B01-02", resident: "คุณสุดใจ สวัสดี" },
  { room: "B-02", bedId: "BED-B02-01", resident: "คุณนินจา พาเพลิน" },
  { room: "B-02", bedId: "BED-B02-02", resident: null },
  { room: "C-01", bedId: "BED-C01-01", resident: null },
];

export default function BedsPage() {
  return (
    <ConsoleShell title="ข้อมูลเตียง" subtitle="" contentClassName="min-h-0 flex-1 overflow-y-auto px-6 py-6">
      <section className="space-y-5">
        <h2 className="text-lg font-semibold text-slate-950">ข้อมูลเตียง</h2>

        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {beds.map((bed) => {
            const isOccupied = Boolean(bed.resident);

            return (
              <article key={bed.bedId} className="border border-slate-200 bg-white p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-500">ห้อง</p>
                    <h3 className="mt-1 text-xl font-semibold text-slate-950">{bed.room}</h3>
                  </div>
                  <div className={`flex h-11 w-11 items-center justify-center rounded-full ${isOccupied ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}>
                    <span className="material-symbols-outlined text-[26px] leading-none [font-variation-settings:'FILL'_0,'wght'_400,'GRAD'_0,'opsz'_24]">
                      single_bed
                    </span>
                  </div>
                </div>

                <div className="mt-5 space-y-3 text-sm">
                  <div className="flex justify-between gap-3 border-t border-slate-100 pt-3">
                    <span className="text-slate-500">Bed ID</span>
                    <span className="font-semibold text-slate-900">{bed.bedId}</span>
                  </div>
                  <div className="flex justify-between gap-3 border-t border-slate-100 pt-3">
                    <span className="text-slate-500">สถานะ</span>
                    <span className={`font-semibold ${isOccupied ? "text-rose-600" : "text-emerald-600"}`}>
                      {isOccupied ? "ไม่ว่าง" : "ว่าง"}
                    </span>
                  </div>
                  <div className="border-t border-slate-100 pt-3">
                    <p className="text-slate-500">ผู้สูงอายุ</p>
                    <p className="mt-1 font-semibold text-slate-950">{bed.resident ?? "-"}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </ConsoleShell>
  );
}
