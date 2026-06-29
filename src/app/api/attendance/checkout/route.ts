import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { DocumentReference } from "firebase-admin/firestore";

interface AttDoc {
  ref: DocumentReference;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  workerId: string;
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

  // 날짜 무관, 출근만 찍히고 퇴근 안 된 가장 최근 기록
  const snap = await db.collection("attendance").where("workerId", "==", workerId).get();

  const unfinished = snap.docs
    .map((doc): AttDoc => ({
      ref: doc.ref,
      date: doc.data().date as string,
      checkIn: doc.data().checkIn as string | null,
      checkOut: doc.data().checkOut as string | null,
      workerId: doc.data().workerId as string,
    }))
    .filter((r) => r.checkIn && !r.checkOut)
    .sort((a, b) => b.date.localeCompare(a.date));

  if (unfinished.length === 0) {
    return NextResponse.json({ error: "출근 기록이 없습니다." }, { status: 400 });
  }

  const record = unfinished[0];
  const now = new Date().toISOString();
  await record.ref.update({ checkOut: now });

  return NextResponse.json({ id: record.ref.id, ...record, checkOut: now });
}
