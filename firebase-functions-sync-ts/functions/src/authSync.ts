import * as functions from "firebase-functions";
import { connectToMongo } from "./utils/mongo";

export const handleUserSignup = functions.auth.user().onCreate(async (user) => {
  const db = await connectToMongo();
  const collection = db.collection("users");

  await collection.insertOne({
    uid: user.uid,
    email: user.email || null,
    displayName: user.displayName || null,
    photoURL: user.photoURL || null,
    createdAt: new Date(),
  });

  console.log(`✅ Synced new user ${user.uid} to MongoDB`);
});

export const handleUserDeletion = functions.auth.user().onDelete(async (user) => {
  const db = await connectToMongo();
  const collection = db.collection("users");

  await collection.deleteOne({ uid: user.uid });

  console.log(`🗑️ Removed user ${user.uid} from MongoDB`);
});
