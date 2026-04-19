import { cn } from '../lib/utils';

type BrandWordmarkProps = {
  className?: string;
  textClassName?: string;
  logoClassName?: string;
  hideText?: boolean;
};

export function BrandWordmark({
  className,
  textClassName,
  logoClassName,
  hideText = false,
}: BrandWordmarkProps) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <img
        src="/brand/oweable-logo-glyph.png"
        alt="Oweable logo"
        className={cn('h-5 w-5 rounded-sm object-contain', logoClassName)}
        loading="eager"
      />
      {!hideText && <span className={cn('brand-header-text whitespace-nowrap', textClassName)}>Oweable</span>}
    </span>
  );
}
