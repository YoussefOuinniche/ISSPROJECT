import { useEffect, useState } from 'react';
import { fetchAIProfile, AIProfileData } from '@/lib/api/profileApi';

// Global cache to share state between screens and prevent unnecessary rerenders
type AIProfile = AIProfileData['ai_profile'] | null;
type AISummary = AIProfileData['ai_summary'] | null;
type ExplicitProfile = AIProfileData['explicit_profile'] | null;

let globalProfile: AIProfile = null;
let globalSummary: AISummary = null;
let globalExplicitProfile: ExplicitProfile = null;
let globalLoading = false;
let globalError: string | null = null;
let isFirstFetch = true;

type Listener = () => void;
const listeners = new Set<Listener>();

const notify = () => {
  listeners.forEach((listener) => listener());
};

/**
 * Globally triggers a refresh of the AI Profile.
 * Useful for updating across the entire app unconditionally, e.g. after an AI Chat action.
 */
export const refreshProfile = async () => {
  globalLoading = true;
  globalError = null;
  notify();

  try {
    const res = await fetchAIProfile();
    globalProfile = res.ai_profile || null;
    globalSummary = res.ai_summary || null;
    globalExplicitProfile = res.explicit_profile || null;
  } catch (err: unknown) {
    console.error('Failed to load profile insights:', err);
    globalError = 'Failed to load profile insights.';
  } finally {
    globalLoading = false;
    isFirstFetch = false;
    notify();
  }
};

/**
 * Reusable hook keeping the mobile UI synchronized with the AI-generated user profile.
 * 
 * Features:
 * - Syncs across screens (Chat -> Dashboard).
 * - Prevents duplicate fetching.
 * - Auto-fetches on initial mount if empty.
 */
export function useAIProfile() {
  const [state, setState] = useState({
    profile: globalProfile,
    summary: globalSummary,
    explicitProfile: globalExplicitProfile,
    loading: globalLoading,
    error: globalError,
  });

  useEffect(() => {
    const handleStoreChange = () => {
      setState({
        profile: globalProfile,
        summary: globalSummary,
        explicitProfile: globalExplicitProfile,
        loading: globalLoading,
        error: globalError,
      });
    };

    listeners.add(handleStoreChange);

    // Initial mount auto-fetch if no data and not already loading/fetching
    if (isFirstFetch && !globalLoading && !globalProfile) {
      isFirstFetch = false;
      refreshProfile();
    }

    return () => {
      listeners.delete(handleStoreChange);
    };
  }, []);

  return {
    profile: state.profile,
    summary: state.summary,
    explicitProfile: state.explicitProfile,
    loading: state.loading,
    error: state.error,
    refreshProfile,
  };
}
