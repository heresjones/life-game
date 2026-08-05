# Life Game

An interactive platform for exploring cellular automata and particle simulations in the browser, deployed as a static site on S3 + CloudFront via Terraform.

This project is a derivative of [Sandbox Science](https://github.com/DicSo92/SandboxScience) by Charly Luzzi ([@DicSo92](https://github.com/DicSo92)), licensed under [AGPL-3.0-or-later](./LICENSE). Per that license, the full source of what's running in production is kept here, publicly.

## Structure

- `frontend/` — Nuxt 3 / Vue app (the game/simulations)
- `infra/` — Terraform for the S3 bucket + CloudFront distribution

## Local development

```bash
cd frontend
npm install
npm run dev
```

## Deploy

```bash
cd frontend
npm run generate
aws s3 sync .output/public s3://life-game-site-031871827796 --delete --profile kindawild
aws cloudfront create-invalidation --distribution-id E3RV7YCR3CJU4T --paths "/*" --profile kindawild
```
