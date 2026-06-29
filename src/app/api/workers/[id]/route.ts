import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { name, phone, hourlyWage, schedules } = body;

  await db.collection("workers").doc(id).update({
    name,
    phone,
    hourlyWage,
    schedules: schedules ?? [],
  });

  const doc = await db.collection("workers").doc(id).get();
  return NextResponse.json({ id, ...doc.data() });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const attendanceSnap = await db.collection("attendance")
    .where("workerId", "==", id)
    .get();

  const batch = db.batch();
  attendanceSnap.docs.forEach((doc) => batch.delete(doc.ref));
  batch.delete(db.collection("workers").doc(id));
  await batch.commit();

  return NextResponse.json({ ok: true });
}
