---
name: validate-requirements
description: |
  Run the D365 requirement validation harness. Provide a requirements file path (JSON/CSV/TXT)
  or paste requirements inline. Orchestrates module discovery → deep-dive → classification → report.
  Produces a color-coded HTML report and JSON output.
---

<skill>
The user wants to validate D365 requirements. Follow these steps:

## Step 1 — Collect inputs

You need three things:
1. **Requirements source** — file path OR inline list (ask if not provided)
2. **Project name** — for the report header (default: "D365 Project")
3. **Module focus** (optional) — e.g. "Sales", "Finance", "Supply Chain"

If the user pasted requirements inline (not a file), first write them to `requirements_input.json`:
```json
{
  "requirements": [
    {"id": "REQ-001", "requirement": "<text>"},
    {"id": "REQ-002", "requirement": "<text>"}
  ]
}
```
Then use `requirements_input.json` as the file path.

## Step 2 — Launch the workflow

Invoke the `validate-d365-requirements` workflow with these args:
- `file` — path to the requirements file (relative to project directory)
- `project` — project name string
- `module` — optional module focus hint

```
Workflow({
  name: "validate-d365-requirements",
  args: {
    file: "<requirements_file>",
    project: "<project_name>",
    module: "<module_focus_or_omit>"
  }
})
```

## Step 3 — Report results to the user

When the workflow completes, tell the user:
1. **Summary table** — No Modification / Little Modification / New Build counts
2. **Key findings** — highlight any `new_build` requirements by ID and feature name (these need custom scoping)
3. **Report locations** — `validation_report.html` and `validation_report.json`
4. **Next steps** — offer to re-run on specific IDs, change module focus, or export differently

## Classification Quick Reference

| Level | Label | Meaning |
|-------|-------|---------|
| 🟢 `no_modification` | No Modification Required | Standard OOB D365, just configure |
| 🟡 `little_modification` | Little Modification Required | Business Rules, Power Automate, form changes |
| 🔴 `new_build` | Completely New Build | Custom plugins, PCF, Azure integration |
</skill>
