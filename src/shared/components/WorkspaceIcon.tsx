import {
  BriefcaseBusiness,
  Building2,
  CircleDollarSign,
  Handshake,
  House,
  Landmark,
  Leaf,
  Scale,
  Store,
  UsersRound,
} from 'lucide-react';
import type { WorkspaceIconName } from '@/core/lib/workspaces';
import { cn } from '@/shared/lib/utils';

export const workspaceIconOptions: Array<{ id: WorkspaceIconName; label: string; icon: typeof Building2 }> = [
  { id: 'building', label: 'Edificio', icon: Building2 },
  { id: 'landmark', label: 'Institución', icon: Landmark },
  { id: 'briefcase', label: 'Portafolio', icon: BriefcaseBusiness },
  { id: 'money', label: 'Finanzas', icon: CircleDollarSign },
  { id: 'handshake', label: 'Acuerdo', icon: Handshake },
  { id: 'house', label: 'Hogar', icon: House },
  { id: 'store', label: 'Comercio', icon: Store },
  { id: 'leaf', label: 'Campo', icon: Leaf },
  { id: 'scale', label: 'Balanza', icon: Scale },
  { id: 'people', label: 'Comunidad', icon: UsersRound },
];

interface WorkspaceIconProps {
  icon: WorkspaceIconName;
  className?: string;
}

export function WorkspaceIcon({ icon, className }: WorkspaceIconProps) {
  const Icon = workspaceIconOptions.find((option) => option.id === icon)?.icon ?? Building2;
  return <Icon className={cn(className)} aria-hidden="true" />;
}
