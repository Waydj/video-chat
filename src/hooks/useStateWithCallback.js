import { useCallback, useEffect, useRef, useState } from "react";

export const useStateWithCallback = (initial) => {
  const [state, setState] = useState(initial);
  const cbRef = useRef(null);

  const updateState = useCallback((newState, cb) => {
    cbRef.current = cb;

    setState((prev) =>
      typeof newState === "function" ? newState(prev) : newState
    );
  }, []);

  useEffect(() => {
    if (cbRef.current) {
      cbRef.current(state);
      cbRef.current = null;
    }
  }, [state]);

  return [state, updateState];
};
