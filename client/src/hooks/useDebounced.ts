import { useEffect, useState } from "react";

/** O valor só muda depois de `ms` sem mudar: busca não dispara a cada letra. */
export function useDebounced(value: string, ms: number): string {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
