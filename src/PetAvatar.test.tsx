import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { customCompanions } from "./data";
import { PetAvatar } from "./PetAvatar";

const mochi = customCompanions.find((pet) => pet.id === "mochi")!;
const biscuit = customCompanions.find((pet) => pet.id === "biscuit")!;

describe("PetAvatar custom cats", () => {
  it("renders Mochi with authored identity and watch pose marker", () => {
    const markup = renderToStaticMarkup(<PetAvatar pet={mochi} behavior="watch" />);

    expect(markup).toContain("Mochi watchful house cat");
    expect(markup).toContain("mochi-avatar");
    expect(markup).toContain("pose-watch");
  });

  it("renders Biscuit with authored identity and stretch pose marker", () => {
    const markup = renderToStaticMarkup(<PetAvatar pet={biscuit} behavior="stretch" />);

    expect(markup).toContain("Biscuit orange-and-white lounger");
    expect(markup).toContain("biscuit-avatar");
    expect(markup).toContain("pose-stretch");
  });

  it("routes Mochi and Biscuit to the side-profile walk rig when walking", () => {
    const mochiMarkup = renderToStaticMarkup(<PetAvatar pet={mochi} behavior="walk" />);
    const biscuitMarkup = renderToStaticMarkup(<PetAvatar pet={biscuit} behavior="walk" />);

    expect(mochiMarkup).toContain("rig-cat");
    expect(mochiMarkup).toContain("pose-walk");
    expect(biscuitMarkup).toContain("rig-cat");
    expect(biscuitMarkup).toContain("pose-walk");
  });

  it("keeps the front-facing sticker for compact tray thumbnails even when walking", () => {
    const markup = renderToStaticMarkup(<PetAvatar pet={mochi} behavior="walk" compact />);

    expect(markup).toContain("mochi-avatar");
    expect(markup).not.toContain("rig-cat");
  });
});
