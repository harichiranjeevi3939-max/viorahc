# Tundra-Viora Deployment Checklist

This document outlines the critical fixes applied to the project and provides the necessary steps to verify, build, and deploy this Vite-based React application to Netlify successfully.

## 1. Summary of Critical Fixes

- **`fix(index.html)`**: Resolved the "misplaced-doctype" build error by moving the `<script type="importmap">` tag from before the `<!DOCTYPE html>` declaration to its correct location inside the `<head>` tag. This ensures the HTML is valid and parsable by Vite's build tools.
- **`fix(build)`**: Corrected the environment variable access method in `services/geminiService.ts`. The code was changed from `process.env.API_KEY` to Vite's standard `import.meta.env.VITE_API_KEY` to prevent build failures and runtime errors (`process is not defined`).
- **`feat(netlify)`**: Added a `netlify.toml` file to the project root. This file contains the necessary rewrite rule (`/* /index.html 200`) to enable correct client-side routing for this Single Page Application (SPA) on Netlify, preventing 404 errors on page refresh or direct navigation.

## 2. Environment Variables for Netlify

The application requires one environment variable to be set in the Netlify UI. The build will fail if this is not configured.

-   **Variable Name**: `VITE_API_KEY`
-   **Purpose**: This variable contains the Google Gemini API key, which is essential for all AI features of the application.
-   **How to Set**:
    1.  In your Netlify site dashboard, go to **Site configuration > Build & deploy > Environment**.
    2.  Click **Edit variables** and add a new variable.
    3.  Set the **Key** to `VITE_API_KEY` and the **Value** to your personal Gemini API key.
    4.  Save and re-deploy your site.

## 3. Local Verification Steps

Follow these steps to confirm the application builds and runs correctly before deploying to Netlify.

### Step 1: Check `index.html`
Run this command in your terminal to verify the `DOCTYPE` is the first line:
```bash
head -n 5 index.html
```
**Expected Outcome**: The first line must be `<!DOCTYPE html>`.

### Step 2: Install Dependencies
Ensure you are using Node.js v22.x or later.
```bash
npm ci
```

### Step 3: Run the Build Command
This will compile the application into the `dist/` directory.
```bash
npm run build
```
**Expected Outcome**: The build process must complete successfully with an exit code of 0 and without any errors in the console. The `dist/` folder will be created.

### Step 4: Serve the Built Application
Use a local static server to preview the production build.
```bash
npx serve dist
```
**Expected Outcome**: The server will provide a local URL (e.g., `http://localhost:3000`).

### Step 5: Final Smoke Test
1.  Open the local URL in your browser.
2.  Open the browser's Developer Tools (F12 or Ctrl+Shift+I) and check the **Console** and **Network** tabs.
3.  **Verification**:
    -   The application UI should load correctly.
    -   The **Console** tab should be free of any red uncaught exceptions or errors.
    -   The **Network** tab should show no 404 errors for any JavaScript or CSS assets.
    -   The `dist` directory should contain `index.html` and hashed asset files.

Passing these checks confirms the project is ready for a successful Netlify deployment.
