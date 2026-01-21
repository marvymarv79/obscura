# Obscura

An astrophotography planning companion app that helps manage gear inventory, review sky forecasts, plan imaging sessions, and track progress.

**Live:** [marvymarv.xyz](https://marvymarv.xyz)

## Features

- **Weather & Sky Forecasts** — Astrophotography-specific forecasts powered by Astrospheric API, including cloud cover, seeing conditions, and transparency
- **Gear Inventory** — Track your astrophotography equipment (cameras, optics, setups)
- **Session Planning** — Plan imaging nights based on forecast conditions and target visibility
- **Saved Plans** — Persist imaging plans across sessions, view history, and clone previous plans
- **Journal** — Markdown notes with user-defined tags for tracking observations, equipment configs, and insights
- **User Accounts** — Email/password authentication with data synced across devices

## Tech Stack

- **Frontend:** React + Vite
- **Backend:** Vercel Serverless Functions
- **Database:** Neon Postgres + Drizzle ORM
- **Auth:** Clerk
- **APIs:** Astrospheric (weather/sky conditions)
- **Hosting:** Vercel

## Local Development

### Prerequisites

- Node.js (v18+)
- npm
- Astrospheric API key
- Clerk account (for auth)
- Neon database (for persistence)

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/marvymarv79/obscura.git
   cd obscura/astro-planner
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with your credentials:
   ```
   VITE_ASTROSPHERIC_API_KEY=your_astrospheric_key
   VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   CLERK_SECRET_KEY=your_clerk_secret_key
   DATABASE_URL=your_neon_connection_string
   ```

4. Push the database schema:
   ```bash
   npm run db:push
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:5173](http://localhost:5173) in your browser

## Deployment

The app is configured for deployment on Vercel. Push to the `main` branch to trigger automatic deployments.

Required environment variables in Vercel:
- `VITE_ASTROSPHERIC_API_KEY`
- `VITE_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `DATABASE_URL`

## License

MIT
