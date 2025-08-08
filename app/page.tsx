"use client";

import {
  useMiniKit,
  useAddFrame,
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

  const addFrame = useAddFrame();

  // Function to send notifications for new quests and rewards
  const sendNewQuestNotification = useCallback(async (questTitle: string) => {
    if (!context?.client.added || !address) {
      console.log('❌ [NOTIFICATION] Frame not added or no address, skipping quest notification');
      return;
    }

    try {
      console.log('🔔 [NOTIFICATION] Sending new quest notification:', questTitle);
      const response = await fetch('/api/notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Quest Available! 🎯',
          body: `A new quest "${questTitle}" has been added. Check it out!`,
          userId: address
        })
      });
      
      const result = await response.json();
      if (result.success) {
        console.log('✅ [NOTIFICATION] New quest notification sent successfully');
      } else {
        console.log('⚠️ [NOTIFICATION] Quest notification skipped:', result.message);
      }
    } catch (error) {
      console.error('❌ [NOTIFICATION] Failed to send new quest notification:', error);
    }
  }, [context?.client.added, address]);

  const sendNewRewardNotification = useCallback(async (rewardName: string) => {
    if (!context?.client.added || !address) {
      console.log('❌ [NOTIFICATION] Frame not added or no address, skipping reward notification');
      return;
    }

    try {
      console.log('🔔 [NOTIFICATION] Sending new reward notification:', rewardName);
      const response = await fetch('/api/notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Reward Available! 🎁',
          body: `A new reward "${rewardName}" has been added. Claim it now!`,
          userId: address
        })
      });
      
      const result = await response.json();
      if (result.success) {
        console.log('✅ [NOTIFICATION] New reward notification sent successfully');
      } else {
        console.log('⚠️ [NOTIFICATION] Reward notification skipped:', result.message);
      }
    } catch (error) {
      console.error('❌ [NOTIFICATION] Failed to send new reward notification:', error);
    }
  }, [context?.client.added, address]);

  // Check for new quests and rewards periodically
  useEffect(() => {
    if (!address || !context?.client.added) return;

    const checkForNewContent = async () => {
      try {
        // Check for new quests
        const questsResponse = await fetch(`/api/quests?userId=${address}&checkNew=true`);
        const questsData = await questsResponse.json();
        
        if (questsData.success && questsData.newQuests?.length > 0) {
          for (const quest of questsData.newQuests) {
            await sendNewQuestNotification(quest.title);
          }
        }

        // Check for new rewards
        const rewardsResponse = await fetch(`/api/rewards?userId=${address}&checkNew=true`);
        const rewardsData = await rewardsResponse.json();
        
        if (rewardsData.success && rewardsData.newRewards?.length > 0) {
          for (const reward of rewardsData.newRewards) {
            await sendNewRewardNotification(reward.name);
          }
        }
      } catch (error) {
        console.error('❌ [NOTIFICATION] Error checking for new content:', error);
      }
    };

    // Check immediately when component mounts
    checkForNewContent();

    // Set up periodic checking (every 2 minutes)
    const interval = setInterval(checkForNewContent, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, [address, context?.client.added, sendNewQuestNotification, sendNewRewardNotification]);

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
    if (context && !context.client.added && !frameAdded && isFrameReady) {
      // Small delay to ensure the app is fully loaded
      const timer = setTimeout(() => {
        setShowSaveFrameModal(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [context, frameAdded, isFrameReady]);

  // Check if notification details become available after frame is added
  useEffect(() => {
    if (context?.client.added && address && !frameAdded) {
      console.log('🔍 [FRAME] Frame is added, but notification details should be handled in handleAddFrame');
      console.log('🔍 [FRAME] Context details:', context);
    }
  }, [context?.client.added, address, frameAdded, context]);

  const handleAddFrame = useCallback(async () => {
    console.log('🔍 [FRAME] handleAddFrame called');
    console.log('🔍 [FRAME] Current state:', { address, context: !!context, clientAdded: context?.client.added, isFrameReady });
    
    if (!address) {
      console.error('❌ [FRAME] No wallet address found');
      alert('Please connect your wallet first');
      return;
    }
    
    if (!context) {
      console.error('❌ [FRAME] MiniKit context not available');
      alert('MiniKit is not ready. Please wait a moment and try again.');
      return;
    }
    
    if (!isFrameReady) {
      console.error('❌ [FRAME] Frame not ready');
      alert('Frame is not ready. Please wait a moment and try again.');
      return;
    }
    
    if (typeof addFrame !== 'function') {
      console.error('❌ [FRAME] addFrame function not available');
      alert('Add frame function not available. Please refresh the page and try again.');
      return;
    }
    
    setIsSavingFrame(true);
    try {
      console.log('🔍 [FRAME] Attempting to add frame...');
      const result = await addFrame();
      console.log('🔍 [FRAME] Frame result:', result);
      
      if (result) {
        console.log('🔍 [FRAME] Frame added successfully!');
        console.log('🔍 [FRAME] URL:', result.url);
        console.log('🔍 [FRAME] Token:', result.token);
        
        // Store notification details in Firebase
        try {
          const response = await fetch('/api/notification', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: address,
              token: result.token,
              url: result.url
            })
          });
          
          const responseResult = await response.json();
          if (responseResult.success) {
            console.log('✅ [NOTIFICATION] Stored notification details for user:', address);
          } else {
            console.error('❌ [NOTIFICATION] Failed to store notification details:', responseResult.error);
          }
        } catch (error) {
          console.error('❌ [NOTIFICATION] Failed to store notification details:', error);
        }
        
        setFrameAdded(true);
        setShowSaveFrameModal(false);
      } else {
        console.log('⚠️ [FRAME] Frame result is null - frame might have been added but notification details not available');
        
        // The frame was added but notification details aren't available yet
        // This can happen in some cases where the frame is added but the notification details
        // are provided through events or context updates later
        
        // Set up a listener for frame events to capture notification details when they become available
        const handleFrameEvent = (event: MessageEvent) => {
          console.log('🔍 [FRAME] Frame event received:', event);
          if (event.data && typeof event.data === 'object' && 'event' in event.data) {
            const frameEvent = event.data as { event: string; notificationDetails?: { token: string; url: string } };
            if (frameEvent.event === 'miniapp_added' && frameEvent.notificationDetails && address) {
              console.log('🔍 [FRAME] Found notification details in frame event:', frameEvent.notificationDetails);
              
              // Store notification details
              fetch('/api/notification', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId: address,
                  token: frameEvent.notificationDetails.token,
                  url: frameEvent.notificationDetails.url
                })
              })
              .then(response => response.json())
              .then(result => {
                if (result.success) {
                  console.log('✅ [NOTIFICATION] Stored notification details from frame event for user:', address);
                } else {
                  console.error('❌ [NOTIFICATION] Failed to store notification details from frame event:', result.error);
                }
              })
              .catch(error => {
                console.error('❌ [NOTIFICATION] Failed to store notification details from frame event:', error);
              });
              
              // Remove the event listener
              window.removeEventListener('message', handleFrameEvent);
            }
          }
        };
        
        // Listen for frame events
        window.addEventListener('message', handleFrameEvent);
        
        // Also try to get notification details from context after a delay
        setTimeout(async () => {
          if (context?.client.added) {
            console.log('🔍 [FRAME] Checking for notification details after delay...');
            // Try to get notification details from the context
            const clientContext = context.client as { notificationDetails?: { token: string; url: string } };
            if (clientContext?.notificationDetails) {
              const notificationDetails = clientContext.notificationDetails;
              console.log('🔍 [FRAME] Found notification details in context after delay:', notificationDetails);
              
              // Store notification details
              try {
                const response = await fetch('/api/notification', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    userId: address,
                    token: notificationDetails.token,
                    url: notificationDetails.url
                  })
                });
                
                const result = await response.json();
                if (result.success) {
                  console.log('✅ [NOTIFICATION] Stored notification details from context after delay for user:', address);
                } else {
                  console.error('❌ [NOTIFICATION] Failed to store notification details from context after delay:', result.error);
                }
              } catch (error) {
                console.error('❌ [NOTIFICATION] Failed to store notification details from context after delay:', error);
              }
            } else {
              console.log('⚠️ [FRAME] Still no notification details found in context after delay');
            }
          }
        }, 3000); // Wait 3 seconds for the context to update
        
        setFrameAdded(true);
        setShowSaveFrameModal(false);
      }
    } catch (error) {
      console.error('❌ [FRAME] Error saving frame:', error);
      alert('Failed to save frame. Please try again.');
    } finally {
      setIsSavingFrame(false);
    }
  }, [addFrame, address, isFrameReady, context]);

  const handleCancelSaveFrame = useCallback(() => {
    setShowSaveFrameModal(false);
  }, []);

  return (
    <div className="flex flex-col min-h-screen font-sans text-[var(--app-foreground)] mini-app-theme from-[var(--app-background)] to-[var(--app-gray)]">
      <div className="w-full max-w-md mx-auto px-4 py-3">
        <header className="flex justify-between items-center mb-3 h-16">
          <div className="flex items-center space-x-2">
            <Image src="/BaseQuestLogo-Blue.png" alt="Base Quest" width={120} height={120} priority />
          </div>
          <div className="flex items-center space-x-2">
            <div className="scale-100 origin-right">
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
