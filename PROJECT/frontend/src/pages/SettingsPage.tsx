import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/component/ui/card";
import { Input } from "@/component/ui/input";
import { Label } from "@/component/ui/label";
import { Button } from "@/component/ui/button";
import { Switch } from "@/component/ui/switch";
import { Separator } from "@/component/ui/seperator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/component/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/hooks/useTheme";

const STORAGE_KEY = "nexapath_settings";

function loadSettings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return {
    platformName: "NexaPath",
    supportEmail: "support@nexapath.com",
    adminDisplayName: "Administrator",
    adminTitle: "Platform Admin",
    emailNotifications: true,
    autoApproveCourses: false,
    maintenanceMode: false,
    sessionTimeout: "4h",
    itemsPerPage: "25",
    dateFormat: "MM/DD/YYYY",
  };
}

export default function SettingsPage() {
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const [settings, setSettings] = useState(loadSettings);

  function set<K extends keyof ReturnType<typeof loadSettings>>(key: K, value: ReturnType<typeof loadSettings>[K]) {
    setSettings((s: ReturnType<typeof loadSettings>) => ({ ...s, [key]: value }));
  }

  function handleSave() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    toast({ title: "Settings saved", description: "Your changes have been applied." });
  }

  function handleReset() {
    localStorage.removeItem(STORAGE_KEY);
    setSettings(loadSettings());
    toast({ title: "Settings reset", description: "All settings restored to defaults." });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Platform configuration</p>
      </div>

      {/* Appearance */}
      <Card>
        <CardHeader><CardTitle className="text-base">Appearance</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Theme</p>
              <p className="text-xs text-muted-foreground">
                Currently using <span className="font-medium capitalize">{theme}</span> mode
              </p>
            </div>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
            >
              {theme === "dark" ? (
                <><Sun className="h-4 w-4 text-yellow-400" /> Light mode</>
              ) : (
                <><Moon className="h-4 w-4" /> Dark mode</>
              )}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Admin Profile */}
      <Card>
        <CardHeader><CardTitle className="text-base">Admin Profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Display Name</Label>
            <Input
              value={settings.adminDisplayName}
              onChange={(e) => set("adminDisplayName", e.target.value)}
              placeholder="e.g. Administrator"
            />
          </div>
          <div className="space-y-2">
            <Label>Job Title</Label>
            <Input
              value={settings.adminTitle}
              onChange={(e) => set("adminTitle", e.target.value)}
              placeholder="e.g. Platform Admin"
            />
          </div>
        </CardContent>
      </Card>

      {/* General */}
      <Card>
        <CardHeader><CardTitle className="text-base">General</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Platform Name</Label>
            <Input
              value={settings.platformName}
              onChange={(e) => set("platformName", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Support Email</Label>
            <Input
              type="email"
              value={settings.supportEmail}
              onChange={(e) => set("supportEmail", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader><CardTitle className="text-base">Security</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Session Timeout</p>
              <p className="text-xs text-muted-foreground">Auto-logout after this idle period</p>
            </div>
            <Select value={settings.sessionTimeout} onValueChange={(v) => set("sessionTimeout", v)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30m">30 minutes</SelectItem>
                <SelectItem value="1h">1 hour</SelectItem>
                <SelectItem value="4h">4 hours</SelectItem>
                <SelectItem value="8h">8 hours</SelectItem>
                <SelectItem value="never">Never</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Login Attempt Limit</p>
              <p className="text-xs text-muted-foreground">Max failed attempts before lockout</p>
            </div>
            <span className="text-sm font-semibold tabular-nums text-muted-foreground">
              3 attempts · 5 min lockout
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader><CardTitle className="text-base">Preferences</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Email Notifications</p>
              <p className="text-xs text-muted-foreground">Receive admin alerts via email</p>
            </div>
            <Switch
              checked={settings.emailNotifications}
              onCheckedChange={(v) => set("emailNotifications", v)}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Auto-approve Courses</p>
              <p className="text-xs text-muted-foreground">Skip review for instructor uploads</p>
            </div>
            <Switch
              checked={settings.autoApproveCourses}
              onCheckedChange={(v) => set("autoApproveCourses", v)}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Maintenance Mode</p>
              <p className="text-xs text-muted-foreground">Disable public access temporarily</p>
            </div>
            <Switch
              checked={settings.maintenanceMode}
              onCheckedChange={(v) => set("maintenanceMode", v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Display */}
      <Card>
        <CardHeader><CardTitle className="text-base">Display</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Items Per Page</p>
              <p className="text-xs text-muted-foreground">Default rows shown in data tables</p>
            </div>
            <Select value={settings.itemsPerPage} onValueChange={(v) => set("itemsPerPage", v)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Date Format</p>
              <p className="text-xs text-muted-foreground">How dates appear across the platform</p>
            </div>
            <Select value={settings.dateFormat} onValueChange={(v) => set("dateFormat", v)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (ISO)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between pb-6">
        <Button onClick={handleSave}>Save Changes</Button>
        <Button
          variant="ghost"
          onClick={handleReset}
          className="text-sm text-muted-foreground hover:text-destructive"
        >
          Reset to Defaults
        </Button>
      </div>
    </div>
  );
}
