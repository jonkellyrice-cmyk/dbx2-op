
# Repo Engine — Patch Planner + Apply Patch Runbook (Jon Orchestrator)

This doc is a step-by-step operational checklist for generating a patch plan and applying a patch deterministically.

Scope:
- Patch planner script: scripts/repo-engine-scripts/gen_patch_plan.ts
- Patch applier script: scripts/repo-engine-scripts/apply_patch.ts
- Output folders (expected):
  - scripts/repo-engine-outputs/patch-plans/
  - scripts/repo-engine-outputs/patches/

Conventions used below:
- “Repo root” means the folder that contains package.json.
- “Terminal” means Git Bash / shell opened at repo root.
- “Target” is the *one thing you want to change*, represented as either:
  - a blockKey, OR
  - a symbolKey, OR
  - a file path + allBlocks.

--------------------------------------------------------------------------------

## 0) Preconditions (do this once per machine)

You must have:
- node + npm working
- repo-engine scripts present in: scripts/repo-engine-scripts/
- package.json scripts wired:
  - gen:patch-plan (or repo:patchplan alias)
  - apply:patch (or repo:applypatch alias)

If verify is set up:
- Run: npm run repo:verify
- If it fails, fix verify before trusting patches.

--------------------------------------------------------------------------------

## 1) Decide the target (this is where you “type the target”)

You choose exactly ONE targeting mode:

### Mode A — Target a known MDV block (blockKey)
Use this when you already know the MDV block id.

1) Open the file you want to change.
2) Find the MDV header line that looks like:
   // MDV_BLOCK:BEGIN id="SOME.ID.HERE" ...

3) Build the blockKey as:
   <posix-file-path>:<block-id>

Example:
- file: src/ui/ui.tsx
- block id: UI.SECTION.COMPOSITION.001
- blockKey: src/ui/ui.tsx:UI.SECTION.COMPOSITION.001

Where you will type this:
- You will paste that full blockKey string into the terminal command in Step 2A.

---

### Mode B — Target by symbol (symbolKey)
Use this when you know the function/class/const, but not the MDV block.

1) Open docs/symbol-index.json (or scripts/repo-engine-outputs/symbol-index.json if that’s where yours is generated).
2) Search for the symbol you care about.
3) Copy the exact symbolKey string.

Example symbolKey (illustrative):
src/app/page.tsx:named:function:renderPage

Where you will type this:
- You will paste that exact symbolKey string into the terminal command in Step 2B.

---

### Mode C — Target every MDV block in a file (file + allBlocks)
Use this when you want a plan that includes *every* block in a file.

1) Choose the file path in POSIX style (forward slashes), relative to repo root.

Example:
src/app/page.tsx

Where you will type this:
- You will paste that file path into the terminal command in Step 2C.

--------------------------------------------------------------------------------

## 2) Generate the patch plan (this produces a .json + .md plan file)

IMPORTANT:
- The patch planner takes inputs ONLY via CLI flags.
- You do NOT edit the planner script to “enter a target”.
- The terminal command you run IS where you put the target.

### 2A) Generate plan for a blockKey (Mode A)
In terminal, run (replace the example with YOUR blockKey):

npm run gen:patch-plan -- --blockKey "src/ui/ui.tsx:UI.SECTION.COMPOSITION.001"

What success looks like:
- Terminal prints two lines like:
  Wrote: scripts/repo-engine-outputs/patch-plans/PLAN....json
  Wrote: scripts/repo-engine-outputs/patch-plans/PLAN....md

If you don’t see “Wrote:” lines:
- The command did not succeed. Scroll up for the error.

---

### 2B) Generate plan for a symbolKey (Mode B)
In terminal, run (replace with YOUR symbolKey):

npm run gen:patch-plan -- --symbolKey "src/app/page.tsx:named:function:renderPage"

What success looks like:
- Same “Wrote: ...json” and “Wrote: ...md” lines.

Common failure:
- “Cannot resolve --symbolKey without docs/symbol-index.json”
  → Generate symbol index first (npm run gen:symbol-index) and retry.

---

### 2C) Generate plan for a whole file (Mode C)
In terminal, run (replace with YOUR file path):

npm run gen:patch-plan -- --file "src/app/page.tsx" --allBlocks

What success looks like:
- Same “Wrote:” lines.
- The .md will show multiple targets.

--------------------------------------------------------------------------------

## 3) Open the plan outputs (this is where you copy/paste into ChatGPT)

You now have TWO plan files:

1) The plan JSON:
- Location printed by the script (copy the path from “Wrote:” output).
- Contains:
  - targets (with blockText + hashes)
  - recommendedOps skeleton (usually replace_block with "__FILL__")

2) The plan Markdown:
- Also printed by the script.
- Contains:
  - human-readable target blocks
  - the exact block text currently in the repo

What you copy into ChatGPT:
- Copy the *specific target blockText* (the MDV_BLOCK:BEGIN..END block) from the plan .md
- Also copy the blockKey and contentHash for that target

Why:
- ChatGPT must generate a new block that preserves policy.
- apply_patch enforces hashes + lego-additive strictness.

--------------------------------------------------------------------------------

## 4) Create the patch JSON (PatchDocumentV1)

Where you “type the patch”:
- You create or edit ONE patch JSON file on disk.
- You paste the patch JSON content into that file.

Recommended location (matches repo-engine outputs layout):
scripts/repo-engine-outputs/patches/patch.json
(or any path you want; you’ll pass it to apply:patch)

PatchDocumentV1 structure (minimum):
- schema: "PatchDocumentV1"
- id: string
- createdAt: ISO string
- policy: optional (leave default unless you truly need refactor permissions)
- ops: array of operations

Key fields you will paste from the plan:
- blockKey
- expectedContentHash
- newBlockText (this is the full MDV block you want after the patch)

IMPORTANT for STRICT lego-additive mode:
- replace_block is allowed ONLY if newBlockText is IDENTICAL to old block,
  except that it may ADD lines immediately before the END line.
- If you need to restructure, you must explicitly set allowRefactor true (and accept that you’re leaving strict mode).

--------------------------------------------------------------------------------

## 5) Apply the patch

Where you “type the patch path”:
- In the terminal command that runs apply:patch

In terminal, run:

npm run apply:patch -- scripts/repo-engine-outputs/patches/patch.json

What success looks like:
- “Patch applied OK: <patch id>”
- “Files touched: <N>”
- “Wrote log: scripts/repo-engine-outputs/patches/last-apply-log.json”

If it fails:
- It will still write last-apply-log.json
- Read that log; it should include the failing op + message.

--------------------------------------------------------------------------------

## 6) Verify after applying

In terminal, run:

npm run repo:verify

If verification fails:
- Fix the failure before continuing to more patches.
- Verification is your “stop the line” gate.

--------------------------------------------------------------------------------

## 7) Practical “what to paste into ChatGPT” template

When you ask ChatGPT to produce a patch, include:

1) The blockKey you’re targeting
2) The expectedContentHash from the plan output
3) The full current blockText (BEGIN..END)
4) A precise instruction: what new code to add and WHERE (which section)
5) The policy constraints:
   - lego-additive strict
   - add-only, no refactor unless explicitly allowed
   - preserve imports/primitives/helpers/composition/exports ordering

Example structure for your message (fill your values):
- Target blockKey: "src/ui/ui.tsx:UI.SECTION.COMPOSITION.001"
- expectedContentHash: "<hash from plan>"
- Current blockText:
  (paste full MDV block)
- Change request:
  “Add a new helper function in HELPERS section to do X (no runtime thrash), then in COMPOSITION wire it in by appending lines immediately before END, without changing existing lines.”

--------------------------------------------------------------------------------

## 8) Where the system writes things (quick reference)

- Patch plans:
  scripts/repo-engine-outputs/patch-plans/*.json
  scripts/repo-engine-outputs/patch-plans/*.md

- Patch apply logs:
  scripts/repo-engine-outputs/patches/last-apply-log.json

--------------------------------------------------------------------------------

## 9) If something “did nothing” (common causes)

If you run gen:patch-plan and see no new files:
- You likely didn’t actually run the script you think you ran
- OR the script wrote somewhere else and printed the path (scroll up)
- OR it failed before write and you missed the error above

Rule:
- Always trust the “Wrote:” lines.
- If they aren’t there, it didn’t write.

--------------------------------------------------------------------------------
