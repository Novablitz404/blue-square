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

export interface Quest {
  id: string;
  title: string;
  description: string;
  type: 'early_adopter' | 'activity_based' | 'streak_based' | 'share_based';
  requirements: {
    dailyLogins?: number;
    targetDate?: string;
    activityCount?: number;
    streakDays?: number;
    shareCount?: number;
    shareContent?: string;
    dailyShareLimit?: number;
  };
  rewards: {
    points: number;
  };
  isActive: boolean;
  startDate: Date;
  endDate?: Date;
  createdAt: Date;
}

export interface UserQuest {
  userId: string;
  questId: string;
  progress: number;
  isCompleted: boolean;
  completedAt?: Date;
  startedAt: Date;
  lastUpdated: Date;
  dailyShares?: {
    date: string; // YYYY-MM-DD format
    count: number;
  }[];
}

// Interface for Firebase UserQuest data with Timestamps
interface FirebaseUserQuest {
  userId: string;
  questId: string;
  progress: number;
  isCompleted: boolean;
  completedAt?: Timestamp;
  startedAt: Timestamp;
  lastUpdated: Timestamp;
  dailyShares?: {
    date: string; // YYYY-MM-DD format
    count: number;
  }[];
}

export interface UserQuestData {
  userId: string;
  quests: UserQuest[];
  dailyLoginStreak: number;
  lastLoginDate: string;
  totalQuestsCompleted: number;
  totalQuestPoints: number;
  lastUpdated: Date;
}

// Fetch quests from Firebase
export async function getQuestsFromFirebase(): Promise<Quest[]> {
  try {
    const q = query(collection(db, 'quests'), where('isActive', '==', true), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      startDate: doc.data().startDate?.toDate() || new Date(),
      endDate: doc.data().endDate?.toDate(),
      createdAt: doc.data().createdAt?.toDate() || new Date()
    })) as Quest[];
  } catch (error) {
    console.error('Error fetching quests from Firebase:', error);
    // Return empty array if Firebase fails - no fallback quests
    return [];
  }
}

