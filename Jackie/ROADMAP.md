# Jackie Roadmap

## Phase 1: Foundation

Goals:
- establish identity
- define behavior rules
- define memory philosophy
- set up folder structure
- keep core direction stable

Deliverables:
- README
- identity files
- behavior rules
- architecture notes
- knowledge vault structure

## Phase 2: Local core — built

Goals:
- basic assistant engine
- CLI mode
- config handling
- memory store
- command dispatcher
- simple security scanning

Deliverables:
- jackie_assistant.py
- config.py
- memory.py
- dispatcher.py
- security.py

## Phase 3: Persistent memory — built

Goals:
- SQLite storage
- memory tiers
- pruning logic
- retrieval basics

Deliverables:
- jackie.db
- memory tiering
- searchable stored records

## Phase 4: Telegram interface

Goals:
- mobile access
- practical day-to-day usage
- stable interaction loop

Deliverables:
- Telegram bot integration
- command support
- message processing pipeline

## Phase 5: Better protection

Goals:
- stronger scanning
- dependency warnings
- risky-code detection
- safer defaults

Deliverables:
- stronger security rules
- better pattern checks
- cleaner warnings

## Phase 6: Knowledge ingestion

Goals:
- use saved chats and transcripts
- convert vault data into useful memory
- support project continuity

Deliverables:
- ingestion logic
- file classification
- summary extraction

## Phase 7: Google integrations

Goals:
- Gmail
- Sheets
- Calendar

Deliverables:
- modular service adapters
- clear fallback behavior
- safe error handling

## Phase 8: Runtime maturity

Goals:
- better retrieval
- model abstraction
- persistent deployment
- cloud portability

Deliverables:
- provider abstraction
- runtime hardening
- migration path to hosted infrastructure
