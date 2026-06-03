# pi-coding-agent: Upstream Merge Plan (15.7.3 → 15.8.2)

## Summary

| Category | Count | Strategy |
|---|---|---|
| Pure upstream (can copy) | 3 | Copy from vendor |
| New vendor files (to add) | 11 | Copy from vendor |
| Scidekick-only files (preserve) | 13 | Verify no vendor conflict |
| Scidekick-modified (need merge) | 147 | Batch by diff size |

---

## Batch 1: Pure upstream + new vendor files (zero risk)

### 1a — Copy pure-upstream files

These have zero Scidekick modifications — the diff is purely upstream drift:

```
discovery/builtin-rules/index.ts
eval/__tests__/llm-bridge.test.ts
eval/llm-bridge.ts
```

### 1b — Add new vendor files

```
cli/claude-trace-cli.ts              # Claude trace CLI tool
discovery/builtin-rules/ts-no-deprecated-leftovers.md  # New builtin rule
eval/__tests__/heartbeat.test.ts     # Heartbeat test
eval/concurrency-bridge.ts           # Task maxConcurrency bridge
eval/heartbeat.ts                    # Idle watchdog heartbeat
lsp/diagnostics-ledger.ts            # LSP diagnostics dedup
prompts/system/empty-stop-retry.md   # Empty-stop retry prompt
task/repair-args.ts                  # Task tool arg repair
tools/eval-backends.ts               # Eval backends for status streams
tools/eval-render.ts                 # Eval renderer (split from eval.ts)
utils/jj.ts                          # JJ workspace support
```

---

## Batch 2: Trivial merges (diff < 15 lines)

These are mostly import additions, feature flags, or one-line config changes. Quick
three-way merge: apply upstream patch, verify Scidekick additions preserved.

```
 capbility/types.ts                  (10 lines)
 cli-commands.ts                     (15 lines)
 cli/agents-cli.ts                   (8 lines)
 cli/args.ts                         (12 lines)
 cli/file-processor.ts              (10 lines)
 cli/session-picker.ts              (6 lines)
 cli/ssh-cli.ts                      (5 lines)
 cli/update-cli.ts                   (4 lines)
 commands/acp.ts                     (8 lines)
 commands/agents.ts                  (5 lines)
 commands/auth-broker.ts            (3 lines)
 commands/auth-gateway.ts           (4 lines)
 commands/launch.ts                  (7 lines)
 commands/read.ts                    (9 lines)
 commands/worktree.ts               (6 lines)
 config/keybindings.ts              (4 lines)
 config/model-registry.ts           (5 lines)
 discovery/claude-plugins.ts        (8 lines)
 discovery/claude.ts                (5 lines)
 edit/index.ts                       (4 lines)
 edit/streaming.ts                   (7 lines)
 eval/agent-bridge.ts               (10 lines)
 eval/js/executor.ts                (8 lines)
 eval/js/shared/prelude.txt         (3 lines)
 eval/js/tool-bridge.ts             (6 lines)
 eval/py/executor.ts                (9 lines)
 eval/py/prelude.py                 (5 lines)
 exec/bash-executor.ts              (8 lines)
 extensibility/shared-events.ts    (6 lines)
 extensibility/skills.ts            (9 lines)
 internal-urls/docs-index.generated.ts (generated, skip)
 internal-urls/local-protocol.ts    (8 lines)
 internal-urls/types.ts             (4 lines)
 lsp/client.ts                       (7 lines)
 lsp/index.ts                        (6 lines)
 lsp/utils.ts                        (5 lines)
 modes/acp/acp-event-mapper.ts     (8 lines)
 modes/components/assistant-message.ts (5 lines)
 modes/components/custom-editor.ts  (7 lines)
 modes/components/hook-selector.ts  (6 lines)
 modes/components/oauth-selector.ts (4 lines)
 modes/components/session-selector.ts (4 lines)
 modes/components/settings-selector.ts (5 lines)
 modes/components/tool-execution.ts (10 lines)
 modes/components/welcome.ts       (8 lines)
 modes/controllers/extension-ui-controller.ts (7 lines)
 modes/controllers/input-controller.ts (8 lines)
 modes/controllers/mcp-command-controller.ts (12 lines)
 modes/controllers/omfg-controller.ts (8 lines)
 modes/controllers/selector-controller.ts (6 lines)
 modes/rpc/rpc-mode.ts              (5 lines)
 modes/setup-wizard/scenes/splash.ts (4 lines)
 modes/types.ts                      (6 lines)
 modes/utils/ui-helpers.ts          (8 lines)
 prompts/agents/reviewer.md         (4 lines)
 prompts/review-request.md          (5 lines)
 prompts/tools/ask.md               (3 lines)
 prompts/tools/eval.md              (5 lines)
 prompts/tools/find.md              (4 lines)
 prompts/tools/irc.md               (2 lines)
 prompts/tools/search.md            (6 lines)
 prompts/tools/task.md              (5 lines)
 registry/agent-registry.ts         (8 lines)
 secrets/index.ts                    (4 lines)
 session/history-storage.ts         (10 lines)
 task/executor.ts                   (9 lines)
 task/index.ts                       (6 lines)
 task/output-manager.ts             (8 lines)
 task/render.ts                      (8 lines)
 tiny/models.ts                      (8 lines)
 tiny/title-client.ts               (6 lines)
 tiny/title-protocol.ts             (4 lines)
 tiny/worker.ts                      (5 lines)
 tools/ask.ts                        (8 lines)
 tools/ast-edit.ts                   (7 lines)
 tools/ast-grep.ts                   (5 lines)
 tools/browser/tab-worker.ts        (4 lines)
 tools/find.ts                       (9 lines)
 tools/gh.ts                         (5 lines)
 tools/index.ts                      (6 lines)
 tools/path-utils.ts                (8 lines)
 tools/read.ts                       (10 lines)
 tools/renderers.ts                  (9 lines)
 tools/report-tool-issue.ts         (4 lines)
 tools/search-tool-bm25.ts          (8 lines)
 tools/sqlite-reader.ts             (6 lines)
 tools/write.ts                      (7 lines)
 tui/output-block.ts                (5 lines)
 utils/clipboard.ts                 (4 lines)
 utils/git.ts                        (7 lines)
 utils/open.ts                       (6 lines)
 web/kagi.ts                         (5 lines)
 web/search/providers/anthropic.ts  (6 lines)
 web/search/providers/exa.ts       (5 lines)
 web/search/providers/kagi.ts      (4 lines)
 slash-commands/builtin-registry.ts (6 lines)
 slash-commands/helpers/mcp.ts     (10 lines)
 slash-commands/types.ts           (8 lines)
 extensibility/custom-tools/types.ts (7 lines)
 extensibility/extensions/types.ts  (8 lines)
 extensibility/custom-commands/bundled/review/index.ts (5 lines)
 exec/exec.ts                       (10 lines)
 export/ttsr.ts                     (8 lines)
 mcp/transports/stdio.ts           (6 lines)
```

