import { NextRequest, NextResponse } from 'next/server';
import { NotificationService } from '@/lib/notification-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, body: messageBody, userId } = body;

    if (!title || !messageBody) {
      return NextResponse.json(
        { error: 'Missing required fields: title, body' },
        { status: 400 }
      );
    }

    // If userId is provided, try to get notification details from Firebase
    if (userId) {
      const notificationDetails = await NotificationService.getNotificationDetails(userId);
      
      if (!notificationDetails) {
        console.log(`⚠️ [NOTIFICATION] No notification details found for user: ${userId}`);
        return NextResponse.json({ 
          success: false, 
          message: 'User has not added the frame or notifications are not enabled' 
        });
      }

      // Forward the notification request to Farcaster's notification API
      const response = await fetch('https://api.farcaster.xyz/v2/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${notificationDetails.token}`,
        },
        body: JSON.stringify({
          title,
          body: messageBody,
          url: notificationDetails.url,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Farcaster notification API error:', errorData);
        return NextResponse.json(
          { error: 'Failed to send notification', details: errorData },
          { status: response.status }
        );
      }

      const result = await response.json();
      console.log(`✅ [NOTIFICATION] Notification sent successfully to user: ${userId}`, result);
      return NextResponse.json(result);
    }

    // If no userId provided, this might be a test notification
    console.log('⚠️ [NOTIFICATION] No userId provided, skipping notification');
    return NextResponse.json({ success: true, message: 'Notification skipped (no userId)' });

  } catch (error) {
    console.error('Notification proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Store notification details when user adds the frame
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, token, url, fid } = body;

    console.log('🔍 [NOTIFICATION] Received PUT request:', { userId, token: token ? '***' : 'missing', url, fid });

    if (!userId || !token || !url) {
      console.log('❌ [NOTIFICATION] Missing required fields:', { userId: !!userId, token: !!token, url: !!url });
      return NextResponse.json(
        { error: 'Missing required fields: userId, token, url' },
        { status: 400 }
      );
    }

    // Store notification details in Firebase
    await NotificationService.storeNotificationDetails(userId, {
      token,
      url,
      fid,
      addedAt: new Date(),
    });

    console.log(`✅ [NOTIFICATION] Stored notification details for user: ${userId}`);
    return NextResponse.json({ success: true, message: 'Notification details stored successfully' });

  } catch (error) {
    console.error('Failed to store notification details:', error);
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
        { error: 'User ID parameter is required' },
        { status: 400 }
      );
    }

    const notificationDetails = await NotificationService.getNotificationDetails(userId);
    
    if (notificationDetails) {
      return NextResponse.json({
        success: true,
        message: 'Notification details found',
        details: {
          userId,
          hasToken: !!notificationDetails.token,
          hasUrl: !!notificationDetails.url,
          addedAt: notificationDetails.addedAt
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'No notification details found for this user'
      });
    }

  } catch (error) {
    console.error('Error getting notification details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 