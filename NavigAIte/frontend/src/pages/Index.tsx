import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Hero from "@/components/Hero";
import ProfileForm from "@/components/ProfileForm";
import Dashboard from "@/components/Dashboard";
import ChatAdvisor from "@/components/ChatAdvisor";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

type View = "home" | "profile" | "dashboard" | "chat";

const Index = () => {
  const [currentView, setCurrentView] = useState<View>("home");
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { user, session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error) throw error;

      if (data) {
        setUserProfile(data);
        if (data.gpa || data.sat_score || data.act_score) {
          setCurrentView("dashboard");
        } else {
          setCurrentView("profile");
        }
      } else {
        setCurrentView("profile");
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setCurrentView("profile");
    } finally {
      setLoading(false);
    }
  };

  const handleProfileComplete = async (profile: any) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user?.id,
          ...profile,
          email: user?.email,
        });

      if (error) throw error;

      const { error: recError } = await supabase.functions.invoke('generate-recommendations', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (recError) {
        console.error('Recommendation error:', recError);
        toast({
          title: "Profile Saved",
          description: "Your profile has been saved, but recommendations generation failed.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Profile Complete!",
          description: "Your personalized college recommendations are ready.",
        });
      }

      setUserProfile({ ...profile, id: user?.id, email: user?.email });
      setCurrentView("dashboard");
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save profile",
        variant: "destructive",
      });
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation currentView={currentView} onNavigate={setCurrentView} hasProfile={!!userProfile} />
      
      {currentView === "home" && (
        <Hero onGetStarted={() => setCurrentView("profile")} />
      )}
      
      {currentView === "profile" && (
        <ProfileForm onComplete={handleProfileComplete} initialData={userProfile} />
      )}
      
      {currentView === "dashboard" && userProfile && (
        <Dashboard profile={userProfile} onStartChat={() => setCurrentView("chat")} />
      )}
      
      {currentView === "chat" && (
        <ChatAdvisor profile={userProfile} />
      )}
    </div>
  );
};

export default Index;
