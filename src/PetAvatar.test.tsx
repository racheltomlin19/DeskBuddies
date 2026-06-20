import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { customCompanions } from "./data";
import { PetAvatar } from "./PetAvatar";

const buddy1 = customCompanions.find((pet) => pet.id === "buddy1")!;
const buddy2 = customCompanions.find((pet) => pet.id === "buddy2")!;

describe("PetAvatar custom cats", () => {
  it("renders Buddy1 with authored identity and watch pose marker", () => {
    const markup = renderToStaticMarkup(<PetAvatar pet={buddy1} behavior="watch" />);

    expect(markup).toContain("Buddy1 watchful house cat");
    expect(markup).toContain("buddy1-avatar");
    expect(markup).toContain("pose-watch");
  });

  it("renders Buddy2 with authored identity and stretch pose marker", () => {
    const markup = renderToStaticMarkup(<PetAvatar pet={buddy2} behavior="stretch" />);

    expect(markup).toContain("Buddy2 orange-and-white lounger");
    expect(markup).toContain("buddy2-avatar");
    expect(markup).toContain("pose-stretch");
  });

  it("routes Buddy1 and Buddy2 to the side-profile walk rig when walking", () => {
    const buddy1Markup = renderToStaticMarkup(<PetAvatar pet={buddy1} behavior="walk" />);
    const buddy2Markup = renderToStaticMarkup(<PetAvatar pet={buddy2} behavior="walk" />);

    expect(buddy1Markup).toContain("rig-cat");
    expect(buddy1Markup).toContain("pose-walk");
    expect(buddy2Markup).toContain("rig-cat");
    expect(buddy2Markup).toContain("pose-walk");
  });

  it("keeps the front-facing sticker for compact tray thumbnails even when walking", () => {
    const markup = renderToStaticMarkup(<PetAvatar pet={buddy1} behavior="walk" compact />);

    expect(markup).toContain("buddy1-avatar");
    expect(markup).not.toContain("rig-cat");
  });
});
