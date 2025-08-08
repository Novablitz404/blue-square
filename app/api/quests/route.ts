import { NextRequest, NextResponse } from 'next/server';
import { getAvailableQuests, getUserQuestData, updateDailyLoginStreak, completeEarlyAdopterQuest } from '../../../lib/quest-service';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'User ID parameter is required' }, { status: 400 });
  }

  try {
    // Update daily login streak when user accesses quests
    await updateDailyLoginStreak(userId);
    
    // Get available quests and user quest data
    const quests = await getAvailableQuests(userId);
    const userQuestData = await getUserQuestData(userId);
    
    console.log('Available quests from Firebase:', quests.map(q => ({ id: q.quest.id, title: q.quest.title, type: q.quest.type })));
    console.log('User quest data:', userQuestData);
    
    return NextResponse.json({
      success: true,
      data: {
        quests,
        userQuestData
      }
    });
  } catch (error) {
    console.error('Error fetching quests:', error);
    return NextResponse.json({ error: 'Failed to fetch quests' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, action, questId } = body;

    console.log('🔍 [API] Quest action received:', { userId, action, questId });

    if (!userId) {
      console.log('❌ [API] User ID is missing');
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    switch (action) {
      case 'update_login_streak':
        console.log('📊 [API] Updating login streak for:', userId);
        await updateDailyLoginStreak(userId);
        return NextResponse.json({ success: true, message: 'Login streak updated' });
      
      case 'check_early_adopter':
        console.log('🏆 [API] Checking early adopter quest for:', userId);
        await completeEarlyAdopterQuest(userId);
        console.log('✅ [API] Early adopter quest check completed for:', userId);
        return NextResponse.json({ success: true, message: 'Early adopter quest checked' });
      
      default:
        console.log('❌ [API] Invalid action:', action);
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('❌ [API] Error processing quest action:', error);
    return NextResponse.json({ error: 'Failed to process quest action' }, { status: 500 });
  }
} 