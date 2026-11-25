import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { expect, it } from "vitest";

const require = createRequire(import.meta.url);
const withAndroidNetwork = require("../apps/mobile/plugins/withAndroidNetwork.cjs");
const { parseStringPromise } = require("xml2js");

it("limits the local Release exception to the emulator and removes it on a normal prebuild", async () => {
  const root = await mkdtemp(join(tmpdir(), "chagok-network-test-"));
  try {
    for (const local of [false, true, false]) {
      const config = withAndroidNetwork(
        { name: "test", slug: "test" },
        { local },
      );
      await config.mods.android.dangerous({
        modRequest: { platformProjectRoot: root },
      });
      const release = join(root, "app/src/release");
      const manifest = await parseStringPromise(
        await readFile(join(release, "AndroidManifest.xml"), "utf8"),
      );
      expect(
        manifest.manifest.application[0].$["android:networkSecurityConfig"],
      ).toBe("@xml/chagok_network_security");
      const xml = await parseStringPromise(
        await readFile(
          join(release, "res/xml/chagok_network_security.xml"),
          "utf8",
        ),
      );
      const network = xml["network-security-config"];
      expect(network["base-config"][0].$.cleartextTrafficPermitted).toBe(
        "false",
      );
      expect(network["domain-config"] ?? []).toEqual(
        local
          ? [
              {
                $: { cleartextTrafficPermitted: "true" },
                domain: [{ _: "10.0.2.2", $: { includeSubdomains: "false" } }],
              },
            ]
          : [],
      );
      await expect(
        readFile(join(root, "app/src/main/AndroidManifest.xml")),
      ).rejects.toMatchObject({ code: "ENOENT" });
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
