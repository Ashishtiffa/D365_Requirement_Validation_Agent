export const meta = {
  name: 'validate-d365-requirements',
  description: 'Validate business requirements against D365 documentation and classify into 3 implementation levels',
  phases: [
    { title: 'Load Requirements', detail: 'Read input file and parse requirements' },
    { title: 'Module Discovery', detail: 'Fetch D365 module overviews from learn.microsoft.com' },
    { title: 'Classify Requirements', detail: 'Deep-dive and classify each requirement against documentation' },
    { title: 'Generate Report', detail: 'Write color-coded HTML and JSON reports' },
  ],
}

// ─── Input ────────────────────────────────────────────────────────────────────
// args: { file: string, project: string, module?: string }
// Pass via: Workflow({ name: "validate-d365-requirements", args: { file: "sample_requirements.json", project: "Contoso" } })

const requirementsFile = (args && args.file) ? args.file : 'sample_requirements.json'
const projectName = (args && args.project) ? args.project : 'D365 Validation'
const moduleHint = (args && args.module) ? args.module : null

// ─── Schemas ──────────────────────────────────────────────────────────────────

const REQUIREMENTS_SCHEMA = {
  type: 'object',
  properties: {
    requirements: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id:          { type: 'string' },
          requirement: { type: 'string' },
          module:      { type: 'string' },
          category:    { type: 'string' },
          priority:    { type: 'string' },
        },
        required: ['id', 'requirement'],
      },
    },
  },
  required: ['requirements'],
}

const MODULE_MAP_SCHEMA = {
  type: 'object',
  properties: {
    modules: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name:                      { type: 'string' },
          overview_url:              { type: 'string' },
          key_capabilities:          { type: 'array', items: { type: 'string' } },
          configurable_without_code: { type: 'array', items: { type: 'string' } },
          requires_custom_code:      { type: 'array', items: { type: 'string' } },
          keywords:                  { type: 'array', items: { type: 'string' } },
        },
        required: ['name', 'overview_url', 'key_capabilities'],
      },
    },
  },
  required: ['modules'],
}

const CLASSIFICATION_SCHEMA = {
  type: 'object',
  properties: {
    requirement_id:      { type: 'string' },
    level: {
      type: 'string',
      enum: ['no_modification', 'little_modification', 'new_build'],
    },
    level_label:         { type: 'string' },
    d365_module:         { type: 'string' },
    feature_name:        { type: 'string' },
    documentation_urls:  { type: 'array', items: { type: 'string' } },
    justification:       { type: 'string' },
    implementation_notes:{ type: 'string' },
    confidence: {
      type: 'string',
      enum: ['high', 'medium', 'low'],
    },
  },
  required: ['requirement_id', 'level', 'level_label', 'd365_module', 'feature_name', 'justification', 'confidence'],
}

const REPORT_SCHEMA = {
  type: 'object',
  properties: {
    html_path: { type: 'string' },
    json_path: { type: 'string' },
    summary: {
      type: 'object',
      properties: {
        no_modification:   { type: 'number' },
        little_modification: { type: 'number' },
        new_build:         { type: 'number' },
      },
      required: ['no_modification', 'little_modification', 'new_build'],
    },
  },
  required: ['html_path', 'json_path', 'summary'],
}

// ─── Phase 1: Load Requirements ───────────────────────────────────────────────

phase('Load Requirements')
log(`Reading requirements from: ${requirementsFile}`)

const loaded = await agent(
  `Read the file at path "${requirementsFile}".
   Parse its contents as JSON.
   - If the JSON has a "requirements" array property, return that array.
   - If the JSON is already an array, return it directly under a "requirements" key.
   Each item must have at minimum an "id" field and a "requirement" field.
   If "id" is missing, generate sequential IDs like "REQ-001", "REQ-002", etc.
   Return the structured requirements array.`,
  { schema: REQUIREMENTS_SCHEMA, label: 'Read requirements file' }
)

if (!loaded || !loaded.requirements || loaded.requirements.length === 0) {
  log('ERROR: No requirements found in file.')
  return { error: 'No requirements found', file: requirementsFile }
}

const requirements = loaded.requirements
log(`Loaded ${requirements.length} requirements`)

// ─── Phase 2: Module Discovery ────────────────────────────────────────────────

phase('Module Discovery')

const requirementsSummary = requirements
  .map(r => `${r.id}: ${r.requirement}`)
  .join('\n')

const moduleHintText = moduleHint ? `\nFocus primarily on: ${moduleHint}` : ''

const moduleMap = await agent(
  `You are a D365 documentation researcher. Build a module capability index for these requirements:

${requirementsSummary}
${moduleHintText}

IMPORTANT: Fetch REAL pages. Do not guess capabilities.

1. First fetch: https://learn.microsoft.com/en-us/dynamics365/
2. Based on the requirements above, identify the 3-5 most relevant D365 modules.
3. For each relevant module, fetch its overview page from the module registry in CLAUDE.md.
4. Extract key_capabilities (top 5-6), configurable_without_code options, and what requires_custom_code.
5. If a requirement has no clear D365 module match, also fetch: https://learn.microsoft.com/en-us/power-platform/

Prioritize modules whose keywords appear in the requirements.`,
  {
    schema: MODULE_MAP_SCHEMA,
    label: 'Discover D365 modules',
    agentType: 'd365-module-scout',
  }
)

