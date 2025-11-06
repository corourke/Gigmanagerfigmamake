# Authentication Setup Guide

GigManager supports multiple authentication methods via Supabase Auth. You can enable any combination of these methods in your Supabase project.

## Supported Authentication Methods

### 1. Email/Password Authentication ✅ Ready to Use

Email/password authentication works out of the box with no additional configuration required.

**Features:**
- Sign up with email and password
- Sign in with email and password
- Email confirmation (optional - configure in Supabase settings)
- Password reset functionality (handled by Supabase)

**User Flow:**
1. User enters email, password, first name, and last name
2. Account is created in Supabase Auth
3. User profile is automatically created in the `users` table
4. User is immediately signed in (or must confirm email if enabled)

**No setup required** - this works immediately!

### 2. Google OAuth 🔧 Requires Setup

Google OAuth requires configuration in both Google Cloud Console and Supabase.

**Setup Instructions:**

1. **Google Cloud Console:**
   - Go to https://console.cloud.google.com/
   - Create a new project or select an existing one
   - Enable Google+ API
   - Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
   - Set application type to "Web application"
   - Add authorized redirect URIs:
     ```
     https://<your-project-id>.supabase.co/auth/v1/callback
     ```
   - Copy the Client ID and Client Secret

2. **Supabase Dashboard:**
   - Go to Authentication → Providers
   - Find Google provider and enable it
   - Paste your Google Client ID and Client Secret
   - Save the configuration

3. **Test:**
   - Click "Sign in with Google" button
   - Should redirect to Google OAuth consent screen
   - After approval, redirects back to your app

**Full Documentation:** https://supabase.com/docs/guides/auth/social-login/auth-google

### 3. Other OAuth Providers (Optional)

Supabase supports many other OAuth providers. To add any of these:

**Available Providers:**
- GitHub
- GitLab
- Bitbucket
- Azure (Microsoft)
- Facebook
- Twitter
- Discord
- Slack
- Spotify
- LinkedIn
- And more...

**To Enable:**
1. Go to Supabase Dashboard → Authentication → Providers
2. Enable the provider you want
3. Follow the provider-specific setup instructions in Supabase docs
4. The LoginScreen will automatically detect and use enabled providers

## Email Confirmation Settings

By default, Supabase may require email confirmation for new signups.

**To Disable Email Confirmation (for development):**
1. Go to Supabase Dashboard → Authentication → Settings
2. Scroll to "Email Auth"
3. Uncheck "Enable email confirmations"
4. Users can sign in immediately after signup

**To Keep Email Confirmation Enabled (recommended for production):**
1. Configure your email templates in Authentication → Email Templates
2. Users will receive a confirmation email
3. They must click the link before they can sign in
4. The app will show an appropriate message

## Password Reset

Password reset is handled automatically by Supabase Auth.

**To add password reset to your app:**
1. Add a "Forgot Password?" link in LoginScreen
2. Call `supabase.auth.resetPasswordForEmail(email)`
3. User receives reset email from Supabase
4. They click the link and set a new password

## Current Implementation

The LoginScreen (`/components/LoginScreen.tsx`) currently supports:

✅ **Email/Password Sign In** - Ready to use
✅ **Email/Password Sign Up** - Ready to use
✅ **Google OAuth** - Requires setup (see above)
✅ **Session Persistence** - Users stay logged in across page refreshes
✅ **Automatic Profile Creation** - User profiles created on first login

## Testing Authentication

### Test Email/Password (No Setup Required):

1. Go to the Sign Up tab
2. Enter:
   - First Name: "Test"
   - Last Name: "User"
   - Email: "test@example.com"
   - Password: "password123"
3. Click "Create Account"
4. If email confirmation is disabled, you'll be logged in immediately
5. If email confirmation is enabled, check your email

### Test Google OAuth (After Setup):

1. Click "Continue with Google"
2. Should redirect to Google sign-in
3. After approving, redirects back and logs you in

### Test Mock Data (For Development):

1. Set `USE_MOCK_DATA = true` in `/App.tsx` (line 51)
2. Click any sign-in button
3. Will immediately log you in with mock data
4. No Supabase connection required

## Security Best Practices

1. **Always use HTTPS in production** - Required for OAuth
2. **Enable email confirmation** - Verifies user email addresses
3. **Set strong password requirements** - Minimum 6 characters (can be increased)
4. **Configure rate limiting** - Prevent brute force attacks (in Supabase settings)
5. **Use Row-Level Security** - Already configured for all tables
6. **Monitor auth logs** - Check Supabase dashboard regularly

## Troubleshooting

### "Email not confirmed" error
- Check Supabase Dashboard → Authentication → Settings
- Either disable email confirmation or check user's email

### "Invalid login credentials"
- Check password is correct
- Check user exists in Supabase Auth (Dashboard → Authentication → Users)

### Google OAuth redirect loop
- Verify redirect URI in Google Cloud Console matches exactly
- Check Google Client ID and Secret are correct in Supabase

### "No authorization header" error
- User's session may have expired
- Try logging out and back in
- Check browser localStorage for auth tokens

## Adding Additional Providers

To add support for more OAuth providers in the UI:

1. **Update LoginScreen.tsx:**
```typescript
// Add button for new provider
const handleGitHubLogin = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: window.location.origin,
    },
  });
};

// Add button in JSX
<Button onClick={handleGitHubLogin}>
  Sign in with GitHub
</Button>
```

2. **Enable in Supabase:**
   - Go to Authentication → Providers
   - Enable the provider
   - Configure OAuth credentials

The authentication flow will work exactly the same way!

## User Profile Management

After authentication, user profiles are stored in the `users` table:

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  -- Additional fields...
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

Profile creation happens automatically when:
- User signs up with email/password
- User signs in with OAuth for the first time
- User data is pulled from OAuth provider (Google profile, etc.)

## Next Steps

1. ✅ Choose which authentication methods to enable
2. ✅ Configure OAuth providers (if using)
3. ✅ Set email confirmation preferences
4. ✅ Test authentication flow
5. ✅ Customize email templates (optional)
6. ✅ Add password reset functionality (optional)
7. ✅ Monitor auth logs and usage

You're all set! Users can now sign up and sign in using any enabled authentication method.
