import type { ComponentType, SVGProps } from 'react';
import {
  McpIcon,
  ProviderIcon,
  RailSymbolIcon,
  ShapesUploadIcon,
  SkillsIcon,
  ThinkIcon,
  TreeUpDownRightIcon,
} from '@lobehub/ui/icons';

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

export const customIcons = {
  nlp: ThinkIcon as IconComponent,
  upload: ShapesUploadIcon as IconComponent,
  smart: McpIcon as IconComponent,
  recurring: ProviderIcon as IconComponent,
  debt: TreeUpDownRightIcon as IconComponent,
  ticket: RailSymbolIcon as IconComponent,
  payments: SkillsIcon as IconComponent,
  planning: McpIcon as IconComponent,
};

export type CustomIconName = keyof typeof customIcons;

export function getCustomIcon(name: CustomIconName): IconComponent {
  return customIcons[name];
}
