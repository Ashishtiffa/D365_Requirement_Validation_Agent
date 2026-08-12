# D365 Requirement Validation Agent

## What This Harness Does

Validates business requirements against official Microsoft Dynamics 365 documentation.
Each requirement is classified into one of three implementation levels:

| Level | Code | Meaning |
|-------|------|---------|
| 🟢 No Modification Required | `no_modification` | Standard OOB D365 — configure and go |
| 🟡 Little Modification Required | `little_modification` | Business Rules, Power Automate, form/entity changes |
| 🔴 Completely New Build | `new_build` | Custom .NET plugins, PCF controls, Azure integrations |

## Entry Points

| What you want | How |
|---------------|-----|
| Validate a requirements file | `/validate-requirements` |
| Discover which D365 modules fit a domain | `/scout-d365-modules` |
| Run the full orchestrated workflow | Workflow: `validate-d365-requirements` |

## Classification Criteria

### no_modification (Green)
- The exact feature exists in D365 standard, accessible via Settings/Configuration
- No custom code, no new entities, no flows — just setup
- Examples: standard opportunity pipeline, OOB case management, built-in budget entry, standard work order creation

### little_modification (Orange)
Any of these is enough to qualify:
- Business Rules (no-code form logic)
- Power Automate cloud flows (email triggers, approval routing, data sync)
- Custom fields / custom entities in Dataverse (no-code schema changes)
- Model-Driven App form and view customizations
- Business Process Flows (custom stage sequences)
- Security roles and field-level security
- Power BI embedded analytics
- AI Builder models (document processing, prediction)
- Minor ISV app configuration from AppSource

### new_build (Red)
Any of these is required:
- Custom C# server-side plugins (IPlugin, IOrganizationService)
- Power Apps Component Framework (PCF) custom controls
- Azure Function / Logic App integration middleware
- Custom REST API development
- Functionality absent from ALL D365 modules
- Real-time bidirectional sync with external ERP/legacy systems
- Complex multi-entity calculations not achievable via Business Rules
- Custom ML models beyond AI Builder capabilities

## D365 Module Registry

| Module | Primary Docs URL | Core Keywords |
|--------|-----------------|---------------|
| Dynamics 365 Sales | https://learn.microsoft.com/en-us/dynamics365/sales/overview | lead, opportunity, quote, pipeline, forecast, account, contact |
| Dynamics 365 Customer Service | https://learn.microsoft.com/en-us/dynamics365/customer-service/overview | case, ticket, SLA, entitlement, queue, knowledge base, agent |
| Dynamics 365 Field Service | https://learn.microsoft.com/en-us/dynamics365/field-service/overview | work order, technician, schedule, asset, maintenance, IoT, dispatch |
| Dynamics 365 Finance | https://learn.microsoft.com/en-us/dynamics365/finance/ | ledger, journal, invoice, AP, AR, budget, tax, financial period |
| Dynamics 365 Supply Chain | https://learn.microsoft.com/en-us/dynamics365/supply-chain/ | inventory, warehouse, procurement, BOM, routing, MRP, production |
| Dynamics 365 Commerce | https://learn.microsoft.com/en-us/dynamics365/commerce/ | retail, POS, e-commerce, product catalog, pricing, promotions |
| Dynamics 365 Human Resources | https://learn.microsoft.com/en-us/dynamics365/human-resources/ | employee, payroll, leave, absence, benefits, recruitment, performance |
| Dynamics 365 Project Operations | https://learn.microsoft.com/en-us/dynamics365/project-operations/ | project, resource, timesheet, expense, billing, milestone |
| Dynamics 365 Marketing | https://learn.microsoft.com/en-us/dynamics365/marketing/overview | campaign, email journey, segment, lead scoring, event, nurture |
| Dynamics 365 Business Central | https://learn.microsoft.com/en-us/dynamics365/business-central/ | SMB, ERP, general ledger, dimensions, item, vendor |
| Power Platform | https://learn.microsoft.com/en-us/power-platform/ | Power Apps, Power Automate, Power BI, Dataverse, low-code |

## Microsoft Learn Search API

Use this endpoint to search documentation:
```
https://learn.microsoft.com/api/search?search=<query>&locale=en-us&%24filter=scopes%2Fany(t%3A+t+eq+'Dynamics365')&%24top=5
```

Replace the scope filter value for specific modules:
- `Dynamics365` — all D365 products
- `dynamics-365-sales`, `dynamics-365-finance`, `dynamics-365-supply-chain-management`
- `dynamics-365-customer-service`, `dynamics-365-field-service`
- `dynamics-365-human-resources`, `dynamics-365-project-operations`
- `dynamics-365-marketing`, `dynamics-365-commerce`, `power-platform`

Tech Community search: `https://techcommunity.microsoft.com/search?q=<query>`

## Input File Format (sample_requirements.json)

```json
{
  "requirements": [
    {
      "id": "REQ-001",
      "requirement": "Track leads with automatic scoring based on activity",
      "module": "Sales",
      "category": "Lead Management",
      "priority": "High"
    }
  ]
}
```

Plain arrays also accepted: `[{"id":"1","requirement":"..."}]`
Plain text also accepted: one requirement per line in a .txt file.

## Workflow Orchestration

The `validate-d365-requirements` workflow handles:
1. **Load** — reads the requirements file
2. **Module Discovery** — fetches D365 module overviews from learn.microsoft.com
3. **Classify** — each requirement goes through the `d365-requirement-classifier` agent
4. **Report** — `d365-report-writer` agent produces HTML + JSON reports

Invoke via the `/validate-requirements` skill or directly:
```
Workflow({ name: "validate-d365-requirements", args: { file: "sample_requirements.json", project: "Contoso" } })
```
