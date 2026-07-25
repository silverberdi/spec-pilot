# Compatibility Notes

Compatibility is time-sensitive and must be revalidated from official documentation in the technical-foundation slice before dependencies are installed.

- Select a Node.js version supported by both the chosen Angular 22 release and the installed OpenSpec CLI.
- Verify the installed OpenSpec CLI version and generated workflow support locally; do not hardcode an assumed version in planning documents.
- Verify current DeepSeek API model identifiers and pricing from official DeepSeek documentation before implementing the gateway.
- Select the latest PrimeNG release officially compatible with the chosen Angular release; do not infer major-version parity.
- Cursor is the only current implementer of SpecPilot. Optional generated integrations for Cline, Codex, or OpenCode do not assign project roles.

Official sources to consult during implementation:
- Angular version and release documentation
- OpenSpec installation, CLI, command, and workflow documentation
- DeepSeek API and pricing documentation
- PrimeNG installation and compatibility documentation
