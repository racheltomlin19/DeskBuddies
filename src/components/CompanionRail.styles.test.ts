import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync("src/styles.css", "utf8");

function rule(selector: string) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return (styles.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`))?.[1] ?? "").replace(/\s+/g, "");
}

describe("companion rail layout", () => {
  it("uses a horizontal rail except in the collapsed native dock", () => {
    expect(rule(".companion-rail")).toContain("display:flex");
    expect(rule(".companion-rail")).toContain("flex:00auto");
    expect(rule(".companion-controls-panel")).toContain("flex:00auto");
    expect(rule(".companion-controls-panel")).toContain("overflow:visible");
    expect(rule(".workspace.docked.collapsed .companion-rail")).toContain("display:grid");
  });
});
