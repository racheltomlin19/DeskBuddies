import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { customCompanions } from "./data";
import { PetAvatar } from "./PetAvatar";

const mochi = customCompanions.find((pet) => pet.id === "mochi")!;
const biscuit = customCompanions.find((pet) => pet.id === "biscuit")!;

describe("PetAvatar custom cats", () => {
  it("renders Mochi with authored identity and watch pose marker", () => {
    const markup = renderToStaticMarkup(<PetAvatar pet={mochi} behavior="watch" />);

    expect(markup).toContain('aria-label="Mochi calico Japanese Bobtail"');
    expect(markup).toContain("mochi-avatar");
    expect(markup).toContain("japanese-bobtail");
    expect(markup).toContain("bobtail-tail");
    expect(markup).toContain("calico-patch");
    expect(markup).toContain("pose-watch");
  });

  it("renders Biscuit with authored identity and stretch pose marker", () => {
    const markup = renderToStaticMarkup(<PetAvatar pet={biscuit} behavior="stretch" />);

    expect(markup).toContain('aria-label="Biscuit cream-orange Maine Coon"');
    expect(markup).toContain("biscuit-avatar");
    expect(markup).toContain("maine-coon");
    expect(markup).toContain("maine-coon-ruff");
    expect(markup).toContain("ear-tufts");
    expect(markup).toContain("pose-stretch");
    expect(markup).toContain("tabby-face-stripes");
    expect(markup).toContain("cream-muzzle");
    expect(markup).not.toContain("face-mask");
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
    const mochiMarkup = renderToStaticMarkup(<PetAvatar pet={mochi} behavior="walk" compact />);
    const biscuitMarkup = renderToStaticMarkup(<PetAvatar pet={biscuit} behavior="walk" compact />);

    expect(mochiMarkup).toContain('aria-label="Mochi calico Japanese Bobtail"');
    expect(mochiMarkup).toContain("mochi-avatar japanese-bobtail");
    expect(mochiMarkup).toContain("bobtail-tail");
    expect(mochiMarkup).not.toContain("rig-cat");

    expect(biscuitMarkup).toContain('aria-label="Biscuit cream-orange Maine Coon"');
    expect(biscuitMarkup).toContain("biscuit-avatar maine-coon");
    expect(biscuitMarkup).toContain("fluffy-tail");
    expect(biscuitMarkup).toContain("maine-coon-ruff");
    expect(biscuitMarkup).toContain("ear-tufts");
    expect(biscuitMarkup).not.toContain("rig-cat");
  });
});
