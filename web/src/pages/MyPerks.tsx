import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  Filter,
  Plane,
  ShoppingBag,
  CreditCard as CreditCardIcon,
  Smartphone,
  Film,
  Shield,
  ChevronDown,
  AlertTriangle,
  CheckCircle,
  Sparkles,
} from "lucide-react";
import {
  api,
  Membership,
  Benefit,
  SmartAddOut,
  ValidateMembershipResponse,
  DiscoverMembershipResponse,
} from "@/lib/api";
import { useAuth } from "@/store/auth";
import { SectionHeader } from "@/components/SectionHeader";
import { BenefitCard } from "@/components/BenefitCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
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

// Category icons
const CATEGORY_ICONS: Record<
  string,
  { icon: any; color: string; emoji: string }
> = {
  travel: {
    icon: Plane,
    color: "text-blue-600 dark:text-blue-400",
    emoji: "✈️",
  },
  retail: {
    icon: ShoppingBag,
    color: "text-pink-600 dark:text-pink-400",
    emoji: "🛍",
  },
  banking: {
    icon: CreditCardIcon,
    color: "text-green-600 dark:text-green-400",
    emoji: "💳",
  },
  mobile: {
    icon: Smartphone,
    color: "text-purple-600 dark:text-purple-400",
    emoji: "📱",
  },
  entertainment: {
    icon: Film,
    color: "text-orange-600 dark:text-orange-400",
    emoji: "🎬",
  },
  insurance: {
    icon: Shield,
    color: "text-red-600 dark:text-red-400",
    emoji: "🛡",
  },
};

const CATEGORIES = Object.keys(CATEGORY_ICONS);

interface MembershipWithBenefits extends Membership {
  benefits: Benefit[];
  isExpanded?: boolean;
}

export default function MyPerks() {
  const { user } = useAuth();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [userMembershipIds, setUserMembershipIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedMemberships, setSelectedMemberships] = useState<number[]>([]);
  const [adding, setAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [expandedMemberships, setExpandedMemberships] = useState<Set<number>>(
    new Set()
  );
  const [removingMembership, setRemovingMembership] = useState<number | null>(
    null
  );

  // Add membership state
  const [showCreateMode, setShowCreateMode] = useState(false);
  const [newMembershipName, setNewMembershipName] = useState("");
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] =
    useState<ValidateMembershipResponse | null>(null);
  const [discovering, setDiscovering] = useState(false);
  const [discoveryResult, setDiscoveryResult] =
    useState<DiscoverMembershipResponse | null>(null);
  const [modalSearchTerm, setModalSearchTerm] = useState("");
  const [smartCheck, setSmartCheck] = useState<SmartAddOut | null>(null);
  const [checkingMembership, setCheckingMembership] = useState<number | null>(
    null
  );

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user?.id]);

  const loadData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const [allMemberships, userBenefits] = await Promise.all([
        api.getMemberships(),
        api.getUserBenefits(user.id),
      ]);

      setMemberships(allMemberships);
      setBenefits(userBenefits);

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

  // Group memberships by category
  const membershipsByCategory = useMemo(() => {
    const userMemberships = memberships.filter((m) =>
      userMembershipIds.includes(m.id)
    );

    const grouped: Record<string, MembershipWithBenefits[]> = {};

    userMemberships.forEach((membership) => {
      const membershipBenefits = benefits.filter(
        (b) => b.membership_id === membership.id
      );
      const enrichedMembership: MembershipWithBenefits = {
        ...membership,
        benefits: membershipBenefits,
      };

      // Categorize by provider slug or benefit category
      let category = "other";
      const slug = membership.provider_slug.toLowerCase();

      if (
        slug.includes("amex") ||
        slug.includes("chase") ||
        slug.includes("lloyds") ||
        slug.includes("hsbc") ||
        slug.includes("barclays")
      ) {
        category = "banking";
      } else if (
        slug.includes("ee") ||
        slug.includes("vodafone") ||
        slug.includes("o2") ||
        slug.includes("three")
      ) {
        category = "mobile";
      } else if (
        slug.includes("aa") ||
        slug.includes("british-airways") ||
        slug.includes("hilton")
      ) {
        category = "travel";
      } else if (slug.includes("amazon") || slug.includes("tesco")) {
        category = "retail";
      } else if (
        membershipBenefits.some((b) => b.category?.includes("travel"))
      ) {
        category = "travel";
      } else if (
        membershipBenefits.some(
          (b) =>
            b.category?.includes("shopping") || b.category?.includes("retail")
        )
      ) {
        category = "retail";
      }

      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(enrichedMembership);
    });

    return grouped;
  }, [memberships, userMembershipIds, benefits]);

  // Detect duplicate benefits
  const duplicateBenefits = useMemo(() => {
    const benefitMap = new Map<string, Benefit[]>();

    benefits.forEach((benefit) => {
      const key = benefit.title.toLowerCase().trim();
      if (!benefitMap.has(key)) {
        benefitMap.set(key, []);
      }
      benefitMap.get(key)!.push(benefit);
    });

    const duplicates = new Map<number, string[]>();
    benefitMap.forEach((benefitList, key) => {
      if (benefitList.length > 1) {
        benefitList.forEach((b) => {
          if (!duplicates.has(b.id)) {
            duplicates.set(b.id, []);
          }
          const otherMemberships = benefitList
            .filter((other) => other.membership_id !== b.membership_id)
            .map((other) => {
              const membership = memberships.find(
                (m) => m.id === other.membership_id
              );
              return membership?.name || "Unknown";
            });
          duplicates.set(b.id, otherMemberships);
        });
      }
    });

    return duplicates;
  }, [benefits, memberships]);

  const toggleMembership = (membershipId: number) => {
    setExpandedMemberships((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(membershipId)) {
        newSet.delete(membershipId);
      } else {
        newSet.add(membershipId);
      }
      return newSet;
    });
  };

  const handleRemoveMembership = async (membershipId: number) => {
    try {
      setRemovingMembership(membershipId);
      await api.removeUserMembership(user.id, membershipId);
      await loadData();
      localStorage.removeItem("vogo_cache_ai");
      localStorage.removeItem("vogo_cache_rule");
    } catch (error) {
      console.error("Failed to remove membership:", error);
    } finally {
      setRemovingMembership(null);
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
      await loadData();
    } catch (error) {
      console.error("Failed to add memberships:", error);
    } finally {
      setAdding(false);
    }
  };

  const toggleMembershipSelection = async (id: number) => {
    if (selectedMemberships.includes(id)) {
      setSelectedMemberships((prev) => prev.filter((m) => m !== id));
      setSmartCheck(null);
      return;
    }

    const membership = memberships.find((m) => m.id === id);
    if (!membership) return;

    setCheckingMembership(id);
    try {
      const check = await api.smartAddCheck({
        user_id: user.id,
        candidate_membership_slug: membership.provider_slug,
      });

      setSmartCheck(check);

      if (check.decision === "add") {
        setSelectedMemberships((prev) => [...prev, id]);
      }
    } catch (error) {
      console.error("Smart check failed:", error);
      setSelectedMemberships((prev) => [...prev, id]);
    } finally {
      setCheckingMembership(null);
    }
  };

  const handleValidateMembership = async () => {
    if (!newMembershipName.trim()) return;

    try {
      setValidating(true);
      setValidationResult(null);
      setDiscoveryResult(null);

      const result = await api.validateMembershipName({
        user_id: user.id,
        name: newMembershipName.trim(),
      });

      setValidationResult(result);

      if (result.status === "exists" && result.existing_membership) {
        if (!userMembershipIds.includes(result.existing_membership.id)) {
          setSelectedMemberships([result.existing_membership.id]);
        }
        // Exit create mode after a short delay so user can see the success message
        setTimeout(() => {
          setShowCreateMode(false);
          setNewMembershipName("");
          setValidationResult(null);
        }, 2000);
      }
    } catch (error) {
      console.error("Failed to validate membership:", error);
      setValidationResult({
        status: "invalid",
        confidence: 0,
        reason: "Failed to validate. Please try again.",
        suggestions: [],
      });
    } finally {
      setValidating(false);
    }
  };

  const handleDiscoverMembership = async () => {
    if (!validationResult || validationResult.status === "invalid") return;

    const nameToUse =
      validationResult.normalized_name || newMembershipName.trim();

    try {
      setDiscovering(true);

      // Exit create mode immediately so user can see the discovery happening
      setShowCreateMode(false);
      setNewMembershipName("");
      setValidationResult(null);
      setDiscoveryResult(null);

      const result = await api.discoverMembership({
        user_id: user.id,
        name: nameToUse,
      });

      await loadData();

      if (!userMembershipIds.includes(result.membership.id)) {
        setSelectedMemberships([result.membership.id]);
      }
    } catch (error) {
      console.error("Failed to discover membership:", error);
      // TODO: Show error toast
    } finally {
      setDiscovering(false);
    }
  };

  const handleUseSuggestion = async (suggestion: string) => {
    setNewMembershipName(suggestion);
    setValidationResult(null);
    setDiscoveryResult(null);

    // Auto-validate the suggestion
    try {
      setValidating(true);

      const result = await api.validateMembershipName({
        user_id: user.id,
        name: suggestion.trim(),
      });

      setValidationResult(result);

      // If it exists, suggest adding it directly
      if (result.status === "exists" && result.existing_membership) {
        if (!userMembershipIds.includes(result.existing_membership.id)) {
          setSelectedMemberships([result.existing_membership.id]);
        }
        // Exit create mode after a short delay so user can see the success message
        setTimeout(() => {
          setShowCreateMode(false);
          setNewMembershipName("");
          setValidationResult(null);
        }, 2000);
      }
    } catch (error) {
      console.error("Failed to validate membership:", error);
      setValidationResult({
        status: "invalid",
        confidence: 0,
        reason: "Failed to validate. Please try again.",
        suggestions: [],
      });
    } finally {
      setValidating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-1 gap-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  const filteredCategories = activeCategory
    ? [activeCategory]
    : Object.keys(membershipsByCategory);

  return (
    <div className="space-y-6">
      {/* Header */}
      <SectionHeader
        title="My Perks"
        description="All your memberships and benefits in one place"
        action={
          <Button onClick={() => setShowModal(true)} className="gap-2">
            <Plus className="w-5 h-5" />
            Add Membership
          </Button>
        }
      />

      {/* Search and Category Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
          <Input
            type="search"
            placeholder="Search memberships or benefits..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
          <Filter className="w-5 h-5 text-zinc-400 flex-shrink-0" />
          <Badge
            variant={!activeCategory ? "default" : "secondary"}
            className="cursor-pointer flex-shrink-0 gap-1"
            onClick={() => setActiveCategory(null)}
          >
            All Categories
          </Badge>
          {CATEGORIES.map((category) => {
            const config = CATEGORY_ICONS[category];
            return (
              <Badge
                key={category}
                variant={activeCategory === category ? "default" : "secondary"}
                className="cursor-pointer capitalize flex-shrink-0 gap-1"
                onClick={() => setActiveCategory(category)}
              >
                <span>{config.emoji}</span>
                {category}
              </Badge>
            );
          })}
        </div>
      </div>

      {/* Memberships Grouped by Category */}
      {userMembershipIds.length === 0 ? (
        <Card className="p-12 text-center">
          <CreditCardIcon className="w-16 h-16 text-zinc-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            No memberships yet
          </h3>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6">
            Add your first membership to start tracking benefits
          </p>
          <Button onClick={() => setShowModal(true)} className="gap-2">
            <Plus className="w-5 h-5" />
            Add Your First Membership
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredCategories.map((category, catIndex) => {
            const categoryMemberships = membershipsByCategory[category];
            if (!categoryMemberships || categoryMemberships.length === 0)
              return null;

            const config = CATEGORY_ICONS[category] || {
              icon: CreditCardIcon,
              color: "text-zinc-600",
              emoji: "📋",
            };
            const Icon = config.icon;

            return (
              <motion.div
                key={category}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: catIndex * 0.1 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 ${config.color}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 capitalize">
                    {config.emoji} {category}
                  </h2>
                  <Badge variant="secondary">
                    {categoryMemberships.length}
                  </Badge>
                </div>

                <div className="space-y-4">
                  {categoryMemberships.map((membership, index) => {
                    const isExpanded = expandedMemberships.has(membership.id);
                    const hasDuplicates = membership.benefits.some(
                      (b) =>
                        duplicateBenefits.has(b.id) &&
                        duplicateBenefits.get(b.id)!.length > 0
                    );

                    return (
                      <motion.div
                        key={membership.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card className="overflow-hidden hover:shadow-lg transition-all">
                          {/* Membership Header */}
                          <div
                            className="p-6 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                            onClick={() => toggleMembership(membership.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                                    {membership.name}
                                  </h3>
                                  {hasDuplicates && (
                                    <Badge variant="warning" className="gap-1">
                                      <AlertTriangle className="w-3 h-3" />
                                      Duplicate
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                  {membership.benefits.length} benefit
                                  {membership.benefits.length !== 1 ? "s" : ""}
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveMembership(membership.id);
                                  }}
                                  disabled={
                                    removingMembership === membership.id
                                  }
                                >
                                  {removingMembership === membership.id
                                    ? "Removing..."
                                    : "Remove"}
                                </Button>
                                <ChevronDown
                                  className={`w-5 h-5 text-zinc-400 transition-transform ${
                                    isExpanded ? "rotate-180" : ""
                                  }`}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Benefits List (Expanded) */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="border-t border-zinc-200 dark:border-zinc-800"
                              >
                                <div className="p-6 space-y-4 bg-zinc-50 dark:bg-zinc-900/30">
                                  {membership.benefits.length === 0 ? (
                                    <p className="text-center text-zinc-500 dark:text-zinc-400 py-8">
                                      No benefits discovered yet
                                    </p>
                                  ) : (
                                    membership.benefits.map((benefit) => {
                                      const isDuplicate = duplicateBenefits.has(
                                        benefit.id
                                      );
                                      const duplicateWith = isDuplicate
                                        ? duplicateBenefits.get(benefit.id)!
                                        : [];

                                      return (
                                        <div
                                          key={benefit.id}
                                          className="relative"
                                        >
                                          {isDuplicate &&
                                            duplicateWith.length > 0 && (
                                              <div className="mb-2 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-500">
                                                <AlertTriangle className="w-4 h-4" />
                                                <span>
                                                  ⚠️ Duplicate: Also available
                                                  via {duplicateWith.join(", ")}
                                                </span>
                                              </div>
                                            )}
                                          <BenefitCard benefit={benefit} />
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add Memberships Dialog - Same as before */}
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
              <div className="mb-4 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <Input
                  placeholder="Search memberships..."
                  value={modalSearchTerm}
                  onChange={(e) => setModalSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Button
                variant="outline"
                className="w-full mb-4 gap-2 border-dashed"
                onClick={() => setShowCreateMode(true)}
              >
                <Sparkles className="w-4 h-4" />
                Can't find it? Create new membership with AI
              </Button>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {memberships
                  .filter(
                    (m) =>
                      modalSearchTerm === "" ||
                      m.name
                        .toLowerCase()
                        .includes(modalSearchTerm.toLowerCase())
                  )
                  .map((membership) => (
                    <div
                      key={membership.id}
                      onClick={() => toggleMembershipSelection(membership.id)}
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
                          <CheckCircle className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {membership.name}
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
            </>
          ) : (
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

              {validationResult && (
                <Alert
                  variant={
                    validationResult.status === "valid" ||
                    validationResult.status === "exists"
                      ? "success"
                      : "warning"
                  }
                >
                  <AlertTitle>{validationResult.reason}</AlertTitle>
                  <AlertDescription>
                    {validationResult.normalized_name &&
                      validationResult.status !== "exists" && (
                        <p className="text-sm font-medium mb-2">
                          Normalized: {validationResult.normalized_name}
                        </p>
                      )}

                    {validationResult.suggestions &&
                      validationResult.suggestions.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium mb-1">
                            Suggestions:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {validationResult.suggestions.map(
                              (suggestion, idx) => (
                                <Button
                                  key={idx}
                                  variant="outline"
                                  size="sm"
                                  className="text-xs"
                                  onClick={() =>
                                    handleUseSuggestion(suggestion)
                                  }
                                >
                                  {suggestion}
                                </Button>
                              )
                            )}
                          </div>
                        </div>
                      )}

                    {validationResult.status === "valid" &&
                      !discoveryResult && (
                        <Button
                          className="mt-3 gap-2"
                          onClick={handleDiscoverMembership}
                          disabled={discovering}
                          size="sm"
                        >
                          <Sparkles className="w-4 h-4" />
                          {discovering ? "Discovering..." : "Discover Benefits"}
                        </Button>
                      )}

                    {validationResult.status === "exists" &&
                      validationResult.existing_membership && (
                        <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 rounded text-xs">
                          {userMembershipIds.includes(
                            validationResult.existing_membership.id
                          ) ? (
                            <>
                              ✓ You already have this membership! No need to add
                              it again.
                            </>
                          ) : (
                            <>
                              ✓ This membership is already in our catalog and
                              has been selected for you! Returning to catalog in
                              a moment...
                            </>
                          )}
                        </div>
                      )}
                  </AlertDescription>
                </Alert>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowCreateMode(false);
                  setNewMembershipName("");
                  setValidationResult(null);
                  setDiscoveryResult(null);
                }}
                className="w-full"
              >
                Back to Catalog
              </Button>
            </div>
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
