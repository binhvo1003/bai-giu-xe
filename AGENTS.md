# Repository Guidelines

## Project Structure

This repository holds the plans for timbaixe.com, a nonprofit community map of motorcycle parking entrances in Ho Chi Minh City. All project documents live at the root.

- [KE_HOACH_MVP.md](KE_HOACH_MVP.md) defines the agreed user flows and acceptance criteria. Follow it for product decisions, including guest submissions and owner approval before publication.
- [PARKING_FINDER_ARCHITECTURE.md](PARKING_FINDER_ARCHITECTURE.md) describes the proposed React, Vite, TypeScript, and MapLibre stack, public GeoJSON exports, and backend services.

Application source, tests, and map assets have yet to be added.

## Development and Review Commands

Run these from the repository root:

- `rg --files` lists project files.
- `git diff --check` checks unstaged edits to tracked files for whitespace errors.
- `git diff --cached` shows the staged patch, including newly added files.

The repository has no package manifest or local run, build, lint, or test scripts. Document working commands in README.md when introducing the application.

## Style and Naming

Preserve Vietnamese accents in ward names and interface labels such as “Chọn phường”. Use descriptive Markdown headings and relative links. Follow the uppercase filename pattern of KE_HOACH_MVP.md for comparable planning documents. TypeScript indentation, formatter settings, and test filename conventions are still open.

## Testing Guidelines

Use the MVP acceptance table when reviewing behavior. For example, verify that “Tìm xa hơn” increases the radius from 1 km to 2 km around the same point. Check that a new ward appears in the picker only after its first parking lot receives approval. The project has no configured test runner or coverage threshold.

## Commits and Pull Requests

The history contains only `first commit`, so no commit convention is established. Use a short, descriptive subject such as `Document ward approval flow`. In a pull request, identify the affected MVP flow, link the relevant issue if available, and describe how you checked the change. Include a mobile screenshot for visible interface changes.