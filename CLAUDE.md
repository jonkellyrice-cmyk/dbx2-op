
 Policy - LINEAR CODING
Version: v1.0
Status: Canonical / Stable
Scope: All code in repo (TS/TSX/JS/MJS)

================================================================
0. PURPOSE
================================================================
Enforce a file- and module-structure that:
- prevents dependency webs (thrash)
- supports additive growth (no rewrites)
- makes code machine-surgically patchable (fingerprinted blocks)
- keeps reasoning deterministic (top-to-bottom flow)

================================================================
1. CORE RULE: LINEAR READ = LINEAR DEPENDENCY
================================================================
Within a file:
- Dependencies MUST flow top → bottom.
- Earlier sections MUST NOT depend on later sections.

Across files in a folder stack:
- Dependencies MUST flow in the declared order of the stack.
- Earlier layers MUST NOT depend on later layers.

No horizontal mesh.

================================================================
2. FILE SHAPE (CANONICAL SECTION ORDER)
================================================================
Every file MUST be organized into these sections in this order:

3) Imports
4) Types / Constants (Primitives)
5) Pure primitives (small, reusable, no side effects)
6) Helpers (minimal; only if reduces future churn)
7) Composition (wiring, assembly, orchestration)
8) Exports (at end)

Notes:
- “Primitives” = high-leverage building blocks.
- “Helpers” = convenience glue; keep near-zero runtime overhead.
- “Composition” = the only place that wires multiple things together.

================================================================
3. SECTION DEPENDENCY RULES
================================================================
Allowed dependencies:

Imports → (everything)
Types/Constants → (primitives, helpers, composition, exports)
Primitives → (helpers, composition, exports)
Helpers → (composition, exports)
Composition → (exports)
Exports → (nothing)

Disallowed dependencies (examples):
- Types referencing helpers
- Primitives importing composition
- Helpers calling composition functions
- Anything above calling anything below

================================================================
4. SIDE EFFECT RULES
================================================================
- Side effects MUST be isolated to Composition (or explicit “Effects” sublayer).
- Primitives + Helpers are PURE by default:
  - no IO
  - no environment reads (unless explicitly injected)
  - no global mutation
- If an exception is required, it MUST be declared as an Effect and placed in the Effect sublayer.

================================================================
5. ADDITIVE GROWTH RULE (NO REWRITE)
================================================================
Preferred modification pattern:
- Add a new block at the tail of the relevant section.
- Wire it in at the tail of Composition.
- Keep older blocks stable unless a bug fix is required.

Hard rule:
- Do not rewrite existing blocks to “make room”.
- Only edit existing blocks when:
  - bug fix
  - security fix
  - policy violation fix
  - planned versioning event (explicit refactor window)

================================================================
6. FINGERPRINTED BLOCKS (SURGICAL PATCHING)
================================================================
All meaningful blocks MUST be wrapped:

// MDV_BLOCK:BEGIN id=“...” intent=“...” kind=“...” tags=“...”
// ...code...
// MDV_BLOCK:END id=“...”

Rules:
- One responsibility per block.
- Stable IDs; never reused for different meaning.
- Block edits should be minimal; prefer adding new blocks.

================================================================
7. NO HORIZONTAL MESH (MODULE GRAPH RULE)
================================================================
Inside a “layer folder”, files must NOT mutually import each other.

If two siblings need each other:
- extract shared pieces into an earlier layer
- or promote the shared pieces into a common primitive file
- or introduce a new earlier “shared” sublayer

Forbidden:
A imports B and B imports A (cycle)
A imports B and B imports C and C imports A (cycle)
A imports B while B imports A “through index” (hidden cycle)

================================================================
8. LAYER STACK RULES (KERNEL EXAMPLE)
================================================================
Example kernel stack order (earlier → later):

9) types/
10) state/
11) actions/
12) selectors/
13) effects/
14) invariants/
15) index.ts (barrel)

Rules:
- types/: imports NOTHING from later kernel folders
- state/: may import types/ only
- actions/: may import types/ and state/ only
- selectors/: may import types/, state/, actions/
- effects/: may import types/, state/, actions/, selectors/
- invariants/: may import anything earlier; must not create cycles
- index.ts: exports only; no logic

If you need a new dependency:
- move the dependency earlier in the stack
- or split the feature into a new earlier sublayer
- do NOT “reach forward”

================================================================
9. BARREL EXPORT POLICY
================================================================
- index.ts files are “barrels” and should be minimal.
- index.ts MAY export from semantic files, but MUST NOT contain logic.
- If index.ts grows beyond re-exports:
  - split the folder
  - or introduce semantic files and keep index.ts thin

