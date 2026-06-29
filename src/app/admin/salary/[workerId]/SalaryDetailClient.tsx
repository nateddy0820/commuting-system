"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  toSchedules,
  getScheduleForDay,
  getWeeklyScheduledMinutes,
  calcJuhuSuDang,
  calcJuhuPaidMinutes,
  calcWorkedMinutes,
  calcPay,
  getMondayOfWeek,
  getSundayOfWeek,
  formatMinutes,
  Schedule,
} from "@/lib/utils";

interface AttendanceRecord {
  id: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  workerId: string;
  worker: {
    id: string;
    name: string;
    hourlyWage: number;
    schedules?: Schedule[];
    workDays?: string;
    startTime?: string;
    endTime?: string;
    breakMinutes?: number;
  };
}

type WorkEntry = {
  type: "work";
  date: string;
  workedMinutes: number;
  pay: number;
};

type JuhuEntry = {
  type: "juhu";
  date: string;
  paidMinutes: number;
  amount: number;
};

type SalaryEntry = WorkEntry | JuhuEntry;

const KR_DAYS = ["일", "월", "화", "수", "목", "금", "토"];
const KR_MONTHS_SHORT = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

function getDayKR(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return KR_DAYS[new Date(y, m - 1, d).getDay()];
}

function formatDateLabel(dateStr: string) {
  const [, m, d] = dateStr.split("-").map(Number);
  const day = getDayKR(dateStr);
  return `${m}월 ${d}일(${day})`;
}

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function buildEntries(
  records: AttendanceRecord[],
  schedules: Schedule[],
  weeklyScheduledMins: number,
  hourlyWage: number
): SalaryEntry[] {
  const entries: SalaryEntry[] = [];

  records.forEach((r) => {
    if (!r.checkIn || !r.checkOut) return;
    const sched = getScheduleForDay(schedules, r.date);
    const worked = calcWorkedMinutes(r.checkIn, r.checkOut, sched?.breakMinutes ?? 0);
    entries.push({ type: "work", date: r.date, workedMinutes: worked, pay: calcPay(worked, hourlyWage) });
  });

  if (weeklyScheduledMins >= 15 * 60) {
    const weeklyJuhu = calcJuhuSuDang(weeklyScheduledMins, hourlyWage);
    const paidMins = calcJuhuPaidMinutes(weeklyScheduledMins);

    const uniqueMondays = [
      ...new Set(
        records.filter((r) => r.checkIn && r.checkOut).map((r) => getMondayOfWeek(r.date))
      ),
    ];

    uniqueMondays.forEach((monday) => {
      entries.push({
        type: "juhu",
        date: getSundayOfWeek(monday),
        paidMinutes: paidMins,
        amount: weeklyJuhu,
      });
    });
  }

  return entries.sort((a, b) => b.date.localeCompare(a.date));
}

export default function SalaryDetailClient({
  workerId,
  initialMonth,
}: {
  workerId: string;
  initialMonth?: string;
}) {
  const router = useRouter();
  const [month, setMonth] = useState(initialMonth ?? getCurrentMonth);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const worker = records[0]?.worker ?? null;
  const schedules = worker ? toSchedules(worker as unknown as Record<string, unknown>) : [];
  const weeklyScheduledMins = getWeeklyScheduledMinutes(schedules);
  const hourlyWage = worker?.hourlyWage ?? 0;

  const entries = buildEntries(records, schedules, weeklyScheduledMins, hourlyWage);
  const totalWorkPay = entries.filter((e) => e.type === "work").reduce((s, e) => s + e.pay, 0);
  const totalJuhu = entries.filter((e) => e.type === "juhu").reduce((s, e) => s + e.amount, 0);
  const grandTotal = totalWorkPay + totalJuhu;

  useEffect(() => {
    if (!sessionStorage.getItem("adminAuth")) router.replace("/admin");
  }, [router]);

  useEffect(() => {
    setLoading(true);
    setRecords([]);
    fetch(`/api/attendance?workerId=${workerId}&month=${month}`)
      .then((r) => r.json())
      .then((d) => { setRecords(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [workerId, month]);

  function changeMonth(delta: number) {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const [year, monthNum] = month.split("-").map(Number);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="text-gray-500 hover:text-gray-700 text-sm"
        >
          ←
        </button>
        <h1 className="text-xl font-bold text-gray-800">
          {worker?.name ?? "급여 상세"}
        </h1>
      </header>

      <div className="max-w-md mx-auto px-4 mt-5 space-y-4">
        {/* Month navigation */}
        <div className="flex items-center justify-between px-1">
          <button
            onClick={() => changeMonth(-1)}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-white rounded-full shadow-sm transition-colors"
          >
            ‹
          </button>
          <span className="font-bold text-gray-800">{year}년 {monthNum}월</span>
          <button
            onClick={() => changeMonth(1)}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-white rounded-full shadow-sm transition-colors"
          >
            ›
          </button>
        </div>

        {/* Monthly summary */}
        {!loading && entries.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm px-4 py-4 space-y-2">
            <div className="flex justify-between text-sm text-gray-500">
              <span>근무 급여</span>
              <span className="font-medium text-gray-700">{totalWorkPay.toLocaleString()}원</span>
            </div>
            {totalJuhu > 0 && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>주휴수당 합계</span>
                <span className="font-medium text-blue-600">{totalJuhu.toLocaleString()}원</span>
              </div>
            )}
            <div className="border-t border-gray-100 pt-2 flex justify-between">
              <span className="font-semibold text-gray-700">이번 달 합계</span>
              <span className="font-bold text-gray-900 text-base">{grandTotal.toLocaleString()}원</span>
            </div>
          </div>
        )}

        {/* Entry list */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {loading && (
            <p className="text-center text-gray-300 text-sm py-12">로딩 중...</p>
          )}
          {!loading && entries.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-12">이 달의 기록이 없습니다.</p>
          )}
          {!loading && entries.map((entry, i) => (
            <div
              key={`${entry.type}-${entry.date}-${i}`}
              className={`flex items-center px-4 py-4 ${i < entries.length - 1 ? "border-b border-gray-50" : ""}`}
            >
              {entry.type === "work" ? (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm">{formatDateLabel(entry.date)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatMinutes(entry.workedMinutes)}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-gray-800 text-sm">
                      {entry.pay.toLocaleString()}원
                    </span>
                    <span className="text-gray-300 text-base">›</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-blue-500 text-sm">{formatDateLabel(entry.date)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      주휴수당 {formatMinutes(entry.paidMinutes)}
                    </p>
                  </div>
                  <span className="font-semibold text-blue-500 text-sm">
                    +{entry.amount.toLocaleString()}원
                  </span>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
