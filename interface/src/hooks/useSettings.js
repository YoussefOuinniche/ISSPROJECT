import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  useChangePasswordAuth,
  useGetAdminAccount,
  useGetAdminSettings,
  useRecomputeUserProfileAnalysis,
  useUpdateAdminAccount,
  useUpdateAdminSettings,
} from '../../../Skill-Pulse-1/lib/api-client-react/src/index.ts';
import { ensureGeneratedClientConfigured } from '../api/generatedClientConfig';

ensureGeneratedClientConfigured();

const SETTINGS_KEY = ['settings'];

export function useSettings() {
  const queryClient = useQueryClient();

  const settingsQuery = useGetAdminSettings({
    query: {
      queryKey: SETTINGS_KEY,
      retry: 1,
      staleTime: 1000 * 30,
      select: (response) => response?.data || {},
    },
  });

  const accountQuery = useGetAdminAccount({
    query: {
      queryKey: ['admin-account'],
      retry: 1,
      staleTime: 1000 * 30,
      select: (response) => response?.data || null,
    },
  });

  const updateAdminRaw = useUpdateAdminAccount();
  const updateAdminMutation = useMutation({
    mutationFn: (patch) => updateAdminRaw.mutateAsync({ data: patch }),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: SETTINGS_KEY });
      const previous = queryClient.getQueryData(SETTINGS_KEY);
      queryClient.setQueryData(SETTINGS_KEY, (old) => ({
        ...old,
        currentUser: {
          ...(old?.currentUser || {}),
          ...patch,
        },
      }));
      return { previous };
    },
    onError: (_error, _patch, context) => {
      if (context?.previous) queryClient.setQueryData(SETTINGS_KEY, context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: SETTINGS_KEY });
      queryClient.invalidateQueries({ queryKey: ['admin-account'] });
    },
  });

  const updateAdminSettingsRaw = useUpdateAdminSettings();
  const updateProfileMutation = useMutation({
    mutationFn: (currentProfile) => updateAdminSettingsRaw.mutateAsync({ data: { currentProfile } }),
    onMutate: async (currentProfile) => {
      await queryClient.cancelQueries({ queryKey: SETTINGS_KEY });
      const previous = queryClient.getQueryData(SETTINGS_KEY);
      queryClient.setQueryData(SETTINGS_KEY, (old) => ({
        ...old,
        currentProfile: {
          ...(old?.currentProfile || {}),
          ...currentProfile,
        },
      }));
      return { previous };
    },
    onError: (_error, _patch, context) => {
      if (context?.previous) queryClient.setQueryData(SETTINGS_KEY, context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: SETTINGS_KEY });
    },
  });

  const changePasswordRaw = useChangePasswordAuth();
  const changePasswordMutation = useMutation({
    mutationFn: (payload) =>
      changePasswordRaw.mutateAsync({
        data: {
          currentPassword: payload.currentPassword,
          newPassword: payload.newPassword,
        },
      }),
  });

  const recomputeRaw = useRecomputeUserProfileAnalysis();
  const recomputeMutation = useMutation({
    mutationFn: () => recomputeRaw.mutateAsync({ data: {} }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SETTINGS_KEY });
    },
  });

  const mergedData = {
    ...(settingsQuery.data || {}),
    currentUser: accountQuery.data || settingsQuery.data?.currentUser || null,
  };

  return {
    ...settingsQuery,
    data: mergedData,
    isLoading: settingsQuery.isLoading || accountQuery.isLoading,
    isRefetching: settingsQuery.isRefetching || accountQuery.isRefetching,
    error: settingsQuery.error || accountQuery.error,
    refresh: () => Promise.all([settingsQuery.refetch(), accountQuery.refetch()]),
    updateAdmin: updateAdminMutation,
    updateProfile: updateProfileMutation,
    changePassword: changePasswordMutation,
    recompute: recomputeMutation,
  };
}

export default useSettings;
