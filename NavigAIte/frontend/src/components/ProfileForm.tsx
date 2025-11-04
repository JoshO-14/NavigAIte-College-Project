import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { ArrowRight, ArrowLeft } from "lucide-react";

interface ProfileFormProps {
  onComplete: (profile: any) => void;
  initialData?: any;
}

const ProfileForm = ({ onComplete, initialData }: ProfileFormProps) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: initialData?.full_name || "",
    gpa: initialData?.gpa?.toString() || "",
    satScore: initialData?.sat_score?.toString() || "",
    actScore: initialData?.act_score?.toString() || "",
    intendedMajor: initialData?.intended_major || "",
    interests: initialData?.interests?.join(", ") || "",
    extracurriculars: initialData?.extracurriculars?.join(", ") || "",
    financialNeed: initialData?.budget_range || "",
    location: initialData?.location_preference || "",
    schoolSize: "",
  });

  const updateField = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
    else {
      // Transform formData to match backend schema
      const profileData = {
        full_name: formData.name,
        gpa: parseFloat(formData.gpa) || null,
        sat_score: parseInt(formData.satScore) || null,
        act_score: parseInt(formData.actScore) || null,
        intended_major: formData.intendedMajor,
        interests: formData.interests.split(",").map(i => i.trim()).filter(Boolean),
        extracurriculars: formData.extracurriculars.split(",").map(e => e.trim()).filter(Boolean),
        budget_range: formData.financialNeed,
        location_preference: formData.location,
      };
      onComplete(profileData);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="container mx-auto max-w-2xl">
        <div className="text-center mb-8 animate-slide-up">
          <h1 className="text-4xl font-bold mb-3">Build Your Profile</h1>
          <p className="text-muted-foreground">
            Help us understand your goals so we can find your perfect college matches
          </p>
          <div className="flex justify-center gap-2 mt-6">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 w-16 rounded-full transition-all ${
                  s === step ? "gradient-hero" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>

        <Card className="p-8 shadow-lg animate-fade-in">
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold mb-4">Academic Profile</h2>
              
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="John Doe"
                  className="mt-1.5"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="gpa">GPA (4.0 scale)</Label>
                  <Input
                    id="gpa"
                    type="number"
                    step="0.01"
                    value={formData.gpa}
                    onChange={(e) => updateField("gpa", e.target.value)}
                    placeholder="3.85"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="satScore">SAT Score (optional)</Label>
                  <Input
                    id="satScore"
                    type="number"
                    value={formData.satScore}
                    onChange={(e) => updateField("satScore", e.target.value)}
                    placeholder="1450"
                    className="mt-1.5"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="actScore">ACT Score (optional)</Label>
                <Input
                  id="actScore"
                  type="number"
                  value={formData.actScore}
                  onChange={(e) => updateField("actScore", e.target.value)}
                  placeholder="32"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="intendedMajor">Intended Major</Label>
                <Input
                  id="intendedMajor"
                  value={formData.intendedMajor}
                  onChange={(e) => updateField("intendedMajor", e.target.value)}
                  placeholder="Computer Science"
                  className="mt-1.5"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold mb-4">Interests & Activities</h2>
              
              <div>
                <Label htmlFor="interests">Academic Interests</Label>
                <Textarea
                  id="interests"
                  value={formData.interests}
                  onChange={(e) => updateField("interests", e.target.value)}
                  placeholder="AI, robotics, sustainable energy..."
                  className="mt-1.5 min-h-24"
                />
              </div>

              <div>
                <Label htmlFor="extracurriculars">Extracurricular Activities</Label>
                <Textarea
                  id="extracurriculars"
                  value={formData.extracurriculars}
                  onChange={(e) => updateField("extracurriculars", e.target.value)}
                  placeholder="Robotics Club President, Varsity Soccer, Math Olympiad..."
                  className="mt-1.5 min-h-24"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold mb-4">Preferences</h2>
              
              <div>
                <Label htmlFor="location">Preferred Location</Label>
                <Select value={formData.location} onValueChange={(value) => updateField("location", value)}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select location preference" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="northeast">Northeast</SelectItem>
                    <SelectItem value="southeast">Southeast</SelectItem>
                    <SelectItem value="midwest">Midwest</SelectItem>
                    <SelectItem value="west">West Coast</SelectItem>
                    <SelectItem value="any">No Preference</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="schoolSize">Preferred School Size</Label>
                <Select value={formData.schoolSize} onValueChange={(value) => updateField("schoolSize", value)}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select school size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small (&lt;5,000)</SelectItem>
                    <SelectItem value="medium">Medium (5,000-15,000)</SelectItem>
                    <SelectItem value="large">Large (&gt;15,000)</SelectItem>
                    <SelectItem value="any">No Preference</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="financialNeed">Financial Aid Need</Label>
                <Select value={formData.financialNeed} onValueChange={(value) => updateField("financialNeed", value)}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select financial need" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High - Need significant aid</SelectItem>
                    <SelectItem value="medium">Medium - Some aid needed</SelectItem>
                    <SelectItem value="low">Low - Minimal aid needed</SelectItem>
                    <SelectItem value="none">None - Can pay full tuition</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="flex gap-3 mt-8">
            {step > 1 && (
              <Button variant="outline" onClick={handleBack} className="flex-1">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
            <Button onClick={handleNext} className="flex-1 gradient-hero shadow-glow">
              {step === 3 ? "Complete Profile" : "Next"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ProfileForm;
