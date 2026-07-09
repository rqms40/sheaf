export type ChecklistItemDef = {
  id: string;
  label: string;
  phase: string;
};

export type ChecklistDef = {
  type: string;
  title: string;
  items: ChecklistItemDef[];
};

const WEB: ChecklistItemDef[] = [
  { id: "web-recon", phase: "Recon", label: "Map attack surface (hosts, apps, APIs)" },
  { id: "web-auth", phase: "Auth", label: "Test authentication & session handling" },
  { id: "web-authz", phase: "Authz", label: "Horizontal / vertical privilege tests (IDOR, roles)" },
  { id: "web-inject", phase: "Input", label: "Injection classes (SQLi, XSS, command, template)" },
  { id: "web-business", phase: "Logic", label: "Business logic / workflow abuse" },
  { id: "web-files", phase: "Files", label: "Upload, path traversal, SSRF if present" },
  { id: "web-config", phase: "Config", label: "Headers, cookies, TLS, debug endpoints" },
  { id: "web-api", phase: "API", label: "API-specific authz, mass assignment, rate limits" },
  { id: "web-report", phase: "Report", label: "Evidence packed; findings triaged for client report" },
];

const NETWORK: ChecklistItemDef[] = [
  { id: "net-scope", phase: "Scope", label: "Confirm in-scope ranges and exclusions" },
  { id: "net-discover", phase: "Discover", label: "Host discovery and port inventory" },
  { id: "net-svc", phase: "Services", label: "Service enumeration and versioning" },
  { id: "net-auth", phase: "Auth", label: "Credential testing (authorized only)" },
  { id: "net-vuln", phase: "Vuln", label: "Known issues / misconfigurations on services" },
  { id: "net-seg", phase: "Segment", label: "Trust boundaries and lateral paths (as scoped)" },
  { id: "net-report", phase: "Report", label: "Findings evidenced and prioritized" },
];

const AD: ChecklistItemDef[] = [
  { id: "ad-enum", phase: "Enum", label: "Domain / forest enumeration (authorized)" },
  { id: "ad-users", phase: "Identity", label: "Users, groups, ACLs of interest" },
  { id: "ad-creds", phase: "Creds", label: "Password policy / kerberoast / AS-REP (if in scope)" },
  { id: "ad-paths", phase: "Paths", label: "Privilege paths (BloodHound-class analysis)" },
  { id: "ad-persist", phase: "Hardening", label: "Note persistence & detection gaps for client" },
  { id: "ad-report", phase: "Report", label: "Attack path narrative + remediations" },
];

const CLOUD: ChecklistItemDef[] = [
  { id: "cloud-inv", phase: "Inventory", label: "Account / subscription inventory" },
  { id: "cloud-iam", phase: "IAM", label: "Identity and over-privileged roles" },
  { id: "cloud-pub", phase: "Public", label: "Public storage, exposed services, open SG/NSG" },
  { id: "cloud-secrets", phase: "Secrets", label: "Secrets in code, metadata, env (authorized)" },
  { id: "cloud-log", phase: "Logging", label: "Logging / monitoring coverage notes" },
  { id: "cloud-report", phase: "Report", label: "Risk-ranked cloud findings" },
];

const OTHER: ChecklistItemDef[] = [
  { id: "gen-scope", phase: "Scope", label: "Document rules of engagement & out-of-scope" },
  { id: "gen-recon", phase: "Recon", label: "Initial reconnaissance complete" },
  { id: "gen-test", phase: "Test", label: "Primary attack paths exercised" },
  { id: "gen-evidence", phase: "Evidence", label: "Evidence attached for each reportable finding" },
  { id: "gen-report", phase: "Report", label: "Draft report exported and reviewed" },
];

export const CHECKLISTS: Record<string, ChecklistDef> = {
  web: { type: "web", title: "Web application", items: WEB },
  network: { type: "network", title: "Network", items: NETWORK },
  ad: { type: "ad", title: "Active Directory", items: AD },
  cloud: { type: "cloud", title: "Cloud", items: CLOUD },
  other: { type: "other", title: "General", items: OTHER },
};

export function checklistForType(type: string): ChecklistDef {
  return CHECKLISTS[type] ?? CHECKLISTS.other;
}
