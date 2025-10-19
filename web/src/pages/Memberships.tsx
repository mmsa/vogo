import { useState, useEffect, useMemo } from "react";
import { Plus, Search, Filter, Sparkles, AlertCircle, CheckCircle } from "lucide-react";
import { 
  api, 
  Membership, 
  Benefit, 
  SmartAddOut,
  ValidateMembershipResponse,
  DiscoverMembershipResponse 
} from "@/lib/api";
import { useAuth } from "@/store/auth";
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
  const { user } = useAuth();
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
  
  // New membership creation state
  const [showCreateMode, setShowCreateMode] = useState(false);
  const [newMembershipName, setNewMembershipName] = useState("");
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidateMembershipResponse | null>(null);
  const [discovering, setDiscovering] = useState(false);
  const [discoveryResult, setDiscoveryResult] = useState<DiscoverMembershipResponse | null>(null);
  const [modalSearchTerm, setModalSearchTerm] = useState("");

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user?.id]);

  const loadData = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      // Load all memberships and user's memberships
      const [allMemberships, userBenefits] = await Promise.all([
        api.getMemberships(),
        api.getUserBenefits(user.id),
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
          api.addUserMembership(user.id, membershipId)
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
        user_id: user.id,
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
      await api.removeUserMembership(user.id, membershipId);
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

  // New membership validation and discovery
  const handleValidateMembership = async () => {
    if (!newMembershipName.trim()) return;
    
    try {
      setValidating(true);
      setValidationResult(null);
      setDiscoveryResult(null);
      
      const result = await api.validateMembershipName({
        user_id: user.id,
        name: newMembershipName.trim()
      });
      
      setValidationResult(result);
      
      // If it exists, suggest adding it directly
      if (result.status === "exists" && result.existing_membership) {
        // Auto-select the existing membership
        if (!userMembershipIds.includes(result.existing_membership.id)) {
          setSelectedMemberships([result.existing_membership.id]);
        }
      }
    } catch (error) {
      console.error("Failed to validate membership:", error);
      setValidationResult({
        status: "invalid",
        confidence: 0,
        reason: "Failed to validate. Please try again.",
        suggestions: []
      });
    } finally {
      setValidating(false);
    }
  };

  const handleDiscoverMembership = async () => {
    if (!validationResult || validationResult.status === "invalid") return;
    
    const nameToUse = validationResult.normalized_name || newMembershipName.trim();
    
    try {
      setDiscovering(true);
      
      const result = await api.discoverMembership({
        user_id: user.id,
        name: nameToUse
      });
      
      setDiscoveryResult(result);
      
      // Reload memberships to include the newly discovered one
      await loadData();
      
      // Auto-select it if not already added
      if (!userMembershipIds.includes(result.membership.id)) {
        setSelectedMemberships([result.membership.id]);
      }
    } catch (error) {
      console.error("Failed to discover membership:", error);
    } finally {
      setDiscovering(false);
    }
  };

  const handleCancelCreateMode = () => {
    setShowCreateMode(false);
    setNewMembershipName("");
    setValidationResult(null);
    setDiscoveryResult(null);
  };

  const handleUseSuggestion = (suggestion: string) => {
    setNewMembershipName(suggestion);
    setValidationResult(null);
    setDiscoveryResult(null);
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
            {showCreateMode 
              ? "Discover a new membership with AI" 
              : "Select from catalog or create new"}
          </DialogDescription>
        </DialogHeader>

        <DialogContent className="max-h-[70vh]">
          {!showCreateMode ? (
            <>
              {/* Search Bar */}
              <div className="mb-4 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <Input
                  placeholder="Search memberships..."
                  value={modalSearchTerm}
                  onChange={(e) => setModalSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Create New Button */}
              <Button
                variant="outline"
                className="w-full mb-4 gap-2 border-dashed"
                onClick={() => setShowCreateMode(true)}
              >
                <Sparkles className="w-4 h-4" />
                Can't find it? Create new membership with AI
              </Button>
            </>
          ) : (
            <>
              {/* Create Mode - Validation Flow */}
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. Revolut Premium, Amex Platinum..."
                    value={newMembershipName}
                    onChange={(e) => setNewMembershipName(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && !validating && !validationResult) {
                        handleValidateMembership();
                      }
                    }}
                    className="flex-1"
                    autoFocus
                  />
                  {!validationResult && (
                    <Button
                      onClick={handleValidateMembership}
                      disabled={validating || !newMembershipName.trim()}
                      size="sm"
                    >
                      {validating ? "Validating..." : "Validate"}
                    </Button>
                  )}
                </div>

                {/* Validation Result */}
                {validationResult && (
                  <Alert
                    variant={
                      validationResult.status === "valid" || validationResult.status === "exists"
                        ? "success"
                        : validationResult.status === "ambiguous"
                        ? "warning"
                        : "error"
                    }
                    className="animate-scale-in"
                  >
                    <div className="flex items-start gap-2">
                      {validationResult.status === "valid" || validationResult.status === "exists" ? (
                        <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <AlertTitle>
                          {validationResult.status === "exists"
                            ? "Already in Catalog"
                            : validationResult.status === "valid"
                            ? "Membership Validated"
                            : validationResult.status === "ambiguous"
                            ? "Please Be More Specific"
                            : "Invalid Membership"}
                        </AlertTitle>
                        <AlertDescription>
                          <p className="text-sm mb-2">{validationResult.reason}</p>
                          
                          {validationResult.normalized_name && validationResult.status !== "exists" && (
                            <p className="text-sm font-medium mb-2">
                              Normalized: {validationResult.normalized_name}
                            </p>
                          )}
                          
                          {validationResult.suggestions && validationResult.suggestions.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs font-medium mb-1">Suggestions:</p>
                              <div className="flex flex-wrap gap-1">
                                {validationResult.suggestions.map((suggestion, idx) => (
                                  <Button
                                    key={idx}
                                    variant="outline"
                                    size="sm"
                                    className="text-xs"
                                    onClick={() => handleUseSuggestion(suggestion)}
                                  >
                                    {suggestion}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {validationResult.status === "valid" && !discoveryResult && (
                            <Button
                              className="mt-3 gap-2"
                              onClick={handleDiscoverMembership}
                              disabled={discovering}
                            >
                              <Sparkles className="w-4 h-4" />
                              {discovering ? "Discovering benefits..." : "Discover Benefits with AI"}
                            </Button>
                          )}
                          
                          {validationResult.status === "exists" && validationResult.existing_membership && (
                            <div className="mt-3 text-xs">
                              This membership is already in our catalog. It will be auto-selected when you close this.
                            </div>
                          )}
                        </AlertDescription>
                      </div>
                    </div>
                  </Alert>
                )}

                {/* Discovery Result */}
                {discoveryResult && (
                  <Alert variant="success" className="animate-scale-in">
                    <CheckCircle className="w-5 h-5" />
                    <AlertTitle>Benefits Discovered!</AlertTitle>
                    <AlertDescription>
                      <p className="text-sm mb-2">
                        Found {discoveryResult.benefits_preview.length} benefits for{" "}
                        <strong>{discoveryResult.membership.name}</strong>
                      </p>
                      <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
                        {discoveryResult.benefits_preview.slice(0, 5).map((benefit, idx) => (
                          <div key={idx} className="flex items-start gap-1">
                            <span className="text-green-600">✓</span>
                            <span>{benefit.title}</span>
                          </div>
                        ))}
                        {discoveryResult.benefits_preview.length > 5 && (
                          <div className="text-zinc-500">
                            ...and {discoveryResult.benefits_preview.length - 5} more
                          </div>
                        )}
                      </div>
                      <p className="text-xs mt-2 text-zinc-500">
                        Membership has been added to the list below. Select it to add to your account.
                      </p>
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelCreateMode}
                  className="w-full"
                >
                  Back to Catalog
                </Button>
              </div>
            </>
          )}
          
          {!showCreateMode && (
            <>
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
          <div className="space-y-3">
            {Object.entries(
              memberships
                .filter((m) => 
                  modalSearchTerm === "" ||
                  m.name.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
                  (m.provider_name && m.provider_name.toLowerCase().includes(modalSearchTerm.toLowerCase())) ||
                  (m.plan_name && m.plan_name.toLowerCase().includes(modalSearchTerm.toLowerCase()))
                )
                .reduce((acc, m) => {
                  const provider = m.provider_name || m.name.split(' ')[0];
                  if (!acc[provider]) acc[provider] = [];
                  acc[provider].push(m);
                  return acc;
                }, {} as Record<string, typeof memberships>)
            ).map(([provider, providerMemberships]) => (
              <div key={provider} className="space-y-1">
                {providerMemberships.length > 1 && (
                  <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 px-2">
                    {provider}
                  </div>
                )}
                {providerMemberships.map((membership) => (
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
                <div className="flex-1">
                  <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {membership.provider_name && membership.plan_name ? (
                      <>
                        <span className="text-zinc-500 dark:text-zinc-400">{membership.provider_name}</span>
                        {" "}<span>{membership.plan_name}</span>
                      </>
                    ) : (
                      membership.name
                    )}
                  </div>
                </div>
                {checkingMembership === membership.id && (
                  <Badge variant="secondary" className="text-xs">
                    Checking...
                  </Badge>
                )}
              </div>
                ))}
              </div>
            ))}
          </div>
            </>
          )}
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
