import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, setDoc, Timestamp, collection } from 'firebase/firestore';
import { sendNewQuestNotification } from '@/lib/notification-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      title, 
      description, 
      type, 
      requirements, 
      rewards, 
      isActive = true,
      startDate,
      endDate,
      sendNotification = true 
    } = body;

    // Validate required fields
    if (!title || !description || !type || !rewards) {
      return NextResponse.json(
        { error: 'Missing required fields: title, description, type, rewards' },
        { status: 400 }
      );
    }

    // Validate quest type
    const validTypes = ['early_adopter', 'activity_based', 'streak_based'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid quest type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Create quest document
    const questRef = doc(collection(db, 'quests'));
    const questData = {
      id: questRef.id,
      title,
      description,
      type,
      requirements: requirements || {},
      rewards,
      isActive,
      startDate: startDate ? Timestamp.fromDate(new Date(startDate)) : Timestamp.now(),
      endDate: endDate ? Timestamp.fromDate(new Date(endDate)) : null,
      createdAt: Timestamp.now()
    };

    await setDoc(questRef, questData);

    console.log(`Created new quest: ${title} (ID: ${questRef.id})`);

    // Send notification if requested
    if (sendNotification && isActive) {
      try {
        await sendNewQuestNotification(questData);
        console.log(`Sent new quest notification for: ${title}`);
      } catch (notificationError) {
        console.error('Failed to send new quest notification:', notificationError);
        // Don't fail the quest creation if notification fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Quest created successfully',
      quest: {
        id: questRef.id,
        title,
        description,
        type,
        isActive,
        createdAt: questData.createdAt.toDate()
      }
    });

  } catch (error) {
    console.error('Error creating quest:', error);
    return NextResponse.json(
      { error: 'Failed to create quest' },
      { status: 500 }
    );
  }
} 