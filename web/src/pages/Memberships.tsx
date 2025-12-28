import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Filter,
  Sparkles,
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Upload,
  FileText,
  Loader2,
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
import { MembershipCard } from "@/components/MembershipCard";
import { GroupedMembershipCard } from "@/components/GroupedMembershipCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
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
  const navigate = useNavigate();
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
  const [currentPage, setCurrentPage] = useState(1);
  const [membershipsPerPage] = useState(12); // Show 12 memberships per page
  const [activeMembershipsPage, setActiveMembershipsPage] = useState(1);
  const [activeMembershipsPerPage] = useState(6); // Show 6 active memberships per page

  // New membership creation state
  const [showCreateMode, setShowCreateMode] = useState(false);
  const [newMembershipName, setNewMembershipName] = useState("");
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] =
    useState<ValidateMembershipResponse | null>(null);
  const [discovering, setDiscovering] = useState(false);
  const [discoveryResult, setDiscoveryResult] =
    useState<DiscoverMembershipResponse | null>(null);
  const [modalSearchTerm, setModalSearchTerm] = useState("");
  const [validatedMembershipId, setValidatedMembershipId] = useState<number | null>(null);
  const [confirmAddMembership, setConfirmAddMembership] = useState<Membership | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Membership[] | null>(null);
  
  // Bank statement upload state
  const [showBankStatementUpload, setShowBankStatementUpload] = useState(false);
  const [uploadingStatement, setUploadingStatement] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const resetModalState = () => {
    setShowCreateMode(false);
    setNewMembershipName("");
    setValidationResult(null);
    setDiscoveryResult(null);
    setValidatedMembershipId(null);
    setModalSearchTerm("");
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
      resetModalState();
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

  const handleQuickAddMembership = async (membershipId: number) => {
    const membership = memberships.find((m) => m.id === membershipId);
    if (!membership) return;

    // Run smart check first
    setCheckingMembership(membershipId);
    try {
      const check = await api.smartAddCheck({
        user_id: user.id,
        candidate_membership_slug: membership.provider_slug,
      });

      // If there's a warning, show confirmation dialog
      if (check.decision !== "add") {
        setSmartCheck(check);
        setConfirmAddMembership(membership);
        setShowModal(true);
        setSelectedMemberships([membershipId]);
        return;
      }

      // If safe to add, show simple confirmation
      setConfirmAddMembership(membership);
    } catch (error) {
      console.error("Smart check failed:", error);
      // On error, just show confirmation
      setConfirmAddMembership(membership);
    } finally {
      setCheckingMembership(null);
    }
  };

  const confirmAndAddMembership = async () => {
    if (!confirmAddMembership) return;

    try {
      setAdding(true);
      await api.addUserMembership(user.id, confirmAddMembership.id);
      setConfirmAddMembership(null);
      setSmartCheck(null);
      // Reload to show updated added memberships
      await loadData();
      // Clear caches for recommendations
      localStorage.removeItem("vogo_cache_ai");
      localStorage.removeItem("vogo_cache_rule");
      // TODO: Show success toast
    } catch (error) {
      console.error("Failed to add membership:", error);
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

  const handleBankStatementUpload = async (file: File) => {
    if (!file.name.endsWith('.pdf')) {
      setUploadError("Please upload a PDF file");
      return;
    }

    try {
      setUploadingStatement(true);
      setUploadError(null);
      setUploadResult(null);

      const result = await api.uploadBankStatement(file);
      setUploadResult(result);

      // Reload memberships to show newly added ones
      await loadData();
      
      // Clear caches
      localStorage.removeItem("vogo_cache_ai");
      localStorage.removeItem("vogo_cache_rule");
    } catch (error: any) {
      console.error("Bank statement upload failed:", error);
      setUploadError(error.message || "Failed to process bank statement");
    } finally {
      setUploadingStatement(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.pdf')) {
      handleBankStatementUpload(file);
    } else {
      setUploadError("Please drop a PDF file");
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
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
        name: newMembershipName.trim(),
      });

      setValidationResult(result);

      // If it exists, suggest adding it directly
      if (result.status === "exists" && result.existing_membership) {
        // Auto-select the existing membership
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

      const result = await api.discoverMembership({
        user_id: user.id,
        name: nameToUse,
      });

      setDiscoveryResult(result);
      setValidatedMembershipId(result.membership.id);

      // Reload memberships to include the newly discovered one
      await loadData();

      // Auto-select it if not already added
      if (!userMembershipIds.includes(result.membership.id)) {
        setSelectedMemberships((prev) => {
          if (!prev.includes(result.membership.id)) {
            return [...prev, result.membership.id];
          }
          return prev;
        });
      }
    } catch (error) {
      console.error("Failed to discover membership:", error);
      // TODO: Show error toast
    } finally {
      setDiscovering(false);
    }
  };

  const handleCancelCreateMode = () => {
    setShowCreateMode(false);
    setNewMembershipName("");
    setValidationResult(null);
    setDiscoveryResult(null);
    setValidatedMembershipId(null);
    // Keep modal open, just exit create mode
  };

  const handleUseSuggestion = async (suggestion: string) => {
    setNewMembershipName(suggestion);
    setValidationResult(null);
    setDiscoveryResult(null);
    setValidatedMembershipId(null);

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

  // Pagination for active memberships
  const activeMembershipsTotalPages = Math.ceil(addedMemberships.length / activeMembershipsPerPage);
  const activeMembershipsStartIndex = (activeMembershipsPage - 1) * activeMembershipsPerPage;
  const activeMembershipsEndIndex = activeMembershipsStartIndex + activeMembershipsPerPage;
  const paginatedActiveMemberships = addedMemberships.slice(activeMembershipsStartIndex, activeMembershipsEndIndex);

  // Reset active memberships page when filters change
  useEffect(() => {
    setActiveMembershipsPage(1);
  }, [searchQuery, activeCategory]);

  const availableMemberships = useMemo(
    () => filteredMemberships.filter((m) => !userMembershipIds.includes(m.id)),
    [filteredMemberships, userMembershipIds]
  );

  // Group available memberships by provider/company
  const groupedMemberships = useMemo(() => {
    const groups: Record<string, typeof availableMemberships> = {};
    
    availableMemberships.forEach((membership) => {
      // Use provider_name if available, otherwise extract from name
      const provider = membership.provider_name || membership.name.split(" ")[0];
      if (!groups[provider]) {
        groups[provider] = [];
      }
      groups[provider].push(membership);
    });

    // Sort groups alphabetically and sort memberships within each group
    return Object.keys(groups)
      .sort()
      .reduce((acc, key) => {
        acc[key] = groups[key].sort((a, b) => a.name.localeCompare(b.name));
        return acc;
      }, {} as Record<string, typeof availableMemberships>);
  }, [availableMemberships]);

  // Separate grouped (multiple plans) and single memberships
  const { groupedItems, singleItems } = useMemo(() => {
    const grouped: Array<{ providerName: string; memberships: Membership[] }> = [];
    const single: Membership[] = [];
    
    Object.entries(groupedMemberships).forEach(([providerName, memberships]) => {
      if (memberships.length > 1) {
        grouped.push({ providerName, memberships });
      } else {
        single.push(memberships[0]);
      }
    });
    
    return { groupedItems: grouped, singleItems: single };
  }, [groupedMemberships]);

  // Flatten for pagination: include grouped items as single entries + single items
  const flattenedMemberships = useMemo(() => {
    // Create a flat list where grouped items are represented as a single entry
    const flat: Array<{ type: 'grouped' | 'single'; data: any }> = [];
    
    groupedItems.forEach(({ providerName, memberships }) => {
      flat.push({ type: 'grouped', data: { providerName, memberships } });
    });
    
    singleItems.forEach((membership) => {
      flat.push({ type: 'single', data: membership });
    });
    
    return flat;
  }, [groupedItems, singleItems]);

  // Pagination calculations
  const totalPages = Math.ceil(flattenedMemberships.length / membershipsPerPage);
  const startIndex = (currentPage - 1) * membershipsPerPage;
  const endIndex = startIndex + membershipsPerPage;
  const paginatedMemberships = flattenedMemberships.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeCategory, showAddedOnly]);

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
    <div className="space-y-6 animate-fade-in w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-1">
            Memberships
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Manage your active memberships and discover new ones
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button 
            onClick={() => setShowBankStatementUpload(true)} 
            variant="outline"
            className="gap-2"
          >
            <Upload className="w-5 h-5" />
            Upload Bank Statement
          </Button>
          <Button onClick={() => setShowModal(true)} className="gap-2">
            <Plus className="w-5 h-5" />
            Add Memberships
          </Button>
        </div>
      </div>

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
        <div className="space-y-4 w-full">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              Your Active Memberships
              <Badge variant="success">{addedMemberships.length}</Badge>
            </h2>
            {addedMemberships.length > activeMembershipsPerPage && (
              <div className="text-sm text-zinc-500 dark:text-zinc-400">
                Showing {activeMembershipsStartIndex + 1}-{Math.min(activeMembershipsEndIndex, addedMemberships.length)} of {addedMemberships.length}
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 w-full">
            {paginatedActiveMemberships.map((membership, index) => (
              <div
                key={membership.id}
                className="animate-fade-in w-full"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <MembershipCard
                  membership={membership}
                  isAdded={true}
                  isChecking={false}
                  onToggle={() => {}}
                  onRemove={() => handleRemoveMembership(membership.id)}
                  isRemoving={removingMembership === membership.id}
                  onViewBenefits={() => navigate(`/memberships/${membership.id}`)}
                />
              </div>
            ))}
          </div>

          {/* Pagination for Active Memberships */}
          {activeMembershipsTotalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveMembershipsPage((prev) => Math.max(1, prev - 1))}
                disabled={activeMembershipsPage === 1}
                className="gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: activeMembershipsTotalPages }, (_, i) => i + 1).map((page) => {
                  if (
                    page === 1 ||
                    page === activeMembershipsTotalPages ||
                    (page >= activeMembershipsPage - 1 && page <= activeMembershipsPage + 1)
                  ) {
                    return (
                      <Button
                        key={page}
                        variant={activeMembershipsPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setActiveMembershipsPage(page)}
                        className="min-w-[2.5rem]"
                      >
                        {page}
                      </Button>
                    );
                  } else if (page === activeMembershipsPage - 2 || page === activeMembershipsPage + 2) {
                    return (
                      <span key={page} className="px-2 text-zinc-500">
                        ...
                      </span>
                    );
                  }
                  return null;
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveMembershipsPage((prev) => Math.min(activeMembershipsTotalPages, prev + 1))}
                disabled={activeMembershipsPage === activeMembershipsTotalPages}
                className="gap-1"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Available Memberships Section - Redesigned Compact Layout */}
      {availableMemberships.length > 0 && !showAddedOnly && (
        <div className="w-full">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              Available Memberships
            </h2>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              {flattenedMemberships.length} total • Page {currentPage} of {totalPages}
            </div>
          </div>

          {/* Compact Grid Layout - Show Grouped and Single Items */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 w-full">
            {paginatedMemberships.map((item, index) => {
              if (item.type === 'grouped') {
                const { providerName, memberships } = item.data;
                return (
                  <div
                    key={`group-${providerName}`}
                    className="animate-fade-in w-full"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <GroupedMembershipCard
                      providerName={providerName}
                      memberships={memberships}
                      onClick={() => setSelectedGroup(memberships)}
                    />
                  </div>
                );
              } else {
                const membership = item.data;
                return (
                  <div
                    key={membership.id}
                    className="animate-fade-in w-full"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <MembershipCard
                      membership={membership}
                      isAdded={false}
                      isChecking={checkingMembership === membership.id}
                      onToggle={() => handleQuickAddMembership(membership.id)}
                      onViewBenefits={() => navigate(`/memberships/${membership.id}`)}
                    />
                  </div>
                );
              }
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  // Show first page, last page, current page, and pages around current
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="min-w-[2.5rem]"
                      >
                        {page}
                      </Button>
                    );
                  } else if (page === currentPage - 2 || page === currentPage + 2) {
                    return (
                      <span key={page} className="px-2 text-zinc-500">
                        ...
                      </span>
                    );
                  }
                  return null;
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="gap-1"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Showing only added memberships */}
      {showAddedOnly && (
        <>
          {addedMemberships.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 w-full">
              {addedMemberships.map((membership, index) => (
                <div
                  key={membership.id}
                  className="animate-fade-in w-full"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <MembershipCard
                    membership={membership}
                    isAdded={true}
                    isChecking={false}
                    onToggle={() => {}}
                    onRemove={() => handleRemoveMembership(membership.id)}
                    isRemoving={removingMembership === membership.id}
                    onViewBenefits={() => navigate(`/memberships/${membership.id}`)}
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

      {/* Quick Add Confirmation Dialog */}
      <Dialog
        open={!!confirmAddMembership && !showModal}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmAddMembership(null);
            setSmartCheck(null);
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Add Membership</DialogTitle>
          <DialogDescription>
            {smartCheck && smartCheck.decision !== "add"
              ? smartCheck.explanation
              : `Add ${confirmAddMembership?.name} to your memberships?`}
          </DialogDescription>
        </DialogHeader>
        <DialogContent>
          {smartCheck && smartCheck.decision !== "add" && (
            <Alert
              variant={
                smartCheck.decision === "already_covered"
                  ? "warning"
                  : "info"
              }
              className="mb-4"
            >
              <AlertTitle>
                {smartCheck.decision === "already_covered"
                  ? "Already Covered"
                  : "Better Alternative Available"}
              </AlertTitle>
              <AlertDescription>
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
              </AlertDescription>
            </Alert>
          )}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <CreditCard className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                {confirmAddMembership?.name}
              </div>
              {confirmAddMembership?.provider_name && (
                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                  {confirmAddMembership.provider_name}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setConfirmAddMembership(null);
              setSmartCheck(null);
            }}
          >
            Cancel
          </Button>
          <Button onClick={confirmAndAddMembership} disabled={adding}>
            {adding ? "Adding..." : "Add Membership"}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Group Selection Dialog */}
      {selectedGroup && (
        <Dialog open={!!selectedGroup} onOpenChange={(open) => {
          if (!open) {
            setSelectedGroup(null);
          }
        }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Choose {selectedGroup[0]?.provider_name || selectedGroup[0]?.name.split(' ')[0]} Plan</DialogTitle>
              <DialogDescription>
                Select which plan you'd like to add to your memberships.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {selectedGroup.map((membership) => {
                const isAdded = userMembershipIds.includes(membership.id);
                return (
                  <Card
                    key={membership.id}
                    className={cn(
                      "p-4 cursor-pointer transition-all hover:shadow-md border-2",
                      isAdded 
                        ? "border-primary bg-primary/5" 
                        : "border-zinc-200 dark:border-zinc-800 hover:border-primary/50"
                    )}
                    onClick={() => {
                      if (!isAdded) {
                        handleQuickAddMembership(membership.id);
                        setSelectedGroup(null);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 mb-1">
                          {membership.name}
                        </h4>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {membership.provider_slug}
                        </p>
                      </div>
                      {isAdded && (
                        <Badge variant="secondary" className="shrink-0 ml-2">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Added
                        </Badge>
                      )}
                      {!isAdded && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="shrink-0 ml-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickAddMembership(membership.id);
                            setSelectedGroup(null);
                          }}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setSelectedGroup(null)}
              >
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Memberships Dialog */}
      <Dialog
        open={showModal}
        onOpenChange={(open) => {
          setShowModal(open);
          if (!open) {
            resetModalState();
            setConfirmAddMembership(null);
            setSmartCheck(null);
          }
        }}
      >
        <DialogClose onClose={() => {
          setShowModal(false);
          resetModalState();
        }} />
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
                      if (
                        e.key === "Enter" &&
                        !validating &&
                        !validationResult
                      ) {
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
                      validationResult.status === "valid" ||
                      validationResult.status === "exists"
                        ? "success"
                        : validationResult.status === "ambiguous"
                        ? "warning"
                        : "error"
                    }
                    className="animate-scale-in"
                  >
                    <div className="flex items-start gap-2">
                      {validationResult.status === "valid" ||
                      validationResult.status === "exists" ? (
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
                          <p className="text-sm mb-2">
                            {validationResult.reason}
                          </p>

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
                              >
                                <Sparkles className="w-4 h-4" />
                                {discovering
                                  ? "Discovering benefits..."
                                  : "Discover Benefits with AI"}
                              </Button>
                            )}

                          {validationResult.status === "exists" &&
                            validationResult.existing_membership && (
                              <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 rounded text-xs">
                                {userMembershipIds.includes(
                                  validationResult.existing_membership.id
                                ) ? (
                                  <>
                                    ✓ You already have this membership! No need
                                    to add it again.
                                  </>
                                ) : (
                                  <>
                                    ✓ This membership is already in our catalog
                                    and has been selected for you! Returning to
                                    catalog in a moment...
                                  </>
                                )}
                              </div>
                            )}
                        </AlertDescription>
                      </div>
                    </div>
                  </Alert>
                )}

                {/* Discovery Result */}
                {discoveryResult && (
                  <Alert 
                    variant={discoveryResult.benefits_found !== false ? "success" : "warning"} 
                    className="animate-scale-in"
                  >
                    <CheckCircle className="w-5 h-5" />
                    <AlertTitle>
                      {discoveryResult.benefits_found !== false 
                        ? "Benefits Discovered!" 
                        : "Membership Added"}
                    </AlertTitle>
                    <AlertDescription>
                      {discoveryResult.benefits_found !== false ? (
                        <>
                          <p className="text-sm mb-2">
                            Found {discoveryResult.benefits_preview.length} benefits
                            for <strong>{discoveryResult.membership.name}</strong>
                          </p>
                          <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
                            {discoveryResult.benefits_preview
                              .slice(0, 5)
                              .map((benefit, idx) => (
                                <div key={idx} className="flex items-start gap-1">
                                  <span className="text-green-600">✓</span>
                                  <span>{benefit.title}</span>
                                </div>
                              ))}
                            {discoveryResult.benefits_preview.length > 5 && (
                              <div className="text-zinc-500">
                                ...and {discoveryResult.benefits_preview.length - 5}{" "}
                                more
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <p className="text-sm">
                          <strong>{discoveryResult.membership.name}</strong> was added to your account, 
                          but we couldn't find specific benefits information online. 
                          You can manually add benefits or check back later as our database grows.
                        </p>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Selectable Membership Card for Validated/Discovered Memberships */}
                {(validationResult?.status === "valid" || discoveryResult) && (
                  <div className="border rounded-xl p-4 bg-white dark:bg-zinc-900">
                    <div
                      onClick={() => {
                        if (discoveryResult?.membership.id) {
                          const membershipId = discoveryResult.membership.id;
                          if (selectedMemberships.includes(membershipId)) {
                            setSelectedMemberships((prev) =>
                              prev.filter((id) => id !== membershipId)
                            );
                          } else {
                            setSelectedMemberships((prev) => [...prev, membershipId]);
                          }
                        }
                      }}
                      className={`flex items-center gap-3 ${
                        discoveryResult?.membership.id
                          ? "cursor-pointer"
                          : "cursor-not-allowed opacity-60"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                          discoveryResult?.membership.id &&
                          selectedMemberships.includes(discoveryResult.membership.id)
                            ? "bg-primary border-primary"
                            : "border-zinc-300 dark:border-zinc-600"
                        }`}
                      >
                        {discoveryResult?.membership.id &&
                          selectedMemberships.includes(discoveryResult.membership.id) && (
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
                          {discoveryResult
                            ? discoveryResult.membership.name
                            : validationResult?.normalized_name || newMembershipName}
                        </div>
                        {discoveryResult && (
                          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                            {discoveryResult.benefits_found !== false 
                              ? `${discoveryResult.benefits_preview.length} benefits discovered`
                              : "No benefits found - membership added"}
                          </div>
                        )}
                        {validationResult?.status === "valid" && !discoveryResult && (
                          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                            Click "Discover Benefits with AI" to find benefits, then select to add
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
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
                    smartCheck.decision === "already_covered"
                      ? "warning"
                      : "info"
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
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={dismissWarning}
                      >
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
                    .filter(
                      (m) =>
                        modalSearchTerm === "" ||
                        m.name
                          .toLowerCase()
                          .includes(modalSearchTerm.toLowerCase()) ||
                        (m.provider_name &&
                          m.provider_name
                            .toLowerCase()
                            .includes(modalSearchTerm.toLowerCase())) ||
                        (m.plan_name &&
                          m.plan_name
                            .toLowerCase()
                            .includes(modalSearchTerm.toLowerCase()))
                    )
                    .reduce((acc, m) => {
                      const provider = m.provider_name || m.name.split(" ")[0];
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
                            {membership.provider_name &&
                            membership.plan_name ? (
                              <>
                                <span className="text-zinc-500 dark:text-zinc-400">
                                  {membership.provider_name}
                                </span>{" "}
                                <span>{membership.plan_name}</span>
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
          <Button
            variant="outline"
            onClick={() => {
              setShowModal(false);
              resetModalState();
            }}
          >
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

      {/* Bank Statement Upload Dialog */}
      <Dialog open={showBankStatementUpload} onOpenChange={setShowBankStatementUpload}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Upload Bank Statement
            </DialogTitle>
            <DialogDescription>
              Upload your bank statement PDF to automatically detect and add recurring subscriptions
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!uploadResult && (
              <div 
                className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => !uploadingStatement && fileInputRef.current?.click()}
              >
                <Upload className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                  Drag and drop your bank statement PDF here, or click to browse
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleBankStatementUpload(file);
                    }
                  }}
                  className="hidden"
                  disabled={uploadingStatement}
                />
                <Button
                  variant="outline"
                  disabled={uploadingStatement}
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="cursor-pointer"
                >
                  {uploadingStatement ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Choose PDF File
                    </>
                  )}
                </Button>
              </div>
            )}

            {uploadError && (
              <Alert variant="destructive">
                <AlertCircle className="w-4 h-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{uploadError}</AlertDescription>
              </Alert>
            )}

            {uploadResult && (
              <div className="space-y-4">
                <Alert>
                  <CheckCircle className="w-4 h-4" />
                  <AlertTitle>Success!</AlertTitle>
                  <AlertDescription>{uploadResult.message}</AlertDescription>
                </Alert>

                <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-4 space-y-2">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-zinc-500 dark:text-zinc-400">Subscriptions Found:</span>
                      <span className="ml-2 font-semibold">{uploadResult.subscriptions_found}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 dark:text-zinc-400">Added to Account:</span>
                      <span className="ml-2 font-semibold text-green-600 dark:text-green-400">
                        {uploadResult.subscriptions_processed}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500 dark:text-zinc-400">Monthly Cost:</span>
                      <span className="ml-2 font-semibold">
                        £{uploadResult.summary.monthly_subscription_cost.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500 dark:text-zinc-400">Annual Cost:</span>
                      <span className="ml-2 font-semibold">
                        £{uploadResult.summary.annual_subscription_cost.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {uploadResult.processed.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Added Memberships:</h4>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {uploadResult.processed.map((item: any, index: number) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-white dark:bg-zinc-800 rounded text-sm"
                        >
                          <span className="font-medium">{item.membership_name}</span>
                          <Badge variant={item.action === 'already_exists' ? 'secondary' : 'default'}>
                            {item.action === 'already_exists' ? 'Already had' : 
                             item.action === 'linked_existing' ? 'Linked' : 
                             item.action === 'created_new' ? 'Created' : 'Added'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {uploadResult.errors.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-red-600 dark:text-red-400">Errors:</h4>
                    <div className="space-y-1">
                      {uploadResult.errors.map((error: any, index: number) => (
                        <div key={index} className="text-sm text-red-600 dark:text-red-400 p-2 bg-red-50 dark:bg-red-900/20 rounded">
                          {error.subscription}: {error.error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            {uploadResult ? (
              <Button onClick={() => {
                setShowBankStatementUpload(false);
                setUploadResult(null);
                setUploadError(null);
              }}>
                Done
              </Button>
            ) : (
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
