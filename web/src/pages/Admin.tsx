import { useState, useEffect } from "react";
import {
  Users,
  CreditCard,
  Gift,
  TrendingUp,
  Search,
  Shield,
  CheckCircle,
  Clock,
  AlertTriangle,
  DollarSign,
  BarChart3,
  Edit,
  ExternalLink,
  Filter,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuth } from "@/store/auth";
import { useNavigate } from "react-router-dom";

interface Stats {
  users: {
    total: number;
    active: number;
    recent: number;
  };
  memberships: {
    total: number;
    user_subscriptions: number;
  };
  benefits: {
    total: number;
    approved: number;
    pending: number;
  };
}

interface User {
  id: number;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  memberships_count: number;
  benefits_count: number;
}

interface UserDetails extends User {
  memberships: Array<{
    id: number;
    name: string;
    provider_name: string;
    plan_name?: string;
    added_at?: string;
    benefits: Array<{
      id: number;
      title: string;
      description?: string;
      category?: string;
      vendor_name?: string;
      vendor_domain?: string;
    }>;
    benefits_count: number;
  }>;
  memberships_count: number;
  benefits_count: number;
}

type AdminTab = "overview" | "affiliates" | "analytics";
type AffiliateSubTab = "memberships" | "benefits";

interface Membership {
  id: number;
  name: string;
  provider_name: string;
  plan_name: string;
  affiliate_id: string | null;
  affiliate_url: string | null;
  commission_type: string | null;
  partner_name: string | null;
  commission_notes: string | null;
}

interface Benefit {
  id: number;
  title: string;
  membership_name: string;
  membership_id: number;
  vendor_name: string | null;
  affiliate_id: string | null;
  affiliate_url: string | null;
  commission_type: string | null;
  partner_name: string | null;
  commission_notes: string | null;
}

