import { XMLParser } from "fast-xml-parser";

export type NmapPort = {
  port: number;
  protocol: string;
  state: string;
  service?: string;
  product?: string;
  version?: string;
};

export type NmapAsset = {
  host: string;
  ports: NmapPort[];
  hostname?: string;
};

function ensureArray<T>(v: T | T[] | undefined | null): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function hostAddress(host: Record<string, unknown>): string {
  const addrs = ensureArray(host.address as Record<string, unknown> | Record<string, unknown>[]);
  const ipv4 = addrs.find((a) => a?.["@_addrtype"] === "ipv4") ?? addrs[0];
  return String(ipv4?.["@_addr"] ?? "unknown");
}

function hostnames(host: Record<string, unknown>): string | undefined {
  const hn = host.hostnames as Record<string, unknown> | undefined;
  if (!hn) return undefined;
  const list = ensureArray(hn.hostname as Record<string, unknown> | Record<string, unknown>[]);
  const primary = list.find((h) => h?.["@_type"] === "user") ?? list[0];
  return primary?.["@_name"] ? String(primary["@_name"]) : undefined;
}

function parsePorts(host: Record<string, unknown>): NmapPort[] {
  const portsNode = host.ports as Record<string, unknown> | undefined;
  if (!portsNode) return [];
  const ports = ensureArray(portsNode.port as Record<string, unknown> | Record<string, unknown>[]);
  return ports.map((p) => {
    const state = p.state as Record<string, unknown> | undefined;
    const service = p.service as Record<string, unknown> | undefined;
    return {
      port: Number(p["@_portid"] ?? 0),
      protocol: String(p["@_protocol"] ?? "tcp"),
      state: String(state?.["@_state"] ?? "unknown"),
      service: service?.["@_name"] ? String(service["@_name"]) : undefined,
      product: service?.["@_product"] ? String(service["@_product"]) : undefined,
      version: service?.["@_version"] ? String(service["@_version"]) : undefined,
    };
  });
}

export function parseNmapXml(raw: string): NmapAsset[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });
  const doc = parser.parse(raw) as Record<string, unknown>;
  const nmaprun = doc.nmaprun as Record<string, unknown> | undefined;
  if (!nmaprun) return [];

  const hosts = ensureArray(nmaprun.host as Record<string, unknown> | Record<string, unknown>[]);
  return hosts.map((host) => {
    const addr = hostAddress(host);
    const name = hostnames(host);
    return {
      host: name || addr,
      hostname: name,
      ports: parsePorts(host),
    };
  });
}
