import { db } from './firebase';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { sendFrameNotification } from './notification-client';

// Interface for storing user FIDs (Farcaster IDs)
export interface UserFID {
  userId: string;
  fid: number;
  lastUpdated: Date;
}

// Interface for global notifications
export interface GlobalNotification {
  id: string;
  title: string;
  body: string;
  isActive: boolean;
  createdAt: Date;
  sentAt?: Date;
  targetUsers?: string[]; // If empty, send to all users
}

// Interface for notification history
export interface NotificationHistory {
  id: string;
  userId: string;
  fid: number;
  type: 'new_quest' | 'new_reward' | 'global';
  title: string;
  body: string;
  sentAt: Date;
  status: 'sent' | 'failed' | 'rate_limited';
}

// Get user's FID from Firebase
export async function getUserFID(userId: string): Promise<number | null> {
  try {
    const userFidRef = doc(db, 'userFIDs', userId);
    const userFidDoc = await getDoc(userFidRef);
    
    if (userFidDoc.exists()) {
      const data = userFidDoc.data();
      return data.fid || null;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user FID:', error);
    return null;
  }
}

// Store user's FID in Firebase
export async function storeUserFID(userId: string, fid: number): Promise<void> {
  try {
    const userFidRef = doc(db, 'userFIDs', userId);
    await setDoc(userFidRef, {
      userId,
      fid,
      lastUpdated: Timestamp.now()
    });
    console.log(`Stored FID ${fid} for user ${userId}`);
  } catch (error) {
    console.error('Error storing user FID:', error);
    throw error;
  }
}

// Get all users with FIDs
export async function getAllUsersWithFIDs(): Promise<UserFID[]> {
  try {
    const userFidsRef = collection(db, 'userFIDs');
    const querySnapshot = await getDocs(userFidsRef);
    
    return querySnapshot.docs.map(doc => ({
      userId: doc.data().userId,
      fid: doc.data().fid,
      lastUpdated: doc.data().lastUpdated?.toDate() || new Date()
    })) as UserFID[];
  } catch (error) {
    console.error('Error getting users with FIDs:', error);
    return [];
  }
}

// Send notification to a single user
export async function sendNotificationToUser(
  userId: string, 
  title: string, 
  body: string, 
  type: 'new_quest' | 'new_reward' | 'global' = 'global'
): Promise<boolean> {
  try {
    const fid = await getUserFID(userId);
    if (!fid) {
      console.log(`No FID found for user ${userId}`);
      return false;
    }

    const result = await sendFrameNotification({
      fid,
      title,
      body
    });

    // Store notification history
    const status = result.state === 'success' ? 'sent' : 
                   result.state === 'rate_limit' ? 'rate_limited' : 'failed';
    await storeNotificationHistory(userId, fid, type, title, body, status);

    if (result.state === 'success') {
      console.log(`Notification sent successfully to user ${userId} (FID: ${fid})`);
      return true;
    } else {
      console.error(`Failed to send notification to user ${userId}:`, result);
      return false;
    }
  } catch (error) {
    console.error(`Error sending notification to user ${userId}:`, error);
    return false;
  }
}

// Send notification to all users
export async function sendNotificationToAllUsers(
  title: string, 
  body: string, 
  type: 'new_quest' | 'new_reward' | 'global' = 'global'
): Promise<{ success: number; failed: number; total: number }> {
  try {
    const users = await getAllUsersWithFIDs();
    let success = 0;
    let failed = 0;

    console.log(`Sending ${type} notification to ${users.length} users`);

    // Send notifications in batches to avoid rate limiting
    const batchSize = 10;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      
      const results = await Promise.allSettled(
        batch.map(user => 
          sendFrameNotification({
            fid: user.fid,
            title,
            body
          })
        )
      );

      results.forEach((result, index) => {
        const user = batch[index];
        if (result.status === 'fulfilled' && result.value.state === 'success') {
          success++;
        } else {
          failed++;
          console.error(`Failed to send notification to user ${user.userId}:`, result);
        }
      });

      // Store notification history for this batch
      await Promise.allSettled(
        batch.map(user => 
          storeNotificationHistory(user.userId, user.fid, type, title, body, 'sent')
        )
      );

      // Wait a bit between batches to avoid rate limiting
      if (i + batchSize < users.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`Notification sent to ${success} users, failed for ${failed} users`);
    return { success, failed, total: users.length };
  } catch (error) {
    console.error('Error sending notification to all users:', error);
    return { success: 0, failed: 0, total: 0 };
  }
}

// Store notification history
async function storeNotificationHistory(
  userId: string, 
  fid: number, 
  type: 'new_quest' | 'new_reward' | 'global',
  title: string, 
  body: string, 
  status: 'sent' | 'failed' | 'rate_limited'
): Promise<void> {
  try {
    const historyRef = doc(collection(db, 'notificationHistory'));
    await setDoc(historyRef, {
      id: historyRef.id,
      userId,
      fid,
      type,
      title,
      body,
      sentAt: Timestamp.now(),
      status
    });
  } catch (error) {
    console.error('Error storing notification history:', error);
  }
}

// Interface for quest data
interface QuestData {
  title: string;
  description?: string;
  type?: string;
}

// Interface for reward data
interface RewardData {
  name: string;
  description?: string;
  type?: string;
}

// Send notification for new quest
export async function sendNewQuestNotification(quest: QuestData): Promise<void> {
  try {
    const title = '📜 New Quest Available!';
    const body = `A new quest "${quest.title}" is now available! Check it out in your quest log.`;
    
    const result = await sendNotificationToAllUsers(title, body, 'new_quest');
    console.log(`New quest notification sent: ${result.success}/${result.total} users`);
  } catch (error) {
    console.error('Error sending new quest notification:', error);
  }
}

// Send notification for new reward
export async function sendNewRewardNotification(reward: RewardData): Promise<void> {
  try {
    const title = '🎁 New Reward Available!';
    const body = `A new reward "${reward.name}" is now available in your rewards center!`;
    
    const result = await sendNotificationToAllUsers(title, body, 'new_reward');
    console.log(`New reward notification sent: ${result.success}/${result.total} users`);
  } catch (error) {
    console.error('Error sending new reward notification:', error);
  }
}

// Send global notification
export async function sendGlobalNotification(
  title: string, 
  body: string, 
  targetUsers?: string[]
): Promise<{ success: number; failed: number; total: number }> {
  try {
    if (targetUsers && targetUsers.length > 0) {
      // Send to specific users
      let success = 0;
      let failed = 0;

      for (const userId of targetUsers) {
        const result = await sendNotificationToUser(userId, title, body, 'global');
        if (result) {
          success++;
        } else {
          failed++;
        }
      }

      return { success, failed, total: targetUsers.length };
    } else {
      // Send to all users
      return await sendNotificationToAllUsers(title, body, 'global');
    }
  } catch (error) {
    console.error('Error sending global notification:', error);
    return { success: 0, failed: 0, total: 0 };
  }
}

// Get notification history for a user
export async function getNotificationHistory(userId: string): Promise<NotificationHistory[]> {
  try {
    const q = query(
      collection(db, 'notificationHistory'),
      where('userId', '==', userId),
      orderBy('sentAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      sentAt: doc.data().sentAt?.toDate() || new Date()
    })) as NotificationHistory[];
  } catch (error) {
    console.error('Error getting notification history:', error);
    return [];
  }
}

