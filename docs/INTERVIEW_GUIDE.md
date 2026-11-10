# Movie Memory: interview guide

Use these as practice points. Read the implementation and adjust the wording so you can explain it comfortably and accurately.

## 30-second project overview

“Movie Memory is a full-stack app where a user signs in with Google, selects a favorite movie, and sees a saved AI-generated fact about it. I chose the backend-focused variant using Next.js, TypeScript, PostgreSQL, Prisma, and OpenAI. The main backend challenge is making sure repeated refreshes reuse a recent fact and concurrent requests do not all generate one. The solution uses a database lease, a 60-second cache, and a saved-fact fallback if the AI service fails.”

Be transparent that an AI assistant helped generate the implementation and tests; see `AI_USAGE.md`.

## Explain the flow step by step

1. A user selects **Sign in with Google**. Auth.js handles the OAuth flow and creates a database session.
2. If the user has not chosen a movie, the server redirects them to onboarding. The server trims and validates the title, then saves it against the signed-in user.
3. The dashboard shows the user's Google profile information and favorite movie. A client component sends a same-origin request for a fact.
4. The backend identifies the user from their session, looks up their movie, and checks PostgreSQL for the latest fact for that user and movie.
5. If the fact is under 60 seconds old, it returns that fact. Otherwise, one request claims a temporary database lease and calls OpenAI; other requests wait briefly and reuse the result.
6. If the AI call fails, the backend returns the previous fact if one exists; otherwise it shows a friendly error. Sign-out removes the session.

## Questions you may be asked

**Why store facts with both a user and a movie?**  
The cache belongs to a specific user and movie. That scope supports access control and prevents a fact for one title from being returned for another. The index helps retrieve the newest matching fact efficiently.

**Why check the cache twice?**  
A request can read an old fact just before another request saves a new one. After obtaining the lease, it checks again so it does not make an unnecessary second AI call.

**Why not use an in-memory lock?**  
An in-memory lock coordinates only one server process. Multiple instances would each have their own lock. The database lease works across processes that share the same database.

**Why is there a lease token?**  
A worker can pause or crash. If its lease expires and another worker takes over, the old worker's token no longer matches. The database rejects the old worker's final write and prevents it from clearing the new worker's lease.

**Why not hold a transaction open during the AI request?**  
A network request can be slow. Holding a database connection and transaction while waiting would reduce capacity and increase contention. The AI call happens outside the transaction; the final ownership check and save happen in a short transaction.

**Does this guarantee the provider sees exactly one request?**  
No. A timed-out request might still be processing at the provider after the application stops waiting. The lease reduces duplicate calls and fencing protects stored data, but exact-once external execution and billing are not guaranteed.

**How do you prevent one user from reading another user's fact?**  
The server gets the user ID from the session, not the request. It looks up the user's own movie and scopes the fact query to that ID and movie. Tests also try passing a different user ID in the request and check that it is ignored.

**What would you improve?**  
I would add real credentialed end-to-end tests, rate and cost limits, monitoring, data retention/deletion, and a scalable alternative to polling if traffic required it. I would also verify facts against a trusted source because model output can be inaccurate.

## Suggested 3–5 minute walkthrough

1. Show the landing page, Google login, onboarding, and dashboard.
2. Explain the `User` and `MovieFact` tables and the user/movie/time index.
3. Walk through cache lookup, lease claim, the second cache check, and the fenced save.
4. Show the tests for the cache boundary, concurrency, authorization, and fallback.
5. Explain the timeout/lease tradeoff, AI usage, and the improvements you would make next.
