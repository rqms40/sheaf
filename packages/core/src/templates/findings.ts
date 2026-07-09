import type { Severity } from "../schemas.js";

export type FindingTemplate = {
  id: string;
  name: string;
  category: string;
  title: string;
  severity: Severity;
  description: string;
  impact: string;
  remediation: string;
  cwe?: string;
};

/** Reusable writeup seeds — reduces report tax. */
export const FINDING_TEMPLATES: FindingTemplate[] = [
  {
    id: "idor",
    name: "Insecure Direct Object Reference",
    category: "Access control",
    title: "Insecure Direct Object Reference (IDOR)",
    severity: "high",
    description:
      "An authenticated user can access or modify another user's objects by changing an identifier in the request (for example a numeric id or UUID) without adequate authorization checks.",
    impact:
      "Cross-tenant or cross-user data exposure, unauthorized modification, or account takeover depending on the object type.",
    remediation:
      "Enforce authorization on every object access using the session principal (ownership or role check). Prefer opaque server-side references. Add automated tests for horizontal privilege escalation.",
    cwe: "CWE-639",
  },
  {
    id: "xss-reflected",
    name: "Reflected Cross-Site Scripting",
    category: "Injection",
    title: "Reflected Cross-Site Scripting (XSS)",
    severity: "medium",
    description:
      "User-controlled input is reflected in an HTTP response without context-appropriate encoding, allowing script execution in a victim browser when a crafted link is opened.",
    impact:
      "Session theft, actions as the victim user, phishing content injection within the application origin.",
    remediation:
      "Context-aware output encoding, Content-Security-Policy with nonces/hashes, validate and reject unexpected input. Prefer frameworks that auto-escape by default.",
    cwe: "CWE-79",
  },
  {
    id: "xss-stored",
    name: "Stored Cross-Site Scripting",
    category: "Injection",
    title: "Stored Cross-Site Scripting (XSS)",
    severity: "high",
    description:
      "Attacker-controlled content is persisted (for example a profile field or comment) and later rendered without encoding for other users.",
    impact:
      "Persistent compromise of users who view the content; admin-panel XSS can lead to full application compromise.",
    remediation:
      "Encode on output, sanitize rich HTML with a vetted library allow-list, CSP, and treat all stored content as untrusted.",
    cwe: "CWE-79",
  },
  {
    id: "sqli",
    name: "SQL Injection",
    category: "Injection",
    title: "SQL Injection",
    severity: "critical",
    description:
      "User input is concatenated into a SQL query (or otherwise interpreted as SQL) without parameterization, allowing query structure to be altered.",
    impact:
      "Data exfiltration, authentication bypass, data tampering, or remote code execution depending on database privileges.",
    remediation:
      "Use parameterized queries / prepared statements exclusively. Least-privilege DB accounts. WAF as defense-in-depth only.",
    cwe: "CWE-89",
  },
  {
    id: "open-redirect",
    name: "Open Redirect",
    category: "Validation",
    title: "Open Redirect",
    severity: "low",
    description:
      "A redirect parameter accepts an arbitrary external URL, allowing the application to bounce users to an attacker-controlled site while appearing trusted.",
    impact:
      "Phishing and credential harvesting using the legitimate domain in the first hop of the attack.",
    remediation:
      "Allow-list redirect targets (relative paths or known hosts). Reject absolute external URLs by default.",
    cwe: "CWE-601",
  },
  {
    id: "broken-authz",
    name: "Broken Function Level Authorization",
    category: "Access control",
    title: "Broken Function Level Authorization",
    severity: "high",
    description:
      "Administrative or privileged API functions are reachable by lower-privileged users because server-side role checks are missing or incomplete.",
    impact:
      "Privilege escalation, mass data access, configuration changes, or account management abuse.",
    remediation:
      "Deny-by-default authorization middleware on every privileged route. Centralize role checks; test with dual-session automation.",
    cwe: "CWE-285",
  },
  {
    id: "sensitive-data",
    name: "Sensitive Data Exposure",
    category: "Cryptography",
    title: "Sensitive Data Exposure",
    severity: "medium",
    description:
      "Sensitive information (tokens, PII, secrets, or verbose errors) is exposed in responses, logs, client storage, or transport without adequate protection.",
    impact:
      "Credential reuse, account takeover, regulatory exposure, or lateral movement.",
    remediation:
      "Minimize data returned; encrypt secrets at rest; never log secrets; use TLS; scrub verbose errors in production.",
    cwe: "CWE-200",
  },
  {
    id: "security-misconfig",
    name: "Security Misconfiguration",
    category: "Configuration",
    title: "Security Misconfiguration",
    severity: "medium",
    description:
      "Default credentials, verbose headers, unnecessary services, missing security headers, or debug endpoints are exposed in the target environment.",
    impact:
      "Easier reconnaissance, fingerprinting, or direct compromise via known defaults.",
    remediation:
      "Harden baselines, remove debug endpoints, apply security headers, rotate defaults, and continuous config scanning.",
    cwe: "CWE-16",
  },
  {
    id: "ssrf",
    name: "Server-Side Request Forgery",
    category: "Request forgery",
    title: "Server-Side Request Forgery (SSRF)",
    severity: "high",
    description:
      "The application fetches a URL or host supplied by the user without adequate allow-listing, enabling requests to internal networks or cloud metadata.",
    impact:
      "Internal network scan, cloud credential theft, or access to internal admin services.",
    remediation:
      "Allow-list destinations, block link-local/metadata ranges, use network egress controls, and never pass raw user URLs to HTTP clients.",
    cwe: "CWE-918",
  },
  {
    id: "weak-tls",
    name: "Weak TLS Configuration",
    category: "Cryptography",
    title: "Weak TLS Configuration",
    severity: "medium",
    description:
      "The service supports outdated TLS versions, weak ciphers, or certificate issues that reduce transport security.",
    impact:
      "Downgrade or interception risk depending on client and network position.",
    remediation:
      "Disable TLS 1.0/1.1, prefer modern cipher suites, valid certificates, HSTS where appropriate.",
    cwe: "CWE-326",
  },
];

export function listFindingTemplates(): FindingTemplate[] {
  return FINDING_TEMPLATES;
}

export function getFindingTemplate(id: string): FindingTemplate | undefined {
  return FINDING_TEMPLATES.find((t) => t.id === id);
}
