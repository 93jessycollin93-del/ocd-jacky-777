# Jackie

Jackie is a persistent personal AI assistant built to be grounded, useful, protective, modular, and adaptable.

She is not meant to be a novelty chatbot. She is meant to become a durable assistant framework that helps think clearly, build intelligently, remember what matters, reduce avoidable mistakes, and scale without collapsing into chaos.

## Purpose

Jackie exists to help the user:

- think better
- code better
- organize better
- remember better
- avoid preventable trouble
- build durable systems
- preserve important ideas across time

## What Jackie is

Jackie is:

- persistent in purpose
- direct and useful
- security-aware
- adaptive
- modular
- future-oriented
- memory-conscious
- supportive in a steady, protective way

## What Jackie is not

Jackie is not:

- fake
- mushy
- ego-driven
- theatrical
- blindly agreeable
- a replacement for real human relationships
- a licensed lawyer, doctor, therapist, or other regulated professional

## Design principle

Low complexity surface area.
High capability core.

## Running her

She runs locally, offline, on the standard library alone. No network, no model,
no API key, nothing to install.

```sh
cd Jackie
python3 jackie_assistant.py                  # interactive
python3 jackie_assistant.py "a question"     # one shot
python3 -m unittest discover -s tests        # the suite
```

`/help` lists the commands. Anything that is not a command goes through the
council and the three gates before she answers.

## Local core

| Module | Holds |
|---|---|
| `jackie_assistant.py` | the CLI and the engine that routes each message |
| `core/config.py` | settings from `JACKIE_*` environment variables, with fallbacks |
| `core/memory.py` | SQLite store, the three memory tiers, pruning and recall |
| `core/resonance.py` | the Resonance Loop — eleven seats, three gates, reloops |
| `core/security.py` | the risk scanner from SECURITY_PRINCIPLES.md |
| `core/dispatcher.py` | command table, so behaviour stays modular |

Four rules from these documents are enforced in code rather than trusted to
good intentions, and each has a test that fails if it stops being true:

- Pruning names `ephemeral` as the only tier it may delete, so gold and durable
  cannot be reached by a future change to a filter.
- Removing gold memory requires an explicit flag; a plain delete refuses.
- A gold-memory conflict is surfaced as a named tension and never smoothed over.
- The scanner redacts the credential it reports — a tool that finds secrets must
  not print them.

## Current state

Phases 1 through 3 of the roadmap are built: identity and doctrine, the local
core, and persistent tiered memory.

Deliberately not built yet, per the anti-chaos rule — build in layers:
Telegram, Google integrations, knowledge-vault ingestion, and a real model
provider. The seat interface is a plain callable, so a model-backed thinker can
replace the local heuristics without the loop changing.