================================================================
10. VALIDATION EXPECTATIONS
================================================================
A deterministic validator SHOULD be able to check:
- section order present
- MDV blocks present
- no forbidden dependency direction
- no cycles in layer graphs
- side effects confined to composition/effects

================================================================
11. SUMMARY RULES (NON-NEGOTIABLE)
================================================================
- Top-to-bottom dependency flow.
- Section order fixed.
- Add > rewrite.
- No sibling mesh.
- Effects isolated.
- Barrels thin.
- Kernel layers only depend backward.

cat >> docs/policies/mdv_linear_code_policy.md <<‘EOF’

================================================================
12. THIN SHELL / ORCHESTRATION POLICY
================================================================
Certain files exist explicitly as *thin shells*. Their purpose is
NOT to contain logic, but to wire logic together.

Thin shells include (non-exhaustive):
- app/page.tsx
- app/layout.tsx
- app/**/route.ts
- kernel/index.ts
- kernel/*/index.ts
- top-level orchestrator files

Rules for thin shells:
- No business logic.
- No domain rules.
- No state mutation.
- No branching beyond trivial routing.
- Ideally ≤ 30–50 LOC.

What thin shells MAY do:
- Import pre-built primitives, actions, selectors, effects.
- Wire modules together in a single, explicit composition step.
- Adapt framework-specific inputs/outputs (Next.js, HTTP, UI events).
- Act as the sole bridge between external systems and the kernel.

What thin shells MUST NOT do:
- Reimplement logic already present in the kernel.
- Contain helpers or primitives.
- Hide behavior behind implicit framework magic.
- Accumulate logic over time (if it grows, split downward).

Mental model:
- Thin shells are adapters.
- The kernel is the brain.
- Framework files are plugs, not circuits.

If a thin shell starts “thinking”, it is violating policy.

================================================================

cat >> docs/policies/mdv_linear_code_policy.md <<‘EOF’

================================================================
13. DOMAIN ↔ ADAPTER PAIRING POLICY
================================================================
Every *domain file* (semantically named file) MUST have a
corresponding *adapter file*.

Definitions:
- Domain file: semantically named, human-meaningful logic container
  (e.g. ChatRoute.ts, AppUI.tsx, KernelState.ts)
- Adapter file: framework- or structure-facing sibling, usually
  named index.ts, route.ts, page.tsx, or similar

Relationship:
- Domain file contains logic.
- Adapter file contains wiring ONLY.

Rules for adapters:
- Adapter files MUST be siblings of their domain file.
- Adapter files MUST NOT contain logic.
- Adapter files MUST NOT create state.
- Adapter files MUST NOT branch meaningfully.
- Adapter files SHOULD ideally be 1–5 lines of code.

Canonical adapter pattern:
- Import from the domain file
- Export to the framework or parent system
- Do nothing else

Example:
- ChatRoute.ts  ← domain (logic)
- route.ts      ← adapter (Next.js)

Mental model:
- Domain files are *what the system does*
- Adapter files are *where the system plugs in*

Adapters are disposable.
Domains are durable.

If an adapter grows:
- Logic is leaking upward
- Split immediately
- Move logic into the domain file

This policy exists to:
- Preserve semantic clarity
- Enable visual hiding of adapters
- Keep framework churn isolated
- Make refactors additive and safe

================================================================

EOF

cat >> docs/policies/mdv_linear_code_policy.md <<‘EOF’

================================================================
14. MINIMUM VIABLE SURFACE & ADDITIVE STABILIZATION POLICY
================================================================
All projects MUST begin by establishing a **Minimum Viable Surface
Area (MVSA)**.

Definitions:
- Minimum Viable Surface Area (MVSA):
  The smallest possible end-to-end system that:
  - Runs
  - Is coherent
  - Exercises the full architectural stack
  - Has real inputs and outputs

The MVSA is NOT a prototype.
The MVSA is NOT throwaway.
The MVSA is the first stable version of the system.

-—————————————————————
Core Principle
-—————————————————————
After the MVSA exists, **the system grows only by addition**.

- No refactors as a primary mode of progress
- No large multi-feature merges
- No speculative over-design
- No “we’ll clean this up later”

Each step after MVSA MUST:
- Add a concrete module, capability, or invariant
- Be internally stable
- Leave the system runnable and shippable
- Integrate cleanly with existing structure

Every change should result in a **usable upgrade**, not a half-state.

-—————————————————————
Why This Exists
-—————————————————————
This policy exists to prevent:
- Scope drift
- Logical drift
- Dependency webs
- Partial systems that cannot run
- Long refactor cycles
- Thrash caused by speculative architecture

Refactors are high-risk, high-cost, and non-local.
Additive growth is low-risk, local, and reversible.

-—————————————————————
Operational Rules
-—————————————————————
1. Establish MVSA as early as possible
2. Lock MVSA as the baseline
3. All future work is additive
4. New behavior is introduced via:
   - New modules
   - New domain files
   - New kernel capabilities
5. Existing code is extended, not rewritten
6. Structural change is allowed ONLY at:
   - Explicit version boundaries
   - Kernel version upgrades
   - Intentional architectural resets

-—————————————————————
Mental Model
-—————————————————————
Think of the system as LEGO bricks:
- The base plate is MVSA
- Every step adds a new brick
- You do not pull bricks out of the base to improve it
- You build upward, not sideways

If something feels like it “needs a refactor”:
- The MVSA was insufficiently scoped
- Or the next feature was too large
- Or the abstraction boundary was violated

Fix the *boundary*, not the base.

-—————————————————————
Compatibility With Other Policies
-—————————————————————
This policy reinforces:
- BRU (bounded reasoning units)
- Linear dependency flow
- Primitives-first architecture
- Kernel add-only growth
- Domain ↔ adapter separation
- Thin shell orchestration

Together, these policies ensure:
- Deterministic progress
- Stable iteration
- Continuous usability
- Zero-thrash development

================================================================

EOF


# policy - Kernel Growth 
Version: v1.0  
Status: Canonical  
Scope: Repo-wide architectural policy  
Applies to: All new projects and all refactors

—

## PURPOSE

The Kernel Growth Policy (KGP) defines **how a system is allowed to grow over time**.

Its goal is to:
- Prevent architectural thrash
- Eliminate rewrite cycles
- Minimize hidden dependencies
- Enable linear, additive development
- Preserve long-term composability with LLM-assisted workflows

This policy exists because **rewrites are a symptom of violated growth constraints**, not of insufficient intelligence or planning.

—

## CORE AXIOM

> **The kernel may only grow by addition, never by rewrite.**

If the kernel must change in a way that is not additive:
- A **new kernel version** must be created
- The old kernel remains intact and referenceable
- Migration is explicit, not implicit

—

## DEFINITIONS

### Kernel
The **minimum viable functional surface** required for the system to operate.

The kernel:
- Defines primitives
- Defines invariants
- Defines extension seams
- Does NOT contain feature logic
- Does NOT contain policy logic
- Does NOT anticipate future features beyond seams

### Additive Change
A change that:
- Introduces new files, modules, or capabilities
- Does not alter existing contracts
- Does not invalidate existing behavior
- Does not require refactoring existing code

### Rewrite (Forbidden)
Any change that:
- Alters existing kernel behavior
- Changes meaning of existing primitives
- Requires modifying multiple dependent modules
- Breaks previously valid assumptions

—

## DESIGN PRINCIPLES

### 1. Minimum Viable Kernel Surface

At project start:
- Identify the **smallest possible kernel** that:
  - Runs end-to-end
  - Exposes extension seams
  - Can be reasoned about in isolation

Do NOT:
- Pre-build full directory trees
- Stub future modules with speculative interfaces
- Encode assumptions about future layers

—

### 2. Seam-First Design

Every kernel component MUST expose:
- Explicit extension points
- Stable input/output contracts
- Clear ownership boundaries

Seams are preferred over:
- Callbacks
- Deep inheritance
- Implicit shared state

If a feature cannot be added cleanly:
- The seam is missing
- The fix is to **add a seam**, not rewrite logic

—

### 3. Linear Layering Only

Growth must follow a **strict vertical order**:

1. Kernel primitives
2. Helpers (pure, reusable)
3. Orchestration logic
4. Feature modules
5. UI / presentation
6. Optimization / acceleration

Rules:
- Upper layers may depend on lower layers
- Lower layers must never depend on upper layers
- Lateral dependencies are forbidden

—

### 4. No Hidden Dependencies

All dependencies must be:
- Explicit
- Local
- Declared at module boundaries

Forbidden:
- Cross-module imports without contracts
- Global mutable state
- Implicit coupling via shared files

If dependency graphs become cyclic:
- Growth rules have been violated

—

### 5. Lego-Style Composition

Every addition must:
- Plug in cleanly
- Be removable without side effects
- Not require awareness of sibling modules

The system must support:
- Partial builds
- Partial activation
- Selective inclusion

—

### 6. Expected Iteration Is a First-Class Constraint

The system MUST assume:
- Context loss (LLM)
- Partial understanding (human)
- Incremental design discovery

Therefore:
- Each layer must be independently understandable
- No layer may require global context to modify safely
- Each addition must be locally verifiable

—

### 7. Drift Prevention over Cleverness

Prefer:
- Explicit structures
- Redundant clarity
- Deterministic workflows

Over:
- Clever abstractions
- Implicit inference
- Dense meta-programming

This is a **workflow optimization policy**, not a code golf policy.

—

### 8. Refactors Are Version Boundaries

Refactors are allowed ONLY when:
- Declaring a new kernel version
- Freezing the old kernel
- Providing explicit migration paths

Never refactor “in place”.

—

## ENFORCEMENT RULES

A change MUST be rejected if:
- It modifies existing kernel logic
- It increases dependency depth non-linearly
- It introduces cross-layer coupling
- It requires simultaneous edits across layers

A change SHOULD be delayed if:
- The seam is unclear
- The kernel surface is not fully understood
- The addition would force premature abstraction

—

## RELATIONSHIP TO OTHER POLICIES

- **BRU Policy**: governs *change scope*
- **KGP**: governs *system evolution*
- **Coding Elegance Policy**: governs *implementation quality*

KGP supersedes all others when in conflict.

—

## CANONICAL TEST

Before accepting a change, ask:

1. Is this an addition or a rewrite?
2. Can this be removed without breaking the system?
3. Does this require touching unrelated files?
4. Does this increase hidden dependency load?
5. Could this have been added later without pain?

If any answer is “no” → reject or redesign.

—

## FINAL RULE

> **A system that grows cleanly never needs to be rewritten.**

The cost of slight overhead is always lower than the cost of thrash.

EOF

cat > docs/kernel_policy_addendum_minimum_surfaces.md <<‘EOF’
KERNEL POLICY — ADDENDUM
MINIMUM VIABLE SURFACES FOR NON-KERNEL COMPONENTS

Version: v1.0
Status: Canonical
Applies To: All repositories implementing an MWM-based architecture

============================================================
PURPOSE
============================================================

This addendum defines the **minimum viable surface** for all
non-kernel components required to operate a complete system.

These components are:
- necessary to run the system
- NOT part of the kernel
- strictly subordinate to kernel semantics
- additive-only in evolution

The goal is to prevent:
- dependency thrash
- hidden coupling
- premature scaffolding
- kernel contamination

============================================================
CANONICAL RULE
============================================================

The kernel defines meaning.
Everything else adapts to meaning.

No non-kernel component may:
- define truth
- enforce rules not present in the kernel
- mutate kernel state directly
- introduce irreversible behavior

============================================================
COMPONENT SURFACE DEFINITIONS
============================================================

————————————————————
1. ORCHESTRATOR (REQUIRED)
————————————————————

ROLE:
Lifecycle, routing, coordination.

MINIMUM SURFACE:
- initialize kernel
- load snapshot
- submit atoms to kernel
- request validation
- request queries
- emit kernel outputs
- manage component wiring

ALLOWED:
- scheduling
- batching
- async handling
- error propagation

FORBIDDEN:
- semantic inference
- validation logic
- rule enforcement
- domain knowledge

DEPENDENCIES:
- depends on kernel
- depends on adapters
- kernel must not depend on orchestrator

————————————————————
2. STORAGE / PERSISTENCE (OPTIONAL BUT PRACTICAL)
————————————————————

ROLE:
Durable representation of kernel artifacts.

MINIMUM SURFACE:
- save snapshot
- load snapshot
- version snapshot
- checksum / integrity verify

ALLOWED:
- serialization
- compression
- indexing
- caching

FORBIDDEN:
- semantic interpretation
- validation shortcuts
- partial writes to kernel state

DEPENDENCIES:
- depends on kernel data shapes
- kernel must be storage-agnostic

————————————————————
3. QUERY ADAPTER (REQUIRED)
————————————————————

ROLE:
Translate external questions into kernel queries.

MINIMUM SURFACE:
- accept query intent
- map intent to traversal
- invoke kernel query engine
- return results

ALLOWED:
- query optimization
- result formatting
- pagination

FORBIDDEN:
- inference
- filtering results for “correctness”
- bypassing kernel constraints

DEPENDENCIES:
- depends on kernel query semantics
- kernel must not depend on adapter

————————————————————
4. UI / CLI / API SHELLS (OPTIONAL, MULTIPLE)
————————————————————

ROLE:
Human or system-facing interface.

MINIMUM SURFACE:
- display kernel state
- accept user input
- send commands to orchestrator
- render explanations

ALLOWED:
- presentation logic
- interaction state
- styling
- transport protocols

FORBIDDEN:
- business rules
- validation
- state mutation outside orchestrator
- semantic assumptions

DEPENDENCIES:
- depends on orchestrator
- must never touch kernel directly

————————————————————
5. LANGUAGE CODEC (LLM) (OPTIONAL)
————————————————————

ROLE:
Natural language translation only.

MINIMUM SURFACE:
- text → structured intent
- structured output → text
- conversation stitching
- rolling context window

ALLOWED:
- summarization
- paraphrasing
- explanation formatting

FORBIDDEN:
- world modeling
- memory authority
- decision making
- validation

DEPENDENCIES:
- depends on orchestrator
- must not own state
- kernel must not depend on codec

————————————————————
6. MEMORY INDEXES / CACHES (OPTIONAL)
————————————————————

ROLE:
Performance acceleration only.

MINIMUM SURFACE:
- cache query results
- cache traversal paths
- invalidate on snapshot change

ALLOWED:
- heuristics
- eviction policies

FORBIDDEN:
- authoritative memory
- semantic compression
- lossy persistence

DEPENDENCIES:
- derived entirely from kernel state

————————————————————
7. SIMULATION / SANDBOX RUNNERS (OPTIONAL)
————————————————————

ROLE:
Isolated exploration of alternatives.

MINIMUM SURFACE:
- fork snapshot
- run simulation
- collect outcomes
- discard or promote results

ALLOWED:
- speculative execution
- parallel runs

FORBIDDEN:
- modifying base world
- bypassing validation
- silent promotion

DEPENDENCIES:
- depends on kernel + governance

============================================================
DEPENDENCY DIRECTION (HARD RULE)
============================================================

UI / API / CLI
      ↓
Orchestrator
      ↓
Kernel
      ↑
Storage / Indexes / Simulation

No upward dependency allowed.
No lateral hidden coupling allowed.

============================================================
EVOLUTION RULES
============================================================

- All components grow by ADDITION only
- No rewrites without explicit versioning
- Kernel changes require new version boundary
- Shell changes must not require kernel changes
- Removing a component must not break kernel

============================================================
VIOLATION CONDITIONS
============================================================

Immediate refactor required if:
- kernel imports UI code
- UI enforces rules absent from kernel
- orchestrator mutates kernel state directly
- storage alters semantic meaning
- LLM output is treated as truth

============================================================
SUMMARY
============================================================

One kernel.
Many minimal shells.
Strict boundaries.
Additive evolution.

This addendum is binding.

EOF

# POLICY: Folder Fan-Out & Structural Boundaries (Revised)

STATUS: Advisory (Non-Blocking)

## Core Principle
Folder structure exists to express **semantic and dependency boundaries**, not to satisfy arbitrary numeric limits.

## Replaced Rule
❌ Hard enforcement of “3–5 folders max per directory”

## New Rule
✅ Create a folder **only** when it introduces a meaningful boundary:
- ownership
- lifecycle
- invariants
- dependency direction
- conceptual domain

## Practical Heuristics
- Prefer **fewer folders with clearer names** over many shallow buckets.
- Do NOT create folders solely to reduce visual fan-out.
- Folder boundaries should mirror **dependency layers**, not aesthetics.

## Soft Guidance
- When a folder exceeds ~10–12 direct children:
  - Evaluate regrouping **only if** human legibility suffers.
  - Regroup by semantic boundary, not file type.

## Hard Constraint (Root Only)
- Repo root should remain minimal.
- Root contains:
  - structural entry points
  - contracts/configs required by tooling
  - top-level domain folders
- No “misc”, “utils”, or catch-all folders at root.

## Non-Goals
- Folder count uniformity
- Visual symmetry
- Premature abstraction

## Rationale
Human legibility and linear dependency flow outweigh aesthetic constraints.
Artificial folder boundaries increase churn, indirection, and refactor risk.

EOF



Policy - Bounded Reasoning Unit (BRU)
## Purpose

The Bounded Reasoning Unit (BRU) Policy defines the preferred size and structure of source files so that both humans and LLMs can reason about them reliably, deeply, and with minimal error.

This policy is motivated by cognitive limits in:
- Human code comprehension
- LLM attention and causal simulation
- Debugging and verification workflows
- Patch review and self-correction loops

The goal is to ensure that every file forms a **cohesive, fully understandable reasoning unit**.

—

## Target Size Ranges

### Preferred Range
- **300–500 lines of code (LOC)**

This range is ideal for:
- Deep logical reasoning
- Reliable invariant tracking
- Accurate diff simulation
- High-quality LLM verification and debugging

### Soft Maximum
- **800 LOC**

Files may exceed the preferred range when:
- The code is still clearly single-responsibility
- Logical cohesion remains high
- The structure is clean and well-factored

Crossing this threshold is a signal to *review for possible decomposition*, not an automatic mandate to split.

### Hard Maximum (Exceptional Cases Only)
- **~1,200 LOC**

Only acceptable for:
- Generated code
- Large declarative schemas
- Data tables / constants
- Vendor or third-party code
- Highly repetitive boilerplate

—

## Splitting Criteria (When to Decompose)

A file should be considered for splitting when one or more of the following are true:

- It contains **multiple conceptual responsibilities**
- It has **distinct logical zones** that rarely interact
- Understanding one part requires scrolling far from its dependencies
- Testing or verifying one part requires loading unrelated logic
- The file routinely exceeds the LLM reasoning horizon (~500 LOC) during debugging or refactoring

Line count is a *signal*, not the primary reason.  
**Responsibility boundaries are the true split points.**

—

## Anti-Bloat Guardrails

To avoid over-fragmentation:

- Do **not** split into “one-function-per-file” unless the function is a reusable public unit.
- Prefer **feature folders** over flat file explosions.
- Use **index / barrel files** to expose clean public APIs.
- Keep strongly related logic together even if it approaches the soft limit.
- Optimize for **navigability and conceptual cohesion**, not raw file count.

—

## Folder Structure Recommendation

Example pattern:

## Addendum: Internal Packetization for Oversized Files

### When This Applies
If a file must exceed the BRU targets (800+ LOC, 1200+ LOC, or more) due to legitimate constraints (e.g., complex integration points, generated-ish but hand-maintained code, legacy consolidation, large orchestrators), the file must be structured to preserve *bounded reasoning* internally.

### Principle
An oversized file must be internally divided into **clear, labeled code blocks (“packets”)** such that:

- Each block can be understood and modified with minimal dependence on the full file context.
- Dependencies between blocks are explicit and narrow (interfaces, types, contracts).
- Most blocks do not require reading distant blocks to reason correctly.

### Required Structure
Oversized files should be organized into a small number of major sections, each with a clear header and stable boundaries, for example:

- Imports / constants / types
- State and configuration
- Pure helpers (stateless utilities)
- Core logic blocks (grouped by responsibility)
- Integration block (wires other blocks together)
- Entry points / exported API

### Block Design Rules
Within an oversized file:

1. **Single Responsibility per Block**
   - Each block owns one coherent responsibility.
   - Avoid mixing unrelated concerns inside the same block.

2. **Self-Sufficiency**
   - Prefer pure functions and local reasoning.
   - Minimize hidden coupling via shared mutable state.
   - When shared state is required, centralize it and keep access patterns explicit.

3. **Explicit Contracts**
   - Define inputs/outputs clearly (types, parameter objects, return shapes).
   - Treat adjacent blocks like “modules” with a stable interface.

4. **Narrow Dependency Graph**
   - Blocks should depend on:
     - shared types/constants, and
     - a small set of helper functions
   - Avoid “spaghetti” where everything calls everything.

5. **Integration Exception**
   - One block may be designated as the **Integration/Wiring Block**.
   - It is allowed to depend on many blocks and coordinate them.
   - Other blocks should ideally not depend on the integration block.

### Rationale
This preserves BRU benefits even when file-level limits cannot be met:

- LLM/human reasoning can focus on one block at a time
- Debugging and verification can target isolated packets
- Review packets can include only the relevant section
- Refactors remain safer and more incremental

### Summary
If a file cannot be kept within BRU limits, it must still be **internally BRU-compliant**:
clearly packetized, minimally interdependent, and structured around explicit contracts—except for a single wiring/integration block.

## Addendum: Coding Elegance & High-Leverage Design

### Purpose

This addendum defines **coding elegance** as a first-class design goal that complements BRU size constraints.

Where BRU focuses on *bounded reasoning*, this section focuses on **leverage**:
maximizing expressive power, reuse, and correctness while minimizing surface area,
special cases, and cognitive load.

Elegant code is not shorter by accident — it is *denser in meaning*.

—

## Definition of Coding Elegance

**Elegant code exhibits the following properties:**

1. **High Leverage**
   - A small number of well-designed primitives are reused widely.
   - Most system behavior emerges from composition, not duplication.
   - New features are expressed by *recombining existing pieces*, not inventing new logic.

2. **Low Granular Complexity**
   - Individual functions are simple, readable, and locally reasoned about.
   - Complexity lives at higher levels of composition, not inside functions.
   - No function should require mental simulation of many hidden branches.

3. **Composability Over Specialization**
   - Prefer general, parameterized functions over bespoke, one-off helpers.
   - Avoid “this-only” logic unless it encodes a truly unique domain invariant.
   - If two functions look similar, they probably want to be one primitive.

4. **Explicit Abstractions**
   - Abstractions exist to *compress reasoning*, not to hide behavior.
   - A reader should be able to predict what a primitive does from its name and signature.
   - Surprise is a design failure.

5. **Stable Mental Models**
   - The same concepts appear in the same shapes throughout the codebase.
   - Data flows and control flows follow consistent patterns.
   - Once a reader learns the primitives, the rest of the system feels familiar.

—

## Primitive-First Design Rule

> **If a piece of logic is useful in more than one place, it must become a primitive.**

A *primitive* is:
- Small
- General
- Deterministic (preferably pure)
- Reusable across modules
- Easy to test in isolation

### Anti-Pattern
- Long functions that mix:
  - data extraction
  - transformation
  - decision logic
  - side effects
- Slight variations of the same logic copy-pasted across files

### Preferred Pattern
- Extract the common logic into a single primitive
- Parameterize the differences
- Compose primitives to express higher-level behavior

—

## Elegance-Driven Decomposition Rules

When refactoring or designing new code:

1. **Extract Before Splitting**
   - Prefer extracting reusable primitives over splitting files prematurely.
   - File splits should usually follow *primitive stabilization*, not precede it.

2. **One Responsibility per Function**
   - A function should answer one clear question or perform one transformation.
   - If the name contains “and”, it likely does too much.

3. **Shallow Functions, Deep Composition**
   - Functions should be short and shallow.
   - Systems may be deep, but only through composition of simple parts.

4. **Few Powerful Primitives > Many Weak Helpers**
   - Ten tiny helpers that are each used once is worse than
     two strong primitives used everywhere.

—

## Elegance vs. Cleverness

**Clever code is not elegant code.**

- Clever code optimizes for brevity or novelty.
- Elegant code optimizes for predictability and leverage.
- Clever code surprises readers.
- Elegant code makes readers say “of course”.

Elegance prioritizes:
- readability over trickery
- clarity over compression
- robustness over novelty

—

## Interaction with BRU Size Limits

Elegance supports BRU goals by:

- Reducing file size organically through reuse
- Making each file’s logic denser but simpler
- Allowing larger systems to be reasoned about via a small set of primitives

A file near the BRU soft limit is acceptable **if**:
- it primarily composes primitives
- internal logic remains shallow
- the reader can reason locally without global context

A smaller file that contains tangled logic is **less** BRU-compliant than a larger but elegant one.

—

## Summary

Elegant code is:

- Built from a small set of reusable primitives
- Composed, not duplicated
- Simple at the function level
- Predictable at the system level
- Designed to maximize reasoning leverage

**BRU defines how much code we can reason about.  
Elegance defines how much meaning each line carries.

# Addendum: MDV Code Block Fingerprinting Policy

## Purpose

This addendum defines the mandatory fingerprinting standard for all meaningful code blocks in MDV repositories (including ENG).

Fingerprinting establishes deterministic, human- and machine-addressable anchors that enable:
- Reliable master patches (no drifting before-snippets)
- Block-level navigation at repo scale
- Lightweight, precise LLM reasoning
- Provenance-grade references for future tooling
- Stable indexing for deterministic scripts

Fingerprinting is infrastructure, not documentation.

—

## Definition: Fingerprinted Block

A fingerprinted block is a contiguous region of source code wrapped with explicit `MDV_BLOCK:BEGIN` and `MDV_BLOCK:END` comments.

Fingerprinting MUST be applied to meaningful logical units, including:
- React components
- Hooks
- Top-level or exported functions
- Domain type clusters
- Scoring tables or configuration tables
- Large helper groups acting together

Fingerprinting MUST NOT be applied to:
- One-line helpers
- Trivial glue code
- Over-fragmented micro-blocks

Target block size guideline: approximately 10–120 LOC (judgment required).

—

## Fingerprint Structure (Authoritative)

### BEGIN Fingerprint (Required)

Every fingerprinted block MUST begin with a BEGIN comment in the following exact shape:

~~~ts
// MDV_BLOCK:BEGIN id=“ENG.APP.PAGE.060” intent=“Generated name entry shape with optional lore and classification attachments” kind=“types” tags=“generated,entry,types”
~~~

Required fields:
- `id` — globally unique, repo-wide identifier
- `intent` — describes WHY the block exists (not how it is implemented)
- `kind` — high-level block category
- `tags` — comma-separated semantic labels (no spaces)

—

### END Fingerprint (Required)

Every fingerprinted block MUST end with a matching END comment:

~~~ts
// MDV_BLOCK:END id=“ENG.APP.PAGE.060” kind=“types” tags=“generated,entry,types”
~~~

Rules:
- `id` MUST match the BEGIN id exactly
- `kind` and `tags` MUST be repeated verbatim
- `intent` MUST NOT appear in END
- BEGIN/END pairs are authoritative anchors and are not casually removed

—

## ID Naming Convention

Format:

~~~
<REPO>.<AREA>.<FILEKEY>.<NNN>
~~~

Examples:
~~~
ENG.APP.PAGE.010
ENG.APP.PAGE.020
ENG.APP.PAGE.030
ENG.LIB.GENERATOR.120
DT.PROV.GRAPH.030
~~~

Rules:
- IDs are repo-wide unique
- Numeric suffix increments by 10 (010, 020, 030, …)
- Gaps are intentional and allow insertion without renumbering
- IDs MUST remain stable once introduced

—

## Field Semantics

### intent

- Describes WHY the block exists
- MUST NOT describe structure, syntax, or implementation details
- MUST be understandable without reading the code

Good:
“Temporary user role hook stub for gating dev/premium UI”

Bad:
“Defines a hook returning booleans”

—

### kind

A coarse classification used by humans and tools.

Common values include:
- module
- component
- hook
- types
- config
- logic
- table
- script

—

### tags

- Comma-separated
- No spaces
- Semantic, not decorative
- Used for filtering, indexing, and tooling

—

## Enforcement Rules

- Fingerprinting is mandatory for all meaningful blocks
- Do not skip fingerprinting for speed
- Do not redesign code while fingerprinting unless explicitly asked
- Large files or pasted chunks MUST be broken into multiple blocks
- Output MUST be modular and copy-pasteable (BRU-compliant)
- Fingerprint comments are treated as stable infrastructure

—

## Relationship to BRU Policy

- Fingerprinted blocks are bounded reasoning units
- Block boundaries should align with BRU cohesion goals
- Fingerprinting reduces cognitive load without inflating file size
- The block, not the file, is the primary unit of reasoning

—

## Tooling Assumptions (Normative)

All MDV tooling may assume:
- BEGIN/END pairs exist
- IDs are stable and unique
- `kind` and `tags` are present at both boundaries
- Blocks can be indexed without ingesting full code content

This enables:
- Deterministic repo indexing
- Block-level patching
- Lightweight LLM ingestion
- Provenance-grade references
- 
EOF

 # POLICY: Minimum Viable Coding Surface (Assembler-Gated Development)

STATUS: Canonical (Blocking for repo-engine workflows)

## Goal
Always present ChatGPT the **smallest effective coding surface area** required to achieve the next bounded change.

## Mechanism
All non-trivial repo changes are executed through deterministic tooling:
- code assembler
- patch planner / apply
- validators (policy + structural)

ChatGPT produces **schema-bound packets**, not freeform edits.

## Rule
ChatGPT must not “edit the repo directly” as a primary method.
Instead:
1) Tooling extracts the minimum relevant context.
2) ChatGPT outputs a JSON packet conforming to the layer schema.
3) Deterministic scripts apply the packet.
4) Validators run.
5) Rollback remains trivial (snapshot/patch lineage).

## Assembler Layers (Progressive Surface)
L0 — Structure
- create folders/files
- stamp domain + adapter pairs
- insert section headers (imports/primitives/helpers/composition/exports)
- no logic

L1 — File Scaffolding
- add minimal stubs in domain files
- wire adapters to domains
- preserve linear dependency rules

L2 — Block Expansion
- add/append primitives/helpers/composition blocks by fingerprint
- no rewriting: append-only within sections

L3 — Composition Wiring
- deterministic wiring into tail composition blocks
- exports assembled via barrel rules

L4 — Targeted Refactor / Surgery
- patch plans generated from repo map + symbol + fingerprint indexes
- apply via snapshot patch with validation gates

## Guarantees Required
- deterministic application (same input ⇒ same result)
- validation gates before promotion
- no hidden mutation / no silent state
- auditable provenance (who/what/why applied)
- rollback path always available (snapshots + apply logs)

## Output Contract
ChatGPT outputs must be:
- schema-valid JSON packets
- block-addressed by fingerprint / ID
- scoped to the minimum change set

## Non-Goals
- “one-shot” full-system generation
- freeform manual edits as default workflow
- untracked changes without patch lineage
- 
EOF