# Platform Plugin: Aurora

`@mcp-devices/plugin-aurora` connects MCP to audb ^0.3.0. Native
`mcp-devices-cli` uses the same public JSON CLI contract. Registered physical
phones/tablets and SDK emulators share device IDs and commands.

Supported: screenshot/compression, coordinate input, Unicode text, named keys,
app lifecycle/inventory, RPM installation/removal, file transfer, shell/logs/info
and Sailjail permissions. UI tree, clipboard, sensor, perf and sandbox extensions
are outside this integration. Flutter SDK is needed to build Flutter apps, not
for runtime control of a prepared device.

Install audb and register/setup devices explicitly; see the maintained agent
[reference](../../cli/plugin/skills/mcp-devices/references/aurora.md) for commands,
root setup policy and limitations. PATH precedes AUDB_PATH. An old audb in PATH
fails with an update instruction. No transport or signing code is duplicated.

Every targeted operation passes `--device ID`. MCP selection stays local to its
adapter and does not modify audb's default. Unknown explicit IDs never fall back
to another Aurora device; registry `unknown` remains `unknown`. Use targeted
audb status/doctor/capabilities to check readiness.

The existing MCP `system` module provides generic permission grant/revoke/reset
and Aurora-only `permission_list`, `permission_grant_all`, `permission_prompt`.
`disablePrompt` is optional and explicit. Enabling the prompt clears grants.
The existing app, screenshot/input and file tools use their capability adapters.

The wrappers validate schemaVersion 1, preserve error codes/partial metadata on
nonzero exits and don't repeat uncertain actions. Text goes through UTF-8 stdin;
PNG data is read from a private temporary directory and removed after capture.
Coordinate scaling uses actual PNG dimensions, including after rotation.