// Get global notifications
export async function getGlobalNotifications(): Promise<GlobalNotification[]> {
  try {
    const q = query(
      collection(db, 'globalNotifications'),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      sentAt: doc.data().sentAt?.toDate()
    })) as GlobalNotification[];
  } catch (error) {
    console.error('Error getting global notifications:', error);
    return [];
  }
}

// Create a new global notification
export async function createGlobalNotification(
  title: string, 
  body: string, 
  targetUsers?: string[]
): Promise<string> {
  try {
    const notificationRef = doc(collection(db, 'globalNotifications'));
    await setDoc(notificationRef, {
      id: notificationRef.id,
      title,
      body,
      isActive: true,
      createdAt: Timestamp.now(),
      targetUsers: targetUsers || []
    });
    
    console.log(`Created global notification: ${title}`);
    return notificationRef.id;
  } catch (error) {
    console.error('Error creating global notification:', error);
    throw error;
  }
}

// Send a global notification by ID
export async function sendGlobalNotificationById(notificationId: string): Promise<{ success: number; failed: number; total: number }> {
  try {
    const notificationRef = doc(db, 'globalNotifications', notificationId);
    const notificationDoc = await getDoc(notificationRef);
    
    if (!notificationDoc.exists()) {
      throw new Error('Notification not found');
    }
    
    const notification = notificationDoc.data() as GlobalNotification;
    
    // Send the notification
    const result = await sendGlobalNotification(notification.title, notification.body, notification.targetUsers);
    
    // Mark as sent
    await updateDoc(notificationRef, {
      sentAt: Timestamp.now()
    });
    
    return result;
  } catch (error) {
    console.error('Error sending global notification by ID:', error);
    return { success: 0, failed: 0, total: 0 };
  }
} 