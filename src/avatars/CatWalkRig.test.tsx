import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { customCompanions } from "../data";
import { CatWalkRig } from "./CatWalkRig";

const mochi = customCompanions.find((pet) => pet.id === "mochi")!;
const biscuit = customCompanions.find((pet) => pet.id === "biscuit")!;

describe("CatWalkRig", () => {
  it("renders Mochi's side rig with articulated leg groups", () => {
    const markup = renderToStaticMarkup(<CatWalkRig pet={mochi} markings="mochi" />);
    expect(markup).toContain("Mochi");
    expect(markup).toContain("rig-cat");
    expect(markup).toContain("pose-walk");
    for (const leg of ["leg-back-far", "leg-front-far", "leg-back-near", "leg-front-near"]) {
      expect(markup).toContain(leg);
    }
    expect(markup).toContain("rig-tail");
    expect(markup).toContain("japanese-bobtail");
    expect(markup).toContain("bobtail-tail");
    expect(markup).toContain("calico-patch");
    expect(markup).toContain('aria-label="Mochi calico Japanese Bobtail"');
  });

  it("renders Biscuit's side rig with articulated leg groups", () => {
    const markup = renderToStaticMarkup(<CatWalkRig pet={biscuit} markings="biscuit" />);
    expect(markup).toContain("Biscuit");
    expect(markup).toContain("rig-cat");
    expect(markup).toContain("leg-front-near");
    expect(markup).toContain("rig-tail");
    expect(markup).toContain("maine-coon");
    expect(markup).toContain("fluffy-tail");
    expect(markup).toContain("maine-coon-ruff");
    expect(markup).toContain("ear-tufts");
    expect(markup).toContain("tabby-face-stripes");
    expect(markup).toContain("cream-muzzle");
    expect(markup).not.toContain("face-mask");
    expect(markup).toContain('aria-label="Biscuit cream-orange Maine Coon"');
  });
});
