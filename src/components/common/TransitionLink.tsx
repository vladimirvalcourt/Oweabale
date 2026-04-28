import { forwardRef, startTransition, type ComponentPropsWithoutRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export type TransitionLinkProps = ComponentPropsWithoutRef<typeof Link>;

function scrollToHash(hash: string) {
  const id = decodeURIComponent(hash.replace(/^#/, ''));
  if (!id) return false;

  const element = document.getElementById(id);
  if (!element) return false;

  element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  window.history.pushState(null, '', `${window.location.pathname}${window.location.search}#${id}`);
  return true;
}

/**
 * Client navigation wrapped in startTransition so route + lazy chunk work does not
 * block the next paint (INP). Modifier keys and non-primary clicks keep default behavior.
 */
export const TransitionLink = forwardRef<HTMLAnchorElement, TransitionLinkProps>(
  function TransitionLink({ onClick, ...props }, ref) {
    const navigate = useNavigate();

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
      onClick?.(e);
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      if (props.reloadDocument) return;
      if (props.target === '_blank') return;
      if (props.download !== undefined) return;
      
      const to = String(props.to);
      const hashOnly = to.startsWith('#');
      const rootHash = to.startsWith('/#');

      if (hashOnly || rootHash) {
        e.preventDefault();

        const hash = hashOnly ? to : to.slice(1);
        const isSamePage = hashOnly || window.location.pathname === '/';

        if (isSamePage) {
          scrollToHash(hash);
          return;
        }

        startTransition(() => {
          navigate(to);
          window.setTimeout(() => scrollToHash(hash), 0);
          window.setTimeout(() => scrollToHash(hash), 120);
        });
        return;
      }
      
      e.preventDefault();
      startTransition(() => {
        navigate(props.to, {
          replace: props.replace,
          state: props.state,
          relative: props.relative,
          preventScrollReset: props.preventScrollReset,
          viewTransition: props.viewTransition,
        });
        if (!props.preventScrollReset && !to.includes('#')) {
          window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: 'auto' }));
        }
      });
    };

    return <Link ref={ref} {...props} onClick={handleClick} />;
  }
);
