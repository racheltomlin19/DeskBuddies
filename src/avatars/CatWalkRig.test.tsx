import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { customCompanions } from "../data";
import { CatWalkRig } from "./CatWalkRig";

const buddy1 = customCompanions.find((pet) => pet.id === "buddy1")!;
const buddy2 = customCompanions.find((pet) => pet.id === "buddy2")!;

describe("CatWalkRig", () => {
  it("renders Buddy1's side rig with articulated leg groups", () => {
    const markup = renderToStaticMarkup(<CatWalkRig pet={buddy1} markings="buddy1" />);
    expect(markup).toContain("Buddy1");
    expect(markup).toContain("rig-cat");
    expect(markup).toContain("pose-walk");
    for (const leg of ["leg-back-far", "leg-front-far", "leg-back-near", "leg-front-near"]) {
      expect(markup).toContain(leg);
    }
    expect(markup).toContain("rig-tail");
  });

  it("renders Buddy2's side rig with articulated leg groups", () => {
    const markup = renderToStaticMarkup(<CatWalkRig pet={buddy2} markings="buddy2" />);
    expect(markup).toContain("Buddy2");
    expect(markup).toContain("rig-cat");
    expect(markup).toContain("leg-front-near");
    expect(markup).toContain("rig-tail");
  });
});
