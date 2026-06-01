---
title: "Model Context Protocol (MCP)"
type: note
created: 2026-05-31T23:59:00.000Z
updated: 2026-05-31T23:59:00.000Z
tags: [infrastructure, protocol, mcp, tool-calling, agent-interface]
---

# Model Context Protocol (MCP)

A standardized protocol for hosts, clients, and servers to expose resources, prompts, and tools over JSON-RPC.

- **Spec**: https://modelcontextprotocol.io/specification/2025-06-18
- **Security principles**: User consent, data privacy, tool safety, sampling controls

## Relevance to Scidekick

Referenced in the science surface. Scidekick's MCP integration (`packages/coding-agent/src/mcp/`) implements the MCP protocol for tool bridging. The science surface specifies that MCP server pages should record schema, permissions, side effects, trust boundary, test fixtures, and security notes. Scidekick should treat tool descriptions as untrusted unless they come from a trusted server.
