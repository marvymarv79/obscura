# Obscura

An astrophotography planning companion app that helps manage gear inventory, review sky forecasts, plan imaging sessions, and track progress.

**Live Demo:** [obscura-pi.vercel.app](https://obscura-pi.vercel.app)

## Features

- **Weather & Sky Forecasts** — Get detailed astrophotography-specific forecasts powered by Astrospheric API, including cloud cover, seeing conditions, and transparency
- **Gear Inventory** — Track your growing collection of astrophotography equipment
- **Session Planning** — Plan your imaging nights based on forecast conditions
- **Progress Tracking** — Log and review your astrophotography sessions

## Tech Stack

- **Frontend:** React + Vite
- **Styling:** CSS
- **API:** Astrospheric (weather/sky conditions)
- **Hosting:** Vercel

## Local Development

### Prerequisites

- Node.js (v18+)
- npm
- Astrospheric API key

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

3. Create a `.env` file and add your API key:
   ```
   VITE_ASTROSPHERIC_API_KEY=your_api_key_here
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:5173](http://localhost:5173) in your browser

## Deployment

The app is configured for deployment on Vercel. Push to the `main` branch to trigger automatic deployments.

Make sure to add your `VITE_ASTROSPHERIC_API_KEY` environment variable in Vercel's project settings.

## License

MIT
