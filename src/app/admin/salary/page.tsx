"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface WorkerSalary {
  id: string;
  name: string;
  workPay: number;
  juhuTotal: number;
  grandTotal: number;
  daysWorked: number;
}

interface SalaryData {
  workers: WorkerSalary[];
  grandTotal: number;
  period: string;
}

const AVATAR_COLORS = [
  "bg-pink-200 text-pink-700",
  "bg-teal-200 text-teal-700",
  "bg-sky-200 text-sky-700",
  "bg-purple-200 text-purple-700",
  "bg-amber-200 text-amber-700",
  "bg-green-200 text-green-700",
  "bg-rose-200 text-rose-700",
];

function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function SalaryPage() {
  const router = useRouter();
  const [month, setMonth] = useState(getCurrentMonth);
  const [data, setData] = useState<SalaryData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sessionStorage.getItem("adminAuth")) router.replace("/admin");
  }, [router]);

  useEffect(() => {
    setLoading(true);
    setData(null);
    fetch(`/api/salary?month=${month}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [month]);

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
          onClick={() => router.push("/admin/workers")}
          className="text-gray-500 hover:text-gray-700 text-sm"
        >
          ←
        </button>
        <h1 className="text-xl font-bold text-gray-800">급여 관리</h1>
      </header>

      <div className="max-w-md mx-auto px-4 mt-5 space-y-5">
        {/* Month card */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => changeMonth(-1)}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              ‹
            </button>
            <span className="font-bold text-gray-800 text-base">{year}년 {monthNum}월</span>
            <button
              onClick={() => changeMonth(1)}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              ›
            </button>
          </div>

          {loading ? (
            <div className="text-gray-300 text-sm py-2">집계 중...</div>
          ) : data ? (
            <div>
              <p className="text-3xl font-bold text-gray-900">{data.grandTotal.toLocaleString()}원</p>
              <p className="text-sm text-gray-400 mt-1">{data.period}</p>
            </div>
          ) : null}
        </div>

        {/* Worker list */}
        {data && (
          <div>
            <p className="text-sm font-semibold text-gray-500 mb-2 px-1">직원별 급여</p>
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100">
              {data.workers.length === 0 && (
                <p className="text-center text-gray-400 text-sm py-10">이 달의 기록이 없습니다.</p>
              )}
              {data.workers.map((w) => (
                <button
                  key={w.id}
                  onClick={() => router.push(`/admin/salary/${w.id}?month=${month}`)}
                  className="w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${avatarColor(w.name)}`}>
                    {w.name[0]}
                  </div>
                  <span className="flex-1 font-medium text-gray-800">{w.name}</span>
                  <span className={`font-bold ${w.grandTotal === 0 ? "text-gray-300" : "text-gray-800"}`}>
                    {w.grandTotal.toLocaleString()}원
                  </span>
                  <span className="text-gray-300 text-lg">›</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
