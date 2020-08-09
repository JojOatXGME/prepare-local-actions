prepare-local-actions
=====================

This action prepares actions defined in the local repository by
installing dependencies and building the actions.

Usage
-----

In your workflow:

```yaml
steps:
- uses: actions/checkout@v2
- uses: JojOatXGME/prepare-local-actions@v1
- uses: ./.github/actions/myLocalAction
```

In `.github/actions/package.json`:

```json
{
  "private": true,
  "scripts": {
    "build": "tsc"
  },
  "dependencies": {
    "@actions/core": "^1.2.4",
    "@actions/exec": "^1.0.4"
  },
  "devDependencies": {
    "@types/node": "^12.12.54"
  }
}
```

In `.github/actions/tsconfig.json`:

```json
{
  "include": [ "**/*.ts" ],
  "compilerOptions": {
    "rootDir": ".",

    "target": "ES2019",
    "module": "CommonJS",
    "lib": ["ES2019"],
    "forceConsistentCasingInFileNames": true,
    "newLine": "lf",

    "noImplicitReturns": true,
    "strict": true,
    "useDefineForClassFields": true
  }
}
```

In `.github/actions/myLocalAction/action.yml`:

```yaml
name: 'My Local Action'
description: 'Some action defined within the repository.'
runs:
  using: 'node12'
  main: 'index.js'
```

In `.github/actions/myLocalAction/index.ts`:

```typescript
import * as core from '@actions/core';

async function main() {
    core.info("My Local Action is executed.");
}

main().catch(reason => {
    core.setFailed(reason instanceof Error ? reason : new Error(reason));
});
```
