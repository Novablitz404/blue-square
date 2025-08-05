"use client";

import { useState } from "react";
import { Button } from "./Button";
import { Icon } from "./Icon";

interface Reward {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  type: "nft" | "token" | "badge" | "discount";
  available: boolean;
  image?: string;
}

interface RewardsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Rewards({ activeTab, setActiveTab }: RewardsProps) {
  const [userPoints] = useState(100); // Mock user points
  const [rewards, setRewards] = useState<Reward[]>([
    {
      id: "1",
      name: "Early Adopter Badge",
      description: "Exclusive badge for early users of the platform",
      pointsCost: 50,
      type: "badge",
      available: true,
    },
    {
      id: "2",
      name: "100 USDC Tokens",
      description: "Redeem 100 USDC tokens to your wallet",
      pointsCost: 200,
      type: "token",
      available: true,
    },
    {
      id: "3",
      name: "Exclusive NFT #001",
      description: "Limited edition NFT for top contributors",
      pointsCost: 500,
      type: "nft",
      available: true,
    },
    {
      id: "4",
      name: "50% Trading Fee Discount",
      description: "Get 50% off trading fees for 30 days",
      pointsCost: 300,
      type: "discount",
      available: true,
    },
    {
      id: "5",
      name: "VIP Access Pass",
      description: "Access to exclusive features and early releases",
      pointsCost: 1000,
      type: "badge",
      available: false,
    },
    {
      id: "6",
      name: "500 ETH Tokens",
      description: "Redeem 500 ETH tokens to your wallet",
      pointsCost: 2000,
      type: "token",
      available: false,
    },
  ]);

  const [redeeming, setRedeeming] = useState<string | null>(null);

  const handleRedeem = async (reward: Reward) => {
    if (userPoints < reward.pointsCost) {
      alert("Not enough points to redeem this reward!");
      return;
    }

    setRedeeming(reward.id);
    try {
      // Simulate redemption process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In a real app, this would call a smart contract or API
      alert(`Successfully redeemed ${reward.name}!`);
      
      // Update rewards list to mark as unavailable
      setRewards(prev => prev.map(r => 
        r.id === reward.id ? { ...r, available: false } : r
      ));
    } catch {
      alert("Failed to redeem reward. Please try again.");
    } finally {
      setRedeeming(null);
    }
  };

  const getRewardIcon = (type: Reward["type"]) => {
    switch (type) {
      case "nft":
        return <Icon name="nft" size="sm" className="text-purple-500" />;
      case "token":
        return <Icon name="wallet" size="sm" className="text-blue-500" />;
      case "badge":
        return <Icon name="trophy" size="sm" className="text-yellow-500" />;
      case "discount":
        return <Icon name="points" size="sm" className="text-green-500" />;
      default:
        return <Icon name="activity" size="sm" className="text-gray-500" />;
    }
  };

  const getRewardColor = (type: Reward["type"]) => {
    switch (type) {
      case "nft":
        return "border-purple-500/20 bg-purple-500/5";
      case "token":
        return "border-blue-500/20 bg-blue-500/5";
      case "badge":
        return "border-yellow-500/20 bg-yellow-500/5";
      case "discount":
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
          
          <div className="grid gap-3">
            {rewards.map((reward) => (
              <div
                key={reward.id}
                className={`bg-[var(--app-card-bg)] backdrop-blur-md rounded-lg p-4 border ${getRewardColor(reward.type)} hover:shadow-md transition-shadow ${
                  !reward.available ? "opacity-50" : ""
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
                        {!reward.available && (
                          <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full">
                            Redeemed
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--app-foreground-muted)] mb-2">
                        {reward.description}
                      </p>
                      <div className="flex items-center space-x-1 text-sm font-semibold text-[var(--app-accent)]">
                        <Icon name="points" size="sm" />
                        <span>{reward.pointsCost} points</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end space-y-2">
                    {reward.available && userPoints >= reward.pointsCost && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleRedeem(reward)}
                        disabled={redeeming === reward.id}
                      >
                        {redeeming === reward.id ? "Redeeming..." : "Redeem"}
                      </Button>
                    )}
                    {reward.available && userPoints < reward.pointsCost && (
                      <div className="text-xs text-red-500 font-medium">
                        Need {reward.pointsCost - userPoints} more points
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
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