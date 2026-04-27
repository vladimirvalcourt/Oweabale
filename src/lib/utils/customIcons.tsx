import type { ComponentType, SVGProps } from 'react';
import {
  Brain,
  Upload,
  Cpu,
  Repeat,
  GitFork,
  Train,
  CreditCard,
  BarChart3,
  SlidersHorizontal,
  PieChart,
  DollarSign,
  RefreshCw,
  Eye,
  LineChart,
  Shield,
  HelpCircle,
  Receipt,
  CalendarDays,
  GraduationCap,
  Target,
  Landmark,
  Tag,
} from 'lucide-react';

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

export const customIcons = {
  nlp:           Brain as IconComponent,
  upload:        Upload as IconComponent,
  smart:         Cpu as IconComponent,
  recurring:     Repeat as IconComponent,
  debt:          GitFork as IconComponent,
  ticket:        Train as IconComponent,
  payments:      CreditCard as IconComponent,
  planning:      BarChart3 as IconComponent,
  transactions:  SlidersHorizontal as IconComponent,
  filters:       SlidersHorizontal as IconComponent,
  budget:        PieChart as IconComponent,
  income:        DollarSign as IconComponent,
  subscriptions: RefreshCw as IconComponent,
  overview:      Eye as IconComponent,
  chart:         LineChart as IconComponent,
  security:      Shield as IconComponent,
  support:       HelpCircle as IconComponent,
  billing:       Receipt as IconComponent,
  calendar:      CalendarDays as IconComponent,
  education:     GraduationCap as IconComponent,
  goals:         Target as IconComponent,
  taxes:         Landmark as IconComponent,
  categories:    Tag as IconComponent,
};

export type CustomIconName = keyof typeof customIcons;

export function getCustomIcon(name: CustomIconName): IconComponent {
  return customIcons[name];
}
