import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";

export async function GET() {
  const [workersSnap, attendanceSnap] = await Promise.all([
    db.collection("workers").count().get(),
    db.collection("attendance").count().get(),
  ]);

  return NextResponse.json({
    workers: workersSnap.data().count,
    attendance: attendanceSnap.data().count,
  });
}
