# Production catalog intentionally empty

No XV2 options are asserted in this release. Each future entry must validate against its family JSON Schema, carry GAME/MODEL/VERIFY evidence, contain all required tactical goal grades (known zero OR explicit unknown), and declare evidence `catalog_coverage` to prevent missing facts from being treated as known absence.

Only confirmed, sourced facts may be treated as known. Candidate community findings go in `../community-findings.yaml`, not into catalog values. Synthetic fixtures live exclusively in `../tests/fixtures/` and MUST NEVER be promoted to the production catalog.
