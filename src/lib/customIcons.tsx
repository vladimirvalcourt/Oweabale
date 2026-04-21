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
  transactions: SkillsIcon as IconComponent,
  filters: McpIcon as IconComponent,
  budget: ProviderIcon as IconComponent,
  income: ThinkIcon as IconComponent,
  subscriptions: RailSymbolIcon as IconComponent,
  overview: McpIcon as IconComponent,
  chart: ThinkIcon as IconComponent,
  security: TreeUpDownRightIcon as IconComponent,
  support: SkillsIcon as IconComponent,
  billing: ProviderIcon as IconComponent,
  calendar: RailSymbolIcon as IconComponent,
  education: ThinkIcon as IconComponent,
  goals: ThinkIcon as IconComponent,
  taxes: ProviderIcon as IconComponent,
  categories: SkillsIcon as IconComponent,
};

export type CustomIconName = keyof typeof customIcons;

export function getCustomIcon(name: CustomIconName): IconComponent {
  return customIcons[name];
}
