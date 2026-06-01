import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import {
  useOrganizationList,
  useOrganization,
  useCreateOrganization,
  useUpdateOrganization,
  useDeleteOrganization,
} from "@/hooks/use-organizations";
import { usePersonList } from "@/hooks/use-person";
import { useOrganizationRelations } from "@/hooks/use-relations"; // Changed from use-organization-relations
import { Link } from "@tanstack/react-router";
import type {
  Organization,
  ClearanceLevel,
  CreateOrganizationRequest,
} from "@/types/organization";
import type { Person } from "@/types/person";
import type { RelationWithNames } from "@/types/relation";

export const Route = createFileRoute("/admin/organizations/")({
  component: OrganizationList,
});

function OrganizationList() {
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [topLevelOnly, setTopLevelOnly] = useState(true); // Default: show only top-level organizations
  const perPage = 10;

  const { data, isLoading, error } = useOrganizationList(
    page,
    perPage,
    topLevelOnly,
  );

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">Organization Management</h1>
              <p className="text-muted-foreground mt-1">
                Manage organizations and their security clearances
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant={topLevelOnly ? "default" : "outline"}
                onClick={() => setTopLevelOnly(true)}
              >
                Top Level Only
              </Button>
              <Button
                variant={!topLevelOnly ? "default" : "outline"}
                onClick={() => setTopLevelOnly(false)}
              >
                All Organizations
              </Button>
              <Button onClick={() => setShowCreate((v) => !v)}>
                <Plus className="h-4 w-4 mr-2" />
                {showCreate ? "Hide New Row" : "Add Organization"}
              </Button>
            </div>
          </div>

          {/* Table */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 text-destructive p-4 rounded-md">
              Error loading organizations: {error.message}
            </div>
          )}

          {data && (
            <>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Contract #</TableHead>
                      <TableHead>Clearance</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {showCreate && (
                      <CreateOrganizationRow
                        onDone={() => setShowCreate(false)}
                      />
                    )}
                    {data.items.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-center py-8 text-muted-foreground"
                        >
                          No organizations found. Create your first entry!
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.items.map((organization) => (
                        <OrganizationRow
                          key={organization.id}
                          organization={organization}
                        />
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {data.total_pages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing {(page - 1) * perPage + 1} to{" "}
                    {Math.min(page * perPage, data.total)} of {data.total}{" "}
                    results
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {page} of {data.total_pages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPage((p) => Math.min(data.total_pages, p + 1))
                      }
                      disabled={page === data.total_pages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

function OrganizationRow({
  organization,
  level = 0,
}: {
  organization: Organization;
  level?: number;
}) {
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const updateMutation = useUpdateOrganization(organization.id);
  const deleteMutation = useDeleteOrganization();

  // Lazy load relations only when expanded
  const { data: relations } = useOrganizationRelations(organization.id, {
    enabled: expanded,
  });

  // Get sub-organization IDs from relations
  const subOrganizationIds =
    relations
      ?.filter(
        (r: RelationWithNames) =>
          r.relation_type === "sub_vendor" &&
          r.related_entity_type === "organization",
      )
      .map((r: RelationWithNames) => r.related_entity_id) || [];

  const hasSubOrganizations = subOrganizationIds.length > 0;

  const [form, setForm] = useState({
    company_name: organization.company_name,
    contact_name: organization.contact_name,
    contact_email: organization.contact_email,
    contact_phone: organization.contact_phone || "",
    contract_number: organization.contract_number,
    clearance_level: organization.clearance_level as ClearanceLevel,
  });

  const onSave = async () => {
    await updateMutation.mutateAsync({
      company_name: form.company_name,
      contact_name: form.contact_name,
      contact_email: form.contact_email,
      contact_phone: form.contact_phone || undefined,
      contract_number: form.contract_number,
      clearance_level: form.clearance_level,
    });
    setEditing(false);
  };

  const onDelete = async () => {
    await deleteMutation.mutateAsync(organization.id);
  };

  return (
    <>
      <TableRow>
        <TableCell>
          {hasSubOrganizations && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="h-6 w-6 p-0"
            >
              {expanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className=" h-4 w-4" />
              )}
            </Button>
          )}
        </TableCell>
        <TableCell className="font-medium">
          <div
            className="flex items-center gap-2"
            style={{ paddingLeft: `${level * 24}px` }}
          >
            {editing ? (
              <Input
                value={form.company_name}
                onChange={(e) =>
                  setForm({ ...form, company_name: e.target.value })
                }
              />
            ) : (
              <Link
                to="/organizations/$organizationId"
                params={{ organizationId: organization.id.toString() }}
                className="hover:underline flex items-center gap-2"
              >
                {organization.company_name}
                <ExternalLink className="h-3 w-3 opacity-50" />
              </Link>
            )}
          </div>
        </TableCell>
        <TableCell>
          {editing ? (
            <Input
              value={form.contact_name}
              onChange={(e) =>
                setForm({ ...form, contact_name: e.target.value })
              }
            />
          ) : (
            organization.contact_name
          )}
        </TableCell>
        <TableCell>
          {editing ? (
            <Input
              type="email"
              value={form.contact_email}
              onChange={(e) =>
                setForm({ ...form, contact_email: e.target.value })
              }
            />
          ) : (
            organization.contact_email
          )}
        </TableCell>
        <TableCell>
          {editing ? (
            <Input
              type="tel"
              value={form.contact_phone}
              onChange={(e) =>
                setForm({ ...form, contact_phone: e.target.value })
              }
            />
          ) : (
            organization.contact_phone || "-"
          )}
        </TableCell>
        <TableCell>
          {editing ? (
            <Input
              value={form.contract_number}
              onChange={(e) =>
                setForm({ ...form, contract_number: e.target.value })
              }
            />
          ) : (
            organization.contract_number
          )}
        </TableCell>
        <TableCell>
          {editing ? (
            <Select
              value={form.clearance_level}
              onValueChange={(v) =>
                setForm({ ...form, clearance_level: v as ClearanceLevel })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UNCLASSIFIED">Unclassified</SelectItem>
                <SelectItem value="CONFIDENTIAL">Confidential</SelectItem>
                <SelectItem value="SECRET">Secret</SelectItem>
                <SelectItem value="TOP_SECRET">Top Secret</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <ClearanceBadge level={organization.clearance_level} />
          )}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-2">
            {editing ? (
              <>
                <Button
                  size="sm"
                  onClick={onSave}
                  disabled={updateMutation.isPending}
                >
                  <Check className="h-4 w-4 mr-1" /> Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditing(false)}
                >
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditing(true)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </TableCell>
      </TableRow>

      {/* Render sub-organizations when expanded */}
      {expanded &&
        hasSubOrganizations &&
        subOrganizationIds.map((subId: number) => (
          <SubOrganizationRow
            key={subId}
            organizationId={subId}
            level={level + 1}
          />
        ))}
    </>
  );
}

function SubOrganizationRow({
  organizationId,
  level,
}: {
  organizationId: number;
  level: number;
}) {
  const { data: organization, isLoading } = useOrganization(organizationId);

  if (isLoading || !organization) {
    return null;
  }

  return <OrganizationRow organization={organization} level={level} />;
}

function ClearanceBadge({ level }: { level: ClearanceLevel }) {
  const variants: Record<
    ClearanceLevel,
    "default" | "secondary" | "warning" | "destructive"
  > = {
    NONE: "secondary",
    CONFIDENTIAL: "default",
    SECRET: "warning",
    TOP_SECRET: "destructive",
  };

  return <Badge variant={variants[level]}>{level}</Badge>;
}

function CreateOrganizationRow({ onDone }: { onDone: () => void }) {
  const createMutation = useCreateOrganization();
  const { data: personPage } = usePersonList(1, 100); // Changed from personnelPage/usePersonnelList
  const [selectedPersonId, setSelectedPersonId] = useState<string>("");
  const [form, setForm] = useState<CreateOrganizationRequest>({
    company_name: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    contract_number: "",
    clearance_level: "UNCLASSIFIED" as ClearanceLevel,
  });

  const handlePersonChange = (personId: string) => {
    setSelectedPersonId(personId);
    const person = personPage?.items.find((p) => p.id === parseInt(personId)); // Changed from personnel/personnelPage
    if (person) {
      setForm({
        ...form,
        contact_name:
          person.first_name && person.last_name
            ? `${person.first_name} ${person.last_name}`
            : person.username || person.email || `Person #${person.id}`,
        contact_email: person.email || person.username || "",
        contact_phone: person.phone || "",
      });
    }
  };

  const onCreate = async () => {
    await createMutation.mutateAsync({
      ...form,
      contact_phone: form.contact_phone || undefined,
    });
    onDone();
  };

  return (
    <TableRow className="bg-accent/30">
      <TableCell className="font-medium">
        <Input
          placeholder="Company name"
          value={form.company_name}
          onChange={(e) => setForm({ ...form, company_name: e.target.value })}
        />
      </TableCell>
      <TableCell>
        <Select value={selectedPersonId} onValueChange={handlePersonChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select contact..." />
          </SelectTrigger>
          <SelectContent>
            {personPage?.items.map((person: Person) => (
              <SelectItem key={person.id} value={person.id.toString()}>
                {person.first_name && person.last_name
                  ? `${person.first_name} ${person.last_name}`
                  : person.username || person.email || `Person #${person.id}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Input
          type="email"
          value={form.contact_email}
          readOnly
          className="bg-muted"
        />
      </TableCell>
      <TableCell>
        <Input
          type="tel"
          value={form.contact_phone}
          readOnly
          className="bg-muted"
        />
      </TableCell>
      <TableCell>
        <Input
          placeholder="Contract #"
          value={form.contract_number}
          onChange={(e) =>
            setForm({ ...form, contract_number: e.target.value })
          }
        />
      </TableCell>
      <TableCell>
        <Select
          value={form.clearance_level}
          onValueChange={(v) =>
            setForm({ ...form, clearance_level: v as ClearanceLevel })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="UNCLASSIFIED">Unclassified</SelectItem>
            <SelectItem value="CONFIDENTIAL">Confidential</SelectItem>
            <SelectItem value="SECRET">Secret</SelectItem>
            <SelectItem value="TOP_SECRET">Top Secret</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <Button
            size="sm"
            onClick={onCreate}
            disabled={createMutation.isPending}
          >
            <Check className="h-4 w-4 mr-1" /> Add
          </Button>
          <Button size="sm" variant="outline" onClick={onDone}>
            <X className="h-4 w-4 mr-1" /> Cancel
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

// Inline editing replaces EditOrganizationDialog

// Delete handled inline in OrganizationRow

// Removed old modal form; inline fields are used instead
