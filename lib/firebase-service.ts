import { db } from './firebase';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  limit, 
  getDocs,
  Timestamp 
} from 'firebase/firestore';
import { getUserQuestData } from './quest-service';

export interface UserActivity {
  address: string;
  totalPoints: number;
  combinedPoints?: number;
  level: string;
  activities: Activity[];
  lastUpdated: Date;
  lastScannedBlock?: number;
  isInitialScanComplete?: boolean;
}

export interface Activity {
  id: string;
  type: 'token_transfer' | 'nft_transfer' | 'contract_interaction' | 'swap' | 'stake' | 'mint';
  description: string;
  timestamp: number;
  points: number;
  hash: string;
  direction: 'inbound' | 'outbound';
  asset?: string;
  tokenId?: string;
}

export interface LeaderboardEntry {
  rank: number;
  address: string;
  points: number;
  level: string;
  activities: number;
  lastActivity: Date;
}

// Save user activity data to Firebase
export async function saveUserActivity(address: string, activityData: UserActivity & { combinedPoints?: number }) {
  try {
    const userRef = doc(db, 'users', address);
    await setDoc(userRef, {
      ...activityData,
      lastUpdated: Timestamp.now(),
    });
    console.log(`Saved activity for ${address} with combined points: ${activityData.combinedPoints || 0}`);
  } catch (error) {
    console.error('Error saving user activity:', error);
    throw error;
  }
}

// Update last scanned block
export async function updateLastScannedBlock(address: string, blockNumber: number) {
  try {
    const userRef = doc(db, 'users', address);
    await updateDoc(userRef, {
      lastScannedBlock: blockNumber,
      lastUpdated: Timestamp.now(),
    });
    console.log(`Updated last scanned block for ${address}: ${blockNumber}`);
  } catch (error) {
    console.error('Error updating last scanned block:', error);
    throw error;
  }
}

// Mark initial scan as complete
export async function markInitialScanComplete(address: string) {
  try {
    const userRef = doc(db, 'users', address);
    await updateDoc(userRef, {
      isInitialScanComplete: true,
      lastUpdated: Timestamp.now(),
    });
    console.log(`Marked initial scan complete for ${address}`);
  } catch (error) {
    console.error('Error marking initial scan complete:', error);
    throw error;
  }
}

// Get user activity data from Firebase
export async function getUserActivity(address: string): Promise<UserActivity | null> {
  try {
    const userRef = doc(db, 'users', address);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const data = userDoc.data();
      
      // Get quest points
      const questData = await getUserQuestData(address);
      const questPoints = questData?.totalQuestPoints || 0;
      
      // Use stored combined points if available, otherwise calculate
      const storedCombinedPoints = data.combinedPoints || 0;
      const calculatedCombinedPoints = (data.totalPoints || 0) + questPoints;
      const combinedPoints = storedCombinedPoints > 0 ? storedCombinedPoints : calculatedCombinedPoints;
      
      return {
        ...data,
        totalPoints: data.totalPoints || 0,
        combinedPoints: combinedPoints,
        lastUpdated: data.lastUpdated?.toDate() || new Date(),
      } as UserActivity;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user activity:', error);
    return null;
  }
}

// Add new activity to user's history
export async function addUserActivity(address: string, activity: Activity) {
  try {
    const userRef = doc(db, 'users', address);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const data = userDoc.data();
      const activities = data.activities || [];
      const totalPoints = (data.totalPoints || 0) + activity.points;
      
      // Add new activity to the beginning
      activities.unshift(activity);
      
      // Keep only the last 100 activities
      if (activities.length > 100) {
        activities.splice(100);
      }
      
      // Get quest points for combined level calculation
      const questData = await getUserQuestData(address);
      const questPoints = questData?.totalQuestPoints || 0;
      const combinedPoints = totalPoints + questPoints;
      
      // Update level based on combined points
      let level = 'Newbie';
      if (combinedPoints >= 1000) level = 'Diamond Hands';
      else if (combinedPoints >= 500) level = 'Whale';
      else if (combinedPoints >= 200) level = 'DeFi Master';
      else if (combinedPoints >= 100) level = 'Crypto Native';
      else if (combinedPoints >= 50) level = 'HODLer';
      
      await updateDoc(userRef, {
        activities,
        totalPoints,
        level,
        combinedPoints, // Store combined points in Firebase
        lastUpdated: Timestamp.now(),
      });
    } else {
      // Create new user document
      await setDoc(userRef, {
        address,
        activities: [activity],
        totalPoints: activity.points,
        combinedPoints: activity.points, // Initially same as activity points
        level: 'Newbie',
        lastUpdated: Timestamp.now(),
      });
    }
    
    console.log(`Added activity for ${address}`);
  } catch (error) {
    console.error('Error adding user activity:', error);
    throw error;
  }
}

