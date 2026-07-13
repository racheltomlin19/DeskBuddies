import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync("src/styles.css", "utf8");

function rule(selector: string) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return (styles.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`))?.[1] ?? "").replace(/\s+/g, "");
}

describe("companion rail layout", () => {
  it("uses a two-column wrapping chip grid without horizontal overflow", () => {
    expect(rule(".companion-rail")).toContain("display:grid");
    expect(rule(".companion-rail")).toContain("grid-template-columns:repeat(2,minmax(0,1fr))");
    expect(rule(".companion-rail")).toContain("overflow-x:hidden");
    expect(rule(".drag-bubble")).toContain("width:36px");
    expect(rule(".drag-bubble")).toContain("height:36px");
    expect(rule(".rail-pet:focus-visible")).toContain("outline:");
    expect(rule(".rail-pet[aria-pressed=\"true\"]")).toContain("border-color:");
  });

  it("retains a portrait-only 68px collapsed rail", () => {
    expect(rule(".app-shell.docked.collapsed .companion-rail")).toContain("grid-template-columns:68px");
    expect(rule(".app-shell.docked.collapsed .rail-pet")).toContain("width:68px");
    expect(rule(".app-shell.docked.collapsed .rail-copy")).toContain("display:none");
    expect(rule(".app-shell.docked.collapsed .drag-bubble")).toContain("width:44px");
    expect(rule(".app-shell.docked.collapsed")).toContain("background:transparent");
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
  });
});
