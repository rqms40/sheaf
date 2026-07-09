import { describe, expect, it } from "vitest";
import { parseNmapXml } from "./nmap.js";

const sample = `<?xml version="1.0"?>
<nmaprun>
  <host>
    <address addr="10.0.0.5" addrtype="ipv4"/>
    <hostnames>
      <hostname name="web.lab.local" type="user"/>
    </hostnames>
    <ports>
      <port protocol="tcp" portid="80">
        <state state="open"/>
        <service name="http" product="nginx" version="1.24"/>
      </port>
      <port protocol="tcp" portid="443">
        <state state="open"/>
        <service name="https"/>
      </port>
    </ports>
  </host>
</nmaprun>`;

describe("nmap importer", () => {
  it("parses hosts and ports", () => {
    const assets = parseNmapXml(sample);
    expect(assets).toHaveLength(1);
    expect(assets[0].host).toBe("web.lab.local");
    expect(assets[0].ports).toHaveLength(2);
    expect(assets[0].ports[0].service).toBe("http");
  });
});
