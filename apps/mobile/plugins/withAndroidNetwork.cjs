const { withDangerousMod } = require("expo/config-plugins");
const { mkdir, writeFile } = require("node:fs/promises");
const path = require("node:path");

module.exports = function withAndroidNetwork(config, { local = false } = {}) {
  return withDangerousMod(config, [
    "android",
    async (mod) => {
      const release = path.join(
        mod.modRequest.platformProjectRoot,
        "app/src/release",
      );
      const directory = path.join(release, "res/xml");
      await mkdir(directory, { recursive: true });
      await writeFile(
        path.join(release, "AndroidManifest.xml"),
        `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
  <application android:networkSecurityConfig="@xml/chagok_network_security" />
</manifest>
`,
      );
      // Rewrite in both modes so prebuild cannot retain an earlier local exception.
      await writeFile(
        path.join(directory, "chagok_network_security.xml"),
        `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="false" />
${local ? '  <domain-config cleartextTrafficPermitted="true"><domain includeSubdomains="false">10.0.2.2</domain></domain-config>\n' : ""}</network-security-config>
`,
      );
      return mod;
    },
  ]);
};
