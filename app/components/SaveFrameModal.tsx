"use client";

import { Button } from "./Button";
import { Icon } from "./Icon";

interface SaveFrameModalProps {
  isOpen: boolean;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
}

export function SaveFrameModal({ isOpen, onSave, onCancel, isSaving }: SaveFrameModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--app-card-bg)] backdrop-blur-md rounded-xl border border-[var(--app-card-border)] p-6 max-w-sm w-full">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-[var(--app-accent)]/10 rounded-lg">
            <Icon name="plus" size="md" className="text-[var(--app-accent)]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[var(--app-foreground)]">
              Save Base Quest Frame
            </h3>
            <p className="text-sm text-[var(--app-foreground-muted)]">
              To quickly access the Base Quest Mini app
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="mb-6">
          <p className="text-sm text-[var(--app-foreground-muted)] leading-relaxed">
            Save this frame to your Farcaster profile for easy access to Base Quest. 
            You&apos;ll be able to quickly return to track your quests, earn rewards, and compete on the leaderboard.
          </p>
        </div>

        {/* Actions */}
        <div className="flex space-x-3">
          <Button
            variant="ghost"
            size="md"
            onClick={onCancel}
            className="flex-1"
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={onSave}
            disabled={isSaving}
            className="flex-1"
          >
            {isSaving ? (
              <>
                <Icon name="refresh" size="sm" className="animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Icon name="plus" size="sm" className="mr-2" />
                Save Frame
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
} 