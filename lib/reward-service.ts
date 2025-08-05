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
import { getUserQuestData } from './quest-service';
import { getCombinedPoints } from './firebase-service';

export interface Reward {
  id: string;
  name: string;
  description: string;
  type: 'points' | 'nft' | 'token' | 'badge' | 'discount';
  pointsReward: number;
  requirements: {
    questIds: string[];
    requiredLevel: number;
  };
  isActive: boolean;
  maxRedemptions?: number;
  currentRedemptions: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserReward {
  id: string;
  userId: string;
  rewardId: string;
  rewardName: string;
  rewardType: string;
  pointsReward: number;
  redeemedAt: Date;
  status: 'pending' | 'claimed' | 'expired';
}

export interface AvailableReward extends Reward {
  isEligible: boolean;
  isRedeemed: boolean;
  missingRequirements: string[];
}

// Get all active rewards
export async function getActiveRewards(): Promise<Reward[]> {
  try {
    const q = query(
      collection(db, 'rewards'),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date()
    })) as Reward[];
  } catch (error) {
    console.error('Error fetching active rewards:', error);
    return [];
  }
}

// Get a single reward by ID
export async function getRewardById(id: string): Promise<Reward | null> {
  try {
    const rewardRef = doc(db, 'rewards', id);
    const rewardDoc = await getDoc(rewardRef);
    
    if (rewardDoc.exists()) {
      const data = rewardDoc.data();
      return {
        id: rewardDoc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as Reward;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching reward:', error);
    return null;
  }
}

// Get available rewards for a user with eligibility check
export async function getAvailableRewardsForUser(userId: string): Promise<AvailableReward[]> {
  try {
    const rewards = await getActiveRewards();
    const userRewards = await getUserRewards(userId);
    const userQuestData = await getUserQuestData(userId);
    const userPoints = await getCombinedPoints(userId);
    
    const availableRewards: AvailableReward[] = [];
    
    for (const reward of rewards) {
      const isRedeemed = userRewards.some(ur => ur.rewardId === reward.id);
      const missingRequirements: string[] = [];
      
      // Check level requirement
      if (userPoints.totalPoints < reward.requirements.requiredLevel) {
        missingRequirements.push(`Need level ${reward.requirements.requiredLevel} (current: ${userPoints.level})`);
      }
      
      // Check quest requirements
      if (reward.requirements.questIds.length > 0) {
        const userCompletedQuests = userQuestData?.quests
          ?.filter(quest => quest.isCompleted)
          ?.map(quest => quest.questId) || [];
        const missingQuests = reward.requirements.questIds.filter(
          questId => !userCompletedQuests.includes(questId)
        );
        
        // Debug logging
        console.log(`Reward ${reward.name} quest requirements:`, {
          requiredQuests: reward.requirements.questIds,
          userCompletedQuests,
          missingQuests,
          userQuestData: userQuestData?.quests?.map(q => ({ questId: q.questId, isCompleted: q.isCompleted }))
        });
        
        if (missingQuests.length > 0) {
          missingRequirements.push(`Complete ${missingQuests.length} more quest(s)`);
        }
      }
      
      // Check max redemptions
      if (reward.maxRedemptions && reward.currentRedemptions >= reward.maxRedemptions) {
        missingRequirements.push('Reward limit reached');
      }
      
      const isEligible = missingRequirements.length === 0 && !isRedeemed;
      
      availableRewards.push({
        ...reward,
        isEligible,
        isRedeemed,
        missingRequirements
      });
    }
    
    return availableRewards;
  } catch (error) {
    console.error('Error getting available rewards for user:', error);
    return [];
  }
}

// Get user's redeemed rewards
export async function getUserRewards(userId: string): Promise<UserReward[]> {
  try {
    const q = query(
      collection(db, 'userRewards'),
      where('userId', '==', userId),
      orderBy('redeemedAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      redeemedAt: doc.data().redeemedAt?.toDate() || new Date()
    })) as UserReward[];
  } catch (error) {
    console.error('Error fetching user rewards:', error);
    return [];
  }
}

// Check if user has already redeemed a reward
export async function hasUserRedeemedReward(userId: string, rewardId: string): Promise<boolean> {
  try {
    const q = query(
      collection(db, 'userRewards'),
      where('userId', '==', userId),
      where('rewardId', '==', rewardId)
    );
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking user reward redemption:', error);
    return false;
  }
}

// Record user reward redemption
export async function recordUserReward(userId: string, reward: Reward): Promise<void> {
  try {
    const userRewardRef = doc(collection(db, 'userRewards'));
    const now = Timestamp.now();
    
    const userReward: UserReward = {
      id: userRewardRef.id,
      userId,
      rewardId: reward.id,
      rewardName: reward.name,
      rewardType: reward.type,
      pointsReward: reward.pointsReward,
      redeemedAt: now.toDate(),
      status: 'claimed'
    };

    await setDoc(userRewardRef, {
      ...userReward,
      redeemedAt: now
    });

    // Update reward redemption count
    const rewardRef = doc(db, 'rewards', reward.id);
    await updateDoc(rewardRef, {
      currentRedemptions: reward.currentRedemptions + 1,
      updatedAt: now
    });
  } catch (error) {
    console.error('Error recording user reward:', error);
    throw error;
  }
} 