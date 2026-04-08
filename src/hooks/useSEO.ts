import { useEffect } from 'react';

interface SEOOptions {
  title: string;
  description: string;
  canonical: string;
  ogTitle?: string;
  ogDescription?: string;
}

export function useSEO({ title, description, canonical, ogTitle, ogDescription }: SEOOptions) {
  useEffect(() => {
    document.title = title;

    // Canonical
    let canonicalEl = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.rel = 'canonical';
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.href = canonical;

    // Meta description
    let descEl = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (descEl) descEl.content = description;

    // OG URL
    let ogUrlEl = document.querySelector<HTMLMetaElement>('meta[property="og:url"]');
    if (ogUrlEl) ogUrlEl.content = canonical;

    // OG title
    let ogTitleEl = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
    if (ogTitleEl) ogTitleEl.content = ogTitle ?? title;

    // OG description
    let ogDescEl = document.querySelector<HTMLMetaElement>('meta[property="og:description"]');
    if (ogDescEl) ogDescEl.content = ogDescription ?? description;
  }, [title, description, canonical, ogTitle, ogDescription]);
}
