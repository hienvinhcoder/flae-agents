#!/usr/bin/env bash
set -e

PROJECT_NAME="${1:-My Fullstack App}"

mkdir -p docs/features
mkdir -p .flaeW/templates
mkdir -p .flaeW/scripts

cat > docs/current_context.md <<EOF
# Current Context

## Project
Name: ${PROJECT_NAME}
Status: Initial planning
Current feature: None

## Product Summary
Briefly describe what this product does.

## Tech Stack
Frontend:
Backend:
Database:
Auth:
Storage:
Background jobs:
Deployment:

## Important Docs
- docs/project_overview.md
- docs/architecture.md
- docs/data_models.md
- docs/api_contracts.md
- docs/ui_guidelines.md
- docs/coding_rules.md

## Current Rules
- Do not code without reading current_context.md.
- Do not implement a feature without IDEA.md, BACKEND_PLAN.md, FRONTEND_PLAN.md, and TASKS.md.
- Do not make unrelated changes.
- Do not add dependencies without approval.
- Update docs after implementation.

## Recently Completed Features
| Feature | Summary | Docs |
|---|---|---|

## Known Constraints
- Keep the system simple.
- Prefer existing patterns.
- Avoid premature architecture complexity.
EOF

cat > docs/project_overview.md <<EOF
# Project Overview

## Product Name
${PROJECT_NAME}

## Problem
Describe the main problem this product solves.

## Target Users
- ...

## Core Use Cases
- ...

## MVP Scope
### In Scope
- ...

### Out of Scope
- ...

## Success Criteria
- ...

## Notes for Agents
Agents must understand this document before designing new features.
EOF

cat > docs/architecture.md <<EOF
# Architecture

## Overview
Describe the high-level architecture.

## Frontend
Framework:
Main folders:
Routing:
State management:
API client pattern:

## Backend
Framework:
Main folders:
Service pattern:
Validation pattern:
Error handling:

## Database
Database:
Main entities/collections:
Relationship style:

## Auth & Permission
Auth provider:
Permission model:

## Background Jobs
Queue/scheduler:
Use cases:

## Deployment
Environment:
Hosting:
CI/CD:

## Architecture Rules
- Do not introduce new architecture patterns without approval.
- Prefer simple, maintainable structure.
- Keep frontend/backend boundaries clear.
EOF

cat > docs/data_models.md <<EOF
# Data Models

## Rules
- Keep models backward compatible.
- Document every new collection/table/entity.
- Document indexes if needed.
- Document owner/user permission fields.

## Models

### Model: [Name]
Purpose:
Storage:
Fields:

| Field | Type | Required | Description |
|---|---|---|---|
| id | string | yes | Unique identifier |

Relationships:
Indexes:
Security notes:
EOF

cat > docs/api_contracts.md <<EOF
# API Contracts

## Rules
- Frontend and backend must follow the same contract.
- Do not use vague response shapes if avoidable.
- Document errors.

## Error Format

\`\`\`json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
\`\`\`

## APIs

### [METHOD] [PATH]

Purpose:
Auth:
Permission:

Request:
\`\`\`json
{}
\`\`\`

Response:
\`\`\`json
{}
\`\`\`

Errors:
- ...
EOF

cat > docs/ui_guidelines.md <<EOF
# UI Guidelines

## Design Principles
- Simple
- Clear
- Fast
- Consistent

## Layout
Describe layout rules.

## Components
Preferred component patterns:
- ...

## UI States
Every important screen should handle:
- Loading
- Empty
- Error
- Success
- Permission denied

## Forms
Validation style:
Error message style:

## Responsive
Desktop:
Mobile:

## Notes for Agents
Do not change global design patterns without approval.
EOF

cat > docs/coding_rules.md <<EOF
# Coding Rules

## General
- Do not make unrelated changes.
- Do not add dependencies without approval.
- Prefer small, reviewable changes.
- Follow existing folder structure.
- Keep code readable.

## Backend
- Validate input.
- Check auth/permission.
- Keep business logic in service/use-case layer if applicable.
- Keep API responses consistent.

## Frontend
- Reuse components.
- Handle loading, error, empty, and success states.
- Do not hardcode API responses.
- Keep API calls in the existing service/client pattern.

## Documentation
After implementation:
- Update TASKS.md
- Update IMPLEMENTATION_SUMMARY.md
- Update current_context.md if architecture/API/data model changes.
EOF

echo "Initial agent docs created for: ${PROJECT_NAME}"