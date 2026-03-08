import { useCallback, useEffect, useState } from 'react';
import { getUser, setUser, updateUserProfile, USER_UPDATE_EVENT_NAME } from '../utils/auth';

export default function useSessionUser() {
  const [user, setUserState] = useState(() => getUser());

  useEffect(() => {
    const syncUser = () => setUserState(getUser());
    const onStorage = (event) => {
      if (!event.key || event.key === 'user') {
        syncUser();
      }
    };

    window.addEventListener(USER_UPDATE_EVENT_NAME, syncUser);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(USER_UPDATE_EVENT_NAME, syncUser);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const replaceUser = useCallback((nextUser) => {
    const normalized = setUser(nextUser || {});
    setUserState(normalized);
    return normalized;
  }, []);

  const patchUser = useCallback((patch) => {
    const normalized = updateUserProfile(patch || {});
    setUserState(normalized);
    return normalized;
  }, []);

  return {
    user,
    setUser: replaceUser,
    updateUser: patchUser,
  };
}
