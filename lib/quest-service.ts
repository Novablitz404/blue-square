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
  type: 'early_adopter' | 'activity_based' | 'streak_based';
  requirements: {
    dailyLogins?: number;
    targetDate?: string;
    activityCount?: number;
    streakDays?: number;
  };
  rewards: {
    points: number;
    title?: string;
    badge?: string;
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
          if (combinedPoints >= 1000) newLevel = 'Diamond';
          else if (combinedPoints >= 500) newLevel = 'Platinum';
          else if (combinedPoints >= 200) newLevel = 'Gold';
          else if (combinedPoints >= 100) newLevel = 'Silver';
          else if (combinedPoints >= 50) newLevel = 'Bronze';
          
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

// Get available quests for a user
export async function getAvailableQuests(userId: string): Promise<{ quest: Quest; userQuest: UserQuest }[]> {
  try {
    const userQuestData = await getUserQuestData(userId);
    
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
          lastUpdated: new Date()
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