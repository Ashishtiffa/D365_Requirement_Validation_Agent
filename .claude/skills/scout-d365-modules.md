---
name: scout-d365-modules
description: |
  Discover which D365 modules and features are relevant for a given business domain or keyword set.
  Fetches real pages from learn.microsoft.com and returns a structured module capability map.
  Use before running full requirement validation to understand D365 coverage.
---

<skill>
The user wants to discover which D365 modules cover a business domain. Follow these steps:

## Step 1 — Extract the domain/keywords

Identify the business domain from the user's message:
- Industry (manufacturing, retail, professional services, healthcare)
- Function (sales, finance, HR, field operations, procurement)
- Keywords (specific features they mentioned)

## Step 2 — Spawn the module scout agent

Use the `d365-module-scout` subagent to do real documentation research:

```
Agent({
  subagent_type: "d365-module-scout",
  prompt: `Discover D365 modules relevant to this business domain: <DOMAIN>

  The user is asking about: <KEYWORDS/FEATURES>

  Instructions:
  1. Fetch https://learn.microsoft.com/en-us/dynamics365/ for the product index
  2. Identify the 3-5 most relevant D365 modules based on the domain
  3. Fetch each module's overview page
  4. Extract: key capabilities, what's configurable without code, what needs custom dev
  5. Note any gaps where no D365 module covers the requirement
  6. Check Power Platform options for gaps

  Return structured JSON with modules array.`
})
```

## Step 3 — Present findings

Structure your response as:

### Relevant D365 Modules
For each module: name, what it covers, key features relevant to the user's domain, doc link

### Gaps
Business areas NOT covered by standard D365 — what would need custom development or ISV solutions

### Power Platform Options
Where Power Automate / Power Apps / AI Builder can extend D365 to fill gaps

### Recommendation
Which modules to start with and in what order

## Step 4 — Offer next steps

- "Run full requirement validation against these modules" → trigger `/validate-requirements`
- "Deep-dive into [specific module]" → spawn `d365-deep-dive` agent for that module
- "Get a feature checklist for [module]" → fetch the module's TOC from learn.microsoft.com
</skill>
