import { NextRequest, NextResponse } from 'next/server';
import { getLeaderboard, getUserStats } from '../../../lib/firebase-service';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50'); // Default to top 50

  try {
    const [leaderboard, userStats] = await Promise.all([
      getLeaderboard(limit),
      getUserStats()
    ]);
    
    return NextResponse.json({
      success: true,
      data: {
        leaderboard,
        stats: userStats
      },
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
} 