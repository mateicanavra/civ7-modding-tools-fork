# Minimal Clean‑Room Implementation Plan

## Can the two‑team approach work?

A strict clean‑room requires airtight separation between people who have seen the original code and those who have not.  In your case the **spec team** will consist of you (who has seen the original SDK) plus one AI agent.  The **implementation team** will be an AI agent that never accesses the original repository.  OpenAI’s infrastructure logs every interaction, so it is possible to demonstrate that the implementation agent never saw the restricted code.  

Because you are involved in both roles, you must **discipline how information flows**.  When acting as spec team, you can read the original SDK and produce a neutral specification; when managing the implementation agent, you must avoid quoting or paraphrasing the original code.  OpenAI chat logs and repository history will provide some evidence of this separation.  This is a lighter version of a clean room but still offers a defensible narrative that your implementation was derived from a specification rather than copied code.  Keep in mind that this does not eliminate all risk; the safest course would still be to obtain permission or rewrite with completely separate human teams.  

## Implementation plan

The plan below assumes that the existing repository (e.g., `mateicanavra/civ7-modding-tools-fork`) remains the **spec team repo** and that you will create a **new, empty repository** for the clean‑room implementation.  The goal is to build a drop‑in replacement SDK that matches the API surface documented in the spec repo while avoiding any direct reuse of the original code.

### 1. Define roles and workflow

| Role | Composition | Responsibilities |
|---|---|---|
| **Spec Team** | You + a ChatGPT agent | Study the original SDK, extract a high‑level API and behaviour specification. Produce a neutral document (JSON Schema/OpenAPI/Markdown) describing endpoints, arguments, data types, and expected behaviour. Produce a small set of black‑box tests to validate the implementation.  Do **not** include code or long phrases from the original repo. |
| **Implementation Team** | A separate ChatGPT agent | Implement the new SDK in a fresh repository based only on the specification and tests provided by the spec team. Use a different architecture and naming where practical. Do not access the original repo or spec team discussions. |
| **Manager** | You | Coordinate both teams, enforce separation, and ensure that you never leak original code into implementation chats. Maintain a log of prompts/responses for audit. |

### 2. Extract the specification (Spec Team)

1. **Set up the spec branch** in the existing repo.  Place all work under `/spec` or a dedicated package (e.g., `sdk-spec`).

2. **API surface extraction**
   - Review public interfaces: CLI commands, exported TypeScript types, API endpoints, request/response shapes, error codes, configuration options, etc.
   - Summarise each interface in neutral language.  Write one or more of the following:
     - **OpenAPI/Swagger** definitions for any REST endpoints.
     - **GraphQL SDL** or JSON Schema definitions for GraphQL endpoints.
     - **TypeScript interface definitions** that express types without using original naming or comments.
   - Document preconditions, invariants, and side effects as behavioural rules.

3. **Black‑box test design**
   - Write simple tests (using Vitest or Jest) that call the public API with representative inputs and assert on outputs.  These tests should reflect the specification, not the internal implementation.
   - Put tests in `/spec/tests` so they can be shared with the implementation repo.

4. **Publish a spec artefact**
   - Package the spec documents and tests into a tarball or npm package (e.g., `civ7-sdk-spec-0.1.0.tgz`).
   - This package will be the **only** artefact given to the implementation team.

### 3. Create the clean‑room repository (Implementation Team)

1. **Initialize a new repository** (e.g., `civ7-sdk-clean`).  Choose your preferred stack—TypeScript with `pnpm`, `bun`, or `node`.  Initialise `package.json`, `tsconfig.json`, and linting/prettier as desired.  Do not copy any files from the original SDK.

2. **Bring in the spec artefact**
   - Add the spec tarball/package as a dev dependency.
   - Copy the black‑box tests from the spec package into your repo’s `/tests` folder.

3. **Scaffold the SDK**
   - Create modules corresponding to the APIs documented in the spec (e.g., `sdk/modinfo.ts`, `sdk/civilizations.ts`).  Use different internal structure/names where feasible.
   - Define public exports that match the spec’s type signatures.
   - Implement functions/classes purely based on the behaviour described in the spec.

4. **Implement features**
   - Work through each API surface element one by one.  Use the tests to guide development.  If tests fail, refine the implementation.
   - Where behaviour is undefined, make reasonable choices and document them in comments.
   - Use different algorithms or patterns from the original codebase where possible (e.g., using `async/await` instead of callbacks; using a different parser library).

5. **Package for consumption**
   - Set up build scripts (e.g., using `tsup` or `rollup`) to produce ESM and CJS outputs.
   - Ensure the package name and exports mirror the original SDK so that downstream projects can switch by changing the dependency source.
   - Publish the package to npm or a private registry when ready.

6. **Optional minimal guardrails**
   - Run a simple code similarity scan (e.g., [jscpd](https://github.com/kucherenko/jscpd)) comparing your repository against the spec team repo to ensure there are no large copied segments.
   - Keep a README explaining the clean‑room process and noting that only the specification and tests were used.

### 4. Integration & monorepo readiness

1. **Monorepo planning**
   - Once the new SDK is stable, add it as a workspace to your existing Turborepo monorepo.  Define proper `package.json` workspace entries, build scripts, and test tasks.
   - Remove the original SDK package or deprecate it, but retain the spec package for reference.

2. **Drop‑in replacement**
   - Bump package versions and adjust import paths across your apps to reference the new SDK package (e.g., change `@civ7/sdk` to `@civ7/sdk-clean`).  You can also publish under the same name if the original is unpublished or replaced.

3. **Future maintenance**
   - Keep the spec package updated when behaviour changes; ensure the implementation team only sees the spec.
   - Document a lightweight process in `CONTRIBUTING.md` so contributors know how to update the spec and propagate changes.

### 5. Notes on defensibility

- This plan is deliberately lightweight.  It avoids the strict process of a corporate clean room but still maintains **no direct copying**.  The most important evidence is the separation of repositories and the use of specification artefacts instead of code.
- If the original licence prohibits distribution of modified code, ensure that you do not distribute files derived from the original SDK【529804253940288†L9-L19】.  The new repository should stand on its own.
- Keep all interactions with the implementation AI in a separate chat log.  Do not paste snippets from the original repository into these chats.  Your OpenAI chat history can be referenced later to demonstrate adherence to this rule.
