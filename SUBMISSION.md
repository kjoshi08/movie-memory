# Submission note

**GitHub repository:** [Add your repository URL here after uploading the project.]

**Chosen variant:** Variant A — backend-focused caching and correctness.

Movie Memory uses Google sign-in, a first-time movie selection, a protected dashboard, and an OpenAI-generated fact saved in PostgreSQL. Fresh facts are cached for 60 seconds. A database-backed lease coordinates concurrent requests, and the latest saved fact is returned if fact generation fails. The README includes setup, environment variables, migration steps, architecture, tradeoffs, testing, and follow-up improvements.

**AI usage:** ChatGPT/Codex helped generate the application, tests, and documentation and run automated checks. See `AI_USAGE.md` for details.

The production build, automated tests, migration, and server-side integration flows were checked locally using a test database and a simulated OpenAI service. Google authorization redirection was checked with test configuration. A full live Google login and live OpenAI call require the reviewer's or candidate's credentials.

Before submitting: replace the repository placeholder, review and understand the code, run it with your credentials, and verify that the repository contains no `.env` file or secrets. If the upload form requires a Word/PDF answer document, copy this note into that format or create a short document with the repository link.
