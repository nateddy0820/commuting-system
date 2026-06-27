import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import path from "path";

if (!getApps().length) {
  const keyPath = path.join(process.cwd(), "serviceAccountKey.json");
  const serviceAccount = JSON.parse(readFileSync(keyPath, "utf-8"));
  initializeApp({ credential: cert(serviceAccount) });
}

export const db = getFirestore();
