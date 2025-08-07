import { NextRequest, NextResponse } from 'next/server';
import { sendGlobalNotificationById } from '@/lib/notification-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { notificationId } = body;

    if (!notificationId) {
      return NextResponse.json(
        { error: 'Notification ID is required' },
        { status: 400 }
      );
    }

    const result = await sendGlobalNotificationById(notificationId);
    
    return NextResponse.json({
      success: true,
      message: 'Notification sent successfully',
      result
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
} 