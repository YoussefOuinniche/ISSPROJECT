import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteUser, getUsers, updateUser } from '../api/settings';

export function useUsers({ query, role, page, pageSize = 8 }) {
  return useQuery({
    queryKey: ['users', query, role, page, pageSize],
    queryFn: () => getUsers({ query, role, page, pageSize }),
    retry: 1,
    staleTime: 1000 * 20,
    keepPreviousData: true,
  });
}

export function useUserActions() {
  const queryClient = useQueryClient();

  const update = useMutation({
    mutationFn: updateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  const remove = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  return { update, remove };
}

export default useUsers;
