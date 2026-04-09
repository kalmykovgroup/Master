import {useCallback, useEffect, useRef, useState} from 'react';

interface QueryState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useSupabaseQuery<T>(
  queryFn: () => Promise<{data: T | null; error: {message: string} | null}>,
  deps: unknown[] = [],
) {
  const [state, setState] = useState<QueryState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  // Keep queryFn in a ref so refetch is always stable
  const queryFnRef = useRef(queryFn);
  queryFnRef.current = queryFn;

  const refetch = useCallback(async () => {
    setState(prev => ({...prev, loading: true, error: null}));
    const {data, error} = await queryFnRef.current();
    setState({
      data,
      loading: false,
      error: error?.message ?? null,
    });
  }, []);

  // Re-execute when deps change
  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return {...state, refetch};
}
