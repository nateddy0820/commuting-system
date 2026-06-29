"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  formatTime,
  calcWorkedMinutes,
  formatMinutes,
  calcPay,
  isLate,
  getScheduledMinutes,
  calcOvertimeMinutes,
  toSchedules,
  getScheduleForDay,
  getWeeklyScheduledMinutes,
  calcJuhuSuDang,
  getMondayOfWeek,
  Schedule,
} from "@/lib/utils";

interface Worker {
  id: string;
  name: string;
  phone: string;
  hourlyWage: number;
  schedules?: Schedule[];
  workDays?: string;
  startTime?: string;
  endTime?: string;
  breakMinutes?: number;
}

interface AttendanceRecord {
  id: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  workerId: string;
  worker: Worker;
}

interface WeekGroup {
  monday: string;
  sunday: string;
  records: AttendanceRecord[];
  totalWorkedMins: number;
  totalPay: number;
  juhuSuDang: number;
}

function getSunday(mondayStr: string): string {
  const [y, m, d] = mondayStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + 6);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDateShort(dateStr: string): string {
  const [, m, d] = dateStr.split("-").map(Number);
  return `${m}/${d}`;
}

export default function AttendancePage() {
  const router = useRouter();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<string>("");
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [viewMode, setViewMode] = useState<"daily" | "worker">("daily");
  const [selectedDate, setSelectedDate] = useState(() =>
    new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" })
  );

  useEffect(() => {
    if (typeof window !== "undefined" && !sessionStorage.getItem("adminAuth")) {
      router.replace("/admin");
    }
    fetch("/api/workers").then((r) => r.json()).then(setWorkers);
  }, [router]);

  const loadRecords = useCallback(async () => {
    let url = "/api/attendance";
    if (viewMode === "daily") {
      url += `?date=${selectedDate}`;
    } else if (viewMode === "worker" && selectedWorker) {
      url += `?workerId=${selectedWorker}`;
    } else {
      setRecords([]);
      return;
    }
    const res = await fetch(url);
    setRecords(await res.json());
  }, [viewMode, selectedDate, selectedWorker]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  // 날짜별 뷰: 총 인원/급여 요약
  const dailyTotalPay = records.reduce((sum, r) => {
    const schedules = toSchedules(r.worker as unknown as Record<string, unknown>);
    const sched = getScheduleForDay(schedules, r.date);
    const worked = calcWorkedMinutes(r.checkIn, r.checkOut, sched?.breakMinutes ?? 0);
    return sum + calcPay(worked, r.worker.hourlyWage);
  }, 0);

  // 알바생별 뷰: 주별로 그룹핑
  const weekGroups: WeekGroup[] = (() => {
    if (viewMode !== "worker" || records.length === 0) return [];
    const worker = workers.find((w) => w.id === selectedWorker);
    if (!worker) return [];
    const schedules = toSchedules(worker as unknown as Record<string, unknown>);
    const weeklyScheduledMins = getWeeklyScheduledMinutes(schedules);

    const grouped: Record<string, AttendanceRecord[]> = {};
    records.forEach((r) => {
      const monday = getMondayOfWeek(r.date);
      if (!grouped[monday]) grouped[monday] = [];
      grouped[monday].push(r);
    });

    return Object.entries(grouped)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([monday, recs]) => {
        const totalWorkedMins = recs.reduce((sum, r) => {
          const sched = getScheduleForDay(schedules, r.date);
          return sum + calcWorkedMinutes(r.checkIn, r.checkOut, sched?.breakMinutes ?? 0);
        }, 0);
        const totalPay = calcPay(totalWorkedMins, worker.hourlyWage);
        const juhuSuDang = calcJuhuSuDang(weeklyScheduledMins, worker.hourlyWage);
        return {
          monday,
          sunday: getSunday(monday),
          records: recs.sort((a, b) => a.date.localeCompare(b.date)),
          totalWorkedMins,
          totalPay,
          juhuSuDang,
        };
      });
  })();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/admin/workers")} className="text-gray-500 hover:text-gray-700 text-sm">
            ← 알바생 관리
          </button>
          <h1 className="text-xl font-bold text-gray-800">출퇴근 기록</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* 뷰 모드 토글 */}
        <div className="flex gap-2 bg-white rounded-xl shadow-sm p-1">
          <button
            onClick={() => setViewMode("daily")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === "daily" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            날짜별 조회
          </button>
          <button
            onClick={() => setViewMode("worker")}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === "worker" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            알바생별 조회
          </button>
        </div>

        {viewMode === "daily" && (
          <div className="bg-white rounded-xl shadow-sm p-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">날짜 선택</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {viewMode === "worker" && (
          <div className="bg-white rounded-xl shadow-sm p-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">알바생 선택</label>
            <select
              value={selectedWorker}
              onChange={(e) => setSelectedWorker(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- 선택 --</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* 날짜별 요약 */}
        {viewMode === "daily" && records.length > 0 && (
          <div className="bg-blue-600 text-white rounded-xl shadow-md p-4 grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-blue-200 text-xs">총 인원</p>
              <p className="text-2xl font-bold">{records.length}명</p>
            </div>
            <div>
              <p className="text-blue-200 text-xs">총 급여</p>
              <p className="text-2xl font-bold">{dailyTotalPay.toLocaleString()}원</p>
            </div>
          </div>
        )}

        {/* 날짜별 레코드 */}
        {viewMode === "daily" && (
          <div className="space-y-3">
            {records.length === 0 && (
              <div className="text-center text-gray-400 py-12 bg-white rounded-2xl shadow-md">기록이 없습니다.</div>
            )}
            {records.map((r) => {
              const schedules = toSchedules(r.worker as unknown as Record<string, unknown>);
              const sched = getScheduleForDay(schedules, r.date);
              const worked = calcWorkedMinutes(r.checkIn, r.checkOut, sched?.breakMinutes ?? 0);
              const pay = calcPay(worked, r.worker.hourlyWage);
              const late = isLate(r.checkIn, sched?.startTime ?? "09:00");
              const scheduled = getScheduledMinutes(sched?.startTime ?? "09:00", sched?.endTime ?? "18:00", sched?.breakMinutes ?? 0);
              const overtime = calcOvertimeMinutes(r.checkOut, sched?.endTime ?? "18:00", worked, scheduled);
              return <RecordCard key={r.id} r={r} worked={worked} pay={pay} late={late} overtime={overtime} showDate={false} onUpdate={loadRecords} />;
            })}
          </div>
        )}

        {/* 알바생별 주간 그룹 */}
        {viewMode === "worker" && (
          <div className="space-y-5">
            {weekGroups.length === 0 && (
              <div className="text-center text-gray-400 py-12 bg-white rounded-2xl shadow-md">
                {selectedWorker ? "기록이 없습니다." : "알바생을 선택하세요."}
              </div>
            )}
            {weekGroups.map((wg) => {
              const worker = workers.find((w) => w.id === selectedWorker);
              const schedules = worker ? toSchedules(worker as unknown as Record<string, unknown>) : [];
              return (
                <div key={wg.monday} className="space-y-2">
                  {/* 주간 헤더 */}
                  <div className="bg-white rounded-xl shadow-sm p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-bold text-gray-700">
                        {formatDateShort(wg.monday)} ~ {formatDateShort(wg.sunday)}주
                      </p>
                      <span className="text-xs text-gray-400">{formatMinutes(wg.totalWorkedMins)} 근무</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-blue-50 rounded-lg p-3 text-center">
                        <p className="text-blue-400 text-xs mb-0.5">근무 급여</p>
                        <p className="text-blue-700 font-bold">{wg.totalPay.toLocaleString()}원</p>
                      </div>
                      <div className={`rounded-lg p-3 text-center ${wg.juhuSuDang > 0 ? "bg-purple-50" : "bg-gray-50"}`}>
                        <p className={`text-xs mb-0.5 ${wg.juhuSuDang > 0 ? "text-purple-400" : "text-gray-400"}`}>주휴수당</p>
                        <p className={`font-bold ${wg.juhuSuDang > 0 ? "text-purple-700" : "text-gray-400"}`}>
                          {wg.juhuSuDang > 0 ? `${wg.juhuSuDang.toLocaleString()}원` : "해당없음"}
                        </p>
                      </div>
                    </div>
                    {wg.juhuSuDang > 0 && (
                      <div className="mt-3 bg-purple-50 rounded-lg px-3 py-2 flex justify-between text-sm">
                        <span className="text-purple-600 font-medium">이번 주 합계</span>
                        <span className="text-purple-800 font-bold">{(wg.totalPay + wg.juhuSuDang).toLocaleString()}원</span>
                      </div>
                    )}
                  </div>

                  {/* 해당 주 일별 기록 */}
                  <div className="space-y-2 pl-2">
                    {wg.records.map((r) => {
                      const sched = getScheduleForDay(schedules, r.date);
                      const worked = calcWorkedMinutes(r.checkIn, r.checkOut, sched?.breakMinutes ?? 0);
                      const pay = calcPay(worked, r.worker.hourlyWage);
                      const late = isLate(r.checkIn, sched?.startTime ?? "09:00");
                      const scheduled = getScheduledMinutes(sched?.startTime ?? "09:00", sched?.endTime ?? "18:00", sched?.breakMinutes ?? 0);
                      const overtime = calcOvertimeMinutes(r.checkOut, sched?.endTime ?? "18:00", worked, scheduled);
                      return <RecordCard key={r.id} r={r} worked={worked} pay={pay} late={late} overtime={overtime} showDate onUpdate={loadRecords} />;
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function toLocalDatetimeValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const kst = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${kst.getFullYear()}-${pad(kst.getMonth() + 1)}-${pad(kst.getDate())}T${pad(kst.getHours())}:${pad(kst.getMinutes())}`;
}

function fromLocalDatetimeValue(val: string): string {
  // datetime-local 값(KST)에 +09:00 붙여서 ISO 변환
  return new Date(`${val}:00+09:00`).toISOString();
}

function RecordCard({
  r, worked, pay, late, overtime, showDate, onUpdate,
}: {
  r: AttendanceRecord;
  worked: number;
  pay: number;
  late: boolean;
  overtime: number;
  showDate: boolean;
  onUpdate: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [checkInVal, setCheckInVal] = useState(toLocalDatetimeValue(r.checkIn));
  const [checkOutVal, setCheckOutVal] = useState(toLocalDatetimeValue(r.checkOut));
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await fetch(`/api/attendance/${r.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        checkIn: checkInVal ? fromLocalDatetimeValue(checkInVal) : null,
        checkOut: checkOutVal ? fromLocalDatetimeValue(checkOutVal) : null,
      }),
    });
    setSaving(false);
    setEditing(false);
    onUpdate();
  }

  return (
    <div className="bg-white rounded-2xl shadow-md p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-bold text-gray-800">{r.worker.name}</p>
            {late && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">지각</span>}
            {overtime > 0 && <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">초과 {formatMinutes(overtime)}</span>}
          </div>
          {showDate && <p className="text-xs text-gray-400 mt-0.5">{r.date}</p>}
        </div>
        <div className="flex items-start gap-3">
          <div className="text-right">
            <p className="font-bold text-blue-600">{pay.toLocaleString()}원</p>
            <p className="text-xs text-gray-400">{r.worker.hourlyWage.toLocaleString()}원/시</p>
          </div>
          <button
            onClick={() => { setEditing((v) => !v); setCheckInVal(toLocalDatetimeValue(r.checkIn)); setCheckOutVal(toLocalDatetimeValue(r.checkOut)); }}
            className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1.5 rounded-lg hover:bg-gray-200 transition-colors"
          >
            {editing ? "취소" : "수정"}
          </button>
        </div>
      </div>

      {editing ? (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">출근 시간</label>
              <input
                type="datetime-local"
                value={checkInVal}
                onChange={(e) => setCheckInVal(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">퇴근 시간</label>
              <input
                type="datetime-local"
                value={checkOutVal}
                onChange={(e) => setCheckOutVal(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-blue-600 text-white py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="bg-gray-50 rounded-lg p-2 text-center">
            <p className="text-gray-400 text-xs">출근</p>
            <p className={`font-semibold ${late ? "text-red-600" : "text-gray-700"}`}>{formatTime(r.checkIn)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2 text-center">
            <p className="text-gray-400 text-xs">퇴근</p>
            <p className="font-semibold text-gray-700">{formatTime(r.checkOut)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2 text-center">
            <p className="text-gray-400 text-xs">근무 시간</p>
            <p className="font-semibold text-gray-700">{r.checkOut ? formatMinutes(worked) : "-"}</p>
          </div>
        </div>
      )}
    </div>
  );
}
