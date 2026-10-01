# Flare Staff Bot

Discord staff bot + web dashboard for Flare Rewards.

## Setup (Render)

1. Connect this repo to Render (Web Service).
2. Build: `npm install`
3. Start: `npm start`
4. Set environment variables (see `.env.example`).

### Required env

- `DISCORD_BOT_TOKEN` — bot token
- `DISCORD_CLIENT_ID` — application ID (OAuth dashboard login)
- `DISCORD_CLIENT_SECRET` — OAuth secret
- `OAUTH_REDIRECT_URI` — must match Discord Developer Portal redirect exactly  
  Example: `https://f-bot.onrender.com/auth/callback`

### Discord Developer Portal

OAuth2 → Redirects → add the same URL as `OAUTH_REDIRECT_URI`.

## Dashboard

Open your Render URL. Login with Discord (staff/member on the Flare server).

## Slash commands

`/help` `/stock` `/genstock` `/genadd` `/pay` `/claim` `/fgen` `/pgen` `/cstatus`  
`/best` `/online` `/staffstats` `/flare` `/invites` `/clear`  
`/gstart` `/greroll` `/ban` `/kick` `/timeout` `/untimeout` `/warn` `/warnings`  
`/staff` `/daily` `/teamup` `/close` `/leave` `/format` `/salary`

Prefix `$` commands still work.
