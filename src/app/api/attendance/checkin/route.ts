import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";

function getTodayKST(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
}

export async function POST(req: Request) {
  const { workerId, phoneLast4 } = await req.json();

  const workerDoc = await db.collection("workers").doc(workerId).get();
  if (!workerDoc.exists) {
    return NextResponse.json({ error: "알바생을 찾을 수 없습니다." }, { status: 404 });
  }

  const worker = workerDoc.data()!;
  if (!worker.phone.endsWith(phoneLast4)) {
    return NextResponse.json({ error: "전화번호 뒷자리가 일치하지 않습니다." }, { status: 401 });
  }

  const today = getTodayKST();
  const snap = await db.collection("attendance")
    .where("workerId", "==", workerId)
    .where("date", "==", today)
    .limit(1)
    .get();

  if (!snap.empty && snap.docs[0].data().checkIn) {
    return NextResponse.json({ error: "이미 출근 처리되었습니다." }, { status: 409 });
  }

  const now = new Date().toISOString();

  if (!snap.empty) {
    await snap.docs[0].ref.update({ checkIn: now });
    return NextResponse.json({ id: snap.docs[0].id, ...snap.docs[0].data(), checkIn: now });
  }

  const ref = await db.collection("attendance").add({
    workerId,
    date: today,
    checkIn: now,
    checkOut: null,
    createdAt: now,
  });

  const doc = await ref.get();
  return NextResponse.json({ id: ref.id, ...doc.data() });
}