// Get user quest data
export async function getUserQuestData(userId: string): Promise<UserQuestData | null> {
  try {
    const userRef = doc(db, 'userQuests', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const data = userDoc.data();
      return {
        userId: data.userId,
        dailyLoginStreak: data.dailyLoginStreak || 0,
        lastLoginDate: data.lastLoginDate || new Date().toISOString().split('T')[0],
        totalQuestsCompleted: data.totalQuestsCompleted || 0,
        totalQuestPoints: data.totalQuestPoints || 0,
        lastUpdated: data.lastUpdated?.toDate() || new Date(),
          quests: data.quests?.map((quest: FirebaseUserQuest) => ({
    ...quest,
    startedAt: quest.startedAt?.toDate() || new Date(),
    lastUpdated: quest.lastUpdated?.toDate() || new Date(),
    completedAt: quest.completedAt?.toDate(),
    dailyShares: quest.dailyShares || [], // Ensure dailyShares is always present
  })) || []
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user quest data:', error);
    return null;
  }
}

// Initialize user quest data
export async function initializeUserQuestData(userId: string): Promise<void> {
  try {
    const userRef = doc(db, 'userQuests', userId);
    
    // Get quests from Firebase to initialize user quest data
    const quests = await getQuestsFromFirebase();
    const userQuests: UserQuest[] = quests.map(quest => ({
      userId,
      questId: quest.id,
      progress: 0,
      isCompleted: false,
      startedAt: new Date(),
      lastUpdated: new Date()
    }));

    await setDoc(userRef, {
      userId,
      quests: userQuests,
      dailyLoginStreak: 0,
      lastLoginDate: new Date().toISOString().split('T')[0],
      totalQuestsCompleted: 0,
      totalQuestPoints: 0,
      lastUpdated: Timestamp.now()
    });

    console.log(`Initialized quest data for ${userId}`);
  } catch (error) {
    console.error('Error initializing user quest data:', error);
    throw error;
  }
}

// Update daily login streak
export async function updateDailyLoginStreak(userId: string): Promise<void> {
  try {
    const userRef = doc(db, 'userQuests', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      await initializeUserQuestData(userId);
      return;
    }

    const data = userDoc.data();
    const today = new Date().toISOString().split('T')[0];
    const lastLoginDate = data.lastLoginDate;
    let streak = data.dailyLoginStreak || 0;

    // Debug logging
    console.log('Today:', today);
    console.log('Last login:', lastLoginDate);
    console.log('Current streak:', streak);

    if (lastLoginDate === today) {
      // Already logged in today, but ensure streak is at least 1
      if (streak === 0) {
        streak = 1;
        console.log('First login of the day, setting streak to 1');
      } else {
        console.log('Already logged in today, streak remains:', streak);
        // Don't return here - we still need to update quest progress
      }
    } else {
      // Check if it's a consecutive day (yesterday)
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      console.log('Yesterday:', yesterday);

      if (lastLoginDate === yesterday) {
        // Consecutive day
        streak += 1;
        console.log('Consecutive day, new streak:', streak);
      } else {
        // Reset streak
        streak = 1;
        console.log('Reset streak to 1');
      }
    }

    await updateDoc(userRef, {
      dailyLoginStreak: streak,
      lastLoginDate: today,
      lastUpdated: Timestamp.now()
    });

    // Always check and update quest progress, even if streak didn't change
    // Get available quests to find the correct quest ID
    const quests = await getQuestsFromFirebase();
    const streakQuest = quests.find(q => q.type === 'streak_based' && q.isActive);
    
    if (streakQuest) {
      console.log(`Found streak quest: ${streakQuest.id} - ${streakQuest.title}`);
      await checkAndUpdateQuestProgress(userId, streakQuest.id, streak);
    } else {
      console.log('No active streak quest found');
    }

    console.log(`Updated daily login streak for ${userId}: ${streak}`);
  } catch (error) {
    console.error('Error updating daily login streak:', error);
    throw error;
  }
}

// Check and update quest progress
export async function checkAndUpdateQuestProgress(userId: string, questId: string, progress: number): Promise<void> {
  try {
    const userRef = doc(db, 'userQuests', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return;
    }

    const data = userDoc.data();
    const quests = data.quests || [];
    const questIndex = quests.findIndex((q: UserQuest) => q.questId === questId);
    
    if (questIndex === -1) {
      return;
    }

    const quest = quests[questIndex];
    
    // Get quest definition from Firebase
    const questsFromFirebase = await getQuestsFromFirebase();
    const questDefinition = questsFromFirebase.find(q => q.id === questId);
    
    console.log(`Updating quest progress for ${questId}:`);
    console.log(`- Current progress: ${quest.progress}`);
    console.log(`- New progress: ${progress}`);
    console.log(`- Quest definition:`, questDefinition);
    
    if (!questDefinition) {
      console.log(`Quest definition not found for ${questId}`);
      return;
    }

    let newProgress = progress;
    let isCompleted = quest.isCompleted;

    // Check if quest should be completed
    if (!isCompleted) {
      switch (questDefinition.type) {
        case 'streak_based':
          if (progress >= (questDefinition.requirements.streakDays || 0)) {
            isCompleted = true;
          }
          break;
        case 'activity_based':
          if (progress >= (questDefinition.requirements.activityCount || 0)) {
            isCompleted = true;
          }
          break;
        case 'early_adopter':
          const targetDate = questDefinition.requirements.targetDate;
          if (targetDate && new Date() <= new Date(targetDate)) {
            isCompleted = true;
            newProgress = 1;
          }
          break;
      }
    }

    // Update quest progress - ensure no undefined values
    const updatedQuest = {
      userId: quest.userId,
      questId: quest.questId,
      progress: newProgress,
      isCompleted: isCompleted,
      startedAt: quest.startedAt,
      lastUpdated: new Date(),
      ...(isCompleted && !quest.isCompleted ? { completedAt: new Date() } : {}),
      ...(quest.completedAt && !isCompleted ? { completedAt: quest.completedAt } : {})
    };
    
    quests[questIndex] = updatedQuest;

    // Update total quest points if newly completed
    let totalQuestPoints = data.totalQuestPoints || 0;
    let totalQuestsCompleted = data.totalQuestsCompleted || 0;
    
    if (isCompleted && !quest.isCompleted) {
      totalQuestPoints += questDefinition.rewards.points;
      totalQuestsCompleted += 1;
    }

    // Update user level in the users collection if quest was completed
    if (isCompleted && !quest.isCompleted) {
      try {
        const userActivityRef = doc(db, 'users', userId);
        const userActivityDoc = await getDoc(userActivityRef);
        
        if (userActivityDoc.exists()) {
          const userData = userActivityDoc.data();
          const activityPoints = userData.totalPoints || 0;
          const combinedPoints = activityPoints + totalQuestPoints;
          
          // Calculate new level based on combined points
          let newLevel = 'Newbie';
                if (combinedPoints >= 1000) newLevel = 'Diamond Hands';
      else if (combinedPoints >= 500) newLevel = 'Whale';
      else if (combinedPoints >= 200) newLevel = 'DeFi Master';
      else if (combinedPoints >= 100) newLevel = 'Crypto Native';
      else if (combinedPoints >= 50) newLevel = 'HODLer';
          
          await updateDoc(userActivityRef, {
            level: newLevel,
            combinedPoints: combinedPoints,
            lastUpdated: Timestamp.now()
          });
          
          console.log(`Updated user level to ${newLevel} for ${userId} (${combinedPoints} total points)`);
        }
      } catch (error) {
        console.error('Error updating user level after quest completion:', error);
      }
    }

    await updateDoc(userRef, {
      quests,
      totalQuestPoints,
      totalQuestsCompleted,
      lastUpdated: Timestamp.now()
    });

    console.log(`Updated quest progress for ${userId}, quest ${questId}: ${newProgress}/${questDefinition.requirements.streakDays || questDefinition.requirements.activityCount || 1}, completed: ${isCompleted}`);
    
    // Note: Combined points are updated in Firebase, no blockchain scan needed
  } catch (error) {
    console.error('Error updating quest progress:', error);
    throw error;
  }
}

// Sync missing quests for existing users (auto-migration)
export async function syncMissingQuests(userId: string): Promise<void> {
  try {
    const userQuestData = await getUserQuestData(userId);
    
    if (!userQuestData) {
      console.log(`No user quest data found for ${userId}, skipping sync`);
      return;
    }

    // Get all active quests from Firebase
    const allQuests = await getQuestsFromFirebase();
    const activeQuests = allQuests.filter(quest => quest.isActive);
    
    // Find missing quests (quests that exist in Firebase but not in user's data)
    const existingQuestIds = new Set(userQuestData.quests.map(uq => uq.questId));
    const missingQuests = activeQuests.filter(quest => !existingQuestIds.has(quest.id));
    
    if (missingQuests.length === 0) {
      console.log(`No missing quests for user ${userId}`);
      return;
    }

    console.log(`🔄 [MIGRATION] Adding ${missingQuests.length} missing quests for user ${userId}:`, missingQuests.map(q => q.title));
    
    // Create UserQuest entries for missing quests
    const newUserQuests: UserQuest[] = missingQuests.map(quest => ({
      userId,
      questId: quest.id,
      progress: 0,
      isCompleted: false,
      startedAt: new Date(),
      lastUpdated: new Date(),
      dailyShares: [] // Initialize empty dailyShares for share-based quests
      // Note: completedAt is undefined by default (not included)
    }));

    // Update user's quest data with missing quests
    const userRef = doc(db, 'userQuests', userId);
    const updatedQuests = [...userQuestData.quests, ...newUserQuests];
    
    // Convert to Firebase format to ensure no undefined values
    const firebaseQuests = updatedQuests.map(quest => {
      const firebaseQuest: Record<string, unknown> = {
        userId: quest.userId,
        questId: quest.questId,
        progress: quest.progress || 0,
        isCompleted: quest.isCompleted || false,
        startedAt: quest.startedAt ? Timestamp.fromDate(quest.startedAt) : Timestamp.now(),
        lastUpdated: quest.lastUpdated ? Timestamp.fromDate(quest.lastUpdated) : Timestamp.now(),
        dailyShares: quest.dailyShares || []
      };
      
      // Only add completedAt if it exists and is not undefined
      if (quest.completedAt) {
        firebaseQuest.completedAt = Timestamp.fromDate(quest.completedAt);
      }
      
      return firebaseQuest;
    });
    
    await updateDoc(userRef, {
      quests: firebaseQuests,
      lastUpdated: Timestamp.now()
    });

    console.log(`✅ [MIGRATION] Successfully added ${missingQuests.length} missing quests to user ${userId}`);
  } catch (error) {
    console.error('Error syncing missing quests:', error);
    throw error;
  }
}

// Get available quests for a user
export async function getAvailableQuests(userId: string): Promise<{ quest: Quest; userQuest: UserQuest }[]> {
  try {
    let userQuestData = await getUserQuestData(userId);
    
    if (!userQuestData) {
      return [];
    }

    // Auto-migrate: sync any missing quests for existing users
    await syncMissingQuests(userId);
    
    // Re-fetch user data after potential migration
    userQuestData = await getUserQuestData(userId);
    
    if (!userQuestData) {
      return [];
    }

    // Get quests from Firebase
    const quests = await getQuestsFromFirebase();
    
    return quests
      .filter(quest => quest.isActive)
      .map(quest => {
        const userQuest = userQuestData.quests.find(uq => uq.questId === quest.id) || {
          userId,
          questId: quest.id,
          progress: 0,
          isCompleted: false,
          startedAt: new Date(),
          lastUpdated: new Date(),
          dailyShares: []
          // Note: completedAt is undefined by default (not included)
        };
        
        return { quest, userQuest };
      });
  } catch (error) {
    console.error('Error getting available quests:', error);
    return [];
  }
}

// Complete early adopter quest for new users
export async function completeEarlyAdopterQuest(userId: string): Promise<void> {
  try {
    console.log('Checking early adopter quest for:', userId);
    
    const userRef = doc(db, 'userQuests', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.log('Initializing quest data for new user');
      await initializeUserQuestData(userId);
    }

    // Check if user qualifies for early adopter quest
    const quests = await getQuestsFromFirebase();
    const earlyAdopterQuest = quests.find(q => q.type === 'early_adopter' && q.isActive);
    
    if (earlyAdopterQuest) {
      const targetDate = earlyAdopterQuest.requirements.targetDate;
      const currentDate = new Date();
      const targetDateObj = targetDate ? new Date(targetDate) : new Date();
      
      console.log('Early adopter quest found:', earlyAdopterQuest.id);
      console.log('Current date:', currentDate);
      console.log('Target date:', targetDateObj);
      console.log('Is current date <= target date:', currentDate <= targetDateObj);
      
      if (targetDate && currentDate <= targetDateObj) {
        console.log('User qualifies for early adopter quest, updating progress');
        await checkAndUpdateQuestProgress(userId, earlyAdopterQuest.id, 1);
      } else {
        console.log('User does not qualify for early adopter quest - past target date');
      }
    } else {
      console.log('Early adopter quest not found or not active');
    }
  } catch (error) {
    console.error('Error completing early adopter quest:', error);
    throw error;
  }
}

// Helper function to check if user can share today for a quest
export function canShareToday(userQuest: UserQuest, quest: Quest): { canShare: boolean; sharesUsedToday: number; dailyLimit: number } {
  const dailyLimit = quest.requirements.dailyShareLimit || 0;
  
  if (dailyLimit <= 0) {
    return { canShare: true, sharesUsedToday: 0, dailyLimit: 0 }; // No limit
  }
  
  const today = new Date().toISOString().split('T')[0];
  const todayShares = userQuest.dailyShares?.find(ds => ds.date === today);
  const sharesUsedToday = todayShares?.count || 0;
  
  return {
    canShare: sharesUsedToday < dailyLimit,
    sharesUsedToday,
    dailyLimit
  };
}

// Complete share-based quest when user shares content
export async function completeShareQuest(userId: string, questId: string): Promise<{ success: boolean; message: string; pointsEarned?: number; dailyLimitReached?: boolean }> {
  try {
    console.log('Completing share quest for:', userId, 'Quest:', questId);
    
    // Get quest details
    const quests = await getQuestsFromFirebase();
    const shareQuest = quests.find(q => q.id === questId && q.type === 'share_based' && q.isActive);
    
    if (!shareQuest) {
      return { success: false, message: 'Share quest not found or not active' };
    }
    
    // Get user quest data
    let userQuestData = await getUserQuestData(userId);
    if (!userQuestData) {
      await initializeUserQuestData(userId);
      userQuestData = await getUserQuestData(userId);
      if (!userQuestData) {
        return { success: false, message: 'Failed to initialize user quest data' };
      }
    }
    
    // Check if quest is already completed
    const currentUserQuest = userQuestData?.quests.find(uq => uq.questId === questId);
    if (currentUserQuest?.isCompleted) {
      return { success: false, message: 'Quest already completed' };
    }
    
    // Check daily limits if specified
    const dailyLimit = shareQuest.requirements.dailyShareLimit;
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    if (dailyLimit && dailyLimit > 0) {
      const todayShares = currentUserQuest?.dailyShares?.find(ds => ds.date === today);
      const todayShareCount = todayShares?.count || 0;
      
      if (todayShareCount >= dailyLimit) {
        return { 
          success: false, 
          message: `Daily limit reached (${todayShareCount}/${dailyLimit}). Come back tomorrow!`,
          dailyLimitReached: true
        };
      }
    }
    
    // Get required share count (default to 1 if not specified)
    const requiredShares = shareQuest.requirements.shareCount || 1;
    const currentProgress = currentUserQuest?.progress || 0;
    const newProgress = currentProgress + 1;
    
    console.log(`Share quest progress: ${newProgress}/${requiredShares}`);
    
    // Update daily shares tracking
    const userRef = doc(db, 'userQuests', userId);
    const updatedQuests = userQuestData.quests.map(quest => {
      if (quest.questId === questId) {
        const updatedDailyShares = quest.dailyShares || [];
        const todayIndex = updatedDailyShares.findIndex(ds => ds.date === today);
        
        if (todayIndex >= 0) {
          updatedDailyShares[todayIndex].count += 1;
        } else {
          updatedDailyShares.push({ date: today, count: 1 });
        }
        
        return {
          ...quest,
          progress: newProgress,
          isCompleted: newProgress >= requiredShares,
          completedAt: newProgress >= requiredShares ? new Date() : quest.completedAt,
          lastUpdated: new Date(),
          dailyShares: updatedDailyShares
        };
      }
      return quest;
    });
    
    // Update Firebase
    await updateDoc(userRef, {
      quests: updatedQuests.map(quest => ({
        ...quest,
        startedAt: Timestamp.fromDate(quest.startedAt),
        lastUpdated: Timestamp.fromDate(quest.lastUpdated),
        completedAt: quest.completedAt ? Timestamp.fromDate(quest.completedAt) : null,
        dailyShares: quest.dailyShares || []
      })),
      lastUpdated: Timestamp.fromDate(new Date())
    });
    
    // Update total quest points if completed
    if (newProgress >= requiredShares) {
      await updateDoc(userRef, {
        totalQuestsCompleted: (userQuestData.totalQuestsCompleted || 0) + 1,
        totalQuestPoints: (userQuestData.totalQuestPoints || 0) + shareQuest.rewards.points
      });
      
      return { 
        success: true, 
        message: 'Share quest completed!', 
        pointsEarned: shareQuest.rewards.points 
      };
    } else {
      const dailyLimit = shareQuest.requirements.dailyShareLimit;
      const todayShares = updatedQuests.find(q => q.questId === questId)?.dailyShares?.find(ds => ds.date === today)?.count || 0;
      
      let message = `Progress updated: ${newProgress}/${requiredShares} shares completed`;
      if (dailyLimit && dailyLimit > 0) {
        const remaining = dailyLimit - todayShares;
        if (remaining <= 0) {
          message += ` - Daily limit reached, come back tomorrow!`;
        } else {
          message += ` - ${remaining} more shares available today`;
        }
      }
      
      return { 
        success: true, 
        message: message
      };
    }
    
  } catch (error) {
    console.error('Error completing share quest:', error);
    return { success: false, message: 'Failed to complete share quest' };
  }
} 