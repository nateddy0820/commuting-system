import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";

export async function GET() {
  const snap = await db.collection("workers").orderBy("createdAt", "desc").get();
  const workers = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return NextResponse.json(workers);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { name, phone, hourlyWage, schedules } = body;

  if (!name || !phone) {
    return NextResponse.json({ error: "이름과 전화번호는 필수입니다." }, { status: 400 });
  }

  const ref = await db.collection("workers").add({
    name,
    phone,
    hourlyWage: hourlyWage ?? 10030,
    schedules: schedules ?? [],
    createdAt: new Date().toISOString(),
  });

  const doc = await ref.get();
  return NextResponse.json({ id: ref.id, ...doc.data() }, { status: 201 });
}
