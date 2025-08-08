"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
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
  const { address } = useAccount();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadLeaderboard = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/leaderboard?timeframe=all`);
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
  }, []);

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
      case "Diamond Hands":
        return "text-purple-500";
      case "Whale":
        return "text-blue-500";
      case "DeFi Master":
        return "text-yellow-500";
      case "Crypto Native":
        return "text-gray-400";
      case "HODLer":
        return "text-orange-500";
      default:
        return "text-green-500";
    }
  };

  return (
    <div className="flex flex-col">
      {/* Navigation Bar - Moved to top */}
      <div className="bg-[var(--app-card-bg)] backdrop-blur-md z-10">
        <div className="flex items-center justify-around py-3 px-4">
          <button
            onClick={() => setActiveTab("activity")}
            className={`px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
              activeTab === "activity" 
                ? "text-[var(--app-accent)] bg-[var(--app-accent)]/10" 
                : "text-[var(--app-foreground-muted)] hover:text-[var(--app-foreground)] hover:bg-[var(--app-accent)]/5"
            }`}
          >
            Activity
          </button>
          
          <button
            onClick={() => setActiveTab("leaderboard")}
            className={`px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
              activeTab === "leaderboard" 
                ? "text-[var(--app-accent)] bg-[var(--app-accent)]/10" 
                : "text-[var(--app-foreground-muted)] hover:text-[var(--app-foreground)] hover:bg-[var(--app-accent)]/5"
            }`}
          >
            Leaderboard
          </button>
          
          <button
            onClick={() => setActiveTab("rewards")}
            className={`px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
              activeTab === "rewards" 
                ? "text-[var(--app-accent)] bg-[var(--app-accent)]/10" 
                : "text-[var(--app-foreground-muted)] hover:text-[var(--app-foreground)] hover:bg-[var(--app-accent)]/5"
            }`}
          >
            Rewards
          </button>
          
          <button
            onClick={() => setActiveTab("quests")}
            className={`px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
              activeTab === "quests" 
                ? "text-[var(--app-accent)] bg-[var(--app-accent)]/10" 
                : "text-[var(--app-foreground-muted)] hover:text-[var(--app-foreground)] hover:bg-[var(--app-accent)]/5"
            }`}
          >
            Quests
          </button>
        </div>
      </div>

      {/* Content area - no scrolling */}
      <div className="space-y-4 px-4">
        {/* Header */}
        <div className="bg-[var(--app-card-bg)] backdrop-blur-md rounded-xl p-4 border border-[var(--app-card-border)]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-semibold">Leaderboard</h2>
            </div>
            {address && (
              <Button
                variant="ghost"
                size="sm"
                onClick={loadLeaderboard}
                disabled={isLoading}
                icon={<Icon name="refresh" size="sm" />}
              >
                {isLoading ? "Loading..." : "Refresh"}
              </Button>
            )}
          </div>
        </div>

        {/* Leaderboard List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-md font-semibold">Top Performers</h3>
          </div>

          {/* Scrollable Leaderboard List */}
          <div className="h-64 overflow-y-auto space-y-2 pr-2">
            {!address ? (
              <div className="text-center py-8 text-[var(--app-foreground-muted)]">
                <Icon name="wallet" size="lg" className="mx-auto mb-3 opacity-50" />
                <p className="text-lg font-medium mb-2">Connect Wallet</p>
                <p className="text-sm">Connect your wallet to view the leaderboard</p>
              </div>
            ) : isLoading ? (
              <div className="space-y-2">
                {[...Array(6)].map((_, index) => (
                  <div
                    key={index}
                    className="bg-[var(--app-card-bg)] backdrop-blur-md rounded-lg p-3 border border-[var(--app-card-border)] animate-pulse"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-16 h-16 bg-gray-300 rounded-full"></div>
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                        </div>
                      </div>
                      <div className="w-12 h-4 bg-gray-300 rounded"></div>
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
              <div className="space-y-2">
                {leaderboard.slice(0, 6).map((entry) => (
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
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 