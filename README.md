# Options Wave by Wave

An interactive course on NIFTY and Bank Nifty options, from basics to advanced, with an Elliott Wave thread running through it.

The course has 10 modules:
1. Foundations
2. Pricing
3. The Greeks
4. Volatility
5. Who wins
6. Strategy lab (24 strategies)
7. Which strategy when
8. Elliott Wave × options
9. Risk and Indian rules
10. A tested playbook

Every module has live calculators and charts and ends with a quiz. There is also a searchable glossary. Progress is saved in the visitor's browser.

The research figures in the course come from a backtest on NSE end-of-day option prices, 2008–2026. The course is educational and is not investment advice.

## How it is built

The site is one self-contained page, `site/index.html`, with all CSS and JavaScript inline. It has no build step and no dependencies; fonts load from Google Fonts.

| Path | What it is |
|---|---|
| `site/index.html` | The course |
| `tests/check.mjs` | Checks run before every deploy |
| `.github/workflows/deploy.yml` | Test-and-deploy pipeline |

`tests/check.mjs` verifies:
- the page structure
- that every inline script compiles
- that every element the script looks up exists
- the quiz data
- the option-pricing maths: put-call parity, Greeks and skew

The "Ask the tutor" page works only when the course is opened inside Claude. On the public site it shows a note instead.

## Run it locally

```bash
npm test
npm start
```

`npm start` serves the course at http://localhost:8000.

## How publishing works

1. Edit `site/index.html` and commit.
2. `git push` to `main`.
3. GitHub Actions runs `npm test`. If every check passes, it publishes `site/` to GitHub Pages; the new version is live about a minute later.

Pull requests run the same checks without publishing. A failed check blocks the deploy, and the live site keeps the last good version.
