# PatchDocumentV1 (schema)

Purpose: deterministic, reviewable, machine-applied code edits.

## File format
JSON with top-level shape:

{
  "schema": "PatchDocumentV1",
  "id": "PATCH.<unique>",
  "createdAt": "ISO-8601",
  "notes": "optional",
  "ops": [ ... ]
}

## Operation types

### replace_block
Replaces a single MDV_BLOCK (BEGIN..END inclusive) addressed by blockKey.

{
  "op": "replace_block",
  "blockKey": "path/to/file.tsx:ENG.SOME.BLOCK.010",
  "expectedContentHash": "optional sha256 of existing block slice",
  "newBlockText": "string (must include BEGIN and END marker lines)"
}

### insert_block_after
Inserts a new block immediately after a target block.

{
  "op": "insert_block_after",
  "afterBlockKey": "path/to/file.tsx:ENG.SOME.BLOCK.010",
  "newBlockText": "string (must include BEGIN and END marker lines)"
}

### delete_block
Deletes a single MDV_BLOCK (BEGIN..END inclusive).

{
  "op": "delete_block",
  "blockKey": "path/to/file.tsx:ENG.SOME.BLOCK.010",
  "expectedContentHash": "optional sha256 of existing block slice"
}

### create_file
Creates a new file (fails if already exists unless allowOverwrite=true).

{
  "op": "create_file",
  "path": "relative/path/from/repo/root.ts",
  "content": "full file text",
  "allowOverwrite": false
}

## Rules
- blockKey = filePathPosix + ":" + blockId (same as fingerprint index)
- newBlockText must include MDV_BLOCK:BEGIN and MDV_BLOCK:END lines with matching id
- The applier is strict and will fail rather than guess.
