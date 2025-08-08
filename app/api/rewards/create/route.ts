import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, setDoc, Timestamp, collection } from 'firebase/firestore';
import { NotificationService } from '@/lib/notification-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      name, 
      description, 
      type, 
      pointsReward, 
      requirements, 
      isActive = true,
      maxRedemptions
    } = body;

    // Validate required fields
    if (!name || !description || !type || pointsReward === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: name, description, type, pointsReward' },
        { status: 400 }
      );
    }

    // Validate reward type
    const validTypes = ['points', 'nft', 'token', 'badge', 'discount'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid reward type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate points reward
    if (typeof pointsReward !== 'number' || pointsReward < 0) {
      return NextResponse.json(
        { error: 'pointsReward must be a non-negative number' },
        { status: 400 }
      );
    }

    // Create reward document
    const rewardRef = doc(collection(db, 'rewards'));
    const rewardData = {
      id: rewardRef.id,
      name,
      description,
      type,
      pointsReward,
      requirements: requirements || { questIds: [], requiredLevel: 0 },
      isActive,
      maxRedemptions: maxRedemptions || null,
      currentRedemptions: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    await setDoc(rewardRef, rewardData);

    console.log(`Created new reward: ${name} (ID: ${rewardRef.id})`);

    // Send notifications to all users who have added the frame
    try {
      const usersWithNotifications = await NotificationService.getAllUsersWithNotifications();
      let notificationCount = 0;
      
      for (const userId of usersWithNotifications) {
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/notification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: 'New Reward Available! 🎁',
              body: `A new reward "${name}" has been added. Claim it now!`,
              userId: userId
            })
          });
          
          const result = await response.json();
          if (result.success) {
            notificationCount++;
            console.log(`✅ [NOTIFICATION] Reward notification sent to user: ${userId}`);
          } else {
            console.log(`⚠️ [NOTIFICATION] Reward notification skipped for user: ${userId} - ${result.message}`);
          }
        } catch (error) {
          console.error(`❌ [NOTIFICATION] Failed to send reward notification to user: ${userId}`, error);
        }
      }
      
      console.log(`🎁 [REWARD] Sent reward notifications to ${notificationCount}/${usersWithNotifications.length} users`);
    } catch (error) {
      console.error('❌ [NOTIFICATION] Failed to send reward notifications:', error);
    }

    return NextResponse.json({
      success: true,
      message: 'Reward created successfully',
      reward: {
        id: rewardRef.id,
        name,
        description,
        type,
        pointsReward,
        isActive,
        createdAt: rewardData.createdAt.toDate()
      }
    });

  } catch (error) {
    console.error('Error creating reward:', error);
    return NextResponse.json(
      { error: 'Failed to create reward' },
      { status: 500 }
    );
  }
} 