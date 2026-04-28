import { useNavigate } from "react-router-dom";
import { BookOpen, Zap, Users, ArrowRight } from "lucide-react";
import { Button } from "@/component/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/component/ui/card";

export default function Index() {
  const navigate = useNavigate();

  const features = [
    {
      icon: BookOpen,
      title: "Comprehensive Courses",
      description: "Learn from expertly curated courses spanning multiple domains and skill levels.",
      link: "/courses",
    },
    {
      icon: Zap,
      title: "Track Skills",
      description: "Monitor skill demand, market trends, and build your professional profile.",
      link: "/skills",
    },
    {
      icon: Users,
      title: "Job Roles",
      description: "Explore career paths with skill requirements and market opportunities.",
      link: "/job-roles",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative">
        {/* Navbar */}
        <nav className="flex items-center justify-between h-16 px-6 border-b border-white/5">
          <div className="text-lg font-semibold text-white">NexaPath</div>
          <Button 
            onClick={() => navigate("/dashboard")}
            className="gap-2"
          >
            Dashboard
            <ArrowRight className="w-4 h-4" />
          </Button>
        </nav>

        {/* Hero Section */}
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold text-white mb-4">
              Master Your Career Path
            </h1>
            <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
              Explore skills, courses, and job roles to accelerate your professional growth
            </p>
            <div className="flex gap-4 justify-center">
              <Button 
                size="lg"
                onClick={() => navigate("/dashboard")}
              >
                Get Started
              </Button>
              <Button 
                variant="outline"
                size="lg"
                onClick={() => navigate("/courses")}
              >
                Explore Courses
              </Button>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card 
                  key={feature.title}
                  className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
                  onClick={() => navigate(feature.link)}
                >
                  <CardHeader>
                    <Icon className="w-8 h-8 text-blue-400 mb-2" />
                    <CardTitle className="text-white">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-300">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-blue-400 mb-2">500+</div>
              <p className="text-slate-400">Courses Available</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-purple-400 mb-2">1000+</div>
              <p className="text-slate-400">Skills Tracked</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-green-400 mb-2">50+</div>
              <p className="text-slate-400">Career Paths</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
