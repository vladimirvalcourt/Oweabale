import React from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { cn } from '../../lib/utils';

export type AppIcon = React.ComponentType<{
  size?: number | string;
  className?: string;
  strokeWidth?: number | string;
}>;

interface TactileIconProps {
  icon: AppIcon;
  className?: string;
  iconClassName?: string;
  size?: number;
  active?: boolean;
  /** Skip motion springs / whileTap — use in dense lists (e.g. sidebar) to protect INP. */
  variant?: 'interactive' | 'static';
}

function TactileIconStatic({
  icon: Icon,
  className,
  iconClassName,
  size = 18,
  active = false,
}: Omit<TactileIconProps, 'variant'>) {
  return (
    <span className={cn('relative inline-flex shrink-0 items-center justify-center', className)} aria-hidden>
      <Icon
        size={size}
        strokeWidth={1.5}
        className={cn(
          'transition-colors duration-300',
          active ? 'text-content-primary' : 'text-content-tertiary group-hover:text-content-primary',
          iconClassName
        )}
      />
    </span>
  );
}

/** Interactive variant only — hooks run unconditionally in this subtree. */
function TactileIconInteractive({
  icon: Icon,
  className,
  iconClassName,
  size = 18,
  active = false,
}: Omit<TactileIconProps, 'variant'>) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseX = useSpring(x, { stiffness: 150, damping: 20 });
  const mouseY = useSpring(y, { stiffness: 150, damping: 20 });

  const rotateX = useTransform(mouseY, [-0.5, 0.5], [15, -15]);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], [-15, 15]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseXPos = e.clientX - rect.left;
    const mouseYPos = e.clientY - rect.top;

    x.set(mouseXPos / width - 0.5);
    y.set(mouseYPos / height - 0.5);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
      }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      className={cn('relative flex items-center justify-center transition-colors duration-300', className)}
    >
      <motion.div
        style={{
          transformStyle: 'preserve-3d',
          translateZ: 10,
        }}
      >
        <Icon
          size={size}
          strokeWidth={1.5}
          className={cn(
            'transition-colors duration-300',
            active ? 'text-content-primary' : 'text-content-tertiary group-hover:text-content-primary',
            iconClassName
          )}
        />
      </motion.div>

      <motion.div
        className="absolute inset-0 rounded-full bg-content-primary/10 opacity-0 blur-md transition-opacity duration-300 group-hover:opacity-100"
        style={{ translateZ: -5 }}
      />
    </motion.div>
  );
}

/**
 * A high-end icon wrapper that provides an organic 3D tilt effect
 * and fluid scaling on hover.
 */
export const TactileIcon: React.FC<TactileIconProps> = ({
  variant = 'interactive',
  ...rest
}) => {
  if (variant === 'static') {
    return <TactileIconStatic {...rest} />;
  }
  return <TactileIconInteractive {...rest} />;
};

interface MorphingMenuIconProps {
  isOpen: boolean;
  className?: string;
  color?: string;
}

/**
 * A custom SVG component that morphs between a 3-line menu
 * and an 'X' close button using Framer Motion.
 */
export const MorphingMenuIcon: React.FC<MorphingMenuIconProps> = ({
  isOpen,
  className,
  color = 'currentColor',
}) => {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={cn('overflow-visible', className)}>
      <motion.line
        x1="2"
        y1="5"
        x2="18"
        y2="5"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        animate={{
          x1: isOpen ? 4 : 2,
          y1: isOpen ? 4 : 5,
          x2: isOpen ? 16 : 18,
          y2: isOpen ? 16 : 5,
        }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      />

      <motion.line
        x1="2"
        y1="10"
        x2="18"
        y2="10"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        animate={{
          opacity: isOpen ? 0 : 1,
          x1: isOpen ? 10 : 2,
          x2: isOpen ? 10 : 18,
        }}
        transition={{ duration: 0.2 }}
      />

      <motion.line
        x1="2"
        y1="15"
        x2="18"
        y2="15"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        animate={{
          x1: isOpen ? 4 : 2,
          y1: isOpen ? 16 : 15,
          x2: isOpen ? 16 : 4,
          y2: isOpen ? 4 : 15,
        }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      />
    </svg>
  );
};
