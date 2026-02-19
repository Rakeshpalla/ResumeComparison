# Guest Access (No Login Required)

**By default the app is guest-only:** anyone can use it without registering. The home page goes to Upload, and a temporary guest session is created when they start a comparison.

## Default behavior (no env vars)

- **Home (`/`)** → **Upload**
- **Login (`/login`)** → redirects to Upload (login form is hidden)
- **Upload & Compare** work without an account; a guest user is created automatically on first use
- **Sign out** is hidden in the header

## Re-enable login / registration

When you want to require email sign-in again:

1. **Vercel:** Project → Settings → Environment Variables → add:
   - `REQUIRE_LOGIN` = `true`
   - `NEXT_PUBLIC_REQUIRE_LOGIN` = `true`
2. **Local:** Add to `.env`:
   ```env
   REQUIRE_LOGIN=true
   NEXT_PUBLIC_REQUIRE_LOGIN=true
   ```
3. Redeploy (or restart dev server).

After that, `/` and `/login` show the login/signup flow and Sign out is visible again.
