# Life Game

A browser game, deployed as a static site on S3 + CloudFront via Terraform.

## Structure

- `frontend/` — Nuxt 3 / Vue app
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
