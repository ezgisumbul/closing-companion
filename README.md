# Closing Companion

A tool for expats who just got their German mortgage approved.

**Two features:**
- Smart Timeline — personalised week-by-week checklist of post-closing steps
- Letter Validator — upload any payment request to check if it's legitimate

**Built with:** Next.js 14, TypeScript, Tailwind CSS, Anthropic Claude API  
**Live demo:** [your Vercel URL]

Built as a portfolio project to demonstrate AI-native product thinking.

---

## Getting Started

```bash
cp .env.local.example .env.local  # add your ANTHROPIC_API_KEY
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Maintaining Tax Rates

German Grunderwerbsteuer rates are maintained in a single file:

```
lib/taxRates.ts
```

When legislation changes (rates are set by each federal state and do change), update the `rate` value for the relevant state in that file. The change will automatically flow through to both the landing page cost estimator and the timeline API route — no other files need touching.

The file also contains `NOTARKOSTEN_RATE`, `GRUNDBUCH_RATE`, and `MAKLER_RATE` constants for the other closing cost estimates shown in the estimator.

## Deployment

1. Push to GitHub
2. Connect repo to Vercel
3. Add `ANTHROPIC_API_KEY` in Vercel → Settings → Environment Variables
4. Deploy
