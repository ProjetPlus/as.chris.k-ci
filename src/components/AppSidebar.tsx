import {
  LayoutDashboard, Users, Skull, Coins, Landmark, BarChart3,
  CreditCard, ScanLine, Settings, Shield, RefreshCw
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import logo from "@/assets/logo-aschrisk.png";
import { useSettings } from "@/db/useDb";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "Tableau de bord", url: "/dashboard", icon: LayoutDashboard },
  { title: "Membres", url: "/members", icon: Users },
  { title: "Scanner QR", url: "/scanner", icon: ScanLine },
];

const managementItems = [
  { title: "Décès & Versements", url: "/deaths", icon: Skull },
  { title: "Cotisations", url: "/contributions", icon: Coins },
  { title: "Caisse", url: "/treasury", icon: Landmark },
  { title: "Rapports", url: "/reports", icon: BarChart3 },
  { title: "Cartes à imprimer", url: "/cards", icon: CreditCard },
];

const adminItems = [
  { title: "Gestion des accès", url: "/access", icon: Shield },
  { title: "Paramètres", url: "/settings", icon: Settings },
  { title: "Données & Sauvegarde", url: "/sync", icon: RefreshCw },
];

function SidebarSection({ label, items }: { label: string; items: typeof mainItems }) {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";

  const handleClick = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-sidebar-primary/70 uppercase text-[10px] tracking-widest font-semibold">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <NavLink
                  to={item.url}
                  end={item.url === "/" || item.url === "/dashboard"}
                  onClick={handleClick}
                  className="flex flex-row flex-nowrap w-full items-center gap-3 rounded-md px-3 py-2 text-sm leading-none transition-colors hover:bg-sidebar-accent [&>*]:inline-flex"
                  activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                  title={collapsed ? item.title : undefined}
                  style={{ display: "flex", flexDirection: "row", alignItems: "center" }}
                >
                  <item.icon className="h-4 w-4 shrink-0" style={{ flexShrink: 0 }} />
                  {!collapsed && <span className="min-w-0 flex-1 truncate whitespace-nowrap leading-none">{item.title}</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { settings } = useSettings();
  const shortName = "AS.CHRIS.K";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4 flex items-center gap-3 border-b border-sidebar-border/60">
        <div className="shrink-0 flex items-center justify-center bg-transparent">
          <img
            src={logo}
            alt={shortName}
            className={collapsed ? "h-10 w-auto object-contain" : "h-16 w-auto object-contain drop-shadow-sm"}
          />
        </div>
        {!collapsed && (
          <div className="flex flex-col leading-tight">
            <span className="text-sidebar-primary font-display font-bold text-base">{shortName}</span>
            <span className="text-sidebar-foreground/60 text-[10px] tracking-wide">Mutuelle Funéraire</span>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarSection label="Navigation" items={mainItems} />
        <SidebarSection label="Gestion" items={managementItems} />
        <SidebarSection label="Administration" items={adminItems} />
      </SidebarContent>

      <SidebarFooter className="p-4">
        {!collapsed && (
          <p className="text-center text-[10px] text-sidebar-foreground/40">
            v2.0 — Kouassikankro
          </p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
