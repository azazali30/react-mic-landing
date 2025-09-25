import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Search, Calendar, Maximize2, MoreHorizontal } from "lucide-react";

const MainContent = () => {
  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Announcements Section */}
      <Card className="bg-[hsl(var(--announcement-bg))] border-0 text-[hsl(var(--announcement-text))] p-6">
        <h2 className="text-xl font-semibold mb-3">Announcements</h2>
        <p className="text-sm mb-4 opacity-90">
          The Announcements widget can take center stage on the home screen to instantly relay important messages, updates, 
          or promotions. It can offer a seamless way to communicate critical information, such as application updates and other 
          time-sensitive information.
        </p>
        <Button 
          variant="secondary" 
          className="bg-white/20 hover:bg-white/30 text-white border-white/30"
        >
          Learn how to configure the Announcements widget
        </Button>
      </Card>

      {/* Tasks Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">A</span>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Tasks</h3>
              <span className="text-sm text-muted-foreground">0 results</span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Star className="text-muted-foreground mb-2" size={32} />
          <p className="text-muted-foreground">No items</p>
        </div>
      </Card>

      {/* My followed items Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-foreground">My followed items</h3>
            <span className="text-sm text-muted-foreground">0 results</span>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm">
              <Search size={16} />
            </Button>
            <Button variant="ghost" size="sm">
              <Calendar size={16} />
            </Button>
            <Button variant="ghost" size="sm">
              <Maximize2 size={16} />
            </Button>
            <Button variant="ghost" size="sm">
              <MoreHorizontal size={16} />
            </Button>
          </div>
        </div>

        {/* Table Headers */}
        <div className="grid grid-cols-4 gap-4 pb-3 border-b border-border">
          <div className="text-sm font-medium text-muted-foreground">Case ID</div>
          <div className="text-sm font-medium text-muted-foreground">Label</div>
          <div className="text-sm font-medium text-muted-foreground">Status</div>
          <div className="text-sm font-medium text-muted-foreground">Priority</div>
        </div>

        {/* Empty State */}
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Star className="text-muted-foreground mb-2" size={32} />
          <p className="text-muted-foreground">No records found</p>
        </div>
      </Card>
    </div>
  );
};

export default MainContent;