# AI-Powered Social Media Automation

A full-stack social media scheduling app with AI-assisted post writing, account connections, and a dashboard for scheduled and published posts.

<p align="center">
  <img src="docs/screenshots/landing-page.png" alt="Scheduler landing page" width="100%">
</p>

<p align="center">
  <strong>Plan, create, and publish social content from one place.</strong>
</p>

## App preview

<table>
  <tr>
    <td align="center" width="50%">
      <strong>Dashboard</strong><br>
      <img src="docs/screenshots/dashboard.png" alt="Dashboard with post statistics and recent activity" width="100%">
    </td>
    <td align="center" width="50%">
      <strong>Post Scheduler</strong><br>
      <img src="docs/screenshots/scheduler.png" alt="Compose a post and view upcoming and published posts" width="100%">
    </td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <strong>Connected Accounts</strong><br>
      <img src="docs/screenshots/connected-accounts.png" alt="Connected social media accounts" width="100%">
    </td>
    <td align="center" width="50%">
      <strong>AI Composer</strong><br>
      <img src="docs/screenshots/ai-composer.png" alt="Generate social media post content with AI" width="100%">
    </td>
  </tr>
</table>

## Features

- Sign up and log in with JWT-based authentication.
- Connect supported social accounts through Zernio OAuth.
- Draft and schedule posts for connected platforms.
- Generate post copy with Gemini (`gemini-3.1-flash-lite`).
- Upload post media and schedule publishing.
- View scheduled posts, published posts, and recent activity.
- Run scheduled publishing through a server-side cron job.

## Tech stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Backend:** Node.js, Express, TypeScript
- **Database:** MongoDB with Mongoose
- **Integrations:** Google Gemini API and Zernio

## Repository structure

```text
.
├── client/   # React/Vite frontend
└── server/   # Express API, MongoDB models, and publishing scheduler
```

## Requirements

- Node.js and npm
- A MongoDB database (MongoDB Atlas is suitable)
- A Gemini API key for AI post generation
- A Zernio API key for social account connections and publishing

## Run locally

1. Clone the repository and install each app's dependencies:

   ```bash
   cd server
   npm install
   cd ../client
   npm install
   ```

2. Create `server/.env`:

   ```env
   PORT=3000
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>/<database>
   JWT_SECRET=<use-a-long-random-secret>
   GEMINI_API_KEY=<your-gemini-api-key>
   ZERNIO_API_KEY=<your-zernio-api-key>
   CLIENT_URL=frontend_uri
   OAUTH_SERVER_URL=backend_uri
   GOOGLE_CLIENT_ID=<your-google-oauth-client-id>
   GOOGLE_CLIENT_SECRET=<your-google-oauth-client-secret>
   GITHUB_CLIENT_ID=<your-github-oauth-client-id>
   GITHUB_CLIENT_SECRET=<your-github-oauth-client-secret>
   ```

   OAuth credentials are required only if you want to enable sign-in with that provider. Register these callback URLs in the corresponding provider console:

   - Google: `backend_uri/api/auth/oauth/google/callback`
   - GitHub: `backend_uri/api/auth/oauth/github/callback`

   Use the deployed backend URL for `OAUTH_SERVER_URL` and the deployed frontend origin for `CLIENT_URL` in production. Register the matching deployed callback URLs with each provider as well. Google must return a verified email; GitHub requires the `user:email` scope and a verified address.

3. Start the backend in one terminal:

   ```bash
   cd server
   npm run server
   ```

   The API listens on `http://localhost:3000`.

4. Create `client/.env`:

   ```env
   VITE_API_BASE_URL=http://localhost:3000
   ```

5. Start the frontend in another terminal:

   ```bash
   cd client
   npm run dev
   ```

   Open the local URL printed by Vite (typically `http://localhost:5173`).

## Available commands

Run commands from the relevant folder.

### Client (`client/`)

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Type-check and create the production build in `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |

### Server (`server/`)

| Command | Description |
| --- | --- |
| `npm run server` | Start the development server with Nodemon and TSX |
| `npm start` | Start the server with TSX |
| `npm run build` | Compile TypeScript into `dist/` |

## Deploy

### Backend on Render

Create a **Web Service** connected to this repository:

- **Root Directory:** `server`
- **Build Command:** `npm install && npm run build`
- **Start Command:** `node dist/server.js`

Set these environment variables in Render:

- `MONGODB_URI`
- `JWT_SECRET`
- `GEMINI_API_KEY`
- `ZERNIO_API_KEY`
- `OAUTH_SERVER_URL` (for example, `https://<your-render-service>.onrender.com`)
- `CLIENT_URL` (your deployed frontend origin)
- `NODE_ENV=production` (ensures the OAuth state cookie is marked secure)
- Provider credentials: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, and `GITHUB_CLIENT_SECRET`.

Render provides `PORT` for the web service. The app uses it automatically.

The server runs a cron scheduler for publishing scheduled posts. Use an always-on service plan; a service that sleeps may not execute scheduled publishing reliably.

### Frontend on Vercel

Import the repository as a Vercel project:

- **Root Directory:** `client`
- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`

Set this Vercel environment variable to the Render API's base URL (no trailing slash):

```env
VITE_API_BASE_URL=https://<your-render-service>.onrender.com
```

The `client/vercel.json` rewrite serves the SPA for application routes, including `/auth/callback`. Redeploy after setting the environment variable.

### Social-account OAuth, user sign-in, CORS, and database access

- The OAuth return URL is currently constructed from the browser request's `Origin` and returns to `/accounts`. Configure Zernio and the connected social providers to accept your deployed Vercel domain and the corresponding OAuth flow.
- User sign-in supports Google and GitHub. Set `CLIENT_URL` to the canonical deployed Vercel origin (for example, `https://your-app.vercel.app`) and `OAUTH_SERVER_URL` to the Render service origin. In Google and GitHub provider settings, register these exact callback URLs: `<OAUTH_SERVER_URL>/api/auth/oauth/google/callback` and `<OAUTH_SERVER_URL>/api/auth/oauth/github/callback`. These provider callbacks go to Render; after login, the backend redirects to Vercel's `/auth/callback`. A provider-verified email matching an existing user account links that provider to the account.
- The API currently enables CORS for all origins. Before production use, restrict it to the deployed frontend origin.
- Configure MongoDB Atlas Network Access to allow connections from the deployed Render service. Prefer allowing the service's outbound IP addresses where available instead of allowing access from everywhere.

## Security notes

- Never commit `.env` files, API keys, database credentials, or JWT secrets.
- Use a long, unique `JWT_SECRET` in production. Do not rely on the development fallback secret.
- `VITE_` environment variables are included in the browser bundle. Only put public configuration, such as the API base URL, in Vercel.

## License

No license has been specified for this repository yet.
