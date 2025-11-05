# Netlify Deployment Checklist for Tundra-Viora

This checklist will guide you through deploying your compiled React application to Netlify.

### Option 1: Drag-and-Drop Deployment

Use this method if you want to deploy manually from your local machine.

1.  **Build the Project:** Open your terminal in the project's root directory and run `npm run build` (or `yarn build`).
2.  **Locate Output:** This command will create a new folder named `dist` in your project.
3.  **Go to Netlify:** Log in to your Netlify account and go to the "Sites" page.
4.  **Drag and Drop:** Drag the entire `dist` folder from your file explorer and drop it onto the deployment area on the Netlify sites page.
5.  **Wait for Upload:** Netlify will upload the files and your site will be live in a few moments!

### Option 2: Git-Based (Continuous) Deployment

This is the recommended method. Netlify will automatically build and deploy your site whenever you push changes to your Git repository.

1.  **Push to Git:** Make sure your project, including the new `package.json`, `vite.config.ts`, and `tsconfig.json` files, is pushed to a repository on GitHub, GitLab, or Bitbucket.
2.  **Connect to Netlify:** In your Netlify dashboard, click "Add new site" and then "Import an existing project".
3.  **Choose Git Provider:** Select the Git provider where your repository is hosted and authorize Netlify.
4.  **Select Repository:** Choose the repository for your Tundra-Viora application.
5.  **Configure Build Settings:** Netlify will auto-detect the framework, but confirm the following settings are correct:
    *   **Build command:** `npm run build` (or `yarn build` if you use Yarn)
    *   **Publish directory:** `dist`
6.  **Add Environment Variables:** Go to your site's settings (`Site configuration` -> `Build & deploy` -> `Environment`). Add an environment variable for your Gemini API key:
    *   **Key:** `VITE_API_KEY`
    *   **Value:** `[Your actual Gemini API key]`
7.  **Deploy:** Click "Deploy site". Netlify will pull your code, run the build command, and deploy the contents of the `dist` directory.

---
**Important Note:** To access the API key in your code with Vite, you must change `process.env.API_KEY` to `import.meta.env.VITE_API_KEY`. I have updated the `geminiService.ts` file for you to reflect this change.
