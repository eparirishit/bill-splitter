"use client"

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  const getIcon = (variant?: string) => {
    switch (variant) {
      case "warning":
        return <i className="fas fa-wand-magic-sparkles text-xs"></i>
      case "destructive":
        return <i className="fas fa-exclamation-circle text-xs"></i>
      default:
        return <i className="fas fa-info-circle text-xs"></i>
    }
  }

  const getIconContainerClass = (variant?: string) => {
    switch (variant) {
      case "warning":
        return "w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 shrink-0"
      case "destructive":
        return "w-8 h-8 rounded-full bg-red-100 dark:bg-red-600/90 flex items-center justify-center text-red-600 dark:text-white shrink-0"
      default:
        return "w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 shrink-0"
    }
  }

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        return (
          <Toast key={id} variant={variant} {...props}>
            <div className={getIconContainerClass(variant)}>
              {getIcon(variant)}
            </div>
            <div className="flex-1 min-w-0">
              {title && <ToastTitle variant={variant}>{title}</ToastTitle>}
              {description && (
                <ToastDescription variant={variant}>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
