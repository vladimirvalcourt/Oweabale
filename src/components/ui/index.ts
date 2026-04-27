/**
 * Barrel export for all UI components (shadcn/ui)
 * Design system components exported from this file
 */

// Layout
export { Card, CardHeader, CardContent } from './Card';
export { Badge } from './Badge';
export { Button, buttonVariants } from './Button';
export { Separator } from './Separator';
export { Skeleton } from './Skeleton';
export { Alert, AlertTitle, AlertDescription } from './Alert';

// Animated components
export { BorderRotate } from './animated-gradient-border';
export { Default as GradientDemo } from './animated-gradient-demo';
export {
  SuccessIcon, MenuCloseIcon, PlayPauseIcon, LockUnlockIcon,
  CopiedIcon, NotificationIcon, HeartIcon, DownloadDoneIcon,
  SendIcon, ToggleIcon
} from './animated-state-icons';

// Fluid menu components
export { Menu as FluidMenu, MenuItem, MenuContainer } from './fluid-menu';
export { MenuDemo as FluidMenuDemo } from './fluid-menu-demo';

// SaaS components
export { SAASHero as SaasHero } from './saas-hero';
export { default as SaasLandingTemplate } from './saas-landing-template';

// Icons
export { TactileIcon, MorphingMenuIcon } from './TactileIcon';
