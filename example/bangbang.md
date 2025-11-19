---
title: Example Project
agent:
  instructions:
    - Modify only the YAML frontmatter
    - Preserve all IDs
    - Keep ordering
    - Make minimal changes
    - Preserve unknown fields
rules:
  always:
    - id: 1
      rule: write tests for all new features
    - id: 2
      rule: update documentation when changing APIs
    - id: 3
      rule: run linter before committing code
  never:
    - id: 1
      rule: deploy without running tests
  prefer:
    - id: 1
      rule: functional components over class components
    - id: 2
      rule: TypeScript over JavaScript for new files
  context:
    - id: 1
      rule: read AGENTS.md
columns:
  - id: todo
    title: To Do
    tasks:
      - id: task-1
        title: Research Project Requirements
        description: Gather and document all project requirements and constraints
      - id: task-2
        title: Design System Architecture
        description: Create high-level system design and component diagrams
  - id: in-progress
    title: In Progress
    tasks:
      - id: task-3
        title: Database Schema Design
        description: |-
          * Define tables and relationships
          * Document constraints
          * Create migration scripts
  - id: review
    title: Review
    tasks:
      - id: task-4
        title: API Documentation
        description: Review and update API documentation for v1.0
  - id: done
    title: Done
    tasks:
      - id: task-5
        title: Project Setup
        description: Initialize repository and configure development environment
      - id: task-6
        title: CI Pipeline
        description: Set up continuous integration workflow with GitHub Actions
---