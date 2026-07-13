import { rm } from "node:fs/promises";

await rm(new URL("../release", import.meta.url), { force: true, recursive: true });
