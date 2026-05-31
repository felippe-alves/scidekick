---
name: research-ingest
description: >
  Composite skill that chains paper search, literature retrieval,
  and wiki ingestion. Takes a research topic or paper DOI and
  produces structured wiki entries (papers, hypotheses, evidence).
globs: []
alwaysApply: false
---

# Research Ingest

Ingest scientific literature into the Scidekick wiki. This skill chains:

1. **Paper lookup** — search for papers by topic or DOI
2. **Structured extraction** — pull experimental data from full text (BGPT)
3. **Wiki ingestion** — save as structured wiki entries

## When to Use

- User asks to "look up papers on X" or "add this paper to the wiki"
- User provides a DOI or paper title
- User wants to build a literature base for a hypothesis
- User mentions PaperQA2, BGPT, or literature review

## Workflow

### Step 1: Find Papers

Use the `paper-lookup` skill or `database-lookup` skill to search for papers.
If a DOI is provided, use `database-lookup` with the DOI directly.
If a topic is given, use `paper-lookup` to search.

### Step 2: Extract Structured Data

For each paper found, use the `bgpt-paper-search` skill to extract:
- Full citation (authors, title, journal, year, DOI)
- Methods and experimental design
- Key results and sample sizes
- Quality scores and limitations

### Step 3: Save to Wiki

For each paper, create a wiki entry using the CLI:

```bash
sk wiki ingest --title "Paper Title" --type paper <<'EOF'
## Citation
Authors, "Title", Journal (Year). DOI: ...

## Summary
...

## Key Findings
- ...

## Methods
...

## Relevance
...
EOF
```

If the paper suggests a testable hypothesis, also create a hypothesis entry:

```bash
sk wiki ingest --title "Hypothesis: X causes Y" --type hypothesis <<'EOF'
## Statement
...

## Rationale
Based on findings from [paper-slug].

## Predictions
- ...
EOF
```

### Step 4: Report

Tell the user what was ingested and suggest next steps:
- `sk wiki list` to see all entries
- `sk wiki query --type hypothesis` to review hypotheses
- `sk wiki lint <slug>` to validate entries

## Notes

- Always include the DOI in paper frontmatter for traceability
- Link evidence entries to their source hypothesis and experiment
- Use the base-delta pattern for experiments: link to a base protocol, only describe changes
