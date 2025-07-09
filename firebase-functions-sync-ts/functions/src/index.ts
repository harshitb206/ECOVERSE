import * as functions from "firebase-functions";
import { connectToMongo } from "./utils/mongo";

// AUTH: onCreate
export const handleUserSignup = functions.auth.user().onCreate(async (user) => {
  const db = await connectToMongo();
  const users = db.collection("users");

  await users.insertOne({
    uid: user.uid,
    email: user.email || null,
    displayName: user.displayName || null,
    photoURL: user.photoURL || null,
    createdAt: new Date(),
  });

  console.log(`✅ Synced new user ${user.uid}`);
});

// AUTH: onDelete
export const handleUserDeletion = functions.auth.user().onDelete(async (user) => {
  const db = await connectToMongo();
  const users = db.collection("users");

  await users.deleteOne({ uid: user.uid });
  console.log(`🗑️ Deleted user ${user.uid}`);
});

// FIRESTORE: onCreate
export const syncLeaderboardCreate = functions.firestore
  .document("leaderboard/{docId}")
  .onCreate(async (snapshot, context) => {
    const db = await connectToMongo();
    const mongo = db.collection("leaderboard");

    await mongo.insertOne({
      firebaseId: context.params.docId,
      ...snapshot.data(),
    });

    console.log(`📥 Firestore → MongoDB: Created ${context.params.docId}`);
  });

// FIRESTORE: onUpdate
export const syncLeaderboardUpdate = functions.firestore
  .document("leaderboard/{docId}")
  .onUpdate(async (change, context) => {
    const db = await connectToMongo();
    const mongo = db.collection("leaderboard");

    await mongo.updateOne(
      { firebaseId: context.params.docId },
      { $set: change.after.data() }
    );

    console.log(`🔁 Firestore → MongoDB: Updated ${context.params.docId}`);
  });

// FIRESTORE: onDelete
export const syncLeaderboardDelete = functions.firestore
  .document("leaderboard/{docId}")
  .onDelete(async (snapshot, context) => {
    const db = await connectToMongo();
    const mongo = db.collection("leaderboard");

    await mongo.deleteOne({ firebaseId: context.params.docId });

    console.log(`❌ Firestore → MongoDB: Deleted ${context.params.docId}`);
  });
