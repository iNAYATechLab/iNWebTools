# ADR-0001 — PostgreSQL over SQLite for the primary store

- **Status:** Accepted
- **Date:** 2026-08-25

## Context

The first implementation used MySQL, which was replaced by embedded SQLite to remove a
service dependency from local development. SQLite worked, and for a single-process API
serving one machine it would have kept working.

Two things made it the wrong long-term choice:

1. **Concurrency.** SQLite serialises writers. The API records a `conversion_log` row
   and touches a `visitor_session` on every transcription request; under concurrent
   uploads these contend with admin dashboard queries on the same file.
2. **Analytics.** The admin dashboard needs conditional aggregation over date ranges.
   SQLite has no `FILTER (WHERE …)` and no real date type, so predicates were written
   as string comparisons — expressions that parse fine and quietly return wrong answers.

## Decision

PostgreSQL is the primary store, accessed through a pooled `pg` client behind
`server/db/index.js`. The wrapper keeps the call sites database-agnostic: reads return
`rows[]`, writes return `{ affectedRows, insertId, rows }`, and `?` placeholders are
rewritten to `$n`.

A local cluster is provisioned by `DevelopmentFiles/scripts/pg-setup.sh`, which runs
`initdb`, applies `schema.sql` and restores the newest dump, so a fresh environment is
one command away.

## Consequences

- Development now requires a running cluster. Mitigated by the setup script; the cost
  is real but paid once.
- The migration surfaced exactly the class of bug predicted above. `RANGE_SQL` still
  carried SQLite's `date('now', '-1 day')`, so the admin dashboard's **Yesterday** range
  returned HTTP 500. Its neighbour `today` had survived only because `date('now')`
  happens to parse in PostgreSQL as a cast — right answer, wrong reason, no warning.
  Both now use `CURRENT_DATE`, and 7 tests pin every range key.
- **Rule adopted:** when an enum or whitelist is ported between engines, exercise
  *every* value. Testing one member proves nothing about the others.

## Alternatives considered

- **Stay on SQLite, add a queue.** Removes write contention but not the date-handling
  and aggregation gaps, and adds a component to operate.
- **Return to MySQL.** Solves concurrency, but `FILTER (WHERE …)`, partial indexes and
  `jsonb` are all used by the analytics and CMS layers.
