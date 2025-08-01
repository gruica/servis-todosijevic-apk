import React from 'react';
import {
  LayoutDashboard,
  User,
  Wrench,
  Package,
  Users,
  Building2,
  Archive,
  Warehouse,
  FolderOpen,
  Search,
  Home,
  Shield,
  UserCheck,
  Smartphone,
  MessageSquare,
  Mail,
  MailOpen,
  Database,
  Upload,
  Download,
  Trash2,
  Euro,
  UserCircle
} from 'lucide-react';

// Mapiranje Material Icons naziva na Lucide React komponente
const iconMap = {
  'dashboard': LayoutDashboard,
  'person': User,
  'build': Wrench,
  'package': Package,
  'groups': Users,
  'business': Building2,
  'inventory': Archive,
  'warehouse': Warehouse,
  'category': FolderOpen,
  'travel_explore': Search,
  'home_repair_service': Home,
  'admin_panel_settings': Shield,
  'verified_user': UserCheck,
  'smartphone': Smartphone,
  'message': MessageSquare,
  'mail': Mail,
  'mail_outline': MailOpen,
  'storage': Database,
  'import_export': Upload,
  'download': Download,
  'cleaning_services': Trash2,
  'euro': Euro,
  'account_circle': UserCircle
};

interface IconMapperProps {
  iconName: string;
  className?: string;
  size?: number;
  style?: React.CSSProperties;
}

// Komponenta koja mapira Material Icons nazive na Lucide React ikone
export function IconMapper({ iconName, className = "", size = 20, style = {} }: IconMapperProps) {
  const IconComponent = iconMap[iconName as keyof typeof iconMap];
  
  if (!IconComponent) {
    // Fallback: prikaži prazan span ako ikona nije pronađena
    return <span className={`inline-block ${className}`} style={{ width: size, height: size, ...style }} />;
  }
  
  return <IconComponent className={className} size={size} style={style} />;
}

// Hook za lakše korišćenje
export function useIconMapper() {
  return { IconMapper, iconMap };
}