# Architecture

This template is intentionally organized as a dependency DAG rather than a mesh.

## Dependency direction

```text
app (framework files)
   │
   ├──────────────► presentation
   │
   └──────────────► composition
                         │
             ┌───────────┼─────────────┐
             ▼           ▼             ▼
       presentation  application  infrastructure
                         │             │
                         ▼             │
                       domain ◄────────┘
                         │
                         ▼
                       kernel
```

The rule is not that every project needs every folder. The rule is that once a role exists, it has one architectural reason to change.

## Layer responsibilities

- `kernel/` — universal pure primitives. Knows no higher layer.
- `domain/` — business/domain meaning, invariants, policies, domain state.
- `application/` — use cases and ports. Coordinates domain behavior.
- `infrastructure/` — adapters that implement application ports.
- `presentation/` — HTTP/UI translation and rendering.
- `composition/` — the ordinary place that wires sibling implementations together.
- `config/` — typed values only. Configuration is read by composition and injected.
- `app/` — thin Next.js framework entry files.
- `scripts/` — development/repository operations, never production semantics.
- `tests/` — assertions and fixtures, never required production behavior.

## Four organizational axes

Use different axes at different scales:

1. **Architectural role → folder**
2. **Owned subsystem / bounded context → folder inside the layer**
3. **Facet (`types`, `state`, `actions`, `events`, `selectors`) → file inside its owner**
4. **Imports → primitives → conservative helpers → composition → exports → order within a file**

Do not turn every axis into a top-level folder.

## No sideways mesh

Sibling domain modules should not import one another to coordinate workflows.

Instead of:

```text
domain/a ─────► domain/b
```

prefer:

```text
        application/use-case
             /       \
            ▼         ▼
        domain/a   domain/b
```

The higher layer owns orchestration.

The same principle applies to adapters: two adapters do not orchestrate each other. Application code describes the operation; composition injects both implementations.

## Cross-cutting capabilities

A concern may be cross-cutting conceptually without becoming globally owned implementation.

For example the game being optimized is represented as:

```text
kernel/optimization/contract.ts   (OptimizationAdapter: the capability)
            ▲
            │ implements
domain/toy-game/adapter.ts        (one game)
```

The engine depends on the contract, not on any game.

## Barrel rule

`index.ts` files are public APIs only. They contain exports, not implementation.

Code inside a folder should import concrete sibling files rather than importing its own barrel. This avoids many circular-dependency traps.

## Helpers

There is deliberately no global `src/helpers/`.

A helper stays private to the owner it helps. If many unrelated owners genuinely need the same pure operation, promote it deliberately to a kernel primitive rather than dumping it into a helper bucket.

## Example wiring

The optimizer shows the full path:

```text
app/page.tsx
    ↓
presentation/web/optimizer-template   (screen, report, charts; binds one adapter in toy-example.tsx)
    ↓
application/optimization              (weights, recommend, auto build, report, comparison, persistence)
    ↓                    ↓
domain/optimization      kernel/optimization/contract ◄── domain/toy-game (the game)
(PNC-Lite search)
```

The PDF export takes the other path:

```text
POST /api/report-pdf → app/api/report-pdf/route.ts → composition/report-pdf.ts → infrastructure/adapters/pdf (headless Chrome)
```

No route contains optimization behavior, no adapter defines scoring policy, and no UI component owns legality or scoring. See `docs/OPTIMIZATION_TEMPLATE.md` for how to add a game.
