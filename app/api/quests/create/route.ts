import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, setDoc, Timestamp, collection } from 'firebase/firestore';
import { NotificationService } from '@/lib/notification-service';

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
      endDate
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
              title: 'New Quest Available! 🎯',
              body: `A new quest "${title}" has been added. Check it out!`,
              userId: userId
            })
          });
          
          const result = await response.json();
          if (result.success) {
            notificationCount++;
            console.log(`✅ [NOTIFICATION] Quest notification sent to user: ${userId}`);
          } else {
            console.log(`⚠️ [NOTIFICATION] Quest notification skipped for user: ${userId} - ${result.message}`);
          }
        } catch (error) {
          console.error(`❌ [NOTIFICATION] Failed to send quest notification to user: ${userId}`, error);
        }
      }
      
      console.log(`🎯 [QUEST] Sent quest notifications to ${notificationCount}/${usersWithNotifications.length} users`);
    } catch (error) {
      console.error('❌ [NOTIFICATION] Failed to send quest notifications:', error);
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