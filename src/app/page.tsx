"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatTime, calcWorkedMinutes, formatMinutes } from "@/lib/utils";

interface Worker {
  id: string;
  name: string;
  phone: string;
}

interface AttendanceRecord {
  id: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  workerId: string;
}

export default function HomePage() {
  const router = useRouter();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<string>("");
  const [phoneLast4, setPhoneLast4] = useState<string>("");
  const [record, setRecord] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    fetch("/api/workers").then((r) => r.json()).then(setWorkers);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const currentWorker = workers.find((w) => w.id === selectedWorker);

  // 전화번호 뒷 4자리 일치 여부
  const phoneVerified =
    phoneLast4.length === 4 &&
    !!currentWorker &&
    currentWorker.phone.replace(/-/g, "").endsWith(phoneLast4);

  const phoneWrong = phoneLast4.length === 4 && !!currentWorker && !phoneVerified;

  useEffect(() => {
    if (!selectedWorker || !phoneVerified) {
      setRecord(null);
      return;
    }
    fetchRecord();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWorker, phoneVerified]);

  async function fetchRecord() {
    const res = await fetch(`/api/attendance?workerId=${selectedWorker}`);
    const data: AttendanceRecord[] = await res.json();
    const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
    setRecord(data.find((r) => r.date === today) ?? null);
  }

  async function handleAction(action: "checkin" | "checkout") {
    setLoading(true);
    setMessage(null);

    const res = await fetch(`/api/attendance/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workerId: selectedWorker, phoneLast4 }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setMessage({ text: data.error, type: "error" });
      return;
    }

    setMessage({
      text: action === "checkin" ? "출근되었습니다." : "퇴근되었습니다.",
      type: "success",
    });
    fetchRecord();
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm px-4 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">출퇴근 시스템</h1>
        <button
          onClick={() => router.push("/admin")}
          className="text-sm bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          관리자
        </button>
      </header>

      {/* Clock */}
      <div className="text-center mt-8">
        <p className="text-gray-500 text-sm" suppressHydrationWarning>
          {now.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric", weekday: "long" })}
        </p>
        <p className="text-5xl font-mono font-bold text-gray-800 mt-1" suppressHydrationWarning>
          {now.toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </p>
      </div>

      {/* Main Card */}
      <div className="max-w-md mx-auto mt-8 px-4 w-full">
        <div className="bg-white rounded-2xl shadow-md p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">이름 선택</label>
            <select
              value={selectedWorker}
              onChange={(e) => {
                setSelectedWorker(e.target.value);
                setPhoneLast4("");
                setMessage(null);
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- 이름을 선택하세요 --</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              전화번호 뒷 4자리
            </label>
            <input
              type="tel"
              maxLength={4}
              value={phoneLast4}
              onChange={(e) => {
                setPhoneLast4(e.target.value.replace(/\D/g, ""));
                setMessage(null);
              }}
              placeholder="예: 1234"
              className={`w-full border rounded-lg px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 transition-colors ${
                phoneWrong
                  ? "border-red-400 focus:ring-red-400"
                  : phoneVerified
                  ? "border-green-400 focus:ring-green-400"
                  : "border-gray-300 focus:ring-blue-500"
              }`}
            />
            {phoneWrong && (
              <p className="text-red-500 text-xs mt-1">전화번호가 일치하지 않습니다.</p>
            )}
          </div>

          {/* 출퇴근 현황 — 전화번호 인증된 경우에만 표시 */}
          {phoneVerified && (
            <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1.5">
              <p className="font-medium text-gray-700 mb-2">오늘 출퇴근 현황</p>
              <div className="flex justify-between text-gray-600">
                <span>출근</span>
                <span className={record?.checkIn ? "text-blue-600 font-medium" : "text-gray-400"}>
                  {record?.checkIn ? formatTime(record.checkIn) : "미출근"}
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>퇴근</span>
                <span className={record?.checkOut ? "text-green-600 font-medium" : "text-gray-400"}>
                  {record?.checkOut ? formatTime(record.checkOut) : "미퇴근"}
                </span>
              </div>
              {record?.checkIn && (
                <div className="flex justify-between text-gray-600 border-t border-gray-200 pt-1.5 mt-1.5">
                  <span>일한 총 시간</span>
                  <span className="text-gray-800 font-semibold">
                    {record.checkOut
                      ? formatMinutes(calcWorkedMinutes(record.checkIn, record.checkOut))
                      : formatMinutes(calcWorkedMinutes(record.checkIn, now.toISOString()))}
                  </span>
                </div>
              )}
            </div>
          )}

          {message && (
            <div
              className={`rounded-lg px-4 py-3 text-sm font-medium ${
                message.type === "success"
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {message.text}
            </div>
          )}

          {/* 출퇴근 버튼 — 전화번호 인증된 경우에만 활성화 */}
          <div className="flex gap-3">
            <button
              onClick={() => handleAction("checkin")}
              disabled={!phoneVerified || loading || !!record?.checkIn}
              className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              출근
            </button>
            <button
              onClick={() => handleAction("checkout")}
              disabled={!phoneVerified || loading || !record?.checkIn || !!record?.checkOut}
              className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              퇴근
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
