# JobMatch Engineering — v0.4.3 Visibility Fix

This version changes the score threshold from a filter into a recommendation threshold.

## New behavior
All live jobs that pass the hard filters are shown.

Hard filters:
- English only, when enabled
- selected source
- excluded industries
- very low salary exclusion already built into the feed logic

The score threshold now means:
"Highlight jobs from X%"

It does NOT hide lower-scoring jobs.

## Match labels
- 85–100%: Strong Match
- 70–84%: Good Match
- 55–69%: Possible
- below 55%: Low Match

Recommended jobs are shown first and visually highlighted.

Each result also shows:
- ROLE score
- SKILLS score
- EVIDENCE score
- combined RANK
- source
- salary / salary not disclosed
- posting age

This makes it possible to audit and tune the matching algorithm without losing visibility into the actual job feed.
