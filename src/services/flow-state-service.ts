/**
 * Client service for cross-device flow state (resume where you left off).
 * userId is derived server-side from the session cookie — no need to pass it.
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

export async function getFlowState(): Promise<FlowStateSnapshot | null> {
  const res = await fetch(`/api/user/flow-state?type=last`);
  if (!res.ok) return null;
  const json = await res.json();
  return json.data ?? null;
}

export async function getAllDrafts(): Promise<FlowStateSnapshot[]> {
  const res = await fetch(`/api/user/flow-state?type=all`);
  if (!res.ok) return [];
  const json = await res.json();
  return json.data || [];
}

export async function saveFlowState(
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
      flow: payload.flow,
      currentStep: payload.currentStep,
      billData: payload.billData,
      previewImageUrl: payload.previewImageUrl ?? null,
    }),
  });
  return res.ok;
}

export async function deleteFlowState(billId: string): Promise<boolean> {
  const res = await fetch(`/api/user/flow-state?billId=${encodeURIComponent(billId)}`, {
    method: 'DELETE',
  });
  return res.ok;
}
