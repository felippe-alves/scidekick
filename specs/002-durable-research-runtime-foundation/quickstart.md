# Quickstart: Durable Research Runtime Foundation

Run package-local tests:

```bash
bun --cwd=packages/scidekick-runtime test test/research-state.test.ts
bun --cwd=packages/scidekick-cli test test/research-runtime-command.test.ts
```

Run package checks:

```bash
bun --cwd=packages/scidekick-runtime run check
bun --cwd=packages/scidekick-cli run check
```

Example command flow through the coding-agent wrapper:

```bash
sk research init --session rs_demo --objective "Evaluate whether a result is reproducible."
sk research plan --session rs_demo --title "Reproducibility check" --evidence "Two reruns agree" --success "Outputs match within tolerance" --stop "Stop after two reruns" --rollback "Restore the previous artifact snapshot"
sk research status --session rs_demo
```
