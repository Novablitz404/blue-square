"use client";

import {
  useMiniKit,
  useAddFrame,
  useNotification,
} from "@coinbase/onchainkit/minikit";
import {
  Name,
  Identity,
  Address,
  Avatar,
  EthBalance,
} from "@coinbase/onchainkit/identity";
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
} from "@coinbase/onchainkit/wallet";
import { useEffect, useState, useCallback } from "react";
import { useAccount } from "wagmi";
import Image from "next/image";
import { Button } from "./components/Button";
import { ActivityTracker } from "./components/ActivityTracker";
import { Leaderboard } from "./components/Leaderboard";
import { Rewards } from "./components/Rewards";
import { Quests } from "./components/Quests";
import { SaveFrameModal } from "./components/SaveFrameModal";

export default function App() {
  const { setFrameReady, isFrameReady, context } = useMiniKit();
  const { address } = useAccount();
  const [frameAdded, setFrameAdded] = useState(false);
  const [showSaveFrameModal, setShowSaveFrameModal] = useState(false);
  const [isSavingFrame, setIsSavingFrame] = useState(false);
  const [activeTab, setActiveTab] = useState("activity");
  const [notificationSent, setNotificationSent] = useState(false);

  const addFrame = useAddFrame();

  const sendNotification = useNotification();

  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [setFrameReady, isFrameReady]);

  // Debug wallet connection
  useEffect(() => {
    console.log('🔍 [CLIENT] Wallet state:', {
      isFrameReady,
      clientAdded: context?.client.added,
      address,
      hasContext: !!context
    });
  }, [isFrameReady, context?.client.added, address, context]);

  // Check for early adopter quest when wallet connects
  useEffect(() => {
    if (address) {
      console.log('🔍 [CLIENT] Checking early adopter quest for wallet:', address);
      
      // Trigger early adopter quest check with real wallet address
      fetch('/api/quests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: address,
          action: 'check_early_adopter'
        })
      })
      .then(response => response.json())
      .then(data => {
        console.log('✅ [CLIENT] Early adopter quest check response:', data);
        // Force a refresh of activity data after quest completion
        if (data.success) {
          // Trigger activity refresh immediately (no blockchain scan needed)
          window.dispatchEvent(new CustomEvent('refreshActivity'));
        }
      })
      .catch(error => {
        console.error('❌ [CLIENT] Error checking early adopter quest:', error);
      });
    }
  }, [address]);

  // Show save frame modal when app loads and frame hasn't been saved
  useEffect(() => {
    if (context && !context.client.added && !frameAdded) {
      // Small delay to ensure the app is fully loaded
      const timer = setTimeout(() => {
        setShowSaveFrameModal(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [context, frameAdded]);

  const handleAddFrame = useCallback(async () => {
    setIsSavingFrame(true);
    try {
      const frameAdded = await addFrame();
      setFrameAdded(Boolean(frameAdded));
      setShowSaveFrameModal(false);
    } catch (error) {
      console.error('Error saving frame:', error);
    } finally {
      setIsSavingFrame(false);
    }
  }, [addFrame]);

  const handleCancelSaveFrame = useCallback(() => {
    setShowSaveFrameModal(false);
  }, []);

  const handleSendNotification = async () => {
    try {
      await sendNotification({
        title: 'New On-chain Points! 🎉',
        body: 'You earned points for your recent on-chain activity!'
      });
      setNotificationSent(true);
      setTimeout(() => setNotificationSent(false), 30000);
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  };

  return (
    <div className="flex flex-col min-h-screen font-sans text-[var(--app-foreground)] mini-app-theme from-[var(--app-background)] to-[var(--app-gray)]">
      <div className="w-full max-w-md mx-auto px-4 py-3">
        <header className="flex justify-between items-center mb-3 h-11">
          <div className="flex items-center space-x-2">
            <Image src="/BaseQuestLogo-Blue.png" alt="Base Quest" width={80} height={80} priority />
          </div>
          <div className="flex items-center space-x-2">
            <div className="scale-75 origin-right">
              <Wallet className="z-10">
                <ConnectWallet>
                  <Name className="text-inherit" />
                </ConnectWallet>
                <WalletDropdown>
                  <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                    <Avatar />
                    <Name />
                    <Address />
                    <EthBalance />
                  </Identity>
                  <WalletDropdownDisconnect />
                </WalletDropdown>
              </Wallet>
            </div>
          </div>
        </header>

        <main className="flex-1">
          <div className={activeTab === "activity" ? "block" : "hidden"}>
            <ActivityTracker activeTab={activeTab} setActiveTab={setActiveTab} />
          </div>
          <div className={activeTab === "leaderboard" ? "block" : "hidden"}>
            <Leaderboard activeTab={activeTab} setActiveTab={setActiveTab} />
          </div>
          <div className={activeTab === "rewards" ? "block" : "hidden"}>
            <Rewards activeTab={activeTab} setActiveTab={setActiveTab} userAddress={address} />
          </div>
          <div className={activeTab === "quests" ? "block" : "hidden"}>
            <Quests activeTab={activeTab} setActiveTab={setActiveTab} />
          </div>
        </main>

        {/* Test Notification Button */}
        {context?.client.added && (
          <div className="mt-4 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSendNotification}
              disabled={notificationSent}
              className="text-xs"
            >
              {notificationSent ? "Notification Sent!" : "Send Test Notification"}
            </Button>
          </div>
        )}

        {/* Save Frame Modal */}
        <SaveFrameModal
          isOpen={showSaveFrameModal}
          onSave={handleAddFrame}
          onCancel={handleCancelSaveFrame}
          isSaving={isSavingFrame}
        />

      </div>
    </div>
  );
}
