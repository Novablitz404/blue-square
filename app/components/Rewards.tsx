"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { getAvailableRewardsForUser, recordUserReward, AvailableReward } from "../../lib/reward-service";
import { getCombinedPoints } from "../../lib/firebase-service";

interface RewardsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userAddress?: string;
}

export function Rewards({ activeTab, setActiveTab, userAddress }: RewardsProps) {
  const [userPoints, setUserPoints] = useState(0);
  const [rewards, setRewards] = useState<AvailableReward[]>([]);
  const [loading, setLoading] = useState(true);

  const [redeeming, setRedeeming] = useState<string | null>(null);

  const loadRewards = useCallback(async () => {
    if (!userAddress) return;
    
    try {
      setLoading(true);
      const [availableRewards, userPointsData] = await Promise.all([
        getAvailableRewardsForUser(userAddress),
        getCombinedPoints(userAddress)
      ]);
      
      setRewards(availableRewards);
      setUserPoints(userPointsData.totalPoints);
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

    setRedeeming(reward.id);
    try {
      await recordUserReward(userAddress, reward);
      alert(`Successfully redeemed ${reward.name}!`);
      
      // Reload rewards to update the UI
      await loadRewards();
    } catch (error) {
      console.error('Error redeeming reward:', error);
      alert("Failed to redeem reward. Please try again.");
    } finally {
      setRedeeming(null);
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

  return (
    <div className="flex flex-col h-screen">
      {/* Scrollable content area */}
      <div className="flex-1 space-y-4 pb-4 overflow-y-auto px-4 mb-20">
        {/* Header with User Points */}
        <div className="bg-[var(--app-card-bg)] backdrop-blur-md rounded-xl p-4 border border-[var(--app-card-border)]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Icon name="points" size="md" className="text-yellow-500" />
              <h2 className="text-lg font-semibold">Rewards Center</h2>
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-[var(--app-accent)]">{userPoints}</div>
            <div className="text-sm text-[var(--app-foreground-muted)]">Your Points</div>
          </div>
        </div>

        {/* Available Rewards */}
        <div className="space-y-3">
          <h3 className="text-md font-semibold">Available Rewards</h3>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="text-sm text-[var(--app-foreground-muted)]">Loading rewards...</div>
            </div>
          ) : rewards.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-sm text-[var(--app-foreground-muted)]">No rewards available</div>
            </div>
          ) : (
            <div className="grid gap-3">
              {rewards.map((reward) => (
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
                          {!reward.isEligible && !reward.isRedeemed && (
                            <span className="text-xs bg-yellow-500 text-white px-2 py-1 rounded-full">
                              Locked
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--app-foreground-muted)] mb-2">
                          {reward.description}
                        </p>
                        <div className="flex items-center space-x-1 text-sm font-semibold text-[var(--app-accent)]">
                          <Icon name="points" size="sm" />
                          <span>{reward.pointsReward} points</span>
                        </div>
                        
                        {/* Requirements */}
                        {reward.requirements.questIds.length > 0 && (
                          <div className="mt-2 text-xs text-[var(--app-foreground-muted)]">
                            <span className="font-medium">Required Quests:</span> {reward.requirements.questIds.length}
                          </div>
                        )}
                        {reward.requirements.requiredLevel > 0 && (
                          <div className="mt-1 text-xs text-[var(--app-foreground-muted)]">
                            <span className="font-medium">Required Level:</span> {reward.requirements.requiredLevel}
                          </div>
                        )}
                        
                        {/* Missing Requirements */}
                        {reward.missingRequirements.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {reward.missingRequirements.map((req, index) => (
                              <div key={index} className="text-xs text-red-500">
                                • {req}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end space-y-2">
                      {reward.isEligible && !reward.isRedeemed && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleRedeem(reward)}
                          disabled={redeeming === reward.id}
                        >
                          {redeeming === reward.id ? "Redeeming..." : "Redeem"}
                        </Button>
                      )}
                      {!reward.isEligible && !reward.isRedeemed && (
                        <div className="text-xs text-red-500 font-medium text-right">
                          Requirements not met
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
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