export const CARD_STYLES = {
  modern: "card-modern border rounded-lg overflow-hidden bg-card shadow-sm",
  compact: "border rounded-md bg-card p-3",
  elevated: "border rounded-lg bg-card shadow-md p-4",
  flat: "border-0 bg-card p-4",
} as const;

export const BUTTON_STYLES = {
  primary: "hover:bg-primary/10 hover:text-primary",
  secondary: "hover:bg-secondary/10 hover:text-secondary",
  outline: "border border-border hover:bg-muted/50",
  ghost: "hover:bg-muted/50",
  destructive: "hover:bg-destructive/10 hover:text-destructive",
} as const;

export const ALERT_STYLES = {
  info: "border-blue-500/50 bg-blue-500/10 text-blue-700 dark:text-blue-400",
  success: "border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400",
  warning: "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  error: "border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400",
  ai: "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  discrepancy: "border-orange-500/50 bg-orange-500/10 text-orange-700 dark:text-orange-400",
} as const;

export const SPACING = {
  xs: "space-y-1",
  sm: "space-y-2",
  md: "space-y-4",
  lg: "space-y-6",
  xl: "space-y-8",
} as const;

export const PADDING = {
  xs: "p-1",
  sm: "p-2",
  md: "p-3",
  lg: "p-4",
  xl: "p-6",
} as const;

export function getCardStyle(variant: keyof typeof CARD_STYLES): string {
  return CARD_STYLES[variant];
}

export function getButtonStyle(variant: keyof typeof BUTTON_STYLES): string {
  return BUTTON_STYLES[variant];
}

export function getAlertStyle(variant: keyof typeof ALERT_STYLES): string {
  return ALERT_STYLES[variant];
}
