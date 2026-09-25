---
name: deepseek-only-dev
description: Run architecture, implementation, review, and integration with DeepSeek models only, using native Agent Teams or imouto-driver workers.
---

# DeepSeek-Only Development

Use this skill when oniichan requests a DeepSeek-only flow.

## Lead model

The Lead performs architecture and orchestration with the selected DeepSeek model. Workers use the same DeepSeek route or `deepseek-flash` through imouto-driver.

Confirm the Lead model is a DeepSeek model from the runtime context. If the Lead is not DeepSeek, report that the flow is not DeepSeek-only.

A DeepSeek-only flow passes when it completes acceptance without non-DeepSeek model work. Human approval and deterministic tools do not violate this rule.

## Effort

Select `low`, `high`, or `max` effort.

- Use `max` for Lead, architecture, difficult debugging, and final review.
- Use `high` for ordinary implementation and integration.
- Use `low` only for mechanical, fully specified work.

## Transport choice

Use one coordination transport per task.

- Native Agent Teams: use when oniichan requests Agent Teams or teammates.
- Imouto-driver: use for bounded DeepSeek workers under one Lead.
- Solo: use for tightly coupled or small work.

Load `subimouto-dev` for the chosen transport. It covers the native and driver routes.

Do not run two task boards for one task. The selected transport remains authoritative.

## Verification

Do not reduce verification because the context window is large. Context capacity does not license irrelevant reading.
