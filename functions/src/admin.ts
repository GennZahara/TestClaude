import * as admin from "firebase-admin";

// Cloud Functions 환경에서는 자동으로 인증되므로 initializeApp()만 호출
if (!admin.apps.length) {
  admin.initializeApp();
}

export { admin };
export const db = admin.firestore();
