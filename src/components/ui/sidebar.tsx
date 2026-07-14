import { createContext, useContext, useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SidebarContext = createContext({ state: "expanded", isMobile: false, setOpenMobile: (_: boolean) => {}, toggle: () => {} });
export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  return <SidebarContext.Provider value={{ state: collapsed ? "collapsed" : "expanded", isMobile: false, setOpenMobile: () => {}, toggle: () => setCollapsed((v) => !v) }}>{children}</SidebarContext.Provider>;
}
export const useSidebar = () => useContext(SidebarContext);
export function SidebarTrigger({ className }: { className?: string }) { const { toggle } = useSidebar(); return <Button variant="ghost" size="icon" onClick={toggle} className={className}><Menu className="h-5 w-5" /></Button>; }
export function Sidebar({ children }: { children: React.ReactNode; collapsible?: string }) { const { state } = useSidebar(); return <aside className={cn("hidden md:flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all", state === "collapsed" ? "w-20" : "w-72")}>{children}</aside>; }
export const SidebarHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div className={className} {...props} />;
export const SidebarContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div className={cn("flex-1 overflow-y-auto p-3", className)} {...props} />;
export const SidebarFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div className={className} {...props} />;
export const SidebarGroup = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div className={cn("py-2", className)} {...props} />;
export const SidebarGroupLabel = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div className={cn("px-3 py-2", className)} {...props} />;
export const SidebarGroupContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div className={className} {...props} />;
export const SidebarMenu = ({ className, ...props }: React.HTMLAttributes<HTMLUListElement>) => <ul className={cn("space-y-1", className)} {...props} />;
export const SidebarMenuItem = ({ className, ...props }: React.HTMLAttributes<HTMLLIElement>) => <li className={className} {...props} />;
export function SidebarMenuButton({ asChild, children }: { asChild?: boolean; children: React.ReactNode }) { return <>{children}</>; }
