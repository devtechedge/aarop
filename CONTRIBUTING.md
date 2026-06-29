# Contributing to AAROP

Thanks for your interest in AAROP! Contributions, issues, and feature ideas are welcome.

## Development setup

**Core engine (Python):**
```bash
cd core
pip install -e ".[dev]"
pytest --cov=aarop          # run the test suite
python examples/run_demo.py --verbose
```

**Web demo (Next.js):**
```bash
cd web-demo
npm install
npm run dev
npm run build               # verify a production build
```

## Guidelines

- **Keep the agentic loop explicit.** New behavior should be modeled as inspectable phases/events, not hidden inside prompt strings.
- **Tests required.** Core orchestration changes must keep coverage ≥ 85%.
- **Inject dependencies.** Models, tools, and memory backends are pluggable — keep them mockable.
- **Document decisions.** Significant architectural changes get an ADR in `core/docs/ARCHITECTURE.md`.

## Pull requests

1. Fork and create a feature branch.
2. Run `pytest` (Python) and `npm run build` (web) before opening the PR.
3. Describe the change and link any related issue.

## Reporting issues

Open a GitHub issue with steps to reproduce, expected vs. actual behavior, and environment details.

## License

By contributing, you agree your contributions are licensed under the MIT License.
