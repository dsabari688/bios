/**
 * conversationState.ts
 *
 * In-memory store for per-conversation slot-filling state with TTL.
 * Lives for the lifetime of the backend process.
 */

export interface SlotSpec {
  key: string;
  question: string;
  /** Optional transform applied to the raw user answer before storing */
  transform?: (raw: string, collectedArgs: Record<string, string>) => string | null;
}

export interface PendingAction {
  tool: string;
  collectedArgs: Record<string, string>;
  remainingSlots: SlotSpec[];
  /** The last question Piggy asked (used to detect confirmation "yes/no") */
  lastQuestion?: string;
  /** If true, the last question was a confirmation (expecting yes/no) */
  awaitingConfirmation?: boolean;
  /** Timestamp when state was created/updated */
  updatedAt?: number;
}

interface ConversationState {
  pendingAction: PendingAction | null;
}

const STATE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const store = new Map<string, ConversationState>();

export const conversationState = {
  get(conversationId: string): ConversationState {
    const state = store.get(conversationId);
    if (!state || !state.pendingAction) {
      return { pendingAction: null };
    }

    // TTL Check: clear state if inactive for > 30 mins
    const updatedAt = state.pendingAction.updatedAt ?? 0;
    if (Date.now() - updatedAt > STATE_TTL_MS) {
      console.log(`[PIGGY][STATE] Expired pending action for conversation ${conversationId}`);
      store.delete(conversationId);
      return { pendingAction: null };
    }

    return state;
  },

  setPendingAction(conversationId: string, action: PendingAction | null): void {
    if (!action) {
      store.delete(conversationId);
      return;
    }
    const actionWithTime: PendingAction = {
      ...action,
      updatedAt: Date.now(),
    };
    store.set(conversationId, { pendingAction: actionWithTime });
  },

  clearPendingAction(conversationId: string): void {
    store.delete(conversationId);
  },

  hasPendingAction(conversationId: string): boolean {
    return Boolean(this.get(conversationId).pendingAction);
  },

  clear(conversationId: string): void {
    store.delete(conversationId);
  },
};
