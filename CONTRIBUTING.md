# Contributing to PharmaLens

Welcome to the PharmaLens project! This document outlines the required workflow for all contributions to this repository. Please follow these guidelines to ensure a clean, traceable history that maps back to our Learning Unit (LU) roadmap.

## 1. Development Workflow

The development of this project strictly follows a predefined roadmap of Learning Units (LUs 3.10 through 3.49). 

- **Do NOT combine multiple LUs into one Pull Request.** Each LU must have its own Git branch and its own PR.
- Before implementing each LU, review the existing architecture and the previous LU's PR.
- Ensure the current LU builds correctly and doesn't break existing functionality before moving to the next.

## 2. Branch Naming Convention

All branches must follow this naming pattern:
`feat/<LU-number>-<short-description>`

**Example:**
`feat/3.32-top-k-retrieval`

## 3. Commit Convention

We use conventional commits. Every commit should be prefixed with the feature and LU number.

**Format:**
`feat(<LU-number>): <description>`

**Example:**
`feat(3.11): github repository and team workflow setup`

## 4. Pull Request Expectations

- A Pull Request must be created for **each individual LU**.
- Use the provided Pull Request Template (`.github/PULL_REQUEST_TEMPLATE.md`).
- Your PR must explicitly list the Learning Unit number, Objective, Technical Implementation, and Verification steps.
- **Testing:** Do not merge if tests, linting, or formatting checks fail. 

## 5. Main Branch Assumptions

- The `main` (or `master`) branch is protected and contains the production-ready state of the verified LUs.
- Direct pushes to `main` are strictly prohibited. All changes must go through the Pull Request process.

Thank you for contributing to PharmaLens!
