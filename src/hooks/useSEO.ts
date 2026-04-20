import { useEffect } from 'react';

interface SEOOptions {
  title: string;
  description: string;
  canonical: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
}

function setMetaByName(name: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.name = name;
    document.head.appendChild(el);
  }
  el.content = content;
}

function setMetaByProperty(property: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    document.head.appendChild(el);
  }
  el.content = content;
}

export function useSEO({ title, description, canonical, ogTitle, ogDescription, ogImage }: SEOOptions) {
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

    // Meta description (create if missing — SPA navigations after first paint)
    setMetaByName('description', description);

    // Stable publisher + locale for aggregators / AI overviews
    setMetaByName('publisher', 'Oweable');
    setMetaByProperty('og:locale', 'en_US');

    // OG URL
    setMetaByProperty('og:url', canonical);

    // OG title
    setMetaByProperty('og:title', ogTitle ?? title);

    // OG description
    setMetaByProperty('og:description', ogDescription ?? description);

    // OG image
    if (ogImage) {
      setMetaByProperty('og:image', ogImage);
      setMetaByName('twitter:image', ogImage);
    }

    // Twitter (card + text mirrors OG for AI/social previews)
    setMetaByName('twitter:card', 'summary_large_image');
    setMetaByName('twitter:title', ogTitle ?? title);
    setMetaByName('twitter:description', ogDescription ?? description);
  }, [title, description, canonical, ogTitle, ogDescription, ogImage]);
}
