import { useEffect, useMemo, type DependencyList } from 'react';

const SCRIPT_PREFIX = 'ow-jsonld-';

/**
 * Injects JSON-LD into document head for the current SPA route; removes on unmount or when payload changes.
 */
export function useJsonLd(id: string, factory: () => object, deps: DependencyList) {
  const serialized = useMemo(
    () => JSON.stringify(factory()),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps are provided explicitly by each page
    deps
  );

  useEffect(() => {
    const fullId = SCRIPT_PREFIX + id;
    document.getElementById(fullId)?.remove();

    const script = document.createElement('script');
    script.id = fullId;
    script.type = 'application/ld+json';
    script.dataset.owSpa = 'true';
    script.textContent = serialized;
    document.head.appendChild(script);

    return () => {
      document.getElementById(fullId)?.remove();
    };
  }, [id, serialized]);
}