**Approach per file:**
1. Copy vendor version over
2. Re-apply Scidekick modifications (identified by git diff against fork point)
3. Verify

---

## Batch 3: Medium merges (diff 15-50 lines)

```
 discovery/omp-plugins.ts           (21 lines)
 extensibility/plugins/types.ts     (46 lines)
 session/session-manager.ts         (39 lines)
 config/settings.ts                 (36 lines)
 modes/acp/acp-agent.ts             (34 lines — reloadMcp additions)
 tools/render-utils.ts              (33 lines — sanitizeForTui additions)
 modes/controllers/command-controller.ts (24 lines)
 eval/__tests__/agent-bridge.test.ts (12 lines)
 modes/components/status-line/presets.ts (scidekick style)
 modes/components/status-line/segments.ts
 modes/components/status-line/separators.ts
 modes/components/status-line.ts
 modes/theme/dark.json               (scidekick theme colors)
 modes/theme/light.json              (scidekick theme colors)
 modes/theme/theme-schema.json       (scidekick additions)
 modes/theme/theme.ts                (scidekick additions)
 prompts/system/orchestrate-notice.md
 prompts/system/project-prompt.md    (scidekick science context)
 prompts/system/subagent-system-prompt.md
 prompts/system/system-prompt.md     (scidekick additions)
 prompts/system/workflow-notice.md
 prompts/tools/search-tool-bm25.md
 extensibility/extensions/loader.ts
 extensibility/extensions/runner.ts
```

**Approach:** Three-way merge: vendor-old → vendor-new patch applied to Scidekick's version.

---

## Batch 4: Large merges (diff > 50 lines)

These are the core files with significant Scidekick changes. Each needs careful
per-file review.

| File | Diff lines | Scidekick changes |
|---|---|---|
| `tools/eval.ts` | 801 | Scidekick eval extensions (agent/parallel/pipeline/tool bridges) |
| `session/agent-session.ts` | 571 | Budget isolation, reloadRuntime, SourceRegistry, shake-summary removal |
| `modes/interactive-mode.ts` | 168 | Scidekick TUI modifications, science surface |
| `main.ts` | 166 | @file validation, scidekick CLI additions |
| `mcp/manager.ts` | 140 | DisconnectAll prompt notification, scidekick MCP extensions |
| `sdk.ts` | 133 | reloadMcp, scidekick extension loading changes |
| `discovery/omp-extension-roots.ts` | 93 | config.yml support, precedence docs |
| `extensibility/plugins/manager.ts` | 84 | Linked plugins, capabilities/risk |
| `tools/search.ts` | 83 | validateSearchPattern, virtual regex dispatch |
| `modes/controllers/event-controller.ts` | 72 | shake-summary removal, scidekick events |
| `config/settings-schema.ts` | 71 | Scidekick settings, science tier, shake-summary removal |
| `cli.ts` | 62 | Scidekick CLI additions |

**Approach per file:**
1. Generate the upstream diff (vendor 15.7.3 → 15.8.2)
2. Apply to Scidekick's version
3. Resolve conflicts manually
4. Verify typecheck

---

## Batch 5: Full verification

1. Copy all remaining test files from vendor
2. Run `bun run check` 
3. Run `bun test` for coding-agent package
4. Fix any remaining issues

---

## Execution order

1. Batch 1a (copy 3 pure-upstream files)
2. Batch 1b (add 11 new vendor files)
3. Batch 2 (trivial merges, ~100 files)
4. Batch 3 (medium merges, ~20 files)
5. Batch 4 (large merges, 12 files — one at a time)
6. Batch 5 (verification)

---

## Risk notes

- `tools/eval.ts` (801 line diff) is the riskiest. Scidekick has significant eval extensions; upstream reorganized eval backends/renderers.
- `modes/theme/*.json` files have scidekick color customizations — preserve by keeping our versions.
- `prompts/system/*.md` — many have scidekick-specific content. Keep ours.
- `internal-urls/docs-index.generated.ts` — auto-generated, just regenerate after merge.
