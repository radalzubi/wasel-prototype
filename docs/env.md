# Environment Variables

## Backend (`backend/.env`)
- `PORT=3001`
- `NODE_ENV=development|production`
- `SUPABASE_URL=...`
- `SUPABASE_PUBLISHABLE_KEY=...` (or `SUPABASE_ANON_KEY`)
- `SUPABASE_SERVICE_ROLE_KEY=...` (required for backend writes)
- `CORS_ORIGINS=https://...` (comma-separated in production)

## Rider (`RIDER/.../.env`)
- `VITE_API_URL=http://localhost:3001`
- `VITE_SUPABASE_URL=...`
- `VITE_SUPABASE_PUBLISHABLE_KEY=...`
- `VITE_GOOGLE_MAPS_API_KEY=...`

## Driver (`driver_app/.env`)
- `VITE_API_URL=http://localhost:3001`
- `VITE_SUPABASE_URL=...`
- `VITE_SUPABASE_PUBLISHABLE_KEY=...`

## Security Rules
- Never commit `.env` files.
- Keep `SUPABASE_SERVICE_ROLE_KEY` backend-only.
- Restrict Google Maps key by referrer + API scope.
