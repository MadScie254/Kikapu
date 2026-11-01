import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Trash2, Loader2, LogOut, Sparkles, Plus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useCategories } from "@/hooks/useCategories";
import { api, ApiClientError } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useQueryClient } from "@tanstack/react-query";
import { minorToDecimalString, toMinorUnits } from "@shared/money";
import type { PublicUser } from "@shared/types";

export default function Settings() {
  const { user, setUser, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { data: categories = [] } = useCategories();
  const { toast } = useToast();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [budgetInput, setBudgetInput] = useState(user?.monthlyBudgetMinor ? minorToDecimalString(user.monthlyBudgetMinor) : "");
  const [aiOptIn, setAiOptIn] = useState(user?.aiEnhancementOptIn ?? false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function saveProfile() {
    setSavingProfile(true);
    try {
      const { user: updated } = await api.put<{ user: PublicUser }>("/user/preferences", {
        displayName,
        monthlyBudgetMinor: budgetInput ? toMinorUnits(budgetInput) : null,
        aiEnhancementOptIn: aiOptIn,
      });
      setUser(updated);
      toast({ title: "Settings saved", variant: "success" });
    } catch (err) {
      toast({ title: "Couldn't save", description: err instanceof ApiClientError ? err.message : undefined, variant: "destructive" });
    } finally {
      setSavingProfile(false);
    }
  }

  async function addCategory() {
    if (!newCategoryName.trim()) return;
    try {
      await api.post("/categories", { name: newCategoryName.trim() });
      qc.invalidateQueries({ queryKey: ["categories"] });
      setNewCategoryName("");
    } catch {
      toast({ title: "Couldn't add category", variant: "destructive" });
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      await api.delete("/user/account");
      navigate("/");
    } catch {
      toast({ title: "Couldn't delete account", variant: "destructive" });
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-display text-2xl font-bold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Display name</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={user?.email ?? ""} disabled />
          </div>
          <div className="space-y-1.5">
            <Label>Monthly household budget (KSh)</Label>
            <Input type="number" min="0" value={budgetInput} onChange={(e) => setBudgetInput(e.target.value)} />
          </div>
          <Button onClick={saveProfile} disabled={savingProfile}>
            {savingProfile && <Loader2 className="size-4 animate-spin" />}
            Save Changes
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            <Label>Theme</Label>
            <Select value={theme} onValueChange={(v) => setTheme(v as "light" | "dark" | "system")}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Shopping Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {categories.filter((c) => !c.isOverall).map((c) => (
              <Badge key={c.id} variant={c.isActive ? "secondary" : "outline"}>
                {c.name}
              </Badge>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <Input placeholder="Add a custom category" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCategory()} />
            <Button variant="outline" onClick={addCategory}>
              <Plus className="size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-accent" /> Optional AI Enhancement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <label className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Offer AI-enhanced scanning</p>
              <p className="text-xs text-muted-foreground">
                When available on this deployment, you'll see the option on the Scan page. It's never used without
                your explicit consent on each scan.
              </p>
            </div>
            <Switch checked={aiOptIn} onCheckedChange={setAiOptIn} />
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Data</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" asChild>
            <a href="/api/user/export?format=json" download>
              <Download className="size-4" /> Export as JSON
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href="/api/user/export?format=csv" download>
              <Download className="size-4" /> Export as CSV
            </a>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={async () => {
              await logout();
              navigate("/");
            }}
          >
            <LogOut className="size-4" /> Sign Out
          </Button>
          <Separator />
          <Button variant="destructive" className="w-full justify-start" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="size-4" /> Delete Account
          </Button>
        </CardContent>
      </Card>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This permanently deletes your account and every receipt, budget, and shopping list in your household.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleting}>
              {deleting && <Loader2 className="size-4 animate-spin" />}
              Yes, delete everything
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
