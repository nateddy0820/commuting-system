"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Schedule,
  toSchedules,
  getScheduleForDay,
  getScheduledMinutes,
  getWeeklyScheduledMinutes,
  calcJuhuSuDang,
  calcWorkedMinutes,
  calcPay,
  getDayNameKR,
  isLate,
  formatMinutes,
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
}

interface DayRecord {
  date: string;
  isAbsent: boolean;
  checkIn: string | null;
  checkOut: string | null;
  scheduledStart: string;
  scheduledEnd: string;
  scheduledMins: number;
  workedMins: number;
  isLateFlag: boolean;
  isEarlyLeave: boolean;
  isOvertime: boolean;
  undertimeMins: number;
  overtimeMins: number;
}

const DAYS = ["월", "화", "수", "목", "금", "토", "일"];
const AVATAR_COLORS = [
  "bg-rose-200 text-rose-700",
  "bg-teal-200 text-teal-700",
  "bg-sky-200 text-sky-700",
  "bg-purple-200 text-purple-700",
  "bg-amber-200 text-amber-700",
  "bg-green-200 text-green-700",
  "bg-pink-200 text-pink-700",
];
function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

function isScheduledDay(schedules: Schedule[], dateStr: string): boolean {
  const dayName = getDayNameKR(dateStr);
  return schedules.some((s) => s.days.includes(dayName));
}

