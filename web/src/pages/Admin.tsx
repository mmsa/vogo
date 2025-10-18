import { useState, useEffect } from "react";
import { Users, CreditCard, Gift, TrendingUp, Search, Shield, CheckCircle, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { apiClient } from "@/lib/api";
import { cn } from "@/lib/utils";

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
}

interface UserDetails extends User {
  memberships: Array<{
    id: number;
    name: string;
    provider_name: string;
    plan_name?: string;
  }>;
  memberships_count: number;
  benefits_count: number;
}

export default function Admin() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    loadUsers();
  }, []);

  const loadStats = async () => {
    try {
      const response = await apiClient.get("/api/admin/stats");
      setStats(response.data);
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get("/api/admin/users", {
        params: { search: search || undefined },
      });
      setUsers(response.data.users);
    } catch (error) {
      console.error("Failed to load users:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserDetails = async (userId: number) => {
    try {
      const response = await apiClient.get(`/api/admin/users/${userId}`);
      setSelectedUser(response.data);
      setShowUserModal(true);
    } catch (error) {
      console.error("Failed to load user details:", error);
    }
  };

  const handleSearch = () => {
    loadUsers();
  };

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

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-zinc-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.users.total}</div>
              <p className="text-xs text-zinc-500 mt-1">
                {stats.users.active} active • {stats.users.recent} new this week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Memberships</CardTitle>
              <CreditCard className="h-4 w-4 text-zinc-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.memberships.total}</div>
              <p className="text-xs text-zinc-500 mt-1">
                {stats.memberships.user_subscriptions} user subscriptions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Benefits</CardTitle>
              <Gift className="h-4 w-4 text-zinc-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.benefits.total}</div>
              <p className="text-xs text-zinc-500 mt-1">
                {stats.benefits.approved} approved • {stats.benefits.pending} pending
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-zinc-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round((stats.benefits.approved / stats.benefits.total) * 100)}%
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
          <CardDescription>Manage platform users and their memberships</CardDescription>
          
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
            <div className="text-center py-8 text-zinc-500">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">No users found</div>
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
                        Joined {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {user.role === "admin" && (
                      <Badge variant="default">Admin</Badge>
                    )}
                    {user.is_active ? (
                      <Badge variant="default" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-500">
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
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Role</p>
                  <Badge variant={selectedUser.role === "admin" ? "default" : "outline"} className="mt-1">
                    {selectedUser.role}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Status</p>
                  <Badge
                    variant={selectedUser.is_active ? "default" : "destructive"}
                    className={cn(
                      "mt-1",
                      selectedUser.is_active && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-500"
                    )}
                  >
                    {selectedUser.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Memberships</p>
                  <p className="text-xl font-bold mt-1">{selectedUser.memberships_count}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Benefits</p>
                  <p className="text-xl font-bold mt-1">{selectedUser.benefits_count}</p>
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
    </div>
  );
}

