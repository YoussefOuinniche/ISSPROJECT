import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
} from 'react';
import { getJobs } from '../services/api';
import {
  getFavorites,
  removeFavorite,
  saveFavorite,
} from '../utils/favorites';

const PAGE_SIZE = 20;

const initialState = {
  jobs: [],
  loading: false,
  error: null,
  filters: { country: 'global', keyword: '', remote: false },
  page: 0,
  hasMore: true,
  favorites: [],
};

function dedup(jobs) {
  const seen = new Set();
  return jobs.filter((j) => {
    if (seen.has(j.id)) return false;
    seen.add(j.id);
    return true;
  });
}

function reducer(state, action) {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, loading: true, error: null };

    case 'FETCH_JOBS':
      return {
        ...state,
        loading: false,
        jobs: action.reset
          ? action.payload
          : dedup([...state.jobs, ...action.payload]),
        page: action.page,
        hasMore: action.payload.length === PAGE_SIZE,
      };

    case 'LOAD_MORE':
      return { ...state, loading: true };

    case 'SET_FILTERS':
      return {
        ...state,
        filters: { ...state.filters, ...action.payload },
        page: 0,
        jobs: [],
        hasMore: true,
      };

    case 'TOGGLE_FAVORITE': {
      const exists = state.favorites.find((f) => f.id === action.payload.id);
      return {
        ...state,
        favorites: exists
          ? state.favorites.filter((f) => f.id !== action.payload.id)
          : [...state.favorites, action.payload],
      };
    }

    case 'SET_FAVORITES':
      return { ...state, favorites: action.payload };

    case 'SET_ERROR':
      return { ...state, loading: false, error: action.payload };

    default:
      return state;
  }
}

export const JobsContext = createContext(null);

export function JobsProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    getFavorites().then((favs) =>
      dispatch({ type: 'SET_FAVORITES', payload: favs })
    );
  }, []);

  const fetchJobs = useCallback(
    async (reset = false) => {
      const nextPage = reset ? 0 : state.page;
      dispatch({ type: 'FETCH_START' });
      try {
        const params = {
          keyword: state.filters.keyword || undefined,
          country:
            state.filters.country !== 'global'
              ? state.filters.country
              : undefined,
          remote: state.filters.remote || undefined,
          limit: PAGE_SIZE,
          offset: nextPage * PAGE_SIZE,
        };
        const data = await getJobs(params);
        const jobs = Array.isArray(data) ? data : data.jobs ?? [];
        dispatch({ type: 'FETCH_JOBS', payload: jobs, page: nextPage + 1, reset });
      } catch (err) {
        dispatch({ type: 'SET_ERROR', payload: err.message });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.filters, state.page]
  );

  const loadMore = useCallback(() => {
    if (!state.loading && state.hasMore) {
      fetchJobs(false);
    }
  }, [state.loading, state.hasMore, fetchJobs]);

  const setFilters = useCallback((filters) => {
    dispatch({ type: 'SET_FILTERS', payload: filters });
  }, []);

  const toggleFavorite = useCallback(
    async (job) => {
      const isFav = state.favorites.find((f) => f.id === job.id);
      if (isFav) {
        await removeFavorite(job.id);
      } else {
        await saveFavorite(job);
      }
      dispatch({ type: 'TOGGLE_FAVORITE', payload: job });
    },
    [state.favorites]
  );

  return (
    <JobsContext.Provider
      value={{ state, fetchJobs, loadMore, setFilters, toggleFavorite }}
    >
      {children}
    </JobsContext.Provider>
  );
}

export function useJobs() {
  const context = useContext(JobsContext);
  if (!context) throw new Error('useJobs must be used within JobsProvider');
  return context;
}

export function useFetchJobs() {
  const { state, fetchJobs, loadMore } = useJobs();
  return { ...state, fetchJobs, loadMore };
}