function fmtTime(isoStr: string | null): string {
  if (!isoStr) return "-";
  const kst = new Date(new Date(isoStr).toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  return `${String(kst.getHours()).padStart(2, "0")}:${String(kst.getMinutes()).padStart(2, "0")}`;
}

function fmtDateRow(dateStr: string): string {
  const [, m, d] = dateStr.split("-").map(Number);
  const day = getDayNameKR(dateStr);
  return `${String(m).padStart(2, "0")}.${String(d).padStart(2, "0")} ${day}`;
}

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function buildDayRecords(
  records: AttendanceRecord[],
  schedules: Schedule[],
  month: string
): DayRecord[] {
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();

  const recordByDate: Record<string, AttendanceRecord> = {};
  records.forEach((r) => { recordByDate[r.date] = r; });

  const dayRecords: DayRecord[] = [];

  records.forEach((r) => {
    if (!r.checkIn || !r.checkOut) return;
    const sched = getScheduleForDay(schedules, r.date);
    const scheduledMins = sched ? getScheduledMinutes(sched.startTime, sched.endTime, sched.breakMinutes) : 0;
    const workedMins = calcWorkedMinutes(r.checkIn, r.checkOut, sched?.breakMinutes ?? 0);
    const lateFlag = isLate(r.checkIn, sched?.startTime ?? "09:00");
    const earlyLeave = scheduledMins > 0 && workedMins < scheduledMins - 10;
    const overtime = scheduledMins > 0 && workedMins > scheduledMins + 10;
    dayRecords.push({
      date: r.date,
      isAbsent: false,
      checkIn: r.checkIn,
      checkOut: r.checkOut,
      scheduledStart: sched?.startTime ?? "09:00",
      scheduledEnd: sched?.endTime ?? "18:00",
      scheduledMins,
      workedMins,
      isLateFlag: lateFlag,
      isEarlyLeave: earlyLeave,
      isOvertime: overtime,
      undertimeMins: earlyLeave ? scheduledMins - workedMins : 0,
      overtimeMins: overtime ? workedMins - scheduledMins : 0,
    });
  });

  for (let d = 1; d <= lastDay; d++) {
    const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    if (dateStr >= today) continue;
    if (!isScheduledDay(schedules, dateStr)) continue;
    if (recordByDate[dateStr]?.checkIn) continue;
    const sched = getScheduleForDay(schedules, dateStr);
    dayRecords.push({
      date: dateStr,
      isAbsent: true,
      checkIn: null,
      checkOut: null,
      scheduledStart: sched?.startTime ?? "09:00",
      scheduledEnd: sched?.endTime ?? "18:00",
      scheduledMins: sched ? getScheduledMinutes(sched.startTime, sched.endTime, sched.breakMinutes) : 0,
      workedMins: 0,
      isLateFlag: false,
      isEarlyLeave: false,
      isOvertime: false,
      undertimeMins: 0,
      overtimeMins: 0,
    });
  }

  return dayRecords.sort((a, b) => b.date.localeCompare(a.date));
}

function primaryStatus(r: DayRecord): { label: string; color: string } {
  if (r.isAbsent) return { label: "결근", color: "text-red-500" };
  if (r.isLateFlag) return { label: "지각", color: "text-amber-500" };
  if (r.isEarlyLeave) return { label: "조퇴", color: "text-slate-500" };
  if (r.isOvertime) return { label: "연장", color: "text-emerald-500" };
  return { label: "정상", color: "text-green-500" };
}

const emptySchedule: Schedule = { days: [], startTime: "09:00", endTime: "18:00", breakMinutes: 0 };

export default function WorkerDetailClient({ workerId }: { workerId: string }) {
  const router = useRouter();
  const [worker, setWorker] = useState<Worker | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [month, setMonth] = useState(getCurrentMonth);
  const [tab, setTab] = useState<"attendance" | "info">("attendance");
  const [loadingRecords, setLoadingRecords] = useState(false);

  // edit form state
  const [editForm, setEditForm] = useState<{ name: string; phone: string; hourlyWage: number; schedules: Schedule[] } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (!sessionStorage.getItem("adminAuth")) router.replace("/admin");
  }, [router]);

  useEffect(() => {
    fetch(`/api/workers/${workerId}`)
      .then((r) => r.json())
      .then((w) => {
        setWorker(w);
        setEditForm({ name: w.name, phone: w.phone, hourlyWage: w.hourlyWage, schedules: toSchedules(w as Record<string, unknown>) });
      });
  }, [workerId]);

  useEffect(() => {
    setLoadingRecords(true);
    fetch(`/api/attendance?workerId=${workerId}&month=${month}`)
      .then((r) => r.json())
      .then((d) => { setRecords(d); setLoadingRecords(false); })
      .catch(() => setLoadingRecords(false));
  }, [workerId, month]);

  function changeMonth(delta: number) {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  async function handleDelete() {
    if (!worker || !confirm(`${worker.name}을(를) 삭제하시겠습니까? 출퇴근 기록도 함께 삭제됩니다.`)) return;
    await fetch(`/api/workers/${workerId}`, { method: "DELETE" });
    router.replace("/admin/workers");
  }

  async function handleSave() {
    if (!editForm) return;
    setSaving(true);
    setSaveMsg(null);
    const res = await fetch(`/api/workers/${workerId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setSaving(false);
    if (res.ok) {
      const w = await res.json();
      setWorker(w);
      setSaveMsg({ text: "저장 완료!", ok: true });
      setTimeout(() => setSaveMsg(null), 2000);
    } else {
      setSaveMsg({ text: "저장 실패. 다시 시도해주세요.", ok: false });
    }
  }

  function addSchedule() {
    if (!editForm) return;
    setEditForm({ ...editForm, schedules: [...editForm.schedules, { ...emptySchedule }] });
  }

  function removeSchedule(idx: number) {
    if (!editForm) return;
    setEditForm({ ...editForm, schedules: editForm.schedules.filter((_, i) => i !== idx) });
  }

  function toggleDay(si: number, day: string) {
    if (!editForm) return;
    setEditForm({
      ...editForm,
      schedules: editForm.schedules.map((s, i) => {
        if (i !== si) return s;
        const days = s.days.includes(day) ? s.days.filter((d) => d !== day) : [...s.days, day];
        return { ...s, days };
      }),
    });
  }

  function updateSchedule(si: number, field: keyof Omit<Schedule, "days">, value: string | number) {
    if (!editForm) return;
    setEditForm({
      ...editForm,
      schedules: editForm.schedules.map((s, i) => (i === si ? { ...s, [field]: value } : s)),
    });
  }

  if (!worker) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">로딩 중...</p>
      </div>
    );
  }

  const schedules = toSchedules(worker as unknown as Record<string, unknown>);
  const dayRecords = buildDayRecords(records, schedules, month);

  const workedDays = dayRecords.filter((r) => !r.isAbsent).length;
  const totalWorkedMins = dayRecords.filter((r) => !r.isAbsent).reduce((s, r) => s + r.workedMins, 0);
  const normalCount = dayRecords.filter((r) => !r.isAbsent && !r.isLateFlag && !r.isEarlyLeave && !r.isOvertime).length;
  const absentCount = dayRecords.filter((r) => r.isAbsent).length;
  const lateCount = dayRecords.filter((r) => r.isLateFlag).length;
  const earlyCount = dayRecords.filter((r) => r.isEarlyLeave).length;
  const totalUndertime = dayRecords.filter((r) => r.isEarlyLeave).reduce((s, r) => s + r.undertimeMins, 0);
  const overtimeCount = dayRecords.filter((r) => r.isOvertime).length;

  const weeklyMins = getWeeklyScheduledMinutes(schedules);
  const juhu = calcJuhuSuDang(weeklyMins, worker.hourlyWage);
  const [year, monthNum] = month.split("-").map(Number);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm px-4 py-4 flex items-center gap-3">
        <button onClick={() => router.push("/admin/workers")} className="text-gray-500 hover:text-gray-700 text-sm">←</button>
        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${avatarColor(worker.name)}`}>
          {worker.name[0]}
        </div>
        <h1 className="text-lg font-bold text-gray-800 flex-1">{worker.name}</h1>
        <button
          onClick={handleDelete}
          className="text-xs text-red-500 hover:text-red-600 px-2 py-1"
        >
          삭제
        </button>
      </header>

      {/* 탭 */}
      <div className="bg-white border-b border-gray-100 flex">
        <button
          onClick={() => setTab("attendance")}
          className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${tab === "attendance" ? "border-gray-800 text-gray-800" : "border-transparent text-gray-400"}`}
        >
          근태기록
        </button>
        <button
          onClick={() => setTab("info")}
          className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${tab === "info" ? "border-gray-800 text-gray-800" : "border-transparent text-gray-400"}`}
        >
          상세정보
        </button>
      </div>

      <div className="max-w-md mx-auto px-4 py-5 space-y-4">
        {/* ── 근태기록 탭 ── */}
        {tab === "attendance" && (
          <>
            {/* 월 선택 */}
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <button onClick={() => changeMonth(-1)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">‹</button>
                <span className="font-bold text-gray-800 text-sm">
                  {year}년 {monthNum}월 1일 ~ {new Date(year, monthNum, 0).getDate()}일
                </span>
                <button onClick={() => changeMonth(1)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">›</button>
              </div>

              {/* 근무일수 */}
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-sm text-gray-500">근무일수</span>
                <span className="text-sm font-bold text-gray-800">
                  {workedDays}일 / {Math.floor(totalWorkedMins / 60)}시간 {totalWorkedMins % 60}분
                </span>
              </div>

              {/* 상태별 요약 */}
              <div className="space-y-0">
                {[
                  { dot: "bg-green-500", label: "정상", value: normalCount > 0 ? `${normalCount}` : null },
                  { dot: "bg-red-400", label: "결근", value: absentCount > 0 ? `${absentCount}` : null },
                  { dot: "bg-amber-400", label: "지각", value: lateCount > 0 ? `${lateCount}` : null },
                  {
                    dot: "bg-slate-400",
                    label: "조퇴",
                    sub: earlyCount > 0 ? `-${totalUndertime}분` : null,
                    value: earlyCount > 0 ? `${earlyCount}` : null,
                  },
                  { dot: "bg-emerald-500", label: "연장", value: overtimeCount > 0 ? `${overtimeCount}` : null },
                ].map(({ dot, label, sub, value }) => (
                  <div key={label} className="flex items-center py-2.5 border-b border-gray-50 last:border-0">
                    <span className={`w-2 h-2 rounded-full mr-2.5 flex-shrink-0 ${dot}`} />
                    <span className="text-sm text-gray-700 flex-1">{label}</span>
                    {sub && <span className="text-xs text-gray-400 mr-3">{sub}</span>}
                    {value !== null ? (
                      <span className="text-sm font-bold text-gray-800 mr-1">{value}</span>
                    ) : (
                      <span className="text-sm text-gray-300 mr-1">-</span>
                    )}
                    <span className="text-gray-300 text-sm">›</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 근무현황 테이블 */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="grid grid-cols-3 px-4 py-2.5 border-b border-gray-100 text-xs font-medium text-gray-400">
                <span>날짜</span>
                <span className="text-center">시간</span>
                <span className="text-right">상태</span>
              </div>
              {loadingRecords && (
                <p className="text-center text-gray-300 text-sm py-10">로딩 중...</p>
              )}
              {!loadingRecords && dayRecords.length === 0 && (
                <p className="text-center text-gray-400 text-sm py-10">기록이 없습니다.</p>
              )}
              {!loadingRecords && dayRecords.map((r, i) => {
                const { label, color } = primaryStatus(r);
                return (
                  <div
                    key={`${r.date}-${i}`}
                    className={`grid grid-cols-3 px-4 py-3.5 items-center ${i < dayRecords.length - 1 ? "border-b border-gray-50" : ""}`}
                  >
                    <span className="text-sm text-gray-700">{fmtDateRow(r.date)}</span>
                    <span className={`text-xs text-center ${r.isAbsent ? "line-through text-gray-300" : "text-gray-600"}`}>
                      {r.isAbsent
                        ? `${r.scheduledStart}~${r.scheduledEnd}`
                        : `${fmtTime(r.checkIn)}~${fmtTime(r.checkOut)}`}
                    </span>
                    <div className="flex items-center justify-end gap-1">
                      <span className={`text-sm font-medium ${color}`}>{label}</span>
                      <span className="text-gray-300 text-sm">›</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── 상세정보 탭 ── */}
        {tab === "info" && editForm && (
          <div className="space-y-4">
            {/* 기본 정보 */}
            <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">이름</label>
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">전화번호</label>
                <input
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: formatPhone(e.target.value) })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">시급 (원)</label>
                <input
                  type="number"
                  value={editForm.hourlyWage}
                  onChange={(e) => setEditForm({ ...editForm, hourlyWage: parseInt(e.target.value) || 0 })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* 스케줄 */}
            <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">근무 스케줄</span>
                <button onClick={addSchedule} className="text-xs text-blue-600 hover:text-blue-700 font-medium">+ 추가</button>
              </div>
              {editForm.schedules.map((sched, i) => (
                <div key={i} className="border border-gray-200 rounded-xl p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-400">스케줄 {i + 1}</span>
                    {editForm.schedules.length > 1 && (
                      <button onClick={() => removeSchedule(i)} className="text-xs text-red-500">삭제</button>
                    )}
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {DAYS.map((day) => (
                      <button
                        key={day}
                        onClick={() => toggleDay(i, day)}
                        className={`w-9 h-9 rounded-full text-sm font-medium transition-colors ${sched.days.includes(day) ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">출근</label>
                      <input type="time" value={sched.startTime} onChange={(e) => updateSchedule(i, "startTime", e.target.value)} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">퇴근</label>
                      <input type="time" value={sched.endTime} onChange={(e) => updateSchedule(i, "endTime", e.target.value)} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">휴게(분)</label>
                      <input type="number" value={sched.breakMinutes} onChange={(e) => updateSchedule(i, "breakMinutes", parseInt(e.target.value) || 0)} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 급여 정보 요약 */}
            <div className="bg-gray-50 rounded-2xl p-4 grid grid-cols-2 gap-3 text-center text-sm">
              <div>
                <p className="text-gray-400 text-xs mb-0.5">주간 소정시간</p>
                <p className="font-semibold text-gray-700">{formatMinutes(weeklyMins)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-0.5">주휴수당</p>
                <p className={`font-semibold ${juhu > 0 ? "text-purple-600" : "text-gray-400"}`}>
                  {juhu > 0 ? `${juhu.toLocaleString()}원` : "해당없음"}
                </p>
              </div>
            </div>

            {saveMsg && (
              <p className={`text-sm text-center rounded-lg py-2 ${saveMsg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                {saveMsg.text}
              </p>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
