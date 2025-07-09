import * as functions from "firebase-functions";
import { connectToMongo } from "./utils/mongo";

const collectionPath = "leaderboard";

export const syncLeaderboardCreate = functions.firestore
  .document(`${collectionPath}/{docId}`)
  .onCreate(async (snapshot, context) => {
    const docId = context.params.docId;
    const data = snapshot.data();

    const db = await connectToMongo();
    const mongo = db.collection("leaderboard");

    await mongo.insertOne({
      firebaseId: docId,
      ...data,
    });

    console.log(`📥 Firestore → MongoDB: Created ${docId}`);
  });

export const syncLeaderboardUpdate = functions.firestore
  .document(`${collectionPath}/{docId}`)
  .onUpdate(async (change, context) => {
    const docId = context.params.docId;
    const newData = change.after.data();

    const db = await connectToMongo();
    const mongo = db.collection("leaderboard");

    await mongo.updateOne({ firebaseId: docId }, { $set: newData });

    console.log(`🔁 Firestore → MongoDB: Updated ${docId}`);
  });

export const syncLeaderboardDelete = functions.firestore
  .document(`${collectionPath}/{docId}`)
  .onDelete(async (snapshot, context) => {
    const docId = context.params.docId;

    const db = await connectToMongo();
    const mongo = db.collection("leaderboard");

    await mongo.deleteOne({ firebaseId: docId });

    console.log(`❌ Firestore → MongoDB: Deleted ${docId}`);
  });
