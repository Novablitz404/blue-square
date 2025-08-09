import { notificationDetailsSchema } from "@farcaster/frame-sdk";
import { db } from "./firebase";
import { doc, setDoc, getDoc, deleteDoc } from "firebase/firestore";
import type { z } from "zod";

type FrameNotificationDetails = z.infer<typeof notificationDetailsSchema>;

const NOTIFICATION_COLLECTION = "user_notifications";

function getUserNotificationKey(fid: number): string {
  return `user_${fid}`;
}

export async function getUserNotificationDetails(
  fid: number,
): Promise<FrameNotificationDetails | null> {
  try {
    const docRef = doc(db, NOTIFICATION_COLLECTION, getUserNotificationKey(fid));
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as FrameNotificationDetails;
    }
    
    return null;
  } catch (error) {
    console.error("Error getting user notification details:", error);
    return null;
  }
}

export async function setUserNotificationDetails(
  fid: number,
  notificationDetails: FrameNotificationDetails,
): Promise<void> {
  try {
    const docRef = doc(db, NOTIFICATION_COLLECTION, getUserNotificationKey(fid));
    await setDoc(docRef, notificationDetails);
    console.log(`✅ Stored notification details for FID ${fid}`);
  } catch (error) {
    console.error("Error setting user notification details:", error);
    throw error;
  }
}

export async function deleteUserNotificationDetails(
  fid: number,
): Promise<void> {
  try {
    const docRef = doc(db, NOTIFICATION_COLLECTION, getUserNotificationKey(fid));
    await deleteDoc(docRef);
    console.log(`✅ Deleted notification details for FID ${fid}`);
  } catch (error) {
    console.error("Error deleting user notification details:", error);
    throw error;
  }
}

// Get all users with notification details for broadcasting
export async function getAllNotificationUsers(): Promise<Array<{ fid: number; details: FrameNotificationDetails }>> {
  try {
    const { collection, getDocs } = await import("firebase/firestore");
    const collectionRef = collection(db, NOTIFICATION_COLLECTION);
    const snapshot = await getDocs(collectionRef);
    
    const users: Array<{ fid: number; details: FrameNotificationDetails }> = [];
    
    snapshot.forEach((doc) => {
      const fidMatch = doc.id.match(/^user_(\d+)$/);
      if (fidMatch) {
        const fid = parseInt(fidMatch[1], 10);
        users.push({
          fid,
          details: doc.data() as FrameNotificationDetails,
        });
      }
    });
    
    return users;
  } catch (error) {
    console.error("Error getting all notification users:", error);
    return [];
  }
}
