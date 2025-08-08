import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, setDoc, Timestamp, collection } from 'firebase/firestore';

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

    // Emit a custom event for new reward creation (for client-side notification)
    // This will be handled by the client-side notification system
    console.log(`🎁 [REWARD] New reward created: ${name} (ID: ${rewardRef.id})`);

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