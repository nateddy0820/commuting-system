"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Schedule, toSchedules } from "@/lib/utils";

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

const DAYS = ["월", "화", "수", "목", "금", "토", "일"];
const emptySchedule: Schedule = { days: [], startTime: "09:00", endTime: "18:00", breakMinutes: 0 };
const emptyForm = { name: "", phone: "", hourlyWage: 10030, schedules: [{ ...emptySchedule }] };

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

function schedulesSummary(worker: Worker): string {
  const schedules = toSchedules(worker as unknown as Record<string, unknown>);
  return schedules
    .map((s) => {
      if (s.days.length === 0) return null;
      const days = DAYS.filter((d) => s.days.includes(d)).join(", ");
      return `${days} ${s.startTime}~${s.endTime}`;
    })
    .filter(Boolean)
    .join(" / ");
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export default function WorkersPage() {
  const router = useRouter();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionStorage.getItem("adminAuth")) router.replace("/admin");
    loadWorkers();
  }, [router]);

  async function loadWorkers() {
    const res = await fetch("/api/workers");
    setWorkers(await res.json());
  }

  function addSchedule() {
    setForm((f) => ({ ...f, schedules: [...f.schedules, { ...emptySchedule }] }));
  }

  function removeSchedule(idx: number) {
    setForm((f) => ({ ...f, schedules: f.schedules.filter((_, i) => i !== idx) }));
  }

  function toggleDay(si: number, day: string) {
    setForm((f) => ({
      ...f,
      schedules: f.schedules.map((s, i) => {
        if (i !== si) return s;
        const days = s.days.includes(day) ? s.days.filter((d) => d !== day) : [...s.days, day];
        return { ...s, days };
      }),
    }));
  }

  function updateSchedule(si: number, field: keyof Omit<Schedule, "days">, value: string | number) {
    setForm((f) => ({
      ...f,
      schedules: f.schedules.map((s, i) => (i === si ? { ...s, [field]: value } : s)),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/workers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json();
      setMessage(d.error);
      return;
    }
    setForm(emptyForm);
    setShowForm(false);
    setMessage(null);
    loadWorkers();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/")} className="text-gray-500 hover:text-gray-700 text-sm">←</button>
          <h1 className="text-xl font-bold text-gray-800">직원관리</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push("/admin/salary")}
            className="text-sm bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
          >
            급여 관리
          </button>
          <button
            onClick={() => router.push("/admin/attendance")}
            className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            출퇴근 기록
          </button>
          <button
            onClick={() => { sessionStorage.removeItem("adminAuth"); router.push("/admin"); }}
            className="text-sm bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
          >
            로그아웃
          </button>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        {/* 등록 버튼 */}
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="w-full bg-rose-50 border border-rose-200 text-rose-600 py-3.5 rounded-xl font-semibold hover:bg-rose-100 transition-colors flex items-center justify-center gap-2"
          >
            <span className="text-lg">+</span> 신규직원 등록
          </button>
        )}

        {/* 등록 폼 */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow-md p-5">
            <h2 className="text-base font-bold text-gray-800 mb-4">알바생 등록</h2>
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">이름 *</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="홍길동"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">전화번호 *</label>
                  <input
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="010-0000-0000"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">시급 (원)</label>
                <input
                  type="number"
                  value={form.hourlyWage}
                  onChange={(e) => setForm({ ...form, hourlyWage: parseInt(e.target.value) || 0 })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-600">근무 스케줄</label>
                  <button type="button" onClick={addSchedule} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                    + 추가
                  </button>
                </div>
                {form.schedules.map((sched, i) => (
                  <div key={i} className="border border-gray-200 rounded-xl p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-500">스케줄 {i + 1}</span>
                      {form.schedules.length > 1 && (
                        <button type="button" onClick={() => removeSchedule(i)} className="text-xs text-red-500">삭제</button>
                      )}
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {DAYS.map((day) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(i, day)}
                          className={`w-9 h-9 rounded-full text-sm font-medium transition-colors ${sched.days.includes(day) ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">출근</label>
                        <input type="time" value={sched.startTime} onChange={(e) => updateSchedule(i, "startTime", e.target.value)} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">퇴근</label>
                        <input type="time" value={sched.endTime} onChange={(e) => updateSchedule(i, "endTime", e.target.value)} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">휴게(분)</label>
                        <input type="number" value={sched.breakMinutes} onChange={(e) => updateSchedule(i, "breakMinutes", parseInt(e.target.value) || 0)} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {message && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{message}</p>}

              <div className="flex gap-3">
                <button type="submit" disabled={saving} className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  {saving ? "등록 중..." : "등록"}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setForm(emptyForm); setMessage(null); }} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors">
                  취소
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 직원 리스트 */}
        {workers.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-gray-500 mb-2 px-1">근무직원</p>
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100">
              {workers.map((w) => (
                <button
                  key={w.id}
                  onClick={() => router.push(`/admin/workers/${w.id}`)}
                  className="w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
                >
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${avatarColor(w.name)}`}>
                    {w.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800">{w.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{schedulesSummary(w) || "스케줄 없음"}</p>
                  </div>
                  <span className="text-gray-300 text-lg flex-shrink-0">›</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {workers.length === 0 && !showForm && (
          <div className="text-center text-gray-400 py-16 bg-white rounded-2xl shadow-sm">
            등록된 직원이 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
