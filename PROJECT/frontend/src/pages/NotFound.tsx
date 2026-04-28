import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Home, ArrowLeft } from "lucide-react";
import { Button } from "@/component/ui/button";
import { Card } from "@/component/ui/card";

export default function NotFound() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4">
      <Card className="max-w-md w-full">
        <div className="p-8 text-center">
          <div className="text-6xl font-bold text-slate-900 mb-2">404</div>
          <h1 className="text-3xl font-semibold text-slate-900 mb-2">Page Not Found</h1>
          <p className="text-slate-600 mb-8">
            Oops! The page you're looking for doesn't exist or has been moved. 
            <span className="block text-sm mt-1">Path: {location.pathname}</span>
          </p>
          
          <div className="flex gap-3 flex-col sm:flex-row">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
            <Button
              className="flex-1"
              onClick={() => navigate("/")}
            >
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
