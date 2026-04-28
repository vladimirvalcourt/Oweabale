import { forwardRef, startTransition, type ComponentPropsWithoutRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export type TransitionLinkProps = ComponentPropsWithoutRef<typeof Link>;

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
      
      // Allow default browser behavior for anchor/hash links (e.g., #flow, #why)
      const to = String(props.to);
      if (to.startsWith('#')) {
        // For anchor links on the same page, let the browser handle scrolling
        // The CSS scroll-behavior: smooth will provide smooth scrolling
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
      });
    };

    return <Link ref={ref} {...props} onClick={handleClick} />;
  }
);
