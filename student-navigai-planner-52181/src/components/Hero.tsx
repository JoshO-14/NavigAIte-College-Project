import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Target, TrendingUp } from "lucide-react";

interface HeroProps {
  onGetStarted: () => void;
}

const Hero = ({ onGetStarted }: HeroProps) => {
  return (
    <div className="min-h-screen pt-16 flex items-center justify-center relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "2s" }} />
      </div>

      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="max-w-4xl mx-auto text-center animate-slide-up">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6 border border-primary/20">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">AI-Powered College Planning</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Your Path to{" "}
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              College Success
            </span>
          </h1>

          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            NavigAIte uses advanced AI to analyze your profile, recommend perfect-fit colleges,
            and guide you through every step of the application process.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button
              size="lg"
              onClick={onGetStarted}
              className="gradient-hero shadow-glow hover:shadow-lg transition-all text-lg px-8"
            >
              Get Started Free
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8">
              Learn More
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mt-16">
            <div className="p-6 rounded-2xl bg-card border border-border shadow-md hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-xl gradient-success flex items-center justify-center mb-4 mx-auto">
                <Target className="w-6 h-6 text-success-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Smart Matching</h3>
              <p className="text-muted-foreground text-sm">
                Find your reach, target, and safety schools based on real data
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border shadow-md hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-xl gradient-hero flex items-center justify-center mb-4 mx-auto shadow-glow">
                <Sparkles className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">AI Advisor</h3>
              <p className="text-muted-foreground text-sm">
                Get personalized guidance, essay feedback, and application tips
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border shadow-md hover:shadow-lg transition-all">
              <div className="w-12 h-12 rounded-xl gradient-warning flex items-center justify-center mb-4 mx-auto">
                <TrendingUp className="w-6 h-6 text-warning-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Track Progress</h3>
              <p className="text-muted-foreground text-sm">
                Stay on top of deadlines, essays, and application milestones
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
