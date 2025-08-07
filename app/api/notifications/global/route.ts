import { NextRequest, NextResponse } from 'next/server';
import { sendGlobalNotification, createGlobalNotification, getGlobalNotifications } from '@/lib/notification-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, body: messageBody, targetUsers, sendImmediately = false } = body;

    if (!title || !messageBody) {
      return NextResponse.json(
        { error: 'Title and body are required' },
        { status: 400 }
      );
    }

    if (sendImmediately) {
      // Send notification immediately
      const result = await sendGlobalNotification(title, messageBody, targetUsers);
      
      return NextResponse.json({
        success: true,
        message: 'Global notification sent successfully',
        result
      });
    } else {
      // Create notification for later sending
      const notificationId = await createGlobalNotification(title, messageBody, targetUsers);
      
      return NextResponse.json({
        success: true,
        message: 'Global notification created successfully',
        notificationId
      });
    }
  } catch (error) {
    console.error('Error sending global notification:', error);
    return NextResponse.json(
      { error: 'Failed to send global notification' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('id');

    if (notificationId) {
      // Get specific notification
      // This would require implementing getGlobalNotificationById
      return NextResponse.json({ error: 'Not implemented' }, { status: 501 });
    } else {
      // Get all global notifications
      const notifications = await getGlobalNotifications();
      
      return NextResponse.json({
        success: true,
        notifications
      });
    }
  } catch (error) {
    console.error('Error getting global notifications:', error);
    return NextResponse.json(
      { error: 'Failed to get global notifications' },
      { status: 500 }
    );
  }
} 