/**
 * DynamicIcon — renders a Lucide icon by string name with graceful fallback.
 * Uses a curated safe-list of common icons to avoid importing all of Lucide.
 */
import {
  Activity, AlertCircle, ArrowRight, Award, BarChart2, BarChart3,
  BookOpen, Brain, Briefcase, Building2, Calendar, CheckCircle2,
  ChevronRight, Clock, Code2, Cpu, Database, DollarSign,
  FileText, Flag, Globe, GraduationCap, Heart, HelpCircle,
  Home, Info, Layers, Lightbulb, Link, List, Lock,
  Mail, MapPin, MessageSquare, Monitor, Moon, Package,
  PenLine, Percent, Phone, PieChart, Play, Plus,
  Presentation, Rocket, Search, Settings, Shield,
  ShoppingCart, Sparkles, Star, Target, ThumbsUp,
  TrendingDown, TrendingUp, Trophy, Truck, User,
  Users, Zap, CheckSquare, Clipboard, Edit3, RefreshCw,
  ArrowUpRight, CircleCheck, LayoutGrid, Network, 
} from "lucide-react";

type LucideIconComponent = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

const ICON_MAP: Record<string, LucideIconComponent> = {
  Activity, AlertCircle, ArrowRight, Award, BarChart2, BarChart3,
  BookOpen, Brain, Briefcase, Building2, Calendar, CheckCircle2,
  ChevronRight, Clock, Code2, Cpu, Database, DollarSign,
  FileText, Flag, Globe, GraduationCap, Heart, HelpCircle,
  Home, Info, Layers, Lightbulb, Link, List, Lock,
  Mail, MapPin, MessageSquare, Monitor, Moon, Package,
  PenLine, Percent, Phone, PieChart, Play, Plus,
  Presentation, Rocket, Search, Settings, Shield,
  ShoppingCart, Sparkles, Star, Target, ThumbsUp,
  TrendingDown, TrendingUp, Trophy, Truck, User,
  Users, Zap, CheckSquare, Clipboard, Edit3, RefreshCw,
  ArrowUpRight, CircleCheck, LayoutGrid, Network,
};

interface Props {
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function DynamicIcon({ name, size = 20, color = "currentColor", strokeWidth = 2 }: Props) {
  // Try exact match, then PascalCase conversion
  const Icon =
    ICON_MAP[name] ??
    ICON_MAP[name.replace(/(^|[-_])(\w)/g, (_, __, c: string) => c.toUpperCase())] ??
    CheckCircle2;

  return <Icon size={size} color={color} strokeWidth={strokeWidth} />;
}
