import { Outlet, Link, useLocation } from "react-router-dom";
import { LayoutDashboard, FileText, Globe, MessageSquare, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export const Layout = () => {
  const location = useLocation();

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Knowledge Base", href: "/knowledge", icon: FileText },
    { name: "Web Scraping", href: "/scraping", icon: Globe },
    { name: "Test Chat", href: "/chat", icon: MessageSquare },
    { name: "API Docs", href: "/api-docs", icon: BookOpen },
  ];

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-border flex flex-col">
        <div className="p-6 border-b border-border">
          <h1 className="text-2xl font-bold text-primary" data-testid="app-logo">KbaseAI</h1>
          <p className="text-sm text-muted-foreground mt-1">Chatbot Platform</p>
        </div>
        <nav className="flex-1 p-4 space-y-2" data-testid="sidebar-nav">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                data-testid={`nav-${item.name.toLowerCase().replace(/ /g, '-')}`}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-foreground hover:bg-secondary hover:text-primary"
                )}
              >
                <Icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;