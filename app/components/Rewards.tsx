"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { getAvailableRewardsForUser, recordUserReward, AvailableReward } from "../../lib/reward-service";

interface RewardsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userAddress?: string;
}

export function Rewards({ activeTab, setActiveTab, userAddress }: RewardsProps) {
  const [rewards, setRewards] = useState<AvailableReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [rewardSubTab, setRewardSubTab] = useState<'unclaimed' | 'claimed'>('unclaimed');

  const loadRewards = useCallback(async () => {
    if (!userAddress) return;
    
    try {
      setLoading(true);
      const availableRewards = await getAvailableRewardsForUser(userAddress);
      setRewards(availableRewards);
    } catch (error) {
      console.error('Error loading rewards:', error);
    } finally {
      setLoading(false);
    }
  }, [userAddress]);

  useEffect(() => {
    if (userAddress) {
      loadRewards();
    }
  }, [loadRewards, userAddress]);

  const handleRedeem = async (reward: AvailableReward) => {
    if (!userAddress) {
      alert("Please connect your wallet to redeem rewards!");
      return;
    }

    if (!reward.isEligible) {
      alert("You are not eligible for this reward!");
      return;
    }

    try {
      await recordUserReward(userAddress, reward);
      alert(`Successfully redeemed ${reward.name}!`);
      
      // Reload rewards to update the UI
      await loadRewards();
    } catch (error) {
      console.error('Error redeeming reward:', error);
      alert("Failed to redeem reward. Please try again.");
    }
  };

  const getRewardIcon = (type: AvailableReward["type"]) => {
    switch (type) {
      case "nft":
        return <Icon name="nft" size="sm" className="text-purple-500" />;
      case "token":
        return <Icon name="wallet" size="sm" className="text-blue-500" />;
      case "badge":
        return <Icon name="trophy" size="sm" className="text-yellow-500" />;
      case "discount":
        return <Icon name="points" size="sm" className="text-green-500" />;
      case "points":
        return <Icon name="points" size="sm" className="text-green-500" />;
      default:
        return <Icon name="activity" size="sm" className="text-gray-500" />;
    }
  };

  const getRewardColor = (type: AvailableReward["type"]) => {
    switch (type) {
      case "nft":
        return "border-purple-500/20 bg-purple-500/5";
      case "token":
        return "border-blue-500/20 bg-blue-500/5";
      case "badge":
        return "border-yellow-500/20 bg-yellow-500/5";
      case "discount":
        return "border-green-500/20 bg-green-500/5";
      case "points":
        return "border-green-500/20 bg-green-500/5";
      default:
        return "border-gray-500/20 bg-gray-500/5";
    }
  };

  // Filter rewards based on sub-tab
  const filteredRewards = rewards.filter((reward) => {
    if (rewardSubTab === 'claimed') {
      return reward.isRedeemed;
    } else {
      return !reward.isRedeemed;
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
        {/* Header with User Points */}
        <div className="bg-[var(--app-card-bg)] backdrop-blur-md rounded-xl p-4 border border-[var(--app-card-border)]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-semibold">Rewards Center</h2>
            </div>
          </div>

          {/* Sub-tabs */}
          {userAddress && rewards.length > 0 && (
            <div className="flex space-x-2">
              <Button
                variant={rewardSubTab === 'unclaimed' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setRewardSubTab('unclaimed')}
              >
                Unclaimed ({rewards.filter(reward => !reward.isRedeemed).length})
              </Button>
              <Button
                variant={rewardSubTab === 'claimed' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setRewardSubTab('claimed')}
              >
                Claimed ({rewards.filter(reward => reward.isRedeemed).length})
              </Button>
            </div>
          )}
        </div>

        {/* Available Rewards */}
        <div className="space-y-3">
          <h3 className="text-md font-semibold">
            {rewardSubTab === 'claimed' ? 'Claimed Rewards' : 'Available Rewards'}
          </h3>
          
          {/* Scrollable Rewards List */}
          <div className="h-94 overflow-y-auto space-y-3 scrollbar-hide">
            {!userAddress ? (
              <div className="text-center py-8 text-[var(--app-foreground-muted)]">
                <Icon name="wallet" size="lg" className="mx-auto mb-3 opacity-50" />
                <p className="text-lg font-medium mb-2">Connect Wallet</p>
                <p className="text-sm">Connect your wallet to view your rewards</p>
              </div>
            ) : loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, index) => (
                  <div
                    key={index}
                    className="bg-[var(--app-card-bg)] backdrop-blur-md rounded-lg p-4 border border-[var(--app-card-border)] animate-pulse"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="mt-0.5">
                          <div className="w-5 h-5 bg-gray-300 rounded-full"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <div className="h-4 bg-gray-300 rounded w-32"></div>
                            <div className="w-16 h-4 bg-gray-300 rounded"></div>
                          </div>
                          <div className="h-3 bg-gray-300 rounded w-full mb-2"></div>
                          
                          {/* Requirements */}
                          <div className="space-y-1">
                            <div className="h-3 bg-gray-300 rounded w-24"></div>
                            <div className="h-3 bg-gray-300 rounded w-28"></div>
                            <div className="h-3 bg-gray-300 rounded w-20"></div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end space-y-2">
                        <div className="w-16 h-6 bg-gray-300 rounded"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : rewards.length === 0 ? (
              <div className="text-center py-8 text-[var(--app-foreground-muted)]">
                <p className="text-lg font-medium mb-2">No rewards available</p>
                <p className="text-sm">Check back later for new rewards!</p>
              </div>
            ) : filteredRewards.length === 0 ? (
              <div className="text-center py-8 text-[var(--app-foreground-muted)]">
                <Icon name="trophy" size="lg" className="mx-auto mb-3 opacity-50" />
                <p className="text-lg font-medium mb-2">
                  {rewardSubTab === 'claimed' ? 'No claimed rewards' : 'No unclaimed rewards'}
                </p>
                <p className="text-sm">
                  {rewardSubTab === 'claimed' 
                    ? 'Claim some rewards to see them here!' 
                    : 'All rewards have been claimed!'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRewards.map((reward) => (
                  <div
                    key={reward.id}
                    className={`bg-[var(--app-card-bg)] backdrop-blur-md rounded-lg p-4 border ${getRewardColor(reward.type)} hover:shadow-md transition-shadow ${
                      !reward.isEligible || reward.isRedeemed ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="mt-0.5">
                          {getRewardIcon(reward.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="text-sm font-semibold text-[var(--app-foreground)]">
                              {reward.name}
                            </h4>
                            {reward.isRedeemed && (
                              <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full">
                                Redeemed
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[var(--app-foreground-muted)] mb-2">
                            {reward.description}
                          </p>
                          
                          {/* Requirements */}
                          <div className="space-y-1">
                            {reward.requirements.requiredLevel > 0 && (
                              <div className="flex items-center space-x-2 text-xs text-[var(--app-foreground-muted)]">
                                <Icon name="points" size="sm" />
                                <span>Level {reward.requirements.requiredLevel}+ required</span>
                              </div>
                            )}
                            {reward.requirements.questIds.length > 0 && (
                              <div className="flex items-center space-x-2 text-xs text-[var(--app-foreground-muted)]">
                                <Icon name="activity" size="sm" />
                                <span>{reward.requirements.questIds.length} quest(s) required</span>
                              </div>
                            )}
                            {reward.maxRedemptions && (
                              <div className="flex items-center space-x-2 text-xs text-[var(--app-foreground-muted)]">
                                <Icon name="check" size="sm" />
                                <span>{reward.currentRedemptions}/{reward.maxRedemptions} claimed</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end space-y-2">
                        <div className="text-right">
                          <div className="text-lg font-bold text-[var(--app-accent)]">
                            +{reward.pointsReward}
                          </div>
                          <div className="text-xs text-[var(--app-foreground-muted)]">
                            points
                          </div>
                        </div>
                        
                        {!reward.isRedeemed && reward.isEligible && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleRedeem(reward)}
                            disabled={loading}
                          >
                            {loading ? "Claiming..." : "Claim"}
                          </Button>
                        )}
                        
                        {reward.isRedeemed && (
                          <span className="text-xs text-red-500 font-medium">
                            Already claimed
                          </span>
                        )}
                        
                        {!reward.isEligible && !reward.isRedeemed && (
                          <span className="text-xs text-[var(--app-foreground-muted)]">
                            Not eligible
                          </span>
                        )}
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