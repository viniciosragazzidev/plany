"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import OnboardingForm from "./onboarding-form";

interface CreateBenchDialogProps {
  trigger: React.ReactElement;
}

export function CreateBenchDialog({ trigger }: CreateBenchDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="sr-only">
          <DialogTitle>Nova Bancada de Estudo</DialogTitle>
        </DialogHeader>
        <OnboardingForm 
            mode="bench-only" 
            onSuccess={() => setOpen(false)} 
        />
      </DialogContent>
    </Dialog>
  );
}
