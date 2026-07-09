import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Archive,
  ArchiveRestore,
  ArrowRight,
  Briefcase,
  FolderOpen,
  Pencil,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/sheaf/EmptyState";
import { SheafWordmark } from "@/components/sheaf/Logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, type Engagement } from "@/lib/api";
import { cn, formatTime } from "@/lib/utils";

const TYPES = ["web", "network", "ad", "cloud", "other"] as const;

export function HomePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["engagements"],
    queryFn: () => api.listEngagements(),
  });
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [type, setType] = useState<string>("web");
  const [filter, setFilter] = useState<"active" | "archived" | "all">("active");
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Engagement | null>(null);
  const [renameName, setRenameName] = useState("");
  const [renameClient, setRenameClient] = useState("");

  const create = useMutation({
    mutationFn: () =>
      api.createEngagement({
        name: name.trim(),
        client: client.trim() || undefined,
        type,
      }),
    onSuccess: (res) => {
      toast.success("Engagement created");
      qc.invalidateQueries({ queryKey: ["engagements"] });
      setName("");
      setClient("");
      navigate({
        to: "/e/$engagementId/findings",
        params: { engagementId: res.data.id },
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const archiveMut = useMutation({
    mutationFn: ({ id, archive }: { id: string; archive: boolean }) =>
      api.archiveEngagement(id, archive),
    onSuccess: (res) => {
      toast.success(
        res.data.status === "archived" ? "Archived" : "Restored to active",
      );
      qc.invalidateQueries({ queryKey: ["engagements"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const renameMut = useMutation({
    mutationFn: () => {
      if (!renameTarget) throw new Error("No engagement");
      return api.updateEngagement(renameTarget.id, {
        name: renameName.trim(),
        client: renameClient.trim() || null,
      });
    },
    onSuccess: () => {
      toast.success("Engagement renamed");
      setRenameOpen(false);
      setRenameTarget(null);
      qc.invalidateQueries({ queryKey: ["engagements"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openRename(e: Engagement) {
    setRenameTarget(e);
    setRenameName(e.name);
    setRenameClient(e.client || "");
    setRenameOpen(true);
  }

  const all = data?.data ?? [];
  const engagements = useMemo(() => {
    if (filter === "all") return all;
    return all.filter((e) => e.status === filter);
  }, [all, filter]);

  return (
    <div className="min-h-full overflow-x-hidden">
      <header className="border-b border-border/80 bg-card/70 backdrop-blur">
        <div className="flex w-full items-center justify-between gap-3 px-3 py-3 sm:px-5 sm:py-4 lg:px-8">
          <SheafWordmark />
          <div className="hidden text-[12px] text-muted sm:block">
            Local casefile
            <span className="mx-1.5 text-faint">·</span>
            <span className="font-mono text-faint">127.0.0.1</span>
          </div>
        </div>
      </header>

      <main className="w-full px-3 py-5 sm:px-5 sm:py-8 lg:px-8">
        <div className="mb-6 max-w-2xl sm:mb-8">
          <div className="eyebrow mb-2">Engagements</div>
          <h1 className="text-[20px] font-medium tracking-tight sm:text-[22px]">
            Bind tool output into a casefile
          </h1>
          <p className="mt-2 text-[13px] text-muted leading-relaxed">
            Scope, findings, evidence, and reports stay on disk under{" "}
            <code className="font-mono text-[12px] text-primary/90">.sheaf/</code>
            . Nothing leaves your machine.
          </p>
        </div>

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.85fr)]">
          <Card className="min-w-0">
            <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="size-3.5 text-primary" />
                  Open
                </CardTitle>
                <CardDescription className="mt-1">
                  {engagements.length} shown
                  {filter !== "all" ? ` · ${filter}` : ""}
                  {all.length !== engagements.length
                    ? ` (${all.length} total)`
                    : ""}
                </CardDescription>
              </div>
              <Select
                value={filter}
                onValueChange={(v) => setFilter(v as typeof filter)}
              >
                <SelectTrigger className="w-full sm:w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading && (
                <div className="px-4 py-6 text-muted">Loading engagements…</div>
              )}
              {error && (
                <div className="space-y-2 px-4 py-6">
                  <div className="text-destructive">API unavailable</div>
                  <p className="text-[12px] text-muted">
                    Start the API with{" "}
                    <code className="font-mono text-foreground">pnpm dev:api</code> or{" "}
                    <code className="font-mono text-foreground">pnpm sheaf -- serve</code>.
                  </p>
                </div>
              )}
              {!isLoading && !error && engagements.length === 0 && (
                <div className="p-4">
                  <EmptyState
                    icon={Briefcase}
                    title={
                      filter === "archived"
                        ? "No archived engagements"
                        : "No engagements yet"
                    }
                    description={
                      filter === "archived"
                        ? "Archive from an engagement header when the assessment is done."
                        : "Create one on the right to start binding findings."
                    }
                    className="border-0 bg-transparent py-6"
                  />
                </div>
              )}
              <ul className="divide-y divide-border">
                {engagements.map((e) => {
                  const isArchived = e.status === "archived";
                  return (
                    <li
                      key={e.id}
                      className="group flex items-center gap-2 px-3 py-2.5 transition-colors hover:bg-elevated/60"
                    >
                      <Link
                        to="/e/$engagementId/findings"
                        params={{ engagementId: e.id }}
                        className="flex min-w-0 flex-1 items-center gap-3 rounded-md px-1 py-1"
                      >
                        <div className="flex size-9 items-center justify-center rounded-md border border-border bg-elevated">
                          <Briefcase
                            className={cn(
                              "size-3.5",
                              isArchived ? "text-faint" : "text-primary",
                            )}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-foreground group-hover:text-primary">
                            {e.name}
                          </div>
                          <div className="text-[12px] text-muted">
                            {e.client || "No client"}
                            <span className="mx-1 text-faint">·</span>
                            {e.type}
                            <span className="mx-1 text-faint">·</span>
                            updated {formatTime(e.updatedAt)}
                          </div>
                        </div>
                        <span className="text-[11px] uppercase tracking-wide text-faint">
                          {e.status}
                        </span>
                        <ArrowRight className="size-3.5 text-faint opacity-0 transition-opacity group-hover:opacity-100" />
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        title="Rename"
                        onClick={(ev) => {
                          ev.preventDefault();
                          openRename(e);
                        }}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        title={isArchived ? "Restore" : "Archive"}
                        onClick={(ev) => {
                          ev.preventDefault();
                          archiveMut.mutate({
                            id: e.id,
                            archive: !isArchived,
                          });
                        }}
                      >
                        {isArchived ? (
                          <ArchiveRestore className="size-3.5" />
                        ) : (
                          <Archive className="size-3.5" />
                        )}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>

          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>New engagement</CardTitle>
              <CardDescription>
                Name it for the client and assessment type.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-3.5"
                onSubmit={(ev) => {
                  ev.preventDefault();
                  if (!name.trim()) return;
                  create.mutate();
                }}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="eng-name">Name</Label>
                  <Input
                    id="eng-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="acme-q3-web"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="eng-client">Client</Label>
                  <Input
                    id="eng-client"
                    value={client}
                    onChange={(e) => setClient(e.target.value)}
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={create.isPending || !name.trim()}
                >
                  {create.isPending ? "Creating…" : "Create engagement"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename engagement</DialogTitle>
            <DialogDescription>
              Update the case name and client label.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(ev) => {
              ev.preventDefault();
              if (!renameName.trim()) return;
              renameMut.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="rename-name">Name</Label>
              <Input
                id="rename-name"
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                autoFocus
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rename-client">Client</Label>
              <Input
                id="rename-client"
                value={renameClient}
                onChange={(e) => setRenameClient(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setRenameOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!renameName.trim() || renameMut.isPending}
              >
                {renameMut.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
