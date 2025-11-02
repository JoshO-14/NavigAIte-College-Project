import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MessageSquare, TrendingUp, Target, AlertCircle, Award, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";

interface DashboardProps {
  profile: any;
  onStartChat: () => void;
}

const Dashboard = ({ profile, onStartChat }: DashboardProps) => {
  const [colleges, setColleges] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      // Load college recommendations
      const { data: userColleges, error: collegesError } = await supabase
        .from('user_colleges')
        .select(`
          *,
          colleges (*)
        `)
        .eq('user_id', user?.id)
        .order('match_score', { ascending: false });

      if (collegesError) throw collegesError;
      setColleges(userColleges || []);

      // Load progress milestones
      const { data: milestonesData, error: milestonesError } = await supabase
        .from('progress_milestones')
        .select('*')
        .eq('user_id', user?.id)
        .order('deadline', { ascending: true });

      if (milestonesError) throw milestonesError;
      setMilestones(milestonesData || []);

    } catch (error: any) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleMilestone = async (milestoneId: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from('progress_milestones')
        .update({ 
          completed: !completed,
          completed_at: !completed ? new Date().toISOString() : null
        })
        .eq('id', milestoneId);

      if (error) throw error;
      
      setMilestones(prev => 
        prev.map(m => m.id === milestoneId ? { ...m, completed: !completed } : m)
      );
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update milestone",
        variant: "destructive",
      });
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "reach": return "reach";
      case "target": return "warning";
      case "safety": return "success";
      default: return "muted";
    }
  };

  const completedMilestones = milestones.filter(m => m.completed).length;
  const progressPercentage = milestones.length > 0 
    ? Math.round((completedMilestones / milestones.length) * 100) 
    : 0;

  const topMatch = colleges.find(c => c.category === 'target') || colleges[0];

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-8 animate-slide-up">
          <h1 className="text-4xl font-bold mb-3">Welcome back, {profile.full_name}! 👋</h1>
          <p className="text-muted-foreground text-lg">
            Here's your personalized college roadmap
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-8 animate-fade-in">
          <Card className="p-6 gradient-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Match Score</span>
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div className="text-3xl font-bold">{topMatch?.match_score || 0}%</div>
            <p className="text-xs text-muted-foreground mt-1">Best Target Match</p>
          </Card>

          <Card className="p-6 gradient-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Your GPA</span>
              <TrendingUp className="w-5 h-5 text-success" />
            </div>
            <div className="text-3xl font-bold">{profile.gpa || 'N/A'}</div>
            <p className="text-xs text-muted-foreground mt-1">On 4.0 scale</p>
          </Card>

          <Card className="p-6 gradient-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Progress</span>
              <CheckCircle2 className="w-5 h-5 text-primary" />
            </div>
            <div className="text-3xl font-bold">{progressPercentage}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {completedMilestones} of {milestones.length} milestones
            </p>
          </Card>

          <Card className="p-6 gradient-hero shadow-glow cursor-pointer hover:shadow-lg transition-all" onClick={onStartChat}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-primary-foreground">AI Advisor</span>
              <MessageSquare className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="text-3xl font-bold text-primary-foreground">Chat</div>
            <p className="text-xs text-primary-foreground/80 mt-1">Get instant guidance</p>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* College Recommendations */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold">Your College Matches</h2>
            </div>

            {colleges.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">No college recommendations yet. Complete your profile to get personalized matches!</p>
              </Card>
            ) : (
              colleges.map((college, i) => (
                <Card key={i} className="p-6 hover:shadow-lg transition-all animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold mb-2">{college.colleges.name}</h3>
                      <Badge variant={getTypeColor(college.category) as any} className="capitalize">
                        {college.category}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-primary">{college.match_score}%</div>
                      <p className="text-xs text-muted-foreground">Match</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Avg GPA</p>
                      <p className="font-semibold">{college.colleges.avg_gpa || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Avg SAT</p>
                      <p className="font-semibold">{college.colleges.avg_sat || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Tuition</p>
                      <p className="font-semibold">${(college.colleges.tuition || 0).toLocaleString()}</p>
                    </div>
                  </div>

                  {college.notes && (
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-primary mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Gap Analysis</p>
                          <p className="text-xs text-muted-foreground mt-1">{college.notes}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <Button className="w-full mt-4" variant="outline" asChild>
                    <a href={college.colleges.website} target="_blank" rel="noopener noreferrer">
                      View Details
                    </a>
                  </Button>
                </Card>
              ))
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Progress Tracker */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Application Milestones</h3>
              </div>
              <Progress value={progressPercentage} className="mb-4" />
              <div className="space-y-3">
                {milestones.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No milestones yet</p>
                ) : (
                  milestones.map((milestone) => (
                    <div 
                      key={milestone.id} 
                      className="flex items-center gap-3 cursor-pointer hover:opacity-70"
                      onClick={() => toggleMilestone(milestone.id, milestone.completed)}
                    >
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        milestone.completed ? "bg-success" : "bg-muted"
                      }`}>
                        {milestone.completed && <CheckCircle2 className="w-3 h-3 text-success-foreground" />}
                      </div>
                      <span className={`text-sm ${milestone.completed ? "line-through text-muted-foreground" : ""}`}>
                        {milestone.title}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* AI Advisor CTA */}
            <Card className="p-6 gradient-hero shadow-glow text-primary-foreground">
              <MessageSquare className="w-10 h-10 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Need Guidance?</h3>
              <p className="text-sm text-primary-foreground/90 mb-4">
                Chat with our AI advisor for personalized tips, essay feedback, and application advice.
              </p>
              <Button onClick={onStartChat} variant="secondary" className="w-full">
                Start Chat
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;