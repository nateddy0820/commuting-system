import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import {
  toSchedules,
  getScheduleForDay,
  getWeeklyScheduledMinutes,
  calcJuhuSuDang,
  calcWorkedMinutes,
  calcPay,
  getMondayOfWeek,
} from "@/lib/utils";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  if (!month) return NextResponse.json({ error: "month required" }, { status: 400 });

  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const startDate = `${month}-01`;
  const endDate = `${month}-${String(lastDay).padStart(2, "0")}`;

  const [attendanceSnap, workersSnap] = await Promise.all([
    db.collection("attendance").where("date", ">=", startDate).where("date", "<=", endDate).get(),
    db.collection("workers").get(),
  ]);

  const recordsByWorker: Record<string, Array<{ date: string; checkIn: string | null; checkOut: string | null }>> = {};
  attendanceSnap.docs.forEach((doc) => {
    const d = doc.data();
    const wid = d.workerId as string;
    if (!recordsByWorker[wid]) recordsByWorker[wid] = [];
    recordsByWorker[wid].push({
      date: d.date as string,
      checkIn: d.checkIn as string | null,
      checkOut: d.checkOut as string | null,
    });
  });

  const workers = workersSnap.docs.map((doc) => {
    const worker = { id: doc.id, ...doc.data() } as Record<string, unknown>;
    const schedules = toSchedules(worker);
    const weeklyScheduledMins = getWeeklyScheduledMinutes(schedules);
    const hourlyWage = (worker.hourlyWage as number) ?? 0;
    const records = recordsByWorker[doc.id] ?? [];

    const workPay = records.reduce((sum, r) => {
      if (!r.checkIn || !r.checkOut) return sum;
      const sched = getScheduleForDay(schedules, r.date);
      const worked = calcWorkedMinutes(r.checkIn, r.checkOut, sched?.breakMinutes ?? 0);
      return sum + calcPay(worked, hourlyWage);
    }, 0);

    const weeksWithWork = new Set(
      records.filter((r) => r.checkIn && r.checkOut).map((r) => getMondayOfWeek(r.date))
    );
    const weeklyJuhu = calcJuhuSuDang(weeklyScheduledMins, hourlyWage);
    const juhuTotal = weeklyJuhu * weeksWithWork.size;

    return {
      id: doc.id,
      name: (worker.name as string) ?? "",
      workPay,
      juhuTotal,
      grandTotal: workPay + juhuTotal,
      daysWorked: records.filter((r) => r.checkIn && r.checkOut).length,
    };
  });

  const grandTotal = workers.reduce((sum, w) => sum + w.grandTotal, 0);

  return NextResponse.json({
    workers: workers.sort((a, b) => a.name.localeCompare(b.name, "ko")),
    grandTotal,
    period: `${m}.1 ~ ${m}.${lastDay}`,
  });
}
