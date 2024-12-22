---
title: Backend Project Board
columns:
  - id: todo
    title: To Do
    tasks:
      - id: task-1
        title: User Authentication Service
        description: |-
          Implement JWT-based auth:
          * User registration
          * Login/logout
          * Password reset
          * Session management
      - id: task-2
        title: API Documentation
        description: Set up Swagger/OpenAPI docs for all endpoints
  - id: in-progress
    title: In Progress
    tasks:
      - id: task-3
        title: Database Schema
        description: |-
          Design and implement:
          * User model
          * Product model
          * Order model
          * Relationships
  - id: review
    title: Review
    tasks:
      - id: task-4
        title: API Rate Limiting
        description: Implement rate limiting middleware with Redis
  - id: done
    title: Done
    tasks:
      - id: task-5
        title: Project Setup
        description: Initialize Go project with modules and testing
      - id: task-6
        title: Docker Setup
        description: Create Dockerfile and docker-compose for development
---
