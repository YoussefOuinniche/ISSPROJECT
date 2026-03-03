import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  changePassword,
  getSettings,
  runAnalysis,
  updateAdminAccount,
  updateSettings,
} from '../api/settings';

const SETTINGS_KEY = ['settings'];

export function useSettings() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: getSettings,
    retry: 1,
    staleTime: 1000 * 30,
  });

  const updateAdminMutation = useMutation({
    mutationFn: updateAdminAccount,
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
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (currentProfile) => updateSettings({ currentProfile }),
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

  const changePasswordMutation = useMutation({
    mutationFn: changePassword,
  });

  const recomputeMutation = useMutation({
    mutationFn: runAnalysis,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SETTINGS_KEY });
    },
  });

  return {
    ...query,
    refresh: () => query.refetch(),
    updateAdmin: updateAdminMutation,
    updateProfile: updateProfileMutation,
    changePassword: changePasswordMutation,
    recompute: recomputeMutation,
  };
}

export default useSettings;
