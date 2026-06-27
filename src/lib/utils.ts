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
  const total = (eh * 60 + em) - (sh * 60 + sm);
  return Math.max(0, total - breakMinutes);
}
