# Reference Reading Map

Inspect the smallest relevant surface for the slice being implemented.

## DeepSeek Harness

Purpose: study plugin-first composition, capability/provider seams, lifecycle/events, deterministic execution lessons, persistence/provider separation, and future runtime interoperability.

Read first:

- `README.md`
- `docs/architecture.md`
- `docs/cordis-primer.md` for understanding only
- `packages/README.md`

Selective areas:

- core session/event packages;
- core tools/policy pipeline;
- system-prompt composition;
- agent-loop boundaries (do not recreate it);
- compaction/provenance ideas;
- storage/session providers;
- profiles/bundles/bootstrap;
- subagent providers when designing future interoperability.

Adopt concepts selectively:

- capability/provider thinking;
- plugin composition;
- event extension points;
- deterministic behavior;
- lifecycle/disposal;
- profile layering;
- isolation != security.

Reject/defer for v0:

- Cordis dependency;
- own LLM/agent loop/tool runtime;
- sandbox runtime;
- self-modifying runtime plugins;
- subagent/workflow/job infrastructure.

## repository-harness — current

Purpose: study repository-as-system-of-record, compact agent guidance, bounded context, durable plans only when useful, human decision gates, and executable proof.

Read first:

- `README.md`
- `AGENTS.md`
- `docs/WORKFLOW.md`
- `docs/README.md`
- decision 0027 ending Protocol V1.

## repository-harness — legacy `harness-cli-v0.1.22`

Purpose: archaeology for useful structured evidence/intake/diagnostic ideas.

Inspect selectively:

- `.harness/` / schemas;
- CLI/control-plane code;
- feature intake/story/test-matrix/trace/evidence concepts.

Possible adaptations:

- structured evidence;
- machine-readable validation metadata;
- explicit diagnostics.

Do not recreate:

- mandatory story/task DB;
- duplicate lifecycle state already represented by Git/repository plans;
- process overhead for every small change.

## Local consumer — Wizloft CLI

If `.references/consumers/wizloft-cli` exists, treat it as read-only while building Harness.
Focus on:

- root `AGENTS.md`, workflow, decisions/plans;
- root dispatcher/package/tests;
- Shopify `AGENTS.md`, architecture, roadmap, tests;
- `.harness-core` only to understand installed provenance/compatibility, not as current consumer authority.
