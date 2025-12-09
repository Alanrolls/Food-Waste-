This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## AI Exploration Workflow

The fullscreen map now includes an AI helper that interprets natural-language prompts (e.g., “Highlight states wasting more than 5 million tons”) and responds with filtered highlights on the map.

1. Create an [OpenAI API key](https://platform.openai.com/api-keys) (or compatible key) and add it to your environment:
   ```bash
   export OPENAI_API_KEY="sk-YOUR_KEY"
   ```
   When deploying, set this environment variable in your hosting provider.
2. Run `npm run dev` and use the **Explore with AI** card to submit prompts or tap the sample suggestions.

The `/api/explore` route sends the prompt plus the food-waste dataset to OpenAI’s `gpt-4o-mini` model and returns structured highlights for the UI.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
