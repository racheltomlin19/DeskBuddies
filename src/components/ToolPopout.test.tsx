import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ToolPopout } from "./ToolPopout";

describe("ToolPopout", () => {
  it("renders a floating tool panel with close control", () => {
    const markup = renderToStaticMarkup(
      <ToolPopout title="Timer" onClose={() => undefined}>
        <p>Body</p>
      </ToolPopout>
    );

    expect(markup).toContain("Timer");
    expect(markup).toContain("Close Timer");
    expect(markup).toContain("Body");
  });
});