// Get leaderboard data with combined points
export async function getLeaderboard(limitCount: number = 10): Promise<LeaderboardEntry[]> {
  try {
    const usersRef = collection(db, 'users');
    // Remove the orderBy clause to get all users, then sort in memory
    const q = query(usersRef, limit(limitCount * 2)); // Get more users to account for filtering
    const querySnapshot = await getDocs(q);
    
    const leaderboard: LeaderboardEntry[] = [];
    
    // Process each user to get combined points
    for (let i = 0; i < querySnapshot.docs.length; i++) {
      const doc = querySnapshot.docs[i];
      const data = doc.data();
      const address = doc.id; // Use document ID as address
      
      // Get quest points for this user
      const questData = await getUserQuestData(address);
      const questPoints = questData?.totalQuestPoints || 0;
      
      // Calculate combined points
      const activityPoints = data.totalPoints || 0;
      const combinedPoints = activityPoints + questPoints;
      
      // Only include users with some activity or quest points
      if (combinedPoints > 0) {
        // Calculate level based on combined points
        let level = 'Newbie';
        if (combinedPoints >= 1000) level = 'Diamond Hands';
        else if (combinedPoints >= 500) level = 'Whale';
        else if (combinedPoints >= 200) level = 'DeFi Master';
        else if (combinedPoints >= 100) level = 'Crypto Native';
        else if (combinedPoints >= 50) level = 'HODLer';
        
        leaderboard.push({
          rank: 0, // Will be set after sorting
          address: address,
          points: combinedPoints,
          level: level,
          activities: data.activities?.length || 0,
          lastActivity: data.lastUpdated?.toDate() || new Date(),
        });
      }
    }
    
    // Sort by combined points (descending)
    leaderboard.sort((a, b) => b.points - a.points);
    
    // Update ranks after sorting and limit results
    const limitedLeaderboard = leaderboard.slice(0, limitCount).map((entry, index) => ({
      ...entry,
      rank: index + 1
    }));
    
    return limitedLeaderboard;
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    return [];
  }
}

// Get user statistics
export async function getUserStats(): Promise<{
  totalUsers: number;
}> {
  try {
    // Get all users count
    const usersRef = collection(db, 'users');
    const usersQuery = query(usersRef);
    const usersSnapshot = await getDocs(usersQuery);
    
    const totalUsers = usersSnapshot.size;
    
    return {
      totalUsers
    };
  } catch (error) {
    console.error('Error getting user stats:', error);
    return {
      totalUsers: 0
    };
  }
}

// Get combined points (activity + quest) for a user
export async function getCombinedPoints(address: string): Promise<{ activityPoints: number; questPoints: number; totalPoints: number; level: string }> {
  try {
    // Get activity points
    const userData = await getUserActivity(address);
    const activityPoints = userData?.totalPoints || 0;
    
    // Get quest points
    const questData = await getUserQuestData(address);
    const questPoints = questData?.totalQuestPoints || 0;
    
    // Calculate combined points
    const totalPoints = activityPoints + questPoints;
    
    // Calculate level based on combined points
    let level = 'Newbie';
    if (totalPoints >= 1000) level = 'Diamond Hands';
    else if (totalPoints >= 500) level = 'Whale';
    else if (totalPoints >= 200) level = 'DeFi Master';
    else if (totalPoints >= 100) level = 'Crypto Native';
    else if (totalPoints >= 50) level = 'HODLer';
    
    return {
      activityPoints,
      questPoints,
      totalPoints,
      level
    };
  } catch (error) {
    console.error('Error getting combined points:', error);
    return {
      activityPoints: 0,
      questPoints: 0,
      totalPoints: 0,
      level: 'Newbie'
    };
  }
}

// Get user's recent activities
export async function getUserRecentActivities(address: string, limit: number = 20): Promise<Activity[]> {
  try {
    const userData = await getUserActivity(address);
    if (userData) {
      return userData.activities.slice(0, limit);
    }
    return [];
  } catch (error) {
    console.error('Error getting user recent activities:', error);
    return [];
  }
} 