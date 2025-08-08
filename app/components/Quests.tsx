"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { Button } from "./Button";
import { Icon } from "./Icon";

interface QuestProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

interface Quest {
  id: string;
  title: string;
  description: string;
  type: 'early_adopter' | 'activity_based' | 'streak_based';
  requirements: {
    dailyLogins?: number;
    targetDate?: string;
    activityCount?: number;
    streakDays?: number;
  };
  rewards: {
    points: number;
    title?: string;
    badge?: string;
  };
  isActive: boolean;
  startDate: Date;
  endDate?: Date;
  createdAt: Date;
}

interface UserQuest {
  userId: string;
  questId: string;
  progress: number;
  isCompleted: boolean;
  completedAt?: Date;
  startedAt: Date;
  lastUpdated: Date;
}

export function Quests({ activeTab, setActiveTab }: QuestProps) {
  const { address } = useAccount();
  const [quests, setQuests] = useState<{ quest: Quest; userQuest: UserQuest }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [questSubTab, setQuestSubTab] = useState<'available' | 'completed'>('available');

  const loadQuests = useCallback(async () => {
    if (!address) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/quests?userId=${address}`);
      const result = await response.json();
      
      if (result.success) {
        setQuests(result.data.quests);
        
        // If this is a new user with no quests, trigger early adopter quest check
        if (result.data.quests.length === 0) {
          console.log('🆕 [QUESTS] New user detected, triggering early adopter quest check');
          fetch('/api/quests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: address,
              action: 'check_early_adopter'
            })
          }).then(() => {
            // Reload quests after a short delay to get updated data
            setTimeout(() => loadQuests(), 500);
          });
        }
      } else {
        console.error("Failed to load quests:", result.error);
        setQuests([]);
      }
    } catch (error) {
      console.error("Failed to load quests:", error);
      setQuests([]);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (address) {
      loadQuests();
    }
  }, [loadQuests, address]);

  // Listen for refresh events (e.g., after quest completion)
  useEffect(() => {
    const handleRefreshQuests = () => {
      console.log('🔄 [QUESTS] Refreshing quest data');
      loadQuests();
    };

    window.addEventListener('refreshActivity', handleRefreshQuests);
    
    return () => {
      window.removeEventListener('refreshActivity', handleRefreshQuests);
    };
  }, [loadQuests]);

  const getProgressPercentage = (userQuest: UserQuest, quest: Quest) => {
    if (userQuest.isCompleted) return 100;
    
    switch (quest.type) {
      case 'streak_based':
        return Math.min((userQuest.progress / (quest.requirements.streakDays || 1)) * 100, 100);
      case 'activity_based':
        return Math.min((userQuest.progress / (quest.requirements.activityCount || 1)) * 100, 100);
      case 'early_adopter':
        return userQuest.progress * 100;
      default:
        return 0;
    }
  };

  const getQuestStatus = (userQuest: UserQuest, quest: Quest) => {
    if (userQuest.isCompleted) {
      return { status: 'completed', text: 'Completed', color: 'text-green-500' };
    }
    
    const progress = getProgressPercentage(userQuest, quest);
    if (progress > 0) {
      return { status: 'in-progress', text: 'In Progress', color: 'text-blue-500' };
    }
    
    return { status: 'not-started', text: 'Not Started', color: 'text-gray-500' };
  };

  // Filter quests based on sub-tab
  const filteredQuests = quests.filter(({ userQuest }) => {
    if (questSubTab === 'completed') {
      return userQuest.isCompleted;
    } else {
      return !userQuest.isCompleted;
    }
  });

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
              <h2 className="text-lg font-semibold">Quests</h2>
            </div>
            {address && (
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadQuests}
                  disabled={isLoading}
                  icon={<Icon name="refresh" size="sm" />}
                >
                  {isLoading ? "Loading..." : "Refresh"}
                </Button>
              </div>
            )}
          </div>

          {/* Sub-tabs */}
          {address && quests.length > 0 && (
            <div className="flex space-x-2">
              <Button
                variant={questSubTab === 'available' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setQuestSubTab('available')}
              >
                Available ({quests.filter(({ userQuest }) => !userQuest.isCompleted).length})
              </Button>
              <Button
                variant={questSubTab === 'completed' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setQuestSubTab('completed')}
              >
                Completed ({quests.filter(({ userQuest }) => userQuest.isCompleted).length})
              </Button>
            </div>
          )}
        </div>

        {/* Quests List */}
        <div className="space-y-3">
          {/* Scrollable Quests List */}
          <div className="h-65 overflow-y-auto space-y-3 scrollbar-hide">
            {!address ? (
              <div className="text-center py-8 text-[var(--app-foreground-muted)]">
                <Icon name="wallet" size="lg" className="mx-auto mb-3 opacity-50" />
                <p className="text-lg font-medium mb-2">Connect Wallet</p>
                <p className="text-sm">Connect your wallet to view your quests</p>
              </div>
            ) : isLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, index) => (
                  <div
                    key={index}
                    className="bg-[var(--app-card-bg)] backdrop-blur-md rounded-lg p-4 border border-[var(--app-card-border)] animate-pulse"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="h-5 bg-gray-300 rounded w-3/4 mb-2"></div>
                        <div className="flex items-center space-x-2">
                          <div className="w-16 h-4 bg-gray-300 rounded"></div>
                          <div className="w-4 h-4 bg-gray-300 rounded"></div>
                          <div className="w-20 h-4 bg-gray-300 rounded"></div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="text-right">
                          <div className="w-12 h-5 bg-gray-300 rounded"></div>
                          <div className="w-8 h-3 bg-gray-300 rounded mt-1"></div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="h-3 bg-gray-300 rounded w-full mb-3"></div>
                    
                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="flex justify-between mb-1">
                        <div className="w-16 h-3 bg-gray-300 rounded"></div>
                        <div className="w-8 h-3 bg-gray-300 rounded"></div>
                      </div>
                      <div className="w-full bg-gray-300 rounded-full h-2">
                        <div className="h-2 rounded-full bg-gray-400 w-1/3"></div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="w-20 h-4 bg-gray-300 rounded"></div>
                      <div className="w-16 h-4 bg-gray-300 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : quests.length === 0 ? (
              <div className="text-center py-8 text-[var(--app-foreground-muted)]">
                <Icon name="trophy" size="lg" className="mx-auto mb-3 opacity-50" />
                <p className="text-lg font-medium mb-2">No quests available</p>
                <p className="text-sm">Check back later for new quests!</p>
              </div>
            ) : filteredQuests.length === 0 ? (
              <div className="text-center py-8 text-[var(--app-foreground-muted)]">
                <Icon name="trophy" size="lg" className="mx-auto mb-3 opacity-50" />
                <p className="text-lg font-medium mb-2">
                  {questSubTab === 'completed' ? 'No completed quests' : 'No available quests'}
                </p>
                <p className="text-sm">
                  {questSubTab === 'completed' 
                    ? 'Complete some quests to see them here!' 
                    : 'All quests have been completed!'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredQuests.map(({ quest, userQuest }) => {
                  const status = getQuestStatus(userQuest, quest);
                  const progress = getProgressPercentage(userQuest, quest);
                  
                  return (
                    <div
                      key={`${quest.id}-${userQuest.userId}`}
                      className={`bg-[var(--app-card-bg)] backdrop-blur-md rounded-lg p-4 border border-[var(--app-card-border)] hover:shadow-md transition-shadow ${
                        userQuest.isCompleted ? "ring-2 ring-green-500/20" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="text-sm font-semibold text-[var(--app-foreground)]">
                              {quest.title}
                            </h4>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              quest.type === 'early_adopter' 
                                ? 'bg-blue-100 text-blue-700' 
                                : quest.type === 'activity_based'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-purple-100 text-purple-700'
                            }`}>
                              {quest.type.replace('_', ' ')}
                            </span>
                            {userQuest.isCompleted && (
                              <span className="text-xs bg-green-500 text-white px-2 py-1 rounded-full">
                                Completed
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[var(--app-foreground-muted)] mb-2">
                            {quest.description}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="text-right">
                            <div className="text-sm font-bold text-[var(--app-accent)]">
                              +{quest.rewards.points}
                            </div>
                            <div className="text-xs text-[var(--app-foreground-muted)]">
                              points
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="mb-3">
                        <div className="flex justify-between mb-1">
                          <span className="text-xs text-[var(--app-foreground-muted)]">Progress</span>
                          <span className="text-xs text-[var(--app-foreground-muted)]">{progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full bg-[var(--app-accent)] transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-[var(--app-foreground-muted)]">
                          {status.text}
                        </div>
                        <div className="text-xs text-[var(--app-foreground-muted)]">
                          {userQuest.isCompleted 
                            ? `Completed ${userQuest.completedAt ? new Date(userQuest.completedAt).toLocaleDateString() : ''}`
                            : `Started ${new Date(userQuest.startedAt).toLocaleDateString()}`
                          }
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 