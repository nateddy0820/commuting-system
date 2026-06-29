export interface Schedule {
  days: string[];
  startTime: string;
  endTime: string;
  breakMinutes: number;
}

const KR_DAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function getDayNameKR(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return KR_DAYS[new Date(y, m - 1, d).getDay()];
}

export function getScheduleForDay(schedules: Schedule[], dateStr: string): Schedule | null {
  const dayName = getDayNameKR(dateStr);
  return schedules.find((s) => s.days.includes(dayName)) ?? schedules[0] ?? null;
}

// 기존 단일 스케줄 필드 → schedules 배열로 변환
export function toSchedules(worker: Record<string, unknown>): Schedule[] {
  if (Array.isArray(worker.schedules) && (worker.schedules as Schedule[]).length > 0) {
    return worker.schedules as Schedule[];
  }
  return [
    {
      days: worker.workDays
        ? (worker.workDays as string).split(",").filter(Boolean)
        : [],
      startTime: (worker.startTime as string) ?? "09:00",
      endTime: (worker.endTime as string) ?? "18:00",
      breakMinutes: (worker.breakMinutes as number) ?? 0,
    },
  ];
}

export function getWeeklyScheduledMinutes(schedules: Schedule[]): number {
  return schedules.reduce((total, s) => {
    const mins = getScheduledMinutes(s.startTime, s.endTime, s.breakMinutes);
    return total + mins * s.days.length;
  }, 0);
}

// 주휴수당: 주 15시간 이상 근무 시 (소정근로시간 / 40) × 8 × 시급
export function calcJuhuSuDang(weeklyScheduledMinutes: number, hourlyWage: number): number {
  const hours = weeklyScheduledMinutes / 60;
  if (hours < 15) return 0;
  return Math.floor((hours / 40) * 8 * hourlyWage);
}

// 해당 날짜의 월요일(주 시작) 반환
export function getMondayOfWeek(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const day = date.getDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  date.setDate(date.getDate() - daysFromMonday);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function getSundayOfWeek(mondayStr: string): string {
  const [y, m, d] = mondayStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + 6);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function calcJuhuPaidMinutes(weeklyScheduledMinutes: number): number {
  return Math.floor((weeklyScheduledMinutes / 40) * 8);
}

export function formatTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  return new Date(date).toLocaleTimeString("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function calcWorkedMinutes(
  checkIn: Date | string | null,
  checkOut: Date | string | null,
  breakMinutes = 0
): number {
  if (!checkIn || !checkOut) return 0;
  const diffMs = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  const totalMinutes = Math.floor(diffMs / 60000);
  return Math.max(0, totalMinutes - breakMinutes);
}

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

export function calcPay(workedMinutes: number, hourlyWage: number): number {
  return Math.floor((workedMinutes / 60) * hourlyWage);
}

export function isLate(checkIn: Date | string | null, startTime: string): boolean {
  if (!checkIn) return false;
  const d = new Date(checkIn);
  const kst = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  const [h, m] = startTime.split(":").map(Number);
  return kst.getHours() > h || (kst.getHours() === h && kst.getMinutes() > m);
}

export function calcOvertimeMinutes(
  checkOut: Date | string | null,
  endTime: string,
  workedMinutes: number,
  scheduledMinutes: number
): number {
  if (!checkOut) return 0;
  return Math.max(0, workedMinutes - scheduledMinutes);
}

export function getScheduledMinutes(startTime: string, endTime: string, breakMinutes: number): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const total = eh * 60 + em - (sh * 60 + sm);
  return Math.max(0, total - breakMinutes);
}
