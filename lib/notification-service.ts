import { db } from './firebase';
import { doc, setDoc, getDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';

export interface NotificationDetails {
  token: string;
  url: string;
  fid?: string;
  addedAt: Date;
}

export class NotificationService {
  private static readonly COLLECTION_NAME = 'notificationDetails';

  // Store notification details for a user
  static async storeNotificationDetails(userId: string, details: NotificationDetails): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, userId);
      await setDoc(docRef, {
        ...details,
        addedAt: new Date(),
      });
      console.log(`✅ [FIREBASE] Stored notification details for user: ${userId}`);
    } catch (error) {
      console.error('❌ [FIREBASE] Failed to store notification details:', error);
      throw error;
    }
  }

  // Get notification details for a user
  static async getNotificationDetails(userId: string): Promise<NotificationDetails | null> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, userId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        console.log(`⚠️ [FIREBASE] No notification details found for user: ${userId}`);
        return null;
      }

      const data = docSnap.data();
      const details: NotificationDetails = {
        token: data.token,
        url: data.url,
        fid: data.fid,
        addedAt: data.addedAt.toDate(),
      };

      console.log(`✅ [FIREBASE] Retrieved notification details for user: ${userId}`);
      return details;
    } catch (error) {
      console.error('❌ [FIREBASE] Failed to get notification details:', error);
      return null;
    }
  }

  // Remove notification details for a user
  static async removeNotificationDetails(userId: string): Promise<void> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, userId);
      await deleteDoc(docRef);
      console.log(`✅ [FIREBASE] Removed notification details for user: ${userId}`);
    } catch (error) {
      console.error('❌ [FIREBASE] Failed to remove notification details:', error);
      throw error;
    }
  }

  // Check if user has notification details
  static async hasNotificationDetails(userId: string): Promise<boolean> {
    try {
      const details = await this.getNotificationDetails(userId);
      return details !== null;
    } catch (error) {
      console.error('❌ [FIREBASE] Failed to check notification details:', error);
      return false;
    }
  }

  // Get all users with notification details
  static async getAllUsersWithNotifications(): Promise<string[]> {
    try {
      const querySnapshot = await getDocs(collection(db, this.COLLECTION_NAME));
      const userIds = querySnapshot.docs.map(doc => doc.id);
      console.log(`✅ [FIREBASE] Found ${userIds.length} users with notification details`);
      return userIds;
    } catch (error) {
      console.error('❌ [FIREBASE] Failed to get users with notifications:', error);
      return [];
    }
  }
} 