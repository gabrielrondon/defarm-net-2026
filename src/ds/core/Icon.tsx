import type { CSSProperties } from "react";
import {
  ArrowLeft, ArrowRight, BadgeCheck, Building2, Camera, Check, Code, Copy, Download, ExternalLink,
  EyeOff, FileDown, Info, KeyRound, Landmark, Lock, Mail, SearchX, ServerCrash, ShieldAlert,
  ShieldCheck, Sprout, User, WifiOff, X, type LucideIcon,
} from "lucide-react";

/* Porte do <Icon> do design system. O original busca o SVG do Lucide num CDN; aqui o mesmo set
   vem do `lucide-react` já instalado no portal. Nomes em kebab-case, como no design, para o
   dia em que o set próprio chegar (guidelines/icones-brief.md) e este mapa for trocado. */
const ICONS: Record<string, LucideIcon> = {
  "arrow-left": ArrowLeft, "arrow-right": ArrowRight, "badge-check": BadgeCheck, "building-2": Building2,
  camera: Camera, check: Check, code: Code, copy: Copy, download: Download, "external-link": ExternalLink,
  "eye-off": EyeOff, "file-down": FileDown, info: Info, "key-round": KeyRound, landmark: Landmark, lock: Lock,
  mail: Mail, "search-x": SearchX, "server-crash": ServerCrash, "shield-alert": ShieldAlert,
  "shield-check": ShieldCheck, sprout: Sprout, user: User, "wifi-off": WifiOff, x: X,
};

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 20, style }: { name: IconName | string; size?: number; style?: CSSProperties }) {
  const Glyph = ICONS[name];
  return (
    <span aria-hidden="true" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: size, height: size, flex: "0 0 auto", color: "currentColor", lineHeight: 0, ...style }}>
      {Glyph ? <Glyph size={size} strokeWidth={2} /> : null}
    </span>
  );
}
