# Development Guidelines

## Branching Strategy
> **CRITICAL RULE**: Direct commits to `main` are **STRICTLY PROHIBITED**.

### Workflow
1.  **Always** create a new branch for every task or feature.
    *   Features: `feature/your-feature-name`
    *   Fixes: `fix/issue-description`
2.  **Implementation**: Make all changes within the specific branch.
3.  **Verification**: Run tests and build on the branch.
4.  **Merge**: Only merge to `main` when explicitly authorized or when a "PR" is functionally complete and verified.

### Agent Instructions
- Check current branch before starting any code editing task.
- If on `main`, immediately create and switch to a new branch.
