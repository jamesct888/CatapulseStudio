---
description: Setup Husky pre-commit hooks to enforce testing
---

1. Install Husky and lint-staged
   ```powershell
   npm install -D husky lint-staged
   ```

2. Initialize Husky
   ```powershell
   npx husky init
   ```

3. Create the pre-commit hook
   ```powershell
   echo "npm test" > .husky/pre-commit
   ```

4. Configure lint-staged in package.json (Optional, for running only on changed files, but for now we run full unit tests)
   <!-- For this task, we will just stick to running all unit tests as they are fast -->

5. Verify the hook
   <!-- User can try to commit and see it run -->
