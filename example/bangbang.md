---
title: Example Project Board
agent:
    instructions:
        - This is an example board demonstrating BangBang features
        - Shows various task metadata fields (priority, assignee, tags)
        - Demonstrates multi-column workflow
statsConfig:
    columns: [todo, in-progress, review, done]  # Custom stat cards (up to 4)
rules:
    always:
        -
            id: 1
            rule: write tests for all new features
        -
            id: 2
            rule: update documentation when changing APIs
        -
            id: 3
            rule: run linter before committing code
    never:
        -
            id: 1
            rule: deploy without running tests
        -
            id: 2
            rule: commit directly to main branch
    prefer:
        -
            id: 1
            rule: functional components over class components
        -
            id: 2
            rule: TypeScript over JavaScript for new files
        -
            id: 3
            rule: descriptive variable names over comments
columns:
    -
        id: todo
        title: To Do
        tasks:
            -
                id: task-2
                title: Design dashboard UI
                description: Create responsive dashboard layout with charts and widgets
                priority: high
                assignee: bob
                tags:
                    - frontend
                    - ui
                    - design
            -
                id: task-3
                title: Write API documentation
                description: Document all REST endpoints with examples
                priority: medium
                assignee: charlie
                tags:
                    - docs
                    - api
            -
                id: task-1
                title: Implement user authentication
                description: Add JWT-based authentication system with refresh tokens
                priority: critical
                assignee: alice
                tags:
                    - backend
                    - security
                    - auth
    -
        id: in-progress
        title: In Progress
        tasks:
            -
                id: task-4
                title: Database Schema Design
                description: |-
                    * Define tables and relationships
                    * Document constraints
                    * Create migration scripts
                priority: high
                assignee: david
                tags:
                    - backend
                    - database
            -
                id: task-5
                title: Optimize image loading
                description: Implement lazy loading for gallery images
                priority: medium
                assignee: bob
                tags:
                    - frontend
                    - performance
                    - optimization
    -
        id: review
        title: Review
        tasks:
            -
                id: task-6
                title: Refactor user service
                description: Clean up user service code and improve error handling
                priority: low
                assignee: alice
                tags:
                    - backend
                    - refactoring
            -
                id: task-7
                title: Update dependencies
                description: Upgrade all npm packages to latest stable versions
                priority: low
                assignee: charlie
                tags:
                    - maintenance
                    - dependencies
    -
        id: done
        title: Done
        tasks:
            -
                id: task-8
                title: Project Setup
                description: Initialize repository and configure development environment
                priority: high
                tags:
                    - setup
                    - devops
            -
                id: task-9
                title: CI Pipeline
                description: Set up continuous integration workflow with GitHub Actions
                priority: high
                assignee: david
                tags:
                    - devops
                    - ci-cd
                    - automation
            -
                id: task-10
                title: Implement dark mode
                description: Add dark theme support with system preference detection
                priority: medium
                assignee: bob
                tags:
                    - frontend
                    - ui
                    - theme
---
