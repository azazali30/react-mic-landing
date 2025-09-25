import { 
  Home, 
  FileText, 
  Users, 
  Settings, 
  BarChart3, 
  Calendar,
  Bell,
  Archive
} from "lucide-react";

const Sidebar = () => {
  const navItems = [
    { icon: Home, label: "Home", active: true },
    { icon: FileText, label: "Documents" },
    { icon: Users, label: "Users" },
    { icon: BarChart3, label: "Analytics" },
    { icon: Calendar, label: "Calendar" },
    { icon: Bell, label: "Notifications" },
    { icon: Archive, label: "Archive" },
    { icon: Settings, label: "Settings" },
  ];

  return (
    <div className="w-16 bg-[hsl(var(--sidebar-bg))] border-r border-border flex flex-col items-center py-4 space-y-2">
      {navItems.map((item, index) => (
        <button
          key={index}
          className={`p-3 rounded-lg transition-colors ${
            item.active
              ? "bg-primary text-primary-foreground"
              : "text-[hsl(var(--sidebar-item))] hover:bg-[hsl(var(--sidebar-item-hover))] hover:text-white"
          }`}
          title={item.label}
        >
          <item.icon size={20} />
        </button>
      ))}
    </div>
  );
};

export default Sidebar;