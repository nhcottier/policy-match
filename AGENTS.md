# AGENTS.md

## Safety

- Keep project source changes inside this project unless I explicitly instruct otherwise.
- Standard development tools may read installed SDKs and toolchains and use system temporary directories, build caches, simulators, emulators, containers, connected devices and platform signing services as needed to build, test and package the project.
- Never directly inspect or modify unrelated files outside this project.
- On macOS, Linux and WSL, never directly inspect or modify sensitive locations such as ~/.ssh, ~/.aws, ~/.config, ~/.gnupg, Keychain data, browser profiles, email, iCloud Drive, Dropbox folders outside this project, mounted network shares or external drives.
- On Windows, never directly inspect or modify sensitive locations such as %USERPROFILE%\.ssh, %USERPROFILE%\.aws, credential stores, certificate stores, browser profiles, email, OneDrive or Dropbox folders outside this project, mapped network drives, the Windows Registry or external drives.
- Never directly inspect, export or modify Keychain contents, Windows Credential Manager contents, signing certificates, certificate-store contents or private keys.
- Standard platform tools may use configured signing identities, certificates and provisioning profiles for builds, testing, device installation and distribution actions that I have approved.
- Never reveal, copy, commit or log secrets, passwords, API keys, tokens, private keys, certificates, provisioning profiles or customer data.
- After I approve an upload, standard platform tools may transmit a signed build and its embedded signing information to the intended distribution service.
- Never install system-wide software or modify operating-system settings without my approval.
- Never run destructive commands without my explicit approval.
- Destructive commands include, but are not limited to, rm -rf, git clean -fdx, diskutil, dd, mkfs, chmod -R, chown -R, Remove-Item -Recurse -Force, del /s /q, rmdir /s /q, format and diskpart.
- Never force-push Git unless I specifically request it.
- Never disable security software, firewall rules, endpoint protection, code-signing checks or permission safeguards without my explicit approval.
- Never bypass approval or permission controls.

## Development

- Before making substantial architectural or structural changes, briefly explain the proposed approach, risks and trade-offs, then ask for approval.
- Before any major refactoring, dependency upgrade, database migration or other significant structural change, check whether the project uses Git.
- If the project uses Git, inspect the worktree and ask whether I would like a checkpoint commit.
- If Git is unavailable, recommend creating a manual backup or copy before a significant structural change, but do not create one without my approval.
- Never commit unrelated or user-owned changes without my approval.
- Preserve existing uncommitted changes and never discard, overwrite or revert them without my explicit approval.
- Prefer reversible, incremental changes over large rewrites.
- Keep commits small, logical and well described when Git is being used.
- Do not create commits, push branches, open pull requests or merge changes unless I request or approve the action.
- Maintain production-quality, readable and maintainable code.
- Preserve existing functionality unless I explicitly request behavioural changes.
- Ask before introducing new third-party dependencies, packages, frameworks or external services.
- Prefer native platform frameworks and existing project dependencies where practical.
- If you are unsure about a requirement and the answer would materially change the result, ask instead of making a risky assumption.
- When fixing bugs, determine and explain the root cause before implementing the fix.
- Before deleting code, confirm that it is no longer required.
- If a substantially better approach exists than the one I requested, explain the alternative and its trade-offs and let me decide.
- Consider edge cases, error states, loading states, accessibility, security and platform compatibility before marking work complete.
- Run appropriate tests, builds, linting and validation before reporting that work is complete.
- Use commands appropriate to the current operating system and shell.
- Do not install dependencies globally when a project-local installation is available.
- Do not edit generated files when the source configuration or generator should be changed instead.
- Continue working normally when Git is unavailable and skip Git-specific checks and actions.

## Production and external actions

- Ask before deploying to production.
- Ask before publishing or releasing an app.
- Ask before uploading builds to App Store Connect, TestFlight, Google Play Console, Microsoft Partner Center or another distribution service.
- Ask before submitting an app or update for review.
- Ask before modifying cloud infrastructure, hosted services, production databases, DNS, domains, certificates or deployment configuration.
- Ask before making a website publicly accessible.
- Never purchase services, subscriptions, domains, certificates or paid resources without my explicit approval.
- Never send emails, messages, notifications or API requests to customers or external contacts without my explicit approval.
- Never create, rotate, revoke or expose production credentials without my explicit approval.
- Never alter live customer data without my explicit approval.
- Preparation, local builds, tests, simulator or emulator runs, archives, validation and dry runs are allowed when they do not cause an external production change.
- A Git push is not automatically considered a production deployment, but ask first if the push could trigger an automatic deployment or release.

## New-project recommendations

When creating a new project, suggest any standard project files that would be beneficial, including:

- README.md
- .gitignore
- CHANGELOG.md
- LICENSE, if appropriate
- .editorconfig
- A platform-appropriate linting configuration, such as .swiftlint.yml
- A GitHub Actions or equivalent CI workflow if remote hosting is intended
- Environment-variable examples such as .env.example when appropriate
- Basic contribution or architecture documentation when the project would benefit from it

Suggest these files, but do not create them unless I approve or request them.
