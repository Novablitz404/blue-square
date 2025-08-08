"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useAccount } from "wagmi";
import { Button } from "./Button";
import { Icon } from "./Icon";

type ActivityType = "token_transfer" | "nft_transfer" | "contract_interaction" | "swap" | "stake" | "mint";

interface Activity {
  id: string;
  type: ActivityType;
  description: string;
  timestamp: number;
  points: number;
  hash: string;
  direction: 'inbound' | 'outbound';
  asset?: string;
  tokenId?: string;
}

interface ActivityTrackerProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function ActivityTracker({ activeTab, setActiveTab }: ActivityTrackerProps) {
  const { address } = useAccount();
  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const [direction, setDirection] = useState<'all' | 'inbound' | 'outbound'>('all');
  const [inboundCount, setInboundCount] = useState(0);
  const [outboundCount, setOutboundCount] = useState(0);
  const [hasInitialized, setHasInitialized] = useState(false);

  const loadActivities = useCallback(async (forceRefresh = false) => {
    if (!address) return;
    
    setIsLoading(true);
    try {
      // Always load from Firebase unless force refresh is explicitly requested
      const response = await fetch(`/api/activity?address=${address}&direction=all&forceRefresh=${forceRefresh}`);
      const result = await response.json();
      
      if (result.success) {
        setAllActivities(result.data.activities);
        setTotalPoints(result.data.totalPoints);
        setInboundCount(result.data.inboundCount || 0);
        setOutboundCount(result.data.outboundCount || 0);
      } else {
        console.error("Failed to load activities:", result.error);
      }
    } catch (error) {
      console.error("Failed to load activities:", error);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  // Client-side filtering
  const activities = useMemo(() => {
    if (direction === 'all') {
      return allActivities;
    } else {
      return allActivities.filter(activity => activity.direction === direction);
    }
  }, [allActivities, direction]);



  useEffect(() => {
    if (address && !hasInitialized) {
      // First time loading or initial wallet connection
      loadActivities();
      setHasInitialized(true);
    }
    // Don't do anything on subsequent renders (tab switching)
  }, [address, hasInitialized, loadActivities]);

  // Listen for refresh events (e.g., after quest completion)
  useEffect(() => {
    const handleRefreshActivity = () => {
      console.log('🔄 [ACTIVITY] Refreshing activity data after quest completion');
      loadActivities(false); // Just refresh from Firebase, no blockchain scan
    };

    window.addEventListener('refreshActivity', handleRefreshActivity);
    
    return () => {
      window.removeEventListener('refreshActivity', handleRefreshActivity);
    };
  }, [loadActivities]);

  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case "token_transfer":
        return <Icon name="wallet" size="sm" className="text-blue-500" />;
      case "nft_transfer":
        return <Icon name="nft" size="sm" className="text-purple-500" />;
      case "contract_interaction":
        return <Icon name="contract" size="sm" className="text-green-500" />;
      case "swap":
        return <Icon name="transaction" size="sm" className="text-orange-500" />;
      case "stake":
        return <Icon name="trophy" size="sm" className="text-yellow-500" />;
      case "mint":
        return <Icon name="plus" size="sm" className="text-pink-500" />;
      default:
        return <Icon name="activity" size="sm" className="text-gray-500" />;
    }
  };



  const getLevel = (points: number) => {
    if (points >= 1000) return { level: "Diamond Hands", color: "text-purple-500" };
    if (points >= 500) return { level: "Whale", color: "text-blue-500" };
    if (points >= 200) return { level: "DeFi Master", color: "text-green-500" };
    if (points >= 100) return { level: "Crypto Native", color: "text-yellow-500" };
    if (points >= 50) return { level: "HODLer", color: "text-orange-500" };
    return { level: "Newbie", color: "text-gray-500" };
  };

  const truncateText = (text: string, maxLength: number = 50) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  const level = getLevel(totalPoints);

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
        {/* Header with Points and Level */}
        <div className="bg-[var(--app-card-bg)] backdrop-blur-md rounded-xl p-4 border border-[var(--app-card-border)]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-semibold">On-chain Points</h2>
            </div>
            {address && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => loadActivities(true)}
                disabled={isLoading}
                icon={<Icon name="refresh" size="sm" />}
              >
                {isLoading ? "Loading..." : "Refresh"}
              </Button>
            )}
          </div>
          
          {address ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--app-accent)]">{totalPoints}</div>
                <div className="text-sm text-[var(--app-foreground-muted)]">Total Points</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1 mb-1">
                  <div className={`text-lg font-semibold ${level.color}`}>{level.level}</div>
                </div>
                <div className="text-sm text-[var(--app-foreground-muted)]">Level</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="text-2xl font-bold text-[var(--app-foreground-muted)]">--</div>
              <div className="text-sm text-[var(--app-foreground-muted)]">Connect wallet to view points</div>
            </div>
          )}
        </div>

        {/* Activity List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-md font-semibold">Recent Activity</h3>
            {address && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("leaderboard")}
              >
                View Leaderboard
              </Button>
            )}
          </div>

          {!address ? (
            <div className="text-center py-8 text-[var(--app-foreground-muted)]">
              <Icon name="wallet" size="lg" className="mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium mb-2">Connect Wallet</p>
              <p className="text-sm">Connect your wallet to view your activities</p>
            </div>
          ) : (
            <>
              {/* Direction Filter */}
              <div className="flex space-x-2">
                <Button
                  variant={direction === 'all' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setDirection('all')}
                >
                  All ({activities.length})
                </Button>
                <Button
                  variant={direction === 'inbound' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setDirection('inbound')}
                >
                  Inbound ({inboundCount})
                </Button>
                <Button
                  variant={direction === 'outbound' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setDirection('outbound')}
                >
                  Outbound ({outboundCount})
                </Button>
              </div>

              {/* Scrollable Activity List */}
              <div className="h-64 overflow-y-auto space-y-2 pr-2">
                {isLoading ? (
                  <div className="space-y-2">
                    {[...Array(6)].map((_, index) => (
                      <div
                        key={index}
                        className="bg-[var(--app-card-bg)] backdrop-blur-md rounded-lg p-3 border border-[var(--app-card-border)] animate-pulse"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            <div className="mt-0.5">
                              <div className="w-4 h-4 bg-gray-300 rounded-full"></div>
                            </div>
                            <div className="flex-1 min-w-0 space-y-2">
                              <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                              <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 bg-gray-300 rounded-full"></div>
                            <div className="w-8 h-4 bg-gray-300 rounded"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : activities.length === 0 ? (
                  <div className="text-center py-8 text-[var(--app-foreground-muted)]">
                    <Icon name="activity" size="lg" className="mx-auto mb-2 opacity-50" />
                    <p>No activity found</p>
                    <p className="text-sm">Start making transactions to earn points!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activities.slice(0, 6).map((activity) => (
                      <div
                        key={`${activity.hash}-${activity.direction}-${activity.tokenId || 'no-token-id'}`}
                        className="bg-[var(--app-card-bg)] backdrop-blur-md rounded-lg p-3 border border-[var(--app-card-border)] hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            <div className="mt-0.5">
                              {getActivityIcon(activity.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[var(--app-foreground)]">
                                {truncateText(activity.description)}
                              </p>
                              <a 
                                href={`https://basescan.org/tx/${activity.hash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-[var(--app-accent)] hover:underline"
                              >
                                {activity.hash.slice(0, 8)}...
                              </a>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className={`text-xs px-2 py-1 rounded-full ${
                              activity.direction === 'inbound' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {activity.direction === 'inbound' ? (
                                <Icon name="arrow-inbound" size="sm" className="text-green-600" />
                              ) : (
                                <Icon name="arrow-outbound" size="sm" className="text-red-600" />
                              )}
                            </div>
                            <div className="flex items-center space-x-1 text-sm font-semibold text-green-500">
                              <span>+{activity.points}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}