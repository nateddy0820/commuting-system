import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";

function getTodayKST(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const workerId = searchParams.get("workerId");
  const date = searchParams.get("date");

  if (workerId) {
    const month = searchParams.get("month"); // "YYYY-MM"

    const snap = await db.collection("attendance")
      .where("workerId", "==", workerId)
      .get();

    const workerDoc = await db.collection("workers").doc(workerId).get();
    const worker = { id: workerId, ...workerDoc.data() };

    let records = snap.docs
      .map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          date: d.date as string,
          checkIn: d.checkIn as string | null,
          checkOut: d.checkOut as string | null,
          workerId: d.workerId as string,
          createdAt: d.createdAt as string,
          worker,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));

    if (month) {
      records = records.filter((r) => r.date.startsWith(month));
    } else {
      records = records.slice(0, 30);
    }

    return NextResponse.json(records);
  }

  const targetDate = date ?? getTodayKST();
  const snap = await db.collection("attendance")
    .where("date", "==", targetDate)
    .get();

  const workerIds = [...new Set(snap.docs.map((d) => d.data().workerId as string))];
  const workerDocs = await Promise.all(
    workerIds.map((wid) => db.collection("workers").doc(wid).get())
  );
  const workerMap: Record<string, Record<string, unknown>> = Object.fromEntries(
    workerDocs.map((d) => [d.id, { id: d.id, ...d.data() }])
  );

  const records = snap.docs
    .map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        date: d.date as string,
        checkIn: d.checkIn as string | null,
        checkOut: d.checkOut as string | null,
        workerId: d.workerId as string,
        worker: workerMap[d.workerId as string],
      };
    })
    .sort((a, b) => ((a.worker?.name as string) ?? "").localeCompare((b.worker?.name as string) ?? ""));

  return NextResponse.json(records);
}

export async function POST(req: Request) {
  const { workerId, date, checkIn, checkOut } = await req.json();

  if (!workerId || !date) {
    return NextResponse.json({ error: "workerId와 date는 필수입니다." }, { status: 400 });
  }

  // 같은 날 중복 체크
  const existing = await db.collection("attendance")
    .where("workerId", "==", workerId)
    .where("date", "==", date)
    .limit(1)
    .get();

  if (!existing.empty) {
    return NextResponse.json({ error: "해당 날짜에 이미 기록이 있습니다." }, { status: 409 });
  }

  const ref = await db.collection("attendance").add({
    workerId,
    date,
    checkIn: checkIn || null,
    checkOut: checkOut || null,
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ id: ref.id }, { status: 201 });
}
