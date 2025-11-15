"use client";

import { useState } from "react";
import { AlertCircle, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: () => Promise<void>;
  isLoading?: boolean;
}

export default function DeleteAccountModal({
  isOpen,
  onClose,
  onConfirmDelete,
  isLoading = false,
}: DeleteAccountModalProps) {
  const [step, setStep] = useState<"warning" | "confirm">("warning");
  const [confirmationText, setConfirmationText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleInitialWarning = () => {
    setStep("confirm");
  };

  const handleConfirmDelete = async () => {
    setIsProcessing(true);
    try {
      await onConfirmDelete();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setStep("warning");
    setConfirmationText("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-md border-neutral-700 bg-neutral-900 p-6 shadow-2xl">
        {step === "warning" && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-red-900/30 p-2">
                <AlertCircle className="h-6 w-6 text-red-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-neutral-100">
                  Delete Account?
                </h2>
                <p className="mt-1 text-sm text-neutral-400">
                  This action cannot be undone
                </p>
              </div>
            </div>

            <div className="space-y-2 rounded-lg bg-red-900/20 p-4">
              <p className="text-sm font-semibold text-red-200">
                If you delete your account:
              </p>
              <ul className="space-y-1 text-sm text-red-100/80">
                <li>✗ Your profile will be permanently deleted</li>
                <li>✗ All your events will be removed</li>
                <li>✗ All your followers/following will be cleared</li>
                <li>✗ You won't be able to recover your data</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleClose}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleInitialWarning}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-red-900/30 p-2">
                <Trash2 className="h-6 w-6 text-red-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-neutral-100">
                  Confirm Deletion
                </h2>
                <p className="mt-1 text-sm text-neutral-400">
                  This is your last chance to cancel
                </p>
              </div>
            </div>

            <div className="space-y-3 rounded-lg bg-neutral-800/50 p-4">
              <p className="text-sm text-neutral-300">
                Type <span className="font-mono font-bold text-red-300">DELETE</span> below to confirm you want to permanently delete your account:
              </p>
              <input
                type="text"
                placeholder="Type DELETE to confirm"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value.toUpperCase())}
                className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2 text-neutral-100 placeholder-neutral-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                maxLength={6}
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setStep("warning")}
                variant="outline"
                className="flex-1"
                disabled={isProcessing || isLoading}
              >
                Go Back
              </Button>
              <Button
                onClick={handleConfirmDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50"
                disabled={
                  isProcessing ||
                  isLoading ||
                  confirmationText !== "DELETE"
                }
              >
                {isProcessing || isLoading ? "Deleting..." : "Delete Account"}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
