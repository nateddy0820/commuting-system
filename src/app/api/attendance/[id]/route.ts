import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { checkIn, checkOut } = await req.json();

  const update: Record<string, string | null> = {};
  if (checkIn !== undefined) update.checkIn = checkIn;
  if (checkOut !== undefined) update.checkOut = checkOut;

  await db.collection("attendance").doc(id).update(update);
  const doc = await db.collection("attendance").doc(id).get();
  return NextResponse.json({ id, ...doc.data() });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.collection("attendance").doc(id).delete();
  return NextResponse.json({ ok: true });
}
