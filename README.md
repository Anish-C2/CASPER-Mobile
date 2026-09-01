# CASPER Mobile

Phone-first archive for [CASPER](https://anish-c2.github.io/CASPER/).

## Data source

This repo does **not** store scores, CSN files, player notes, or records.

On every load the site fetches live files from the desktop repo:

- `https://anish-c2.github.io/CASPER/`
- fallback `https://raw.githubusercontent.com/Anish-C2/CASPER/main`
- fallback `https://cdn.jsdelivr.net/gh/Anish-C2/CASPER@main`

Update `config.json`, `sports.json`, `misc.json`, `player-registry.json`, and `data/**` only in **Anish-C2/CASPER**. This site picks up those changes automatically.

## Enable GitHub Pages

1. Open the repo Settings → Pages
2. Source: Deploy from a branch
3. Branch: `main` / root
4. Site URL: `https://anish-c2.github.io/CASPER-Mobile/`

## Local preview

Serve the folder over HTTP (needed for module-free fetch during tests against the live archive):

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.
