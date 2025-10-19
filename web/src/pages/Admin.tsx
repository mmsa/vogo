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
                      variant={user.role === "admin" ? "default" : "outline"}
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
                    JSON.parse(localStorage.getItem('vogplus-auth')).state.accessToken{" "}
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
                  <DialogTitle className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-light rounded-full flex items-center justify-center text-white font-medium">
                      {selectedUser.email.charAt(0).toUpperCase()}
                    </div>
                    {selectedUser.email}
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
                          selectedUser.role === "admin" ? "default" : "outline"
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Affiliate Management
              </CardTitle>
              <CardDescription>
                Manage affiliate IDs, URLs, and commission tracking for
                memberships and benefits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <DollarSign className="w-16 h-16 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  Affiliate Management Coming Soon
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400 mb-6 max-w-md mx-auto">
                  Manage affiliate information for all memberships and benefits
                  to start earning commissions.
                </p>
                <div className="space-y-4 text-left max-w-2xl mx-auto">
                  <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-4">
                    <h4 className="font-semibold mb-2">✅ Backend Ready</h4>
                    <ul className="text-sm space-y-1 text-zinc-600 dark:text-zinc-400">
                      <li>
                        • GET /api/admin/memberships - List memberships with
                        affiliate info
                      </li>
                      <li>
                        • PATCH /api/admin/memberships/{"{id}"}/affiliate -
                        Update affiliate info
                      </li>
                      <li>
                        • GET /api/admin/benefits - List benefits with affiliate
                        info
                      </li>
                      <li>
                        • PATCH /api/admin/benefits/{"{id}"}/affiliate - Update
                        affiliate info
                      </li>
                    </ul>
                  </div>
                  <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-4">
                    <h4 className="font-semibold mb-2">
                      🎯 What You Can Track
                    </h4>
                    <ul className="text-sm space-y-1 text-zinc-600 dark:text-zinc-400">
                      <li>• Affiliate ID & URL</li>
                      <li>• Commission Type (CPA, Revenue Share, etc.)</li>
                      <li>• Partner Name</li>
                      <li>• Commission Notes</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Analytics Dashboard
              </CardTitle>
              <CardDescription>
                View platform analytics, user behavior, and affiliate
                performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <BarChart3 className="w-16 h-16 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  Analytics Dashboard Coming Soon
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400 mb-6 max-w-md mx-auto">
                  Track user engagement, affiliate clicks, and platform
                  performance in real-time.
                </p>
                <div className="space-y-4 text-left max-w-2xl mx-auto">
                  <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-4">
                    <h4 className="font-semibold mb-2">✅ Backend Ready</h4>
                    <ul className="text-sm space-y-1 text-zinc-600 dark:text-zinc-400">
                      <li>
                        • GET /api/admin/analytics/overview - Platform overview
                      </li>
                      <li>
                        • GET /api/admin/analytics/affiliate-report - Affiliate
                        performance
                      </li>
                      <li>• POST /api/analytics/event - Event tracking</li>
                    </ul>
                  </div>
                  <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-4">
                    <h4 className="font-semibold mb-2">📊 Metrics Available</h4>
                    <ul className="text-sm space-y-1 text-zinc-600 dark:text-zinc-400">
                      <li>• Daily Active Users (DAU)</li>
                      <li>• Total Events by Type</li>
                      <li>• Affiliate Click Tracking</li>
                      <li>• Top Performing Benefits/Memberships</li>
                      <li>• Custom Date Ranges (1-365 days)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
