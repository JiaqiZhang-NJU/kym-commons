# GitHub Setup

## Repository

- Owner: `JiaqiZhang-NJU`
- Name: `kym-commons`
- Visibility: private first, public later

## First Push

```bash
git remote add origin https://github.com/JiaqiZhang-NJU/kym-commons.git
git push -u origin main
```

## Actions And Pages

1. Open repository settings.
2. Confirm GitHub Actions is enabled.
3. In Pages settings, choose GitHub Actions as the source.
4. Keep the repository private during internal setup.

## Public Rollout Gate

Do not announce the site to students with the default GitHub Pages URL.

The public release must happen only after:

1. a custom domain is configured
2. DNS is pointed correctly
3. HTTPS is active
4. the final public URL no longer exposes the GitHub username

## Suggested Public URL Patterns

- `https://commons.<your-domain>/`
- `https://kym.<your-domain>/`
- `https://materials.<your-domain>/`
