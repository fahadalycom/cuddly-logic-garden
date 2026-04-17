import { useCallback, useRef, useState } from "react";

/**
 * Prevents rapid double-submission of an async action.
 * Returns [submitting, run] where `run` ignores invocations while a previous
 * call is still in-flight. Use for create/update buttons that hit the API.
 */
export function useSubmitGuard() {
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);

  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    if (inFlight.current) return undefined;
    inFlight.current = true;
    setSubmitting(true);
    try {
      return await fn();
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }, []);

  return { submitting, run };
}
