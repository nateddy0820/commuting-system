"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Worker {
  id: string;
  name: string;
  phone: string;
  hourlyWage: number;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  workDays: string;
}

const DAYS = ["월", "화", "수", "목", "금", "토", "일"];

const emptyForm = {
  name: "",
  phone: "",
  hourlyWage: 10030,
  startTime: "09:00",
  endTime: "18:00",
  breakMinutes: 60,
  workDays: "",
};

export default function WorkersPage() {
  const router = useRouter();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [stats, setStats] = useState<{ workers: number; attendance: number } | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && !sessionStorage.getItem("adminAuth")) {
      router.replace("/admin");
    }
    loadWorkers();
    fetch("/api/admin/stats").then((r) => r.json()).then(setStats);
  }, [router]);

  async function loadWorkers() {
    const res = await fetch("/api/workers");
    setWorkers(await res.json());
  }

  function formatPhone(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }

  function toggleDay(day: string) {
    const current = form.workDays ? form.workDays.split(",") : [];
    const next = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day];
    setForm({ ...form, workDays: next.join(",") });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    const url = editingId ? `/api/workers/${editingId}` : "/api/workers";
    const method = editingId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json();
      setMessage({ text: data.error, type: "error" });
      return;
    }

    setMessage({ text: editingId ? "수정 완료!" : "등록 완료!", type: "success" });
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
    loadWorkers();
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`${name} 알바생을 삭제하시겠습니까? 출퇴근 기록도 모두 삭제됩니다.`)) return;
    await fetch(`/api/workers/${id}`, { method: "DELETE" });
    loadWorkers();
  }

  function startEdit(w: Worker) {
    setForm({
      name: w.name,
      phone: w.phone,
      hourlyWage: w.hourlyWage,
      startTime: w.startTime,
      endTime: w.endTime,
      breakMinutes: w.breakMinutes,
      workDays: w.workDays ?? "",
    });
    setEditingId(w.id);
    setShowForm(true);
    setMessage(null);
  }

  function cancelForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
    setMessage(null);
  }

  const selectedDays = form.workDays ? form.workDays.split(",") : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/")} className="text-gray-500 hover:text-gray-700 text-sm">
            ← 메인
          </button>
          <h1 className="text-xl font-bold text-gray-800">알바생 관리</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push("/admin/attendance")}
            className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            출퇴근 기록
          </button>
          <button
            onClick={() => {
              sessionStorage.removeItem("adminAuth");
              router.push("/admin");
            }}
            className="text-sm bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
          >
            로그아웃
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Firebase 사용량 */}
        {stats && (
          <div className={`rounded-xl p-4 text-sm ${stats.attendance > 40000 ? "bg-red-50 border border-red-200" : stats.attendance > 30000 ? "bg-yellow-50 border border-yellow-200" : "bg-white shadow-sm"}`}>
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-gray-700">Firebase 무료 사용량</p>
              <a
                href="https://console.firebase.google.com/project/farmers-poke/usage"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-500 hover:underline"
              >
                콘솔에서 확인 →
              </a>
            </div>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-gray-500 text-xs mb-1">
                  <span>출퇴근 기록 ({stats.attendance.toLocaleString()}개)</span>
                  <span className="text-gray-400">무료 한도: 1GB 저장</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${stats.attendance > 40000 ? "bg-red-500" : stats.attendance > 30000 ? "bg-yellow-400" : "bg-green-400"}`}
                    style={{ width: `${Math.min((stats.attendance / 50000) * 100, 100)}%` }}
                  />
                </div>
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>알바생 {stats.workers}명</span>
                {stats.attendance > 40000 && <span className="text-red-600 font-medium">⚠️ 용량 주의</span>}
                {stats.attendance > 30000 && stats.attendance <= 40000 && <span className="text-yellow-600 font-medium">⚠️ 용량 경고</span>}
                {stats.attendance <= 30000 && <span className="text-green-600">정상</span>}
              </div>
            </div>
          </div>
        )}

        {!showForm && (
          <button
            onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); }}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
          >
            + 알바생 등록
          </button>
        )}

        {showForm && (
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">
              {editingId ? "알바생 수정" : "알바생 등록"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">이름 *</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="홍길동"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">전화번호 *</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">시급 (원)</label>
                <input
                  type="number"
                  value={form.hourlyWage}
                  onChange={(e) => setForm({ ...form, hourlyWage: parseInt(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">근무 요일</label>
                <div className="flex gap-2">
                  {DAYS.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`w-9 h-9 rounded-full text-sm font-medium transition-colors ${
                        selectedDays.includes(day)
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">출근 시간</label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">퇴근 시간</label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">휴게(분)</label>
                  <input
                    type="number"
                    value={form.breakMinutes}
                    onChange={(e) => setForm({ ...form, breakMinutes: parseInt(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {message && (
                <p className={`text-sm rounded-lg px-3 py-2 ${
                  message.type === "success"
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}>
                  {message.text}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                >
                  {editingId ? "수정" : "등록"}
                </button>
                <button
                  type="button"
                  onClick={cancelForm}
                  className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="space-y-3">
          {workers.length === 0 && (
            <div className="text-center text-gray-400 py-12 bg-white rounded-2xl shadow-md">
              등록된 알바생이 없습니다.
            </div>
          )}
          {workers.map((w) => {
            const days = w.workDays ? w.workDays.split(",") : [];
            return (
              <div key={w.id} className="bg-white rounded-2xl shadow-md p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-gray-800 text-lg">{w.name}</p>
                    <p className="text-sm text-gray-500">{w.phone}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(w)}
                      className="text-sm bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(w.id, w.name)}
                      className="text-sm bg-red-50 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      삭제
                    </button>
                  </div>
                </div>

                {days.length > 0 && (
                  <div className="flex gap-1.5 mt-3">
                    {DAYS.map((day) => (
                      <span
                        key={day}
                        className={`w-7 h-7 rounded-full text-xs font-medium flex items-center justify-center ${
                          days.includes(day)
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-50 text-gray-300"
                        }`}
                      >
                        {day}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                  <div className="bg-gray-50 rounded-lg p-2 text-center">
                    <p className="text-gray-400 text-xs">시급</p>
                    <p className="font-semibold text-gray-700">{w.hourlyWage.toLocaleString()}원</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 text-center">
                    <p className="text-gray-400 text-xs">근무 시간</p>
                    <p className="font-semibold text-gray-700">{w.startTime} ~ {w.endTime}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 text-center">
                    <p className="text-gray-400 text-xs">휴게</p>
                    <p className="font-semibold text-gray-700">{w.breakMinutes}분</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
