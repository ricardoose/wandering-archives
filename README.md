<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Wandering Archives - Deployed Webpage

This React + Vite application is automatically deployed to GitHub Pages.

## 🌐 Live Site
https://ricardoose.github.io/wandering-archives/

## Local Development

**Prerequisites:** Node.js 18+

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set the `GEMINI_API_KEY` in `.env.local` to your Gemini API key

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

5. Preview the production build:
   ```bash
   npm run preview
   ```

## Deployment

This repository uses GitHub Actions to automatically deploy to GitHub Pages on every push to the `main` branch.

The deployment workflow:
- Installs dependencies
- Builds the Vite app
- Deploys the `dist` folder to GitHub Pages

View your app in AI Studio: https://ai.studio/apps/f86c1eb0-f049-48cd-8fb9-f292c1182700