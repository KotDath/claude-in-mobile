# Aurora audb — PR #49 review, 2026-10-09

## Scope and project rules

Feature branch `feat/aurora-audb-migration` integrates the released audb 0.3
public JSON contract with existing CLI, skills and MCP. Upstream 4.4.1 was merged
at `7ed83cc` without rewriting history. Main and project versions are unchanged.
The local release profile explicitly excludes ordinary feature development;
this is not a claude-in-mobile release. No OMP delegation rules apply outside
OMP sessions. Existing host injection tests, CLI shell opt-in, MCP denylist,
audit policy and permission prompt safeguards are retained.

## Maintainer feedback

- M1 and M3: the broad location/sensor/perf/sandbox/display extension tools were
  removed from this minimal integration. Their boolean/unit issues are deferred
  with those tools, not claimed as implemented fixes. Added Aurora permission
  tools validate the platform explicitly.
- M2: install/uninstall are exposed and documented in the current CLI; fake and
  real integration checks cover application installation/removal.
- Root: CLI `--root` and MCP `root:true` both forward `audb shell --root` on Aurora;
  both reject other platforms before dispatch. Omitting root stays unprivileged.
- Version parsing: strict stable SemVer `^0.3.0` in both clients. The external
  Rust CLI requirement, JSON schema and contract URL live in the Aurora plugin's
  package.json; the TS client enforces that manifest requirement. PATH precedes
  AUDB_PATH, and an incompatible PATH binary is not silently bypassed.
- Contract: https://github.com/KotDath/audb/tree/v0.3.0 and the public release
  https://github.com/KotDath/audb/releases/tag/v0.3.0. `cargo install audb-client`
  installs a binary named `audb`; the obsolete `audb-client` fallback is absent.
- CI now explicitly runs the native `aurora_cli` integration suite. Production
  advisories discovered in the current base were fixed in a separate dependency
  commit, without force upgrades or new audit ignores.

## Local validation

- Clean npm ci, full workspace build, tsc: pass.
- Vitest: 79 files, 1522 tests pass.
- Rust CI suites: 237 tests pass (202 lib + 6 Aurora CLI + 3 Harmony + 5 live
  REPL TUI + 14 REPL observability + 7 skill installer).
- Changed Rust files pass rustfmt. Clippy passes with existing warnings outside
  the new code; this is not a warning-free repository.
- npm production audit: zero vulnerabilities. Full lockfile rebuilt from an
  isolated directory without old node_modules; 8 Linux sharp optional branches
  retained. MCP SDK 1.32.1, sharp 0.35.5, proxy-addr 2.0.8, fast-uri 3.1.8 and
  ip-address 10.7.3 are resolved.
- cargo audit --deny warnings: passes using the repository's unchanged policy.
- Runtime: server --help exits; Browser ESM import passes; actual MCP stdio
  discovery/requests and screenshot compression pass after dependency updates.

## Device evidence and root provisioning

Aurora 5.2.0.259/aarch64 KVADRA device and 5.2.1.200/x86_64 SDK emulator were
checked through native CLI and real MCP stdio. Initial tests covered screenshots,
coordinate scaling, touch/swipe, exact Unicode read-back, binary files, app RPM
idempotency and permission prompts. The temporary fixture was removed. The phone
fixture declares no permissions, so its grant-all check uses an empty set; the
emulator fixture declares UserDirs. This is not a claim of nonempty grants on the
phone fixture.

Root was then provisioned explicitly through a one-shot devel-su credential.
Phone sshd already permits root public-key authentication and was not modified.
A separate identity for this device was authorized for both the existing SSH
user and root; the registry changed only after both connections were verified.
No password is stored in the registry or included in subprocess argv/output.
`setup-root` was repeated without a credential and returned changed:false.
Both CLI and actual MCP stdio return UID 0 with root on phone/emulator, and UID
100000 without it. Screenshots still work; persistent default remains emulator.

The provisioning helper is currently source-only, not in published audb 0.3.0:
https://github.com/KotDath/audb/commit/cb9af47. The ordinary root shell API already
works with released 0.3.0 after provisioning. The audb helper has 97 workspace
tests passing and Clippy --deny warnings passes. Tests include failed credentials,
SSH policy rejection/key cleanup, preserving defaults, idempotent key installation,
symlink refusal and a complete-command UID guard. Private local evidence lives
under ignored cli/target/aurora-evidence and audb/target.

No SDK is required to run the integration against prepared devices. Device-side
agents are a prerequisite. Tested OS versions above do not establish an untested
minimum OS compatibility. Flutter Aurora 3.41.4 was used to build the disposable
fixture; it is not a runtime dependency of this integration.

## GitHub CI

Pending reopening/push; local checks are not GitHub checks. PR #49 was closed,
and the workflow only triggers for an open PR to main or main/release pushes.
The final workflow URL/status will be recorded after the new head is checked.
