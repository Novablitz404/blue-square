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
    <div className="flex flex-col h-screen">
      {/* Scrollable content area */}
      <div className="flex-1 space-y-4 pb-4 overflow-y-auto px-4 mb-20">
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
          {!address ? (
            <div className="text-center py-8 text-[var(--app-foreground-muted)]">
              <Icon name="wallet" size="lg" className="mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium mb-2">Connect Wallet</p>
              <p className="text-sm">Connect your wallet to view your quests</p>
            </div>
          ) : isLoading ? (
            <div className="text-center py-8 text-[var(--app-foreground-muted)]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--app-accent)] mx-auto mb-2"></div>
              <p>Loading quests...</p>
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
            filteredQuests.map(({ quest, userQuest }) => {
              const status = getQuestStatus(userQuest, quest);
              const progress = getProgressPercentage(userQuest, quest);
              
              return (
                <div
                  key={quest.id}
                  className={`bg-[var(--app-card-bg)] backdrop-blur-md rounded-lg p-4 border border-[var(--app-card-border)] hover:shadow-md transition-shadow ${
                    userQuest.isCompleted ? "ring-2 ring-green-500/20" : ""
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-[var(--app-foreground)]">
                        {quest.title}
                      </h3>
                      <span className={`text-xs font-medium ${status.color}`}>
                        {status.text}
                      </span>
                    </div>
                    
                    <p className="text-xs text-[var(--app-foreground-muted)] mb-3">
                      {quest.description}
                    </p>
                    
                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-[var(--app-foreground-muted)] mb-1">
                        <span>Progress</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <div className="w-full bg-[var(--app-card-border)] rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            userQuest.isCompleted 
                              ? 'bg-green-500' 
                              : progress > 0 
                                ? 'bg-blue-500' 
                                : 'bg-gray-300'
                          }`}
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    {/* Rewards */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-semibold text-[var(--app-accent)]">
                          +{quest.rewards.points} points
                        </span>
                      </div>
                      
                      {userQuest.isCompleted && (
                        <div className="flex items-center space-x-1 text-green-500">
                          <Icon name="check" size="sm" />
                          <span className="text-xs font-medium">Completed</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
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