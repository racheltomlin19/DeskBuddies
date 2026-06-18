import { describe, expect, it } from "vitest";
import config from "./vite.config";

describe("vite production config", () => {
  it("uses relative asset paths for Electron loadFile builds", () => {
    expect(config.base).toBe("./");
  });
});
