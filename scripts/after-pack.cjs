/**
 * electron-builder does NOT fail when an extraFiles source is missing - it logs
 * "file source doesn't exist" and carries on. On macOS that produces a bundle
 * with no update core that looks exactly like a shipping one, and a plain
 * "npm run dist" would ship it (adversarial review, finding 2). This hook is the
 * backstop: a mac package must carry every entry build.mac.extraFiles promises.
 *
 * Wired as build.afterPack in package.json. Detection is by the presence of the
 * .app bundle rather than by platform naming, so it cannot be fooled by a
 * renamed platform constant.
 */
const { existsSync } = require("node:fs");
const { join } = require("node:path");

function assertMacHelper(context) {
  const appName = context.packager.appInfo.productFilename;
  const appBundle = join(context.appOutDir, appName + ".app");
  if (!existsSync(appBundle)) return; // not a mac pack

  const macConfig = context.packager.config.mac || {};
  const promised = (macConfig.extraFiles || [])
    .map((entry) => (typeof entry === "string" ? entry : entry && entry.to))
    .filter((to) => typeof to === "string" && to.startsWith("MacOS/"));

  const contents = join(appBundle, "Contents");
  const missing = promised.filter((to) => !existsSync(join(contents, to)));
  if (missing.length > 0) {
    throw new Error(
      "DeskBuddies: the mac bundle is missing " + missing.join(", ") + "\n" +
        "  electron-builder does not fail on a missing extraFiles source, so this\n" +
        "  assertion is the backstop. Build with the guarded lane:\n" +
        "    HOST_KIT_DIR=<kit dir> npm run dist:mac",
    );
  }
  console.log("  \u2022 afterPack: mac bundle carries " + promised.join(", "));
}

exports.afterPack = assertMacHelper;
exports.default = assertMacHelper;
