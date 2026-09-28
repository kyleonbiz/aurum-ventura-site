# Aurum Ventura Onboarding Tool

Client onboarding form tool deployed at `/tools/onboarding` on the main domain.

## Setup

```bash
cd onboarding
npm install
```

## Development

```bash
npm run dev
```

Runs on `http://localhost:3001` (accessible via main site at `/tools/onboarding` in production)

## Environment Variables

Create `.env.local`:

```
MONGODB_URI=mongodb://localhost:27017/aurum-onboarding
```

## Build & Deploy

The onboarding tool is deployed as part of the main site via Vercel's path-based routing. When you deploy:

1. Vercel detects the `/onboarding` folder
2. Routes all `/tools/onboarding/*` requests to this Next.js app
3. The main Vite app serves everything else

The `basePath: "/tools/onboarding"` in `next.config.ts` ensures all routes work correctly under this path.

## File Structure

```
onboarding/
├── src/
│   ├── app/              # Next.js pages
│   ├── components/       # React components
│   ├── lib/              # Utilities & database
│   └── types/            # TypeScript types
├── package.json
├── next.config.ts
└── tsconfig.json
```

## See Also

- Main website: `../` (Vite React app)
- Footer link: added in main App.jsx
