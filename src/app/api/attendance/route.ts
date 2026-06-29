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
