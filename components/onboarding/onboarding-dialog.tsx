"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import OnboardingForm from "./onboarding-form";

interface OnboardingDialogProps {
  forceOpen?: boolean;
}

export function OnboardingDialog({ forceOpen = false }: OnboardingDialogProps) {
  const [open, setOpen] = useState(forceOpen);

  return (
    <Dialog 
        open={open} 
        onOpenChange={(val) => {
            if (forceOpen) return; // Prevent closing if forced
            setOpen(val);
        }}
    >
      <DialogContent 
        className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
        showCloseButton={!forceOpen}
        onPointerDownOutside={(e) => {
            if (forceOpen) e.preventDefault(); // Prevent closing on outside click
        }}
        onEscapeKeyDown={(e) => {
            if (forceOpen) e.preventDefault(); // Prevent closing on escape
        }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Onboarding BrainBench AI</DialogTitle>
        </DialogHeader>
        <OnboardingForm 
            mode="onboarding" 
            onSuccess={() => setOpen(false)} 
        />
      </DialogContent>
    </Dialog>
  );
}
