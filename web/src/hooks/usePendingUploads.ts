import { useState, useEffect, useCallback } from 'react';
import {
  PendingUpload,
  getPendingUploadsForToken,
  savePendingUpload,
  removePendingUpload,
  updatePendingUpload,
  pendingUploadToFile,
} from '../utils/offlineStorage';
import { uploadProofWithProgress, ProofType } from '../services/api';

interface UsePendingUploadsOptions {
  token: string;
  onUploadSuccess?: (proofType: ProofType) => void;
  onUploadError?: (error: Error, proofType: ProofType) => void;
}

interface UsePendingUploadsReturn {
  pendingUploads: PendingUpload[];
  isLoading: boolean;
  isSyncing: boolean;
  saveForLater: (file: File, proofType: ProofType) => Promise<string>;
  syncPendingUploads: () => Promise<void>;
  removePending: (id: string) => Promise<void>;
  hasPending: boolean;
}

/**
 * Hook for managing pending (offline) uploads
 * 오프라인 업로드 대기열 관리 훅
 */
export const usePendingUploads = ({
  token,
  onUploadSuccess,
  onUploadError,
}: UsePendingUploadsOptions): UsePendingUploadsReturn => {
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load pending uploads on mount
  useEffect(() => {
    const loadPending = async () => {
      try {
        const pending = await getPendingUploadsForToken(token);
        setPendingUploads(pending);
      } catch (error) {
        console.error('Failed to load pending uploads:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPending();
  }, [token]);

  // Save a file for later upload
  const saveForLater = useCallback(
    async (file: File, proofType: ProofType): Promise<string> => {
      const id = await savePendingUpload(token, file, proofType);

      // Refresh the list
      const pending = await getPendingUploadsForToken(token);
      setPendingUploads(pending);

      return id;
    },
    [token]
  );

  // Remove a pending upload
  const removePending = useCallback(
    async (id: string): Promise<void> => {
      await removePendingUpload(id);

      // Refresh the list
      const pending = await getPendingUploadsForToken(token);
      setPendingUploads(pending);
    },
    [token]
  );

  // Sync all pending uploads
  const syncPendingUploads = useCallback(async (): Promise<void> => {
    if (isSyncing || pendingUploads.length === 0) return;

    setIsSyncing(true);

    for (const pending of pendingUploads) {
      try {
        const file = pendingUploadToFile(pending);

        await uploadProofWithProgress(token, file, pending.proofType);

        // Success - remove from pending
        await removePendingUpload(pending.id);
        onUploadSuccess?.(pending.proofType);
      } catch (error) {
        // Update retry count
        await updatePendingUpload(pending.id, {
          retryCount: pending.retryCount + 1,
          lastError: (error as Error).message,
        });
        onUploadError?.(error as Error, pending.proofType);
      }
    }

    // Refresh the list
    const remaining = await getPendingUploadsForToken(token);
    setPendingUploads(remaining);
    setIsSyncing(false);
  }, [token, pendingUploads, isSyncing, onUploadSuccess, onUploadError]);

  return {
    pendingUploads,
    isLoading,
    isSyncing,
    saveForLater,
    syncPendingUploads,
    removePending,
    hasPending: pendingUploads.length > 0,
  };
};
