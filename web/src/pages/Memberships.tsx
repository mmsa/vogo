import { useState, useEffect, useMemo } from "react";
import { Plus, Search, Filter } from "lucide-react";
import { api, CURRENT_USER_ID, Membership, Benefit, SmartAddOut } from "@/lib/api";
import { SectionHeader } from "@/components/SectionHeader";
import { MembershipCard } from "@/components/MembershipCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogFooter,
  DialogClose,
} from "@/components/ui/Dialog";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/Alert";

const CATEGORIES = [
  "all",
  "banking",
  "travel",
  "mobile",
  "retail",
  "entertainment",
];

export default function Memberships() {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [userMembershipIds, setUserMembershipIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedMemberships, setSelectedMemberships] = useState<number[]>([]);
  const [adding, setAdding] = useState(false);
  const [smartCheck, setSmartCheck] = useState<SmartAddOut | null>(null);
  const [checkingMembership, setCheckingMembership] = useState<number | null>(
    null
  );
  const [removingMembership, setRemovingMembership] = useState<number | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [showAddedOnly, setShowAddedOnly] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Load all memberships and user's memberships
      const [allMemberships, userBenefits] = await Promise.all([
        api.getMemberships(),
        api.getUserBenefits(CURRENT_USER_ID),
      ]);

      setMemberships(allMemberships);

      // Extract unique membership IDs from user benefits
      const userMembershipSet = new Set(
        userBenefits.map((b: Benefit) => b.membership_id)
      );
      setUserMembershipIds(Array.from(userMembershipSet) as number[]);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMemberships = async () => {
    try {
      setAdding(true);
      await Promise.all(
        selectedMemberships.map((membershipId) =>
          api.addUserMembership(CURRENT_USER_ID, membershipId)
        )
      );
      setShowModal(false);
      setSelectedMemberships([]);
      // Reload to show updated added memberships
      await loadData();
      // TODO: Show success toast
    } catch (error) {
      console.error("Failed to add memberships:", error);
      // TODO: Show error toast
    } finally {
      setAdding(false);
    }
  };

  const toggleMembership = async (id: number) => {
    // If unchecking, just remove
    if (selectedMemberships.includes(id)) {
      setSelectedMemberships((prev) => prev.filter((m) => m !== id));
      setSmartCheck(null);
      return;
    }

    // Run smart check when selecting
    const membership = memberships.find((m) => m.id === id);
    if (!membership) return;

    setCheckingMembership(id);
    try {
      const check = await api.smartAddCheck({
        user_id: CURRENT_USER_ID,
        candidate_membership_slug: membership.provider_slug,
      });

      setSmartCheck(check);

      // Auto-add if decision is "add"
      if (check.decision === "add") {
        setSelectedMemberships((prev) => [...prev, id]);
      }
    } catch (error) {
      console.error("Smart check failed:", error);
      // On error, just add it
      setSelectedMemberships((prev) => [...prev, id]);
    } finally {
      setCheckingMembership(null);
    }
  };

  const forceAddAfterWarning = () => {
    const membershipToAdd = memberships.find(
      (m) => m.id === smartCheck?.impacted_benefits[0]?.membership_id
    );
    if (membershipToAdd) {
      setSelectedMemberships((prev) => [...prev, membershipToAdd.id]);
    }
    setSmartCheck(null);
  };

  const dismissWarning = () => {
    setSmartCheck(null);
    setCheckingMembership(null);
  };

  const handleRemoveMembership = async (membershipId: number) => {
    try {
      setRemovingMembership(membershipId);
      await api.removeUserMembership(CURRENT_USER_ID, membershipId);
      // Reload data to reflect removal
      await loadData();
      // Clear caches for recommendations
      localStorage.removeItem("vogo_cache_ai");
      localStorage.removeItem("vogo_cache_rule");
      // TODO: Show success toast
    } catch (error) {
      console.error("Failed to remove membership:", error);
      // TODO: Show error toast
    } finally {
      setRemovingMembership(null);
    }
  };

  // Filter memberships
  const filteredMemberships = useMemo(() => {
    return memberships.filter((membership) => {
      const matchesSearch =
        searchQuery === "" ||
        membership.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        membership.provider_slug
          .toLowerCase()
          .includes(searchQuery.toLowerCase());

      const matchesCategory =
        activeCategory === "all" ||
        membership.provider_slug.toLowerCase().includes(activeCategory);

      const matchesAddedFilter =
        !showAddedOnly || userMembershipIds.includes(membership.id);

      return matchesSearch && matchesCategory && matchesAddedFilter;
    });
  }, [
    memberships,
    searchQuery,
    activeCategory,
    showAddedOnly,
    userMembershipIds,
  ]);

  // Split into added and available
  const addedMemberships = useMemo(
    () => filteredMemberships.filter((m) => userMembershipIds.includes(m.id)),
    [filteredMemberships, userMembershipIds]
  );

  const availableMemberships = useMemo(
    () => filteredMemberships.filter((m) => !userMembershipIds.includes(m.id)),
    [filteredMemberships, userMembershipIds]
  );


  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <SectionHeader
        title="Memberships"
        description="Manage your active memberships and discover new ones"
        action={
          <Button onClick={() => setShowModal(true)} className="gap-2">
            <Plus className="w-5 h-5" />
            Add Memberships
          </Button>
        }
      />

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
          <Input
            type="search"
            placeholder="Search memberships..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
          <Filter className="w-5 h-5 text-zinc-400 flex-shrink-0" />
          <Badge
            variant={showAddedOnly ? "default" : "secondary"}
            className="cursor-pointer flex-shrink-0"
            onClick={() => setShowAddedOnly(!showAddedOnly)}
          >
            My Memberships ({userMembershipIds.length})
          </Badge>
          {CATEGORIES.map((category) => (
            <Badge
              key={category}
              variant={activeCategory === category ? "default" : "secondary"}
              className="cursor-pointer capitalize flex-shrink-0"
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </Badge>
          ))}
        </div>
      </div>

      {/* Active Memberships Section */}
      {addedMemberships.length > 0 && !showAddedOnly && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            Your Active Memberships
            <Badge variant="success">{addedMemberships.length}</Badge>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {addedMemberships.map((membership, index) => (
              <div
                key={membership.id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <MembershipCard
                  membership={membership}
                  isAdded={true}
                  isChecking={false}
                  onToggle={() => {}}
                  onRemove={() => handleRemoveMembership(membership.id)}
                  isRemoving={removingMembership === membership.id}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Memberships Section */}
      {availableMemberships.length > 0 && !showAddedOnly && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Available Memberships
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableMemberships.map((membership, index) => (
              <div
                key={membership.id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <MembershipCard
                  membership={membership}
                  isAdded={false}
                  isChecking={false}
                  onToggle={() => {}}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Showing only added memberships */}
      {showAddedOnly && (
        <>
          {addedMemberships.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {addedMemberships.map((membership, index) => (
                <div
                  key={membership.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <MembershipCard
                    membership={membership}
                    isAdded={true}
                    isChecking={false}
                    onToggle={() => {}}
                    onRemove={() => handleRemoveMembership(membership.id)}
                    isRemoving={removingMembership === membership.id}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-zinc-500 dark:text-zinc-400">
                No active memberships yet. Add some to get started!
              </p>
            </div>
          )}
        </>
      )}

      {/* Empty state for all filters */}
      {!showAddedOnly && filteredMemberships.length === 0 && (
        <div className="text-center py-12">
          <p className="text-zinc-500 dark:text-zinc-400">
            No memberships found matching your criteria
          </p>
        </div>
      )}

      {/* Add Memberships Dialog */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogClose onClose={() => setShowModal(false)} />
        <DialogHeader>
          <DialogTitle>Add Memberships</DialogTitle>
          <DialogDescription>
            Select memberships to add to your account
          </DialogDescription>
        </DialogHeader>

        <DialogContent className="max-h-[60vh]">
          {/* Smart Check Warning */}
          {smartCheck && smartCheck.decision !== "add" && (
            <Alert
              variant={
                smartCheck.decision === "already_covered" ? "warning" : "info"
              }
              className="mb-4"
            >
              <AlertTitle>
                {smartCheck.decision === "already_covered"
                  ? "Already Covered"
                  : "Better Alternative Available"}
              </AlertTitle>
              <AlertDescription>
                <p className="mb-2">{smartCheck.explanation}</p>
                {smartCheck.impacted_benefits.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-medium mb-1">
                      Overlapping benefits:
                    </p>
                    <ul className="text-xs space-y-0.5">
                      {smartCheck.impacted_benefits
                        .slice(0, 3)
                        .map((benefit: Benefit, idx: number) => (
                          <li key={idx}>• {benefit.title}</li>
                        ))}
                    </ul>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button size="sm" onClick={forceAddAfterWarning}>
                    Add Anyway
                  </Button>
                  <Button size="sm" variant="outline" onClick={dismissWarning}>
                    Cancel
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Membership List */}
          <div className="space-y-2">
            {memberships.map((membership) => (
              <div
                key={membership.id}
                onClick={() => toggleMembership(membership.id)}
                className="flex items-center gap-3 p-4 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
              >
                <div
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                    selectedMemberships.includes(membership.id)
                      ? "bg-primary border-primary"
                      : "border-zinc-300 dark:border-zinc-600"
                  }`}
                >
                  {selectedMemberships.includes(membership.id) && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="currentColor"
                      viewBox="0 0 12 12"
                    >
                      <path
                        d="M10 3L4.5 8.5L2 6"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="none"
                      />
                    </svg>
                  )}
                </div>
                <span className="flex-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {membership.name}
                </span>
                {checkingMembership === membership.id && (
                  <Badge variant="secondary" className="text-xs">
                    Checking...
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </DialogContent>

        <DialogFooter>
          <Button variant="outline" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAddMemberships}
            disabled={adding || selectedMemberships.length === 0}
          >
            {adding
              ? "Adding..."
              : `Add ${selectedMemberships.length} Selected`}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
