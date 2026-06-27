import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";

export async function POST(req: Request) {
  const { password } = await req.json();

  const doc = await db.collection("settings").doc("admin").get();

  let correctPassword = "2543";
  if (doc.exists) {
    correctPassword = doc.data()!.password ?? "2543";
  }

  if (password !== correctPassword) {
    return NextResponse.json({ error: "비밀번호가 틀렸습니다." }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
