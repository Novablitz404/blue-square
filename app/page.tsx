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
    if (context && !context.client.added && !frameAdded) {
      // Small delay to ensure the app is fully loaded
      const timer = setTimeout(() => {
        setShowSaveFrameModal(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [context, frameAdded]);

  // Check if notification details become available after frame is added
  useEffect(() => {
    if (context?.client.added && address && !frameAdded) {
      console.log('🔍 [FRAME] Frame is added, checking for notification details...');
      console.log('🔍 [FRAME] Context details:', context);
      
      // Try to get notification details from context
      const clientContext = context.client as { notificationDetails?: { token: string; url: string } };
      if (clientContext?.notificationDetails) {
        const notificationDetails = clientContext.notificationDetails;
        console.log('🔍 [FRAME] Found notification details in context:', notificationDetails);
        
        // Store notification details
        fetch('/api/notification', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: address,
            token: notificationDetails.token,
            url: notificationDetails.url
          })
        })
        .then(response => response.json())
        .then(result => {
          if (result.success) {
            console.log('✅ [NOTIFICATION] Stored notification details from context for user:', address);
          } else {
            console.error('❌ [NOTIFICATION] Failed to store notification details from context:', result.error);
          }
        })
        .catch(error => {
          console.error('❌ [NOTIFICATION] Failed to store notification details from context:', error);
        });
      } else {
        console.log('⚠️ [FRAME] No notification details found in context, trying alternative approach...');
        
        // Try to get notification details from the MiniKit context
        // This might be available through a different property or method
        if (context.client && typeof context.client === 'object') {
          const clientKeys = Object.keys(context.client);
          console.log('🔍 [FRAME] Available client keys:', clientKeys);
          
          // Check if there are any properties that might contain notification details
          for (const key of clientKeys) {
            const value = (context.client as Record<string, unknown>)[key];
            if (value && typeof value === 'object' && (value as { token?: string; url?: string }).token || (value as { token?: string; url?: string }).url) {
              console.log('🔍 [FRAME] Found potential notification details in:', key, value);
              
              // Store notification details if found
              const notificationValue = value as { token?: string; url?: string };
              if (notificationValue.token && notificationValue.url) {
                fetch('/api/notification', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    userId: address,
                    token: notificationValue.token,
                    url: notificationValue.url
                  })
                })
                .then(response => response.json())
                .then(result => {
                  if (result.success) {
                    console.log('✅ [NOTIFICATION] Stored notification details from alternative source for user:', address);
                  } else {
                    console.error('❌ [NOTIFICATION] Failed to store notification details from alternative source:', result.error);
                  }
                })
                .catch(error => {
                  console.error('❌ [NOTIFICATION] Failed to store notification details from alternative source:', error);
                });
                break;
              }
            }
          }
        }
        
        // If still no notification details found, try to get them from the MiniKit context
        // This might be available through a different approach
        if (context.client && typeof context.client === 'object') {
          // Check if there's a way to get notification details from the MiniKit context
          // This might be available through a different property or method
          const clientContext = context.client as Record<string, unknown>;
          
          // Try to get notification details from the MiniKit context
          // This might be available through a different property or method
          if (clientContext.notificationDetails) {
            console.log('🔍 [FRAME] Found notification details in clientContext.notificationDetails:', clientContext.notificationDetails);
          } else if (clientContext.notifications) {
            console.log('🔍 [FRAME] Found notifications in clientContext.notifications:', clientContext.notifications);
          } else if (clientContext.token) {
            console.log('🔍 [FRAME] Found token in clientContext.token:', clientContext.token);
          } else if (clientContext.url) {
            console.log('🔍 [FRAME] Found url in clientContext.url:', clientContext.url);
          }
        }
      }
    }
  }, [context?.client.added, address, frameAdded, context]);

  const handleAddFrame = useCallback(async () => {
    setIsSavingFrame(true);
    try {
      console.log('🔍 [FRAME] Attempting to add frame...');
      const frameResult = await addFrame();
      console.log('🔍 [FRAME] Frame result:', frameResult);
      
      if (frameResult && address) {
        console.log('🔍 [FRAME] Frame added successfully, storing notification details...');
        console.log('🔍 [FRAME] Token:', frameResult.token);
        console.log('🔍 [FRAME] URL:', frameResult.url);
        
        // Store notification details in Firebase
        try {
          const response = await fetch('/api/notification', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: address,
              token: frameResult.token,
              url: frameResult.url
            })
          });
          
          const result = await response.json();
          if (result.success) {
            console.log('✅ [NOTIFICATION] Stored notification details for user:', address);
          } else {
            console.error('❌ [NOTIFICATION] Failed to store notification details:', result.error);
          }
        } catch (error) {
          console.error('❌ [NOTIFICATION] Failed to store notification details:', error);
        }
        
        setFrameAdded(true);
        setShowSaveFrameModal(false);
      } else if (address) {
        // If frameResult is null but we have an address, the frame might have been added
        // but the notification details aren't available yet. We'll try to store them later.
        console.log('⚠️ [FRAME] Frame result is null, but frame might have been added. Will try to store notification details later.');
        
        // Try to get notification details from the context after a short delay
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
        }, 2000); // Wait 2 seconds for the context to update
        
        setFrameAdded(true);
        setShowSaveFrameModal(false);
      } else {
        console.log('⚠️ [FRAME] Frame result is null or no address:', { frameResult, address });
      }
    } catch (error) {
      console.error('❌ [FRAME] Error saving frame:', error);
    } finally {
      setIsSavingFrame(false);
    }
  }, [addFrame, address, context?.client]);

  const handleCancelSaveFrame = useCallback(() => {
    setShowSaveFrameModal(false);
  }, []);

  const handleSendNotification = async () => {
    try {
      // Check if the frame is added and user has notification permissions
      if (!context?.client.added || !address) {
        console.error('❌ [NOTIFICATION] Frame not added or no address');
        alert('Please add the frame to your mini apps first to enable notifications');
        return;
      }

      console.log('🔔 [NOTIFICATION] Attempting to send notification');
      
      const response = await fetch('/api/notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Test Notification! 🎉',
          body: 'This is a test notification from Base Quest!',
          userId: address
        })
      });
      
      const result = await response.json();
      if (result.success) {
        console.log('✅ [NOTIFICATION] Notification sent successfully:', result);
        setNotificationSent(true);
        setTimeout(() => setNotificationSent(false), 30000);
      } else {
        console.log('⚠️ [NOTIFICATION] Notification skipped:', result.message);
        alert(result.message || 'Failed to send notification');
      }
    } catch (error) {
      console.error('❌ [NOTIFICATION] Failed to send notification:', error);
      alert('Failed to send notification. Please try again.');
    }
  };

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

        {/* Test Notification Button */}
        {context?.client.added && (
          <div className="mt-4 flex flex-col gap-2 items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSendNotification}
              disabled={notificationSent}
              className="text-xs"
            >
              {notificationSent ? "Notification Sent!" : "Send Test Notification"}
            </Button>
            
            {/* Debug button to check notification details */}
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                if (address) {
                  const response = await fetch(`/api/notification?userId=${address}`, {
                    method: 'GET'
                  });
                  const result = await response.json();
                  console.log('🔍 [DEBUG] Notification details for user:', result);
                  alert(result.success ? 'Notification details found!' : 'No notification details found');
                }
              }}
              className="text-xs"
            >
              Debug Notification Details
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
