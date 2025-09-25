import { Search, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";

const Header = () => {
  return (
    <header className="h-16 bg-card border-b border-border px-6 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <Menu className="text-muted-foreground" size={20} />
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">R</span>
          </div>
          <span className="font-semibold text-foreground">
            Recruiting, Onboarding, and HR Modernization
          </span>
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
          <Input
            placeholder="All"
            className="pl-10 w-64 bg-background"
          />
        </div>
        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-sm">A</span>
        </div>
      </div>
    </header>
  );
};

export default Header;