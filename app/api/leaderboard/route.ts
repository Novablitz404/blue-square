import { NextRequest, NextResponse } from 'next/server';
import { getLeaderboard } from '../../../lib/firebase-service';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '10');

  try {
    const leaderboard = await getLeaderboard(limit);
    
    return NextResponse.json({
      success: true,
      data: leaderboard,
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
} 