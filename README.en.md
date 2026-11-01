<h1 align="center">dsh-token-dash</h1>

<p align="center">
  <a href="./README.md">简体中文</a> | English
</p>

<p align="center">
  Track daily/monthly model spend and budget headroom right next to the DSH input box: paste an API Key and the plan is auto-detected (subscription or pay-as-you-go), set a monthly budget, and consumption is estimated locally in real time.
</p>

<p align="center">
  <a href="https://github.com/spartawhy117/dsh-token-dash/releases">Latest release</a> ·
  <a href="./CHANGELOG.md">Changelog</a> ·
  <a href="https://github.com/spartawhy117/dsh-token-dash/issues">Feedback</a>
</p>

<p align="center">
  <img src="https://img.shields.io/github/v/tag/spartawhy117/dsh-token-dash?label=version&sort=semver" alt="version" />
  <img src="https://img.shields.io/github/downloads/spartawhy117/dsh-token-dash/total?label=downloads" alt="downloads" />
  <img src="https://img.shields.io/github/license/spartawhy117/dsh-token-dash" alt="license" />
  <img src="https://img.shields.io/badge/node-%3E%3D20-brightgreen" alt="node" />
</p>

- **Providers**: DeepSeek (DS account / API key), GLM Coding (subscription), Kimi Coding (subscription), Kimi / OpenRouter / Qwen (pay-as-you-go; OpenRouter in USD, Qwen CNY domestic / USD international) — paste a key and the billing mode is detected automatically
- **Pages**: bottom bar Pill → floating dashboard → settings; click the pill to expand, click outside to collapse
- **Dashboard data**: per-provider monthly budget progress (used / total / percent), today's spend, account balance, subscription 5h/weekly windows with reset times, model costs grouped by currency, token usage with cache hit rate
- **Settings**: per-provider monthly budget (with currency), three refresh intervals, balance toggle, log viewing / export, check for updates
- **Data**: daily / monthly usage estimated locally (built-in price catalog + community price table), three-layer model attribution, read-only local sessions

---

## Install

Requires DSH `0.2.1` or newer. Three options:

```bash
# Option 1: install from npm (recommended)
dsh plugin --profile desktop add dsh-token-dash

# Option 2: install straight from the GitHub repo (plain JS, no build step)
dsh plugin --profile desktop add github:spartawhy117/dsh-token-dash

# Option 3: download dsh-token-dash-x.y.z.tgz from Releases and install locally (offline)
dsh plugin --profile desktop add /path/to/dsh-token-dash-1.0.0.tgz
```

Update: run `update` with the same name, or use the in-app updater (settings → check for updates). Remove: run `remove` with the same name; data stays in `$DSH_HOME/dsh-token-dash/`.

---

## Interface

```text
P1 · Bottom bar pill (click to open the dashboard)
┌──────────────────────────────────────────────────────────┐
│ [API] Budget 91.9% · Today ¥0.04 · Balance ¥87.66⌃       │
└──────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────┐
│ [Sub] 5h 42% · Week 18%⌃                                 │
└──────────────────────────────────────────────────────────┘

P2 · Floating dashboard (opens right above the pill; cards appear as API keys are detected)
┌──────────────────────────────────────────────────────────┐
│ Token Dashboard                       Refresh Settings × │
│ Pay-as-you-go (3 detected)                   just now   │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ DeepSeek  Budget ¥79.13/¥95.80 · 91.9%   Today Bal.  │ │
│ │ [=========================================-------]   │ │
│ └──────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ OpenRouter  Budget $23.52/$62.00 · 38.0%  Today Bal.  │ │
│ │ [==================--------------------------------] │ │
│ └──────────────────────────────────────────────────────┘ │
│ Subscriptions (2 detected)                                │
│ ┌────────────────────────────┐ ┌────────────────────────┐ │
│ │ GLM Coding                 │ │ Kimi Coding            │ │
│ │ 5h 42%     Week 18%        │ │ 5h 30%    Week 12%     │ │
│ │ Resets 14:05               │ │ Resets 15:20           │ │
│ └────────────────────────────┘ └────────────────────────┘ │
│ API cost breakdown / this month        local estimates   │
│ Model usage / this month                    total 1.31M  │
└──────────────────────────────────────────────────────────┘

P3 · Settings
┌──────────────────────────────────────────────────────────┐
│ ← Back   Token Dashboard                          [Close] │
│ API billing (2 detected)                                  │
│   DeepSeek        Monthly budget [ 500.00 ]  CNY          │
│   OpenRouter      Monthly budget [ 50.00 ]   USD          │
│ Subscriptions (2 detected)                  [Rescan]      │
│   GLM Coding                     5h 42% / Week 18%        │
│   Kimi Coding                    5h 30% / Week 12%        │
│ Display                                                   │
│   Refresh interval   [30s] [1 min] [5 min]                │
│   Account balance                                    [On] │
│ Logs                                                      │
│   View logs   [Open log folder]   [Export logs]           │
│ Pricing & version                                         │
│   Version 1.0.0                             [Check update]│
└──────────────────────────────────────────────────────────┘

UI transitions
                click pill / Enter
  ┌──────────┐ ──────────────────→ ┌────────────┐
  │ P1 idle  │                     │ P2 dashboard│
  └──────────┘ ←────────────────── └────────────┘
        ↑       click pill / click outside / [×]
        │                              │[Settings]
        │                              ▼
        │    [← Back] / click outside ┌────────────┐
        └──────────────────────────── │ P3 settings │
                                       └────────────┘
```

**P1 · Bottom bar pill** (home workspace row / activity row under the chat input)

<p align="center">
  <img src="./docs/pic/pill-home.png" alt="Home pill" />
</p>

<p align="center">
  <img src="./docs/pic/pill-session.png" alt="Session pill" />
</p>

**P2 · Floating dashboard**

<p align="center">
  <img src="./docs/pic/panel-dashboard.png" alt="Dashboard" />
</p>

**P3 · Settings**

<p align="center">
  <img src="./docs/pic/settings.png" alt="Settings" />
</p>

---

## Logs & privacy

When filing a bug, attach `~/.dsh/logs/dsh-token-dash/` (already redacted). Error log entries carry `errorKind` (http/timeout/network/parse) and `httpStatus`, which usually pinpoints the cause:

```bash
npm run logs -- --tail 50                # tail recent logs
npm run logs -- --module slot,adapter.*  # filter by module
```

Reads only local session `usage` (title-generation overhead excluded); balances come from official endpoints only, with credentials resolved by the host and never written to disk; costs are local estimates — no billing requests are ever made.

## Development

```bash
npm test      # unit tests
npm run e2e   # end-to-end (temp DSH_HOME + web profile + Playwright)
npm run pack  # build the release tarball into build/
```

Releases: pushing a `v*` tag triggers the GitHub Release (tarball) and an npm staged publish automatically (goes live after a maintainer approves it on npmjs.com with 2FA); see [docs/release.md](./docs/release.md) for the full checklist.

## Acknowledgements

Attribution and billing semantics learned from these community plugins:

- [dsh-cost-dashboard](https://github.com/mike-lee0120/dsh-cost-dashboard)
- [dsh-token-usage-lao](https://github.com/LaoYueHanNi/dsh-token-usage)
- [dsh-ui-usage-billing](https://github.com/kenz1117/dsh-ui-usage-billing)
- [dsh-spend](https://github.com/nonewind/dsh-spend)
- [dsh-stats-panel](https://github.com/zhang-jiazhi/dsh-stats-panel)
- [DshCockpit](https://github.com/Lxiayu/DshCockpit)
