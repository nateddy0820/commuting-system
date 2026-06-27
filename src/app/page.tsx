"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatTime } from "@/lib/utils";

interface Worker {
  id: number;
  name: string;
  phone: string;
}

interface AttendanceRecord {
  id: number;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  workerId: number;
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
    fetch("/api/workers")
      .then((r) => r.json())
      .then(setWorkers);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!selectedWorker) {
      setRecord(null);
      return;
    }
    fetchRecord();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWorker]);

  async function fetchRecord() {
    const res = await fetch(`/api/attendance?workerId=${selectedWorker}`);
    const data = await res.json();
    const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
    const todayRecord = data.find((r: AttendanceRecord) => r.date === today) ?? null;
    setRecord(todayRecord);
  }

  async function handleAction(action: "checkin" | "checkout") {
    if (!selectedWorker) {
      setMessage({ text: "이름을 선택해주세요.", type: "error" });
      return;
    }
    if (phoneLast4.length !== 4) {
      setMessage({ text: "전화번호 뒷 4자리를 입력해주세요.", type: "error" });
      return;
    }

    setLoading(true);
    setMessage(null);

    const res = await fetch(`/api/attendance/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workerId: parseInt(selectedWorker), phoneLast4 }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setMessage({ text: data.error, type: "error" });
      return;
    }

    setMessage({
      text: action === "checkin" ? "출근 처리 완료!" : "퇴근 처리 완료!",
      type: "success",
    });
    setPhoneLast4("");
    fetchRecord();
  }

  const currentWorker = workers.find((w) => w.id === parseInt(selectedWorker));

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
        <p className="text-gray-500 text-sm">
          {now.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric", weekday: "long" })}
        </p>
        <p className="text-5xl font-mono font-bold text-gray-800 mt-1">
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
                setMessage(null);
                setPhoneLast4("");
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- 이름을 선택하세요 --</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
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
              onChange={(e) => setPhoneLast4(e.target.value.replace(/\D/g, ""))}
              placeholder="예: 1234"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Today status */}
          {currentWorker && (
            <div className="bg-gray-50 rounded-lg p-4 text-sm">
              <p className="font-medium text-gray-700 mb-2">오늘 출퇴근 현황</p>
              <div className="flex justify-between text-gray-600">
                <span>출근</span>
                <span className={record?.checkIn ? "text-blue-600 font-medium" : "text-gray-400"}>
                  {record?.checkIn ? formatTime(record.checkIn) : "미출근"}
                </span>
              </div>
              <div className="flex justify-between text-gray-600 mt-1">
                <span>퇴근</span>
                <span className={record?.checkOut ? "text-green-600 font-medium" : "text-gray-400"}>
                  {record?.checkOut ? formatTime(record.checkOut) : "미퇴근"}
                </span>
              </div>
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

          <div className="flex gap-3">
            <button
              onClick={() => handleAction("checkin")}
              disabled={loading || !!record?.checkIn}
              className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              출근
            </button>
            <button
              onClick={() => handleAction("checkout")}
              disabled={loading || !record?.checkIn || !!record?.checkOut}
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
