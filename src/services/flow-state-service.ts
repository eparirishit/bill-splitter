/**
 * Client service for cross-device flow state (resume where you left off).
 */

export interface FlowStateSnapshot {
  flow: string;
  currentStep: number;
  billData: Record<string, any> | null;
  previewImageUrl: string | null;
  updatedAt: string;
  billId?: string;
  isLastActive?: boolean;
  storeName?: string;
  totalAmount?: number;
}

export async function getFlowState(userId: string): Promise<FlowStateSnapshot | null> {
  const res = await fetch(`/api/user/flow-state?userId=${encodeURIComponent(userId)}&type=last`);
  if (!res.ok) return null;
  const json = await res.json();
  return json.data ?? null;
}

export async function getAllDrafts(userId: string): Promise<FlowStateSnapshot[]> {
  const res = await fetch(`/api/user/flow-state?userId=${encodeURIComponent(userId)}&type=all`);
  if (!res.ok) return [];
  const json = await res.json();
  return json.data || [];
}

export async function saveFlowState(
  userId: string,
  payload: {
    flow: string;
    currentStep: number;
    billData: Record<string, any> | null;
    previewImageUrl?: string | null;
  }
): Promise<boolean> {
  const res = await fetch('/api/user/flow-state', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      flow: payload.flow,
      currentStep: payload.currentStep,
      billData: payload.billData,
      previewImageUrl: payload.previewImageUrl ?? null,
    }),
  });
  return res.ok;
}
