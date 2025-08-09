"use client";

import { useComposeCast } from "@coinbase/onchainkit/minikit";
import { useState } from "react";
import { Button } from "./Button";
import { Icon } from "./Icon";

interface ShareButtonProps {
  questId: string;
  shareContent: string;
  onShareComplete?: () => void;
  disabled?: boolean;
}

export function ShareButton({ questId, shareContent, onShareComplete, disabled }: ShareButtonProps) {
  const [isSharing, setIsSharing] = useState(false);
  const { openCastComposer } = useComposeCast();

  const handleShare = async () => {
    try {
      setIsSharing(true);
      
      // Open the cast composer with pre-filled content
      await openCastComposer({
        text: shareContent,
        // Optional: You can add embeds like URLs, images, etc.
        embeds: [
          {
            url: process.env.NEXT_PUBLIC_URL || 'https://basequest.app'
          }
        ]
      });

      // Note: We can't directly detect if the user actually published the cast
      // This would typically require server-side verification via Farcaster API
      // For now, we'll trigger completion when the composer is opened
      
      // Call completion callback after a short delay to allow composer to open
      setTimeout(() => {
        onShareComplete?.();
        setIsSharing(false);
      }, 1000);

    } catch (error) {
      console.error('Error opening cast composer:', error);
      setIsSharing(false);
    }
  };

  return (
    <Button
      variant="primary"
      size="sm"
      onClick={handleShare}
      disabled={disabled || isSharing}
    >
      {isSharing ? "Opening..." : "Share"}
    </Button>
  );
}