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
    const snap = await db.collection("attendance")
      .where("workerId", "==", workerId)
      .orderBy("date", "desc")
      .limit(30)
      .get();

    const workerDoc = await db.collection("workers").doc(workerId).get();
    const worker = { id: workerId, ...workerDoc.data() };

    const records = snap.docs.map((doc) => ({ id: doc.id, ...doc.data(), worker }));
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
    .map((doc) => ({ id: doc.id, ...doc.data(), worker: workerMap[doc.data().workerId] }))
    .sort((a, b) => ((a.worker?.name as string) ?? "").localeCompare((b.worker?.name as string) ?? ""));

  return NextResponse.json(records);
}
