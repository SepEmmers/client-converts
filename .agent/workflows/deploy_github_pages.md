---
description: Deploy Client Converts to GitHub Pages
---

# Deploy to GitHub Pages

Follow these steps to host your tools for free on GitHub Pages.

## 1. Initialize Git (If not already done)
Open your terminal in the project folder and run:
```bash
git init
git add .
git commit -m "Initial commit: Client Converts"
```

## 2. Create a GitHub Repository
1.  Go to [GitHub.com](https://github.com) and sign in.
2.  Click the **+** icon in the top right and select **New repository**.
3.  Name it `client-converts` (or any name you prefer).
4.  Make it **Public** (required for free GitHub Pages).
5.  Click **Create repository**.

## 3. Push Code
Copy the commands shown on GitHub under "…or push an existing repository from the command line" and run them. They will look like this:
```bash
git remote add origin https://github.com/YOUR_USERNAME/client-converts.git
git branch -M main
git push -u origin main
```

## 4. Enable GitHub Pages
1.  In your repository on GitHub, go to **Settings**.
2.  Click **Pages** in the left sidebar.
3.  Under **Build and deployment** > **Source**, select **Deploy from a branch**.
4.  Under **Branch**, select `main` and `/ (root)`.
5.  Click **Save**.

## 5. Final SEO Update
Once deployed, GitHub will give you a URL (e.g., `https://yourusername.github.io/client-converts/`).

1.  Copy this URL.
2.  Update `sitemap.xml`, `robots.txt`, and the `<link rel="canonical">` tags in all HTML files to use this real URL instead of the placeholder.
3.  Commit and push the changes:
    ```bash
    git add .
    git commit -m "Update SEO URLs"
    git push
    ```

Your site is now live! 🚀
