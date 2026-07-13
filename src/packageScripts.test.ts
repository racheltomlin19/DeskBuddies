import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("package scripts", () => {
  it("uses the cross-platform release cleanup before packaging", () => {
    const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

    expect(packageJson.scripts.dist).toContain("node scripts/clean-release.mjs");
    expect(packageJson.scripts.dist).not.toContain("rm -rf");
  });
});
