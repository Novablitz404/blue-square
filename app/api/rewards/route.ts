import { NextRequest, NextResponse } from 'next/server';
import { recordUserReward, getRewardById, hasUserRedeemedReward } from '../../../lib/reward-service';
import { getCombinedPoints } from '../../../lib/firebase-service';
import { getUserQuestData } from '../../../lib/quest-service';

export async function POST(request: NextRequest) {
  try {
    const { userId, rewardId } = await request.json();

    if (!userId || !rewardId) {
      return NextResponse.json(
        { error: 'Missing required fields: userId and rewardId' },
        { status: 400 }
      );
    }

    // Get the reward details
    const reward = await getRewardById(rewardId);
    if (!reward) {
      return NextResponse.json(
        { error: 'Reward not found' },
        { status: 404 }
      );
    }

    if (!reward.isActive) {
      return NextResponse.json(
        { error: 'Reward is not active' },
        { status: 400 }
      );
    }

    // Check if user has already redeemed this reward
    const hasRedeemed = await hasUserRedeemedReward(userId, rewardId);
    if (hasRedeemed) {
      return NextResponse.json(
        { error: 'User has already redeemed this reward' },
        { status: 400 }
      );
    }

    // Check if reward has reached max redemptions
    if (reward.maxRedemptions && reward.currentRedemptions >= reward.maxRedemptions) {
      return NextResponse.json(
        { error: 'Reward redemption limit reached' },
        { status: 400 }
      );
    }

    // Check user eligibility
    const [userPoints, userQuestData] = await Promise.all([
      getCombinedPoints(userId),
      getUserQuestData(userId)
    ]);

    // Check level requirement
    if (userPoints.totalPoints < reward.requirements.requiredLevel) {
      return NextResponse.json(
        { 
          error: 'Level requirement not met',
          details: `Required level: ${reward.requirements.requiredLevel}, Current level: ${userPoints.level}`
        },
        { status: 400 }
      );
    }

    // Check quest requirements
    if (reward.requirements.questIds.length > 0) {
      const userCompletedQuests = userQuestData?.quests
        ?.filter(quest => quest.isCompleted)
        ?.map(quest => quest.questId) || [];
      const missingQuests = reward.requirements.questIds.filter(
        questId => !userCompletedQuests.includes(questId)
      );
      
      if (missingQuests.length > 0) {
        return NextResponse.json(
          { 
            error: 'Quest requirements not met',
            details: `Missing ${missingQuests.length} quest(s)`
          },
          { status: 400 }
        );
      }
    }

    // Record the reward redemption
    await recordUserReward(userId, reward);

    return NextResponse.json({
      success: true,
      message: 'Reward redeemed successfully',
      reward: {
        id: reward.id,
        name: reward.name,
        type: reward.type,
        pointsReward: reward.pointsReward
      }
    });

  } catch (error) {
    console.error('Error redeeming reward:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 }
      );
    }

    // Get user's available rewards
    const { getAvailableRewardsForUser } = await import('../../../lib/reward-service');
    const availableRewards = await getAvailableRewardsForUser(userId);

    return NextResponse.json({
      success: true,
      rewards: availableRewards
    });

  } catch (error) {
    console.error('Error getting user rewards:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 