import { describe, expect, it } from "vitest";
import { parseBurpIssuesXml } from "./burp.js";

const sample = `<?xml version="1.0"?>
<issues burpVersion="2024.1" exportTime="Thu Jan 01 12:00:00 UTC 2026">
  <issue>
    <serialNumber>1</serialNumber>
    <type>2097920</type>
    <name>SQL injection</name>
    <host ip="10.0.0.5">https://app.lab.local</host>
    <path>/login</path>
    <location>https://app.lab.local/login</location>
    <severity>High</severity>
    <confidence>Certain</confidence>
    <issueBackground>SQL injection may allow data extraction.</issueBackground>
    <issueDetail>The password parameter appears vulnerable.</issueDetail>
    <remediationBackground>Use parameterized queries.</remediationBackground>
    <requestresponse>
      <request base64="false"><![CDATA[POST /login HTTP/1.1
Host: app.lab.local

user=admin&password=1']]></request>
      <response base64="false"><![CDATA[HTTP/1.1 500 Internal Server Error
Content-Type: text/html

error near ']]></response>
    </requestresponse>
  </issue>
  <issue>
    <serialNumber>2</serialNumber>
    <name>Cookie without HttpOnly flag</name>
    <host>https://app.lab.local</host>
    <path>/</path>
    <location>https://app.lab.local/</location>
    <severity>Information</severity>
    <confidence>Firm</confidence>
    <issueDetail>Session cookie lacks HttpOnly.</issueDetail>
  </issue>
</issues>`;

describe("burp importer", () => {
  it("parses issues with severity and HTTP evidence", () => {
    const items = parseBurpIssuesXml(sample);
    expect(items.length).toBe(2);
    expect(items[0].title).toBe("SQL injection");
    expect(items[0].severity).toBe("high");
    expect(items[0].host).toContain("app.lab.local");
    expect(items[0].request).toContain("POST /login");
    expect(items[0].response).toContain("500");
    expect(items[0].fingerprint).toBeTruthy();
    expect(items[1].severity).toBe("info");
  });

  it("returns empty for empty issues", () => {
    expect(parseBurpIssuesXml(`<?xml version="1.0"?><issues></issues>`)).toEqual([]);
  });
});
