"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { ReactNode, ReactElement } from "react"

interface ConfirmDialogProps {
  trigger?: ReactElement
  title: string
  description: string
  onConfirm: () => void
  confirmText?: string
  cancelText?: string
  variant?: "default" | "destructive"
  nativeButton?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ConfirmDialog({
  trigger,
  title,
  description,
  onConfirm,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "default",
  nativeButton = false,
  open,
  onOpenChange,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {trigger && <AlertDialogTrigger render={trigger} nativeButton={nativeButton} />}
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelText}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} variant={variant}>
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
