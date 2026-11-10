# Upload the project to GitHub

The project is provided as source code. Creating a repository in your GitHub account is a separate step.

1. Extract the ZIP file and open PowerShell in the `movie-memory` folder.
2. On GitHub, create a new **empty** repository, such as `movie-memory`. Do not initialize it with a README, `.gitignore`, or license because the project already includes its own files. Choose visibility according to the reviewer's instructions. If it is private, give the reviewer access before submitting.
3. Run these commands, replacing the example URL with the URL shown on your new repository page:

   ```powershell
   git init -b main
   git add .
   git status
   git commit -m "Build Movie Memory take-home application"
   git remote add origin https://github.com/YOUR_USERNAME/movie-memory.git
   git push -u origin main
   ```

   If Git asks you to sign in or configure your name and email, follow its prompts. Check `git status` before committing: `.env`, dependencies, and build output should not be listed. `.env.example` is safe to include because it contains placeholders.
4. Open the repository in a browser and check that `README.md`, `prisma/`, `app/`, `tests/`, and `package-lock.json` are present. Do not upload real credentials.
5. Replace the highlighted placeholder in `SUBMISSION.docx` with the repository URL. Check the document and submit it through the link from Sunil's email. The Markdown version is `SUBMISSION.md`.