interface AffiliateFormData {
  affiliate_id: string;
  affiliate_url: string;
  commission_type: string;
  partner_name: string;
  commission_notes: string;
}

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingUser, setUpdatingUser] = useState(false);

  // Affiliate management state
  const [affiliateSubTab, setAffiliateSubTab] =
    useState<AffiliateSubTab>("memberships");
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [affiliateSearch, setAffiliateSearch] = useState("");
  const [affiliateFilter, setAffiliateFilter] = useState<
    "all" | "has" | "none"
  >("all");
  const [selectedMembership, setSelectedMembership] =
    useState<Membership | null>(null);
  const [selectedBenefit, setSelectedBenefit] = useState<Benefit | null>(null);
  const [showAffiliateModal, setShowAffiliateModal] = useState(false);
  const [affiliateLoading, setAffiliateLoading] = useState(false);
  const [affiliateFormData, setAffiliateFormData] = useState<AffiliateFormData>(
    {
      affiliate_id: "",
      affiliate_url: "",
      commission_type: "",
      partner_name: "",
      commission_notes: "",
    }
  );

  // Analytics state
  const [analyticsDays, setAnalyticsDays] = useState(7);
  const [analyticsOverview, setAnalyticsOverview] = useState<any>(null);
  const [affiliateReport, setAffiliateReport] = useState<any[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Cron job state
  const [cronRunning, setCronRunning] = useState(false);
  const [cronResult, setCronResult] = useState<any>(null);
  const [cronLimit, setCronLimit] = useState(10);

  // Check if user is admin
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    if (user.role !== "admin") {
      console.error("Access denied: User is not an admin", user);
      setError(
        "Access denied: You must be an administrator to view this page."
      );
      setLoading(false);
      return;
    }

    // User is admin, load data
    loadStats();
    loadUsers();
  }, [user]);

  const loadStats = async () => {
    try {
      const data = await api.get("/api/admin/stats");
      setStats(data);
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data: any = await api.get(
        "/api/admin/users",
        search ? { search } : undefined
      );
      setUsers(data.users);
    } catch (error) {
      console.error("Failed to load users:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserDetails = async (userId: number) => {
    try {
      const data = await api.get(`/api/admin/users/${userId}`);
      setSelectedUser(data);
      setShowUserModal(true);
    } catch (error) {
      console.error("Failed to load user details:", error);
    }
  };

  const handleSearch = () => {
    loadUsers();
  };

  // Affiliate Management Functions
  const loadMemberships = async () => {
    try {
      setAffiliateLoading(true);
      const params: any = { page: 1, page_size: 100 };
      if (affiliateSearch) params.search = affiliateSearch;
      if (affiliateFilter === "has") params.has_affiliate = true;
      if (affiliateFilter === "none") params.has_affiliate = false;

      const data: any = await api.get("/api/admin/memberships", params);
      setMemberships(data.memberships || []);
    } catch (err: any) {
      console.error("Failed to load memberships:", err);
    } finally {
      setAffiliateLoading(false);
    }
  };

  const loadBenefits = async () => {
    try {
      setAffiliateLoading(true);
      const params: any = { page: 1, page_size: 100 };
      if (affiliateSearch) params.search = affiliateSearch;
      if (affiliateFilter === "has") params.has_affiliate = true;
      if (affiliateFilter === "none") params.has_affiliate = false;

      const data: any = await api.get("/api/admin/benefits", params);
      setBenefits(data.benefits || []);
    } catch (err: any) {
      console.error("Failed to load benefits:", err);
    } finally {
      setAffiliateLoading(false);
    }
  };

  const openMembershipEdit = (membership: Membership) => {
    setSelectedMembership(membership);
    setSelectedBenefit(null);
    setAffiliateFormData({
      affiliate_id: membership.affiliate_id || "",
      affiliate_url: membership.affiliate_url || "",
      commission_type: membership.commission_type || "",
      partner_name: membership.partner_name || "",
      commission_notes: membership.commission_notes || "",
    });
    setShowAffiliateModal(true);
  };

  const openBenefitEdit = (benefit: Benefit) => {
    setSelectedBenefit(benefit);
    setSelectedMembership(null);
    setAffiliateFormData({
      affiliate_id: benefit.affiliate_id || "",
      affiliate_url: benefit.affiliate_url || "",
      commission_type: benefit.commission_type || "",
      partner_name: benefit.partner_name || "",
      commission_notes: benefit.commission_notes || "",
    });
    setShowAffiliateModal(true);
  };

  const saveAffiliateData = async () => {
    if (!selectedMembership && !selectedBenefit) return;

    try {
      setAffiliateLoading(true);
      const endpoint = selectedMembership
        ? `/api/admin/memberships/${selectedMembership.id}/affiliate`
        : `/api/admin/benefits/${selectedBenefit!.id}/affiliate`;

      await api.patch(endpoint, affiliateFormData);

      // Reload data
      if (selectedMembership) {
        await loadMemberships();
      } else {
        await loadBenefits();
      }

      setShowAffiliateModal(false);
    } catch (err: any) {
      console.error("Failed to save affiliate data:", err);
      alert("Failed to save affiliate data");
    } finally {
      setAffiliateLoading(false);
    }
  };

  // Load affiliate data when tab changes
  useEffect(() => {
    if (activeTab === "affiliates") {
      if (affiliateSubTab === "memberships") {
        loadMemberships();
      } else {
        loadBenefits();
      }
    }
  }, [activeTab, affiliateSubTab, affiliateSearch, affiliateFilter]);

  // Analytics Functions
  const loadAnalyticsOverview = async () => {
    try {
      setAnalyticsLoading(true);
      const data: any = await api.get("/api/admin/analytics/overview", {
        days: analyticsDays.toString(),
      });
      setAnalyticsOverview(data);
    } catch (err: any) {
      console.error("Failed to load analytics overview:", err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const loadAffiliateReport = async () => {
    try {
      setAnalyticsLoading(true);
      const data: any = await api.get("/api/admin/analytics/affiliate-report", {
        days: analyticsDays.toString(),
      });
      setAffiliateReport(data.report || []);
    } catch (err: any) {
      console.error("Failed to load affiliate report:", err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Load analytics when tab changes
  useEffect(() => {
    if (activeTab === "analytics") {
      loadAnalyticsOverview();
      loadAffiliateReport();
    }
  }, [activeTab, analyticsDays]);

  // Show loading state
  if (loading && !error) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-zinc-600 dark:text-zinc-400">
            Loading admin dashboard...
          </p>
        </div>
      </div>
    );
  }

  // Show error state (access denied)
  if (error || !user || user.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-6 h-6" />
              <CardTitle>Access Denied</CardTitle>
            </div>
            <CardDescription>
              You do not have permission to access the admin dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {user ? (
              <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-zinc-900 dark:text-white">
                  Your Account:
                </p>
                <div className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1">
                  <p>
                    <span className="font-medium">Email:</span> {user.email}
                  </p>
                  <p>
                    <span className="font-medium">Role:</span>{" "}
                    <Badge
                      variant={user.role === "admin" ? "default" : "secondary"}
                    >
                      {user.role}
                    </Badge>
                  </p>
                  <p>
                    <span className="font-medium">User ID:</span> {user.id}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Please log in to continue.
              </p>
            )}
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                To get admin access:
              </p>
              <ol className="text-sm text-zinc-600 dark:text-zinc-400 list-decimal list-inside space-y-1">
                <li>Open browser console (F12)</li>
                <li>
                  Run:{" "}
                  <code className="bg-zinc-200 dark:bg-zinc-700 px-1 rounded">
                    fetch('/api/dev/make-me-admin', {"{"} method: 'POST',
                    headers: {"{"} 'Authorization': 'Bearer ' +
                    JSON.parse(localStorage.getItem('vogoplus-auth') || localStorage.getItem('vogplus-auth') || '{}').state?.accessToken{" "}
                    {"}"} {"}"}).then(r =&gt; r.json()).then(console.log)
                  </code>
                </li>
                <li>Log out and log back in</li>
              </ol>
            </div>
            <Button onClick={() => navigate("/")} className="w-full">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tabs = [
    { id: "overview" as AdminTab, label: "Overview", icon: Users },
    { id: "affiliates" as AdminTab, label: "Affiliates", icon: DollarSign },
    { id: "analytics" as AdminTab, label: "Analytics", icon: BarChart3 },
  ];

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
            Admin Dashboard
          </h1>
        </div>
        <p className="text-zinc-600 dark:text-zinc-400">
          Manage users, memberships, and platform settings
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 font-medium transition-all border-b-2",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <>
          {/* Stats Grid */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Users
                  </CardTitle>
                  <Users className="h-4 w-4 text-zinc-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.users.total}</div>
                  <p className="text-xs text-zinc-500 mt-1">
                    {stats.users.active} active • {stats.users.recent} new this
                    week
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Memberships
                  </CardTitle>
                  <CreditCard className="h-4 w-4 text-zinc-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.memberships.total}
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">
                    {stats.memberships.user_subscriptions} user subscriptions
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Benefits
                  </CardTitle>
                  <Gift className="h-4 w-4 text-zinc-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.benefits.total}
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">
                    {stats.benefits.approved} approved •{" "}
                    {stats.benefits.pending} pending
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Approval Rate
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-zinc-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Math.round(
                      (stats.benefits.approved / stats.benefits.total) * 100
                    )}
                    %
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">
                    of total benefits
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Benefit Discovery Cron Job */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <CardTitle>Benefit Discovery Cron Job</CardTitle>
              </div>
              <CardDescription>
                Discover and add benefits for memberships that currently have no benefits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 block">
                    Process Limit
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="50"
                    value={cronLimit}
                    onChange={(e) => setCronLimit(parseInt(e.target.value) || 10)}
                    className="w-32"
                    disabled={cronRunning}
                  />
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Max memberships to process per run
                  </p>
                </div>
                <div className="flex gap-2 pt-6">
                  <Button
                    onClick={async () => {
                      setCronRunning(true);
                      setCronResult(null);
                      try {
                        const result = await api.post(
                          `/api/admin/cron/discover-benefits?limit=${cronLimit}&dry_run=true`
                        );
                        setCronResult(result);
                      } catch (error: any) {
                        setCronResult({
                          status: "error",
                          error: error.message || "Failed to run cron job",
                        });
                      } finally {
                        setCronRunning(false);
                      }
                    }}
                    variant="outline"
                    disabled={cronRunning}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Dry Run
                  </Button>
                  <Button
                    onClick={async () => {
                      if (
                        !confirm(
                          `Are you sure you want to discover benefits for up to ${cronLimit} memberships? This will use GPT web search and may take several minutes.`
                        )
                      ) {
                        return;
                      }
                      setCronRunning(true);
                      setCronResult(null);
                      try {
                        const result = await api.post(
                          `/api/admin/cron/discover-benefits?limit=${cronLimit}&dry_run=false`
                        );
                        setCronResult(result);
                        // Reload stats after successful run
                        if (result.status === "completed") {
                          loadStats();
                        }
                      } catch (error: any) {
                        setCronResult({
                          status: "error",
                          error: error.message || "Failed to run cron job",
                        });
                      } finally {
                        setCronRunning(false);
                      }
                    }}
                    disabled={cronRunning}
                  >
                    {cronRunning ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Running...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Run Now
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {cronResult && (
                <div
                  className={`p-4 rounded-lg border ${
                    cronResult.status === "error"
                      ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                      : cronResult.status === "completed"
                      ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                      : "bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {cronResult.status === "error" ? (
                      <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                    ) : cronResult.status === "completed" ? (
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                    ) : (
                      <Clock className="w-5 h-5 text-zinc-600 dark:text-zinc-400 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-zinc-900 dark:text-white mb-2">
                        {cronResult.status === "error"
                          ? "Error"
                          : cronResult.dry_run
                          ? "Dry Run Results"
                          : "Cron Job Results"}
                      </p>
                      {cronResult.status === "error" ? (
                        <p className="text-sm text-red-600 dark:text-red-400">
                          {cronResult.error || "Unknown error occurred"}
                        </p>
                      ) : (
                        <div className="space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
                          <p>
                            <span className="font-medium">Processed:</span>{" "}
                            {cronResult.processed || 0}
                          </p>
                          <p>
                            <span className="font-medium">Successful:</span>{" "}
                            <span className="text-green-600 dark:text-green-400">
                              {cronResult.successful || 0}
                            </span>
                          </p>
                          <p>
                            <span className="font-medium">Failed:</span>{" "}
                            <span className="text-red-600 dark:text-red-400">
                              {cronResult.failed || 0}
                            </span>
                          </p>
                          <p>
                            <span className="font-medium">Benefits Added:</span>{" "}
                            <span className="text-primary">
                              {cronResult.benefits_added || 0}
                            </span>
                          </p>
                          {cronResult.results && cronResult.results.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700">
                              <p className="font-medium mb-2">Details:</p>
                              <div className="space-y-1 max-h-40 overflow-y-auto">
                                {cronResult.results.map((r: any, idx: number) => (
                                  <p
                                    key={idx}
                                    className="text-xs text-zinc-600 dark:text-zinc-400"
                                  >
                                    {r.membership_name}:{" "}
                                    {r.status === "success"
                                      ? `✅ Added ${r.benefits_added} benefits`
                                      : r.status === "failed"
                                      ? `❌ ${r.reason || "Failed"}`
                                      : r.status}
                                  </p>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Users Section */}
          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
              <CardDescription>
                Manage platform users and their memberships
              </CardDescription>

              {/* Search */}
              <div className="flex gap-2 mt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input
                    placeholder="Search by email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                    className="pl-9"
                  />
                </div>
                <Button onClick={handleSearch}>Search</Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-zinc-500">
                  Loading users...
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">
                  No users found
                </div>
              ) : (
                <div className="space-y-2">
                  {users.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => loadUserDetails(user.id)}
                      className="w-full flex items-center justify-between p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-primary/30 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-all text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-light rounded-full flex items-center justify-center text-white font-medium">
                          {user.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-zinc-900 dark:text-white">
                            {user.email}
                          </p>
                          <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            Joined{" "}
                            {new Date(user.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {user.role === "admin" && (
                          <Badge variant="default">Admin</Badge>
                        )}
                        {user.is_active ? (
                          <Badge
                            variant="default"
                            className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-500"
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="destructive">Inactive</Badge>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* User Details Modal */}
          {selectedUser && (
            <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-light rounded-full flex items-center justify-center text-white font-medium">
                        {selectedUser.email.charAt(0).toUpperCase()}
                      </div>
                      {selectedUser.email}
                    </div>
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                  {/* User Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Role
                      </p>
                      <Badge
                        variant={
                          selectedUser.role === "admin"
                            ? "default"
                            : "secondary"
                        }
                        className="mt-1"
                      >
                        {selectedUser.role}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Status
                      </p>
                      <Badge
                        variant={
                          selectedUser.is_active ? "default" : "destructive"
                        }
                        className={cn(
                          "mt-1",
                          selectedUser.is_active &&
                            "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-500"
                        )}
                      >
                        {selectedUser.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Memberships
                      </p>
                      <p className="text-xl font-bold mt-1">
                        {selectedUser.memberships_count}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Benefits
                      </p>
                      <p className="text-xl font-bold mt-1">
                        {selectedUser.benefits_count}
                      </p>
                    </div>
                  </div>

                  {/* Memberships List */}
                  {selectedUser.memberships.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3">Memberships</h4>
                      <div className="space-y-2">
                        {selectedUser.memberships.map((membership) => (
                          <div
                            key={membership.id}
                            className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50"
                          >
                            <p className="font-medium text-zinc-900 dark:text-white">
                              {membership.name}
                            </p>
                            {membership.plan_name && (
                              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                {membership.plan_name}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </>
      )}

      {/* Affiliates Tab */}
      {activeTab === "affiliates" && (
        <div className="space-y-6">
          {/* Sub-tabs for Memberships / Benefits */}
          <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-800">
            <button
              onClick={() => setAffiliateSubTab("memberships")}
              className={cn(
                "px-4 py-2 font-medium transition-all border-b-2",
                affiliateSubTab === "memberships"
                  ? "border-primary text-primary"
                  : "border-transparent text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              )}
            >
              <CreditCard className="w-4 h-4 inline mr-2" />
              Memberships
            </button>
            <button
              onClick={() => setAffiliateSubTab("benefits")}
              className={cn(
                "px-4 py-2 font-medium transition-all border-b-2",
                affiliateSubTab === "benefits"
                  ? "border-primary text-primary"
                  : "border-transparent text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              )}
            >
              <Gift className="w-4 h-4 inline mr-2" />
              Benefits
            </button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                {affiliateSubTab === "memberships"
                  ? "Membership"
                  : "Benefit"}{" "}
                Affiliate Management
              </CardTitle>
              <CardDescription>
                Add and manage affiliate tracking for monetization
              </CardDescription>

              {/* Search and Filters */}
              <div className="flex gap-2 mt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input
                    placeholder={`Search ${affiliateSubTab}...`}
                    value={affiliateSearch}
                    onChange={(e) => setAffiliateSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <select
                  value={affiliateFilter}
                  onChange={(e) =>
                    setAffiliateFilter(e.target.value as "all" | "has" | "none")
                  }
                  className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
                >
                  <option value="all">All</option>
                  <option value="has">Has Affiliate</option>
                  <option value="none">No Affiliate</option>
                </select>
              </div>
            </CardHeader>
            <CardContent>
              {affiliateLoading ? (
                <div className="text-center py-8 text-zinc-500">
                  Loading {affiliateSubTab}...
                </div>
              ) : affiliateSubTab === "memberships" ? (
                // Memberships List
                <div className="space-y-2">
                  {memberships.length === 0 ? (
                    <div className="text-center py-8 text-zinc-500">
                      No memberships found
                    </div>
                  ) : (
                    memberships.map((membership) => (
                      <div
                        key={membership.id}
                        className="flex items-center justify-between p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-primary/30 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-all"
                      >
                        <div className="flex-1">
                          <h3 className="font-semibold text-zinc-900 dark:text-white">
                            {membership.name}
                          </h3>
                          {membership.affiliate_id ? (
                            <div className="mt-2 space-y-1 text-sm">
                              <p className="text-zinc-600 dark:text-zinc-400">
                                <span className="font-medium">
                                  Affiliate ID:
                                </span>{" "}
                                {membership.affiliate_id}
                              </p>
                              {membership.partner_name && (
                                <p className="text-zinc-600 dark:text-zinc-400">
                                  <span className="font-medium">Partner:</span>{" "}
                                  {membership.partner_name}
                                </p>
                              )}
                              {membership.commission_type && (
                                <Badge variant="secondary" className="mr-2">
                                  {membership.commission_type}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                              No affiliate information
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {membership.affiliate_url && (
                            <a
                              href={membership.affiliate_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-zinc-600 hover:text-primary"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openMembershipEdit(membership)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                // Benefits List
                <div className="space-y-2">
                  {benefits.length === 0 ? (
                    <div className="text-center py-8 text-zinc-500">
                      No benefits found
                    </div>
                  ) : (
                    benefits.map((benefit) => (
                      <div
                        key={benefit.id}
                        className="flex items-center justify-between p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-primary/30 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-all"
                      >
                        <div className="flex-1">
                          <h3 className="font-semibold text-zinc-900 dark:text-white">
                            {benefit.title}
                          </h3>
                          <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            {benefit.membership_name}
                            {benefit.vendor_name && ` • ${benefit.vendor_name}`}
                          </p>
                          {benefit.affiliate_id ? (
                            <div className="mt-2 space-y-1 text-sm">
                              <p className="text-zinc-600 dark:text-zinc-400">
                                <span className="font-medium">
                                  Affiliate ID:
                                </span>{" "}
                                {benefit.affiliate_id}
                              </p>
                              {benefit.partner_name && (
                                <p className="text-zinc-600 dark:text-zinc-400">
                                  <span className="font-medium">Partner:</span>{" "}
                                  {benefit.partner_name}
                                </p>
                              )}
                              {benefit.commission_type && (
                                <Badge variant="secondary" className="mr-2">
                                  {benefit.commission_type}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                              No affiliate information
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {benefit.affiliate_url && (
                            <a
                              href={benefit.affiliate_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-zinc-600 hover:text-primary"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openBenefitEdit(benefit)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Affiliate Edit Modal */}
          {(selectedMembership || selectedBenefit) && (
            <Dialog
              open={showAffiliateModal}
              onOpenChange={setShowAffiliateModal}
            >
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    Edit Affiliate Info:{" "}
                    {selectedMembership?.name || selectedBenefit?.title}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Affiliate ID
                    </label>
                    <Input
                      value={affiliateFormData.affiliate_id}
                      onChange={(e) =>
                        setAffiliateFormData({
                          ...affiliateFormData,
                          affiliate_id: e.target.value,
                        })
                      }
                      placeholder="e.g., partner-12345"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Affiliate URL
                    </label>
                    <Input
                      value={affiliateFormData.affiliate_url}
                      onChange={(e) =>
                        setAffiliateFormData({
                          ...affiliateFormData,
                          affiliate_url: e.target.value,
                        })
                      }
                      placeholder="https://partner.com/ref/..."
                      className="mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Commission Type
                      </label>
                      <select
                        value={affiliateFormData.commission_type}
                        onChange={(e) =>
                          setAffiliateFormData({
                            ...affiliateFormData,
                            commission_type: e.target.value,
                          })
                        }
                        className="mt-1 w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
                      >
                        <option value="">Select type</option>
                        <option value="cpa">CPA (Cost Per Action)</option>
                        <option value="cps">CPS (Cost Per Sale)</option>
                        <option value="revenue_share">Revenue Share</option>
                        <option value="hybrid">Hybrid</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Partner Name
                      </label>
                      <Input
                        value={affiliateFormData.partner_name}
                        onChange={(e) =>
                          setAffiliateFormData({
                            ...affiliateFormData,
                            partner_name: e.target.value,
                          })
                        }
                        placeholder="e.g., Impact, CJ, Direct"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Commission Notes
                    </label>
                    <textarea
                      value={affiliateFormData.commission_notes}
                      onChange={(e) =>
                        setAffiliateFormData({
                          ...affiliateFormData,
                          commission_notes: e.target.value,
                        })
                      }
                      placeholder="e.g., 10% commission on all sales, 30-day cookie window"
                      rows={3}
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white resize-none"
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={saveAffiliateData}
                      disabled={affiliateLoading}
                      className="flex-1"
                    >
                      {affiliateLoading ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowAffiliateModal(false)}
                      disabled={affiliateLoading}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          {/* Time Range Selector */}
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
              Analytics Dashboard
            </h2>
            <select
              value={analyticsDays}
              onChange={(e) => setAnalyticsDays(Number(e.target.value))}
              className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
            >
              <option value={1}>Last 24 hours</option>
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={365}>Last year</option>
            </select>
          </div>

          {analyticsLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-zinc-600 dark:text-zinc-400">
                Loading analytics...
              </p>
            </div>
          ) : (
            <>
              {/* Overview Metrics */}
              {analyticsOverview && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Total Events
                      </CardTitle>
                      <BarChart3 className="h-4 w-4 text-zinc-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {analyticsOverview.total_events}
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">
                        Last {analyticsDays} days
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Active Users
                      </CardTitle>
                      <Users className="h-4 w-4 text-zinc-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {analyticsOverview.daily_active_users}
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">
                        Unique users with events
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Affiliate Clicks
                      </CardTitle>
                      <DollarSign className="h-4 w-4 text-zinc-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {analyticsOverview.affiliate_clicks}
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">
                        Potential conversions
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Event Types
                      </CardTitle>
                      <TrendingUp className="h-4 w-4 text-zinc-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {analyticsOverview.events_by_type?.length || 0}
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">
                        Different event types
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Event Breakdown */}
              {analyticsOverview?.events_by_type &&
                analyticsOverview.events_by_type.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Event Breakdown</CardTitle>
                      <CardDescription>
                        Events tracked across the platform
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analyticsOverview.events_by_type.map((event: any) => (
                          <div
                            key={event.event_name}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-primary"></div>
                              <span className="font-medium text-zinc-900 dark:text-white">
                                {event.event_name}
                              </span>
                            </div>
                            <Badge variant="secondary">{event.count}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

              {/* Affiliate Performance Report */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Affiliate Performance
                  </CardTitle>
                  <CardDescription>
                    Top performing memberships and benefits by affiliate clicks
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {affiliateReport.length === 0 ? (
                    <div className="text-center py-8 text-zinc-500">
                      No affiliate clicks recorded yet
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {affiliateReport.map((item: any, index: number) => (
                        <div
                          key={`${item.type}-${item.id}`}
                          className="flex items-center justify-between p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-primary/30 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-light rounded-full flex items-center justify-center text-white font-bold text-sm">
                              {index + 1}
                            </div>
                            <div>
                              <h3 className="font-semibold text-zinc-900 dark:text-white">
                                {item.name}
                              </h3>
                              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                {item.type === "membership"
                                  ? "Membership"
                                  : "Benefit"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-lg font-bold text-zinc-900 dark:text-white">
                                {item.total_clicks}
                              </p>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                Total clicks
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-zinc-900 dark:text-white">
                                {item.unique_users}
                              </p>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                Unique users
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Empty State if no data */}
              {!analyticsOverview && affiliateReport.length === 0 && (
                <Card>
                  <CardContent className="py-12">
                    <div className="text-center">
                      <BarChart3 className="w-16 h-16 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold mb-2">
                        No Data Yet
                      </h3>
                      <p className="text-zinc-600 dark:text-zinc-400 max-w-md mx-auto">
                        Analytics data will appear here once users start
                        interacting with the platform.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
