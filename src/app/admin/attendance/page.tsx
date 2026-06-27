"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  formatTime,
  calcWorkedMinutes,
  formatMinutes,
  calcPay,
  isLate,
  getScheduledMinutes,
  calcOvertimeMinutes,
} from "@/lib/utils";

interface Worker {
  id: number;
  name: string;
  phone: string;
  hourlyWage: number;
  startTime: string;
  endTime: string;
  breakMinutes: number;
}

interface AttendanceRecord {
  id: number;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  workerId: number;
  worker: Worker;
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

  useEffect(() => {
    loadRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, selectedDate, selectedWorker]);

  async function loadRecords() {
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
  }

  const totalPay = records.reduce((sum, r) => {
    const worked = calcWorkedMinutes(r.checkIn, r.checkOut, r.worker.breakMinutes);
    return sum + calcPay(worked, r.worker.hourlyWage);
  }, 0);

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
        {/* View mode toggle */}
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

        {/* Filters */}
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

        {/* Summary */}
        {records.length > 0 && (
          <div className="bg-blue-600 text-white rounded-xl shadow-md p-4 grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-blue-200 text-xs">총 인원</p>
              <p className="text-2xl font-bold">{records.length}명</p>
            </div>
            <div>
              <p className="text-blue-200 text-xs">총 급여</p>
              <p className="text-2xl font-bold">{totalPay.toLocaleString()}원</p>
            </div>
          </div>
        )}

        {/* Records */}
        <div className="space-y-3">
          {records.length === 0 && (
            <div className="text-center text-gray-400 py-12 bg-white rounded-2xl shadow-md">
              기록이 없습니다.
            </div>
          )}
          {records.map((r) => {
            const worked = calcWorkedMinutes(r.checkIn, r.checkOut, r.worker.breakMinutes);
            const pay = calcPay(worked, r.worker.hourlyWage);
            const late = isLate(r.checkIn, r.worker.startTime);
            const scheduled = getScheduledMinutes(r.worker.startTime, r.worker.endTime, r.worker.breakMinutes);
            const overtime = calcOvertimeMinutes(r.checkOut, r.worker.endTime, worked, scheduled);

            return (
              <div key={r.id} className="bg-white rounded-2xl shadow-md p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-800">{r.worker.name}</p>
                      {late && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">지각</span>
                      )}
                      {overtime > 0 && (
                        <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">초과 {formatMinutes(overtime)}</span>
                      )}
                    </div>
                    {viewMode === "worker" && (
                      <p className="text-xs text-gray-400">{r.date}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-blue-600">{pay.toLocaleString()}원</p>
                    <p className="text-xs text-gray-400">{r.worker.hourlyWage.toLocaleString()}원/시</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="bg-gray-50 rounded-lg p-2 text-center">
                    <p className="text-gray-400 text-xs">출근</p>
                    <p className={`font-semibold ${late ? "text-red-600" : "text-gray-700"}`}>
                      {formatTime(r.checkIn)}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 text-center">
                    <p className="text-gray-400 text-xs">퇴근</p>
                    <p className="font-semibold text-gray-700">{formatTime(r.checkOut)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 text-center">
                    <p className="text-gray-400 text-xs">근무 시간</p>
                    <p className="font-semibold text-gray-700">
                      {r.checkOut ? formatMinutes(worked) : "-"}
                    </p>
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
