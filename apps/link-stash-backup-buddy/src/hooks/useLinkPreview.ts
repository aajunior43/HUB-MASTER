
import { useState, useCallback } from 'react';

export interface LinkPreview {
  id: string;
  url: string;
  loading: boolean;
  error?: string;
}

export const useLinkPreview = () => {
  const [previews, setPreviews] = useState<LinkPreview[]>([]);

  const fetchPreview = useCallback(async (linkId: string, url: string) => {
    // Função vazia - prévias desabilitadas
  }, []);

  const getPreviewByLinkId = useCallback((linkId: string): LinkPreview | undefined => {
    return undefined;
  }, []);

  const refreshPreview = useCallback((linkId: string, url: string) => {
    // Função vazia - prévias desabilitadas
  }, []);

  return {
    previews,
    fetchPreview,
    getPreviewByLinkId,
    refreshPreview,
  };
};
