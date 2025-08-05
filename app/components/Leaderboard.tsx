"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "./Button";
import { Icon } from "./Icon";

interface LeaderboardEntry {
  rank: number;
  address: string;
  points: number;
  level: string;
  activities: number;
  lastActivity: string;
}

interface LeaderboardProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Leaderboard({ activeTab, setActiveTab }: LeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [timeframe, setTimeframe] = useState<"week" | "month" | "all">("week");

  const loadLeaderboard = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/leaderboard?timeframe=${timeframe}`);
      const result = await response.json();
      
      if (result.success) {
        setLeaderboard(result.data);
      } else {
        console.error("Failed to load leaderboard:", result.error);
        setLeaderboard([]);
      }
    } catch (error) {
      console.error("Failed to load leaderboard:", error);
      setLeaderboard([]);
    } finally {
      setIsLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  const getRankIcon = (rank: number) => {
    console.log('getRankIcon called with rank:', rank);
    switch (rank) {
      case 1:
        console.log('Returning gold medal');
        return <Icon name="medal-gold" size="lg" className="text-yellow-500 w-8 h-8" />;
      case 2:
        console.log('Returning silver medal');
        return <Icon name="medal-silver" size="lg" className="text-gray-400 w-8 h-8" />;
      case 3:
        console.log('Returning bronze medal');
        return <Icon name="medal-bronze" size="lg" className="text-orange-500 w-8 h-8" />;
      default:
        console.log('Returning rank number:', rank);
        return <span className="text-xl font-bold text-[var(--app-foreground-muted)]">{rank}</span>;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "Diamond":
        return "text-purple-500";
      case "Platinum":
        return "text-blue-500";
      case "Gold":
        return "text-yellow-500";
      case "Silver":
        return "text-gray-400";
      case "Bronze":
        return "text-orange-500";
      default:
        return "text-green-500";
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Scrollable content area */}
      <div className="flex-1 space-y-4 pb-4 overflow-y-auto px-4 mb-20">
        {/* Header */}
        <div className="bg-[var(--app-card-bg)] backdrop-blur-md rounded-xl p-4 border border-[var(--app-card-border)]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-semibold">Leaderboard</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadLeaderboard}
              disabled={isLoading}
              icon={<Icon name="refresh" size="sm" />}
            >
              {isLoading ? "Loading..." : "Refresh"}
            </Button>
          </div>

          {/* Timeframe Filter */}
          <div className="flex space-x-2">
            {(["week", "month", "all"] as const).map((period) => (
              <Button
                key={period}
                variant={timeframe === period ? "primary" : "outline"}
                size="sm"
                onClick={() => setTimeframe(period)}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {/* Leaderboard List */}
        <div className="space-y-2">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, index) => (
                <div
                  key={index}
                  className="bg-[var(--app-card-bg)] backdrop-blur-md rounded-lg p-3 border border-[var(--app-card-border)] animate-pulse"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-16 h-16">
                        <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="h-4 bg-gray-300 rounded w-24"></div>
                        <div className="flex items-center space-x-2">
                          <div className="h-3 bg-gray-300 rounded w-16"></div>
                          <div className="w-1 h-3 bg-gray-300 rounded"></div>
                          <div className="h-3 bg-gray-300 rounded w-20"></div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-12 h-4 bg-gray-300 rounded"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-8 text-[var(--app-foreground-muted)]">
              <p className="text-lg font-medium mb-2">No leaderboard data yet</p>
              <p className="text-sm">Start earning on-chain points to appear on the leaderboard!</p>
            </div>
          ) : (
            leaderboard.map((entry) => (
              <div
                key={`${entry.rank}-${entry.address}`}
                className={`bg-[var(--app-card-bg)] backdrop-blur-md rounded-lg p-3 border border-[var(--app-card-border)] hover:shadow-md transition-shadow ${
                  entry.rank <= 3 ? "ring-2 ring-yellow-500/20" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-16 h-16">
                      {getRankIcon(entry.rank)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-[var(--app-foreground)]">
                          {entry.address.slice(0, 6)}...{entry.address.slice(-4)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-[var(--app-foreground-muted)]">
                        <span className={`font-medium ${getLevelColor(entry.level)}`}>
                          {entry.level}
                        </span>
                        <span>•</span>
                        <span>{entry.activities} activities</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 text-sm font-semibold text-[var(--app-accent)]">
                    <span>{entry.points.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Navigation Bar - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-[var(--app-card-bg)] backdrop-blur-md border-t border-[var(--app-card-border)] z-10">
        <div className="flex items-center justify-around py-3 px-4">
          <button
            onClick={() => setActiveTab("activity")}
            className={`px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
              activeTab === "activity" 
                ? "text-[var(--app-accent)] bg-[var(--app-accent)]/10" 
                : "text-[var(--app-foreground-muted)] hover:text-[var(--app-foreground)]"
            }`}
          >
            Activity
          </button>
          
          <button
            onClick={() => setActiveTab("leaderboard")}
            className={`px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
              activeTab === "leaderboard" 
                ? "text-[var(--app-accent)] bg-[var(--app-accent)]/10" 
                : "text-[var(--app-foreground-muted)] hover:text-[var(--app-foreground)]"
            }`}
          >
            Leaderboard
          </button>
          
          <button
            onClick={() => setActiveTab("rewards")}
            className={`px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
              activeTab === "rewards" 
                ? "text-[var(--app-accent)] bg-[var(--app-accent)]/10" 
                : "text-[var(--app-foreground-muted)] hover:text-[var(--app-foreground)]"
            }`}
          >
            Rewards
          </button>
          
          <button
            onClick={() => setActiveTab("quests")}
            className={`px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
              activeTab === "quests" 
                ? "text-[var(--app-accent)] bg-[var(--app-accent)]/10" 
                : "text-[var(--app-foreground-muted)] hover:text-[var(--app-foreground)]"
            }`}
          >
            Quests
          </button>
        </div>
      </div>
    </div>
  );
} 