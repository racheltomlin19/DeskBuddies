import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { catalogCompanions } from "../data";
import type { Behavior } from "../types";
import { getGusPose, GusSprite } from "./GusSprite";

const gus = catalogCompanions.find((pet) => pet.id === "gus")!;

describe("GusSprite", () => {
  it.each<[Behavior, string]>([
    ["idle", "idle"],
    ["sit", "idle"],
    ["watch", "idle"],
    ["walk", "walk"],
    ["come", "walk"],
    ["drag", "idle"],
    ["chase", "chase"],
    ["stalk", "stalk"],
    ["pounce", "pounce"],
    ["jump", "pounce"],
    ["fall", "idle"],
    ["toss", "idle"],
    ["zoomies", "zoomies"],
    ["climb", "climb"],
    ["sleep", "sleep"],
    ["stretch", "stretch"]
  ])("maps %s to the %s authored pose", (behavior, pose) => {
    expect(getGusPose(behavior)).toBe(pose);
  });

  it("renders the selected authored image with stable framing and no duplicate vector shadow", () => {
    const markup = renderToStaticMarkup(<GusSprite pet={gus} behavior="chase" compact={false} />);

    expect(markup).toContain('data-gus-pose="chase"');
    expect(markup).toContain("gus-sprite-image");
    expect(markup).toContain("preserveAspectRatio");
    expect(markup).not.toContain("soft-shadow");
    expect(markup).not.toContain("pet-walk-body");
    expect(markup).toContain('aria-label="Gus ginger tabby lounger"');
  });
});