const moduleCount = moduleMap ? moduleMap.modules.length : 0
log(`Discovered ${moduleCount} relevant D365 module(s)`)

// Build module context string for classifiers
const moduleContext = moduleMap
  ? moduleMap.modules.map(m =>
      `**${m.name}** (${m.overview_url})\n` +
      `  Capabilities: ${(m.key_capabilities || []).join(', ')}\n` +
      `  Configurable: ${(m.configurable_without_code || []).join(', ')}\n` +
      `  Needs custom code: ${(m.requires_custom_code || []).join(', ')}`
    ).join('\n\n')
  : 'Refer to CLAUDE.md for D365 module registry.'

// ─── Phase 3: Classify Each Requirement ──────────────────────────────────────

phase('Classify Requirements')
log(`Classifying ${requirements.length} requirements in parallel...`)

const classificationResults = await pipeline(
  requirements,
  req => agent(
    `You are a senior D365 Solutions Architect doing presales fit-gap analysis.
Classify this requirement against official D365 documentation.

## Requirement
ID: ${req.id}
Requirement: ${req.requirement}
${req.module ? 'Module hint: ' + req.module : ''}
${req.category ? 'Category: ' + req.category : ''}
${req.priority ? 'Priority: ' + req.priority : ''}

## D365 Module Context (from documentation)
${moduleContext}

## Your Task
1. Search Microsoft Learn for the specific D365 feature using the API:
   https://learn.microsoft.com/api/search?search=<TARGETED_QUERY>&locale=en-us&%24filter=scopes%2Fany(t%3A+t+eq+'Dynamics365')&%24top=5

   Write a SPECIFIC query like: "Dynamics 365 Sales lead automatic scoring" or "D365 Finance budget approval workflow"

2. Fetch the most relevant documentation page from the search results.

3. Classify using these rules:
   - no_modification: The exact feature works OOB, article shows it needs only configuration
   - little_modification: Feature needs Business Rules / Power Automate / custom entity / BPF
   - new_build: Requires custom plugin / PCF / Azure integration / no matching feature found

4. Always cite the URL of the documentation page you relied on.
5. Provide specific implementation_notes (actual steps, settings, or components needed).

NEVER hallucinate features. Only classify based on what documentation actually states.`,
    {
      schema: CLASSIFICATION_SCHEMA,
      label: `Classify ${req.id}`,
      phase: 'Classify Requirements',
      agentType: 'd365-requirement-classifier',
    }
  )
)

const validResults = classificationResults.filter(Boolean)
log(`Classified ${validResults.length} / ${requirements.length} requirements`)

// Count by level
const summary = { no_modification: 0, little_modification: 0, new_build: 0 }
for (const r of validResults) {
  if (r && r.level && summary[r.level] !== undefined) {
    summary[r.level]++
  }
}
log(`Results — 🟢 No Modification: ${summary.no_modification} | 🟡 Little Modification: ${summary.little_modification} | 🔴 New Build: ${summary.new_build}`)

// ─── Phase 4: Generate Report ─────────────────────────────────────────────────

phase('Generate Report')

const reportPayload = JSON.stringify({
  project_name: projectName,
  results: validResults,
  summary,
  total: requirements.length,
}, null, 2)

const report = await agent(
  `Generate two report files from this D365 requirement validation data.

DATA:
${reportPayload}

Write these two files using the Write tool:

## File 1: validation_report.json
Write the full structured JSON. Include all fields from the results array.
Add percentage fields in summary: no_modification_pct, little_modification_pct, new_build_pct.

## File 2: validation_report.html
Write a standalone HTML report (no external CDN). Include:

### Header
- Title: "D365 Requirement Validation Report"
- Sub: Project name, generated timestamp, total requirement count
- Background: linear-gradient(135deg, #0078d4, #005a9e), white text

### Summary Cards (4 side-by-side)
- Total (blue #0078d4)
- No Modification count (green #28a745)
- Little Modification count (orange #fd7e14)
- New Build count (red #dc3545)
Each card: large bold number + label underneath + subtle box-shadow

### Requirements Table
Columns: # | Requirement | Classification | D365 Module / Feature | Justification & Notes | Effort | Confidence | Documentation

Styling:
- Table header: #0078d4 background, white text
- No Modification rows: green badge (#28a745)
- Little Modification rows: orange badge (#fd7e14)
- New Build rows: red badge (#dc3545)
- Row hover: #f0f7ff highlight
- Documentation URLs: clickable <a> tags, open in new tab
- Wrap text in cells; max-width on requirement and justification columns
- Font: 'Segoe UI', Tahoma, sans-serif

### Footer
"Generated by D365 Requirement Validation Agent | Powered by Claude AI"

Return the paths of both files written and the summary counts.`,
  {
    schema: REPORT_SCHEMA,
    label: 'Write HTML + JSON reports',
    agentType: 'd365-report-writer',
  }
)

// ─── Return ───────────────────────────────────────────────────────────────────

return {
  project: projectName,
  requirements_validated: validResults.length,
  summary: {
    no_modification:     summary.no_modification,
    little_modification: summary.little_modification,
    new_build:           summary.new_build,
  },
  reports: {
    html: report ? report.html_path : 'validation_report.html',
    json: report ? report.json_path : 'validation_report.json',
  },
  message: `Validation complete. Open ${report ? report.html_path : 'validation_report.html'} to view the report.`,
}
