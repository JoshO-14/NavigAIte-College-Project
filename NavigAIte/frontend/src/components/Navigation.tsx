import { Button } from "@/components/ui/button";
import { GraduationCap, Home, User, LayoutDashboard, MessageSquare, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";

interface NavigationProps {
  currentView: string;
  onNavigate: (view: any) => void;
  hasProfile: boolean;
}

const Navigation = ({ currentView, onNavigate, hasProfile }: NavigationProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      navigate("/auth");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to log out",
        variant: "destructive",
      });
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-card/80 backdrop-blur-lg">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center shadow-glow">
            <GraduationCap className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            NavigAIte College
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={currentView === "home" ? "default" : "ghost"}
            size="sm"
            onClick={() => onNavigate("home")}
          >
            <Home className="w-4 h-4 mr-2" />
            Home
          </Button>
          
          {hasProfile && (
            <>
              <Button
                variant={currentView === "dashboard" ? "default" : "ghost"}
                size="sm"
                onClick={() => onNavigate("dashboard")}
              >
                <LayoutDashboard className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
              
              <Button
                variant={currentView === "chat" ? "default" : "ghost"}
                size="sm"
                onClick={() => onNavigate("chat")}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                AI Advisor
              </Button>
            </>
          )}
          
          <Button
            variant={currentView === "profile" ? "default" : "ghost"}
            size="sm"
            onClick={() => onNavigate("profile")}
          >
            <User className="w-4 h-4 mr-2" />
            Profile
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-destructive hover:text-destructive"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
