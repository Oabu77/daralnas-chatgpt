# Client Services Portal

## Overview

The DarCloud™ Client Services Portal provides a unified interface for clients to sign in and access all platform services from one location.

## Features

### 🔐 Authentication
- **Sign In**: Secure authentication with email/password
- **Demo Access**: Try the portal without creating an account
- **Session Management**: Persistent sessions with "Remember Me" option
- **Auto-redirect**: Automatically redirects to portal if already logged in

### 🌐 Unified Services Access

The portal provides access to all DarCloud™ services:

1. **OliveExpress™ Logistics** (`/oliveexpress.html`)
   - Multi-regional logistics platform
   - 18 active ports (USA, Mexico, Jordan)
   - AI dispatch and tracking

2. **QuranChain™ Blockchain** (`/quranchain.html`)
   - Halal blockchain platform
   - Smart contracts and escrow
   - Dispute resolution

3. **AI Assistant** (`/assistant.html`)
   - 24/7 AI-powered support
   - Multi-language assistance
   - Context-aware responses

4. **Fungi Mesh Network** (`/fungi.html`)
   - Decentralized mesh network
   - Infrastructure monitoring
   - Automatic failover

5. **Network Management** (`/network.html`)
   - Auto device discovery
   - Performance monitoring
   - Auto-optimization

6. **AI Agents Dashboard** (`/agents-dashboard.html`)
   - 180+ active AI agents
   - Real-time monitoring
   - Auto-scaling

7. **MeshTalk OS™** (`/meshtalk.html`)
   - Secure messaging
   - Offline capabilities
   - End-to-end encryption

8. **Revenue Analytics** (`/revenue.html`)
   - Real-time revenue tracking
   - Founder royalty monitoring
   - Financial analytics

9. **Operations Dashboard** (`/dashboard.html`)
   - Live metrics
   - System health
   - User analytics

### 🚀 Quick Actions

The portal includes quick action buttons for:
- **Auto-Connect Devices**: Trigger network device discovery
- **My Profile**: Access user profile settings
- **Billing & Plans**: Manage subscriptions
- **API Documentation**: View complete API docs

## File Structure

```
public/
├── signin.html      # Sign-in page
├── portal.html      # Main services portal (requires authentication)
├── signup.html      # Updated to redirect to portal
└── index.html       # Updated with "Sign In" links
```

## Usage

### For Users

1. **Sign In**:
   - Visit `/signin.html`
   - Enter email and password
   - Or click "Demo Access" for instant access

2. **Access Services**:
   - After sign-in, you're redirected to `/portal.html`
   - Click any service card to access that service
   - Use quick actions for common tasks

3. **Sign Out**:
   - Click "Sign Out" button in the header
   - Returns to sign-in page

### For Developers

#### Session Management

Sessions are stored in `localStorage` (with "Remember Me") or `sessionStorage`:

```javascript
// Session structure
{
  email: "user@example.com",
  loggedIn: true,
  demo: false,  // true for demo access
  timestamp: "2026-02-18T16:00:00.000Z"
}
```

#### Authentication Check

The portal automatically checks authentication on load:

```javascript
function checkAuth() {
  const session = localStorage.getItem('darcloud_session') || 
                  sessionStorage.getItem('darcloud_session');
  
  if (!session) {
    window.location.href = '/signin.html';
    return null;
  }
  
  return JSON.parse(session);
}
```

#### Integration with Existing Services

All service pages can check authentication and show user info:

```javascript
const session = JSON.parse(
  localStorage.getItem('darcloud_session') || 
  sessionStorage.getItem('darcloud_session')
);

if (session?.loggedIn) {
  console.log('Logged in as:', session.email);
}
```

## Demo Mode

Demo access is provided for users to explore the platform without creating an account:

- **Email**: `demo@darcloud.host`
- **Demo Flag**: `session.demo = true`
- **Session Storage**: Uses `sessionStorage` (doesn't persist)

## Navigation Flow

```
index.html (Landing Page)
    ↓
    → "Sign In" button → signin.html
    ↓                         ↓
    → "Get Started" → signup.html
                            ↓
                      (After signup)
                            ↓
                    ← portal.html →
                            ↓
            (Access all services)
```

## Customization

### Adding New Services

To add a new service to the portal, edit `public/portal.html`:

```html
<a href="/new-service.html" class="service-card">
    <div class="service-icon">🆕</div>
    <div class="service-name">New Service</div>
    <span class="service-status status-live">🟢 LIVE</span>
    <p class="service-description">
        Description of the new service.
    </p>
    <ul class="service-features">
        <li>Feature 1</li>
        <li>Feature 2</li>
        <li>Feature 3</li>
    </ul>
</a>
```

### Styling

The portal uses CSS custom properties for easy theming:

```css
:root {
    --primary: #2a5298;
    --primary-dark: #1e3c72;
    --secondary: #2ecc71;
    --accent: #f39c12;
    --text: #2c3e50;
    --light: #ecf0f1;
    --white: #ffffff;
}
```

## Security Considerations

⚠️ **Important**: The current implementation is for demonstration purposes.

For production deployment:

1. **Backend Authentication**: Implement proper API-based authentication
2. **Token Management**: Use JWT or session tokens
3. **HTTPS Only**: Enforce HTTPS for all authentication flows
4. **Rate Limiting**: Add rate limiting to prevent brute force
5. **Password Requirements**: Enforce strong password policies
6. **2FA Support**: Add two-factor authentication
7. **Session Expiry**: Implement automatic session expiration

## Future Enhancements

Planned improvements:

- [ ] Backend API integration for authentication
- [ ] OAuth integration (Google, GitHub)
- [ ] Multi-factor authentication
- [ ] Role-based access control (RBAC)
- [ ] Service usage analytics
- [ ] Notification center
- [ ] Dark mode support
- [ ] Mobile app integration
- [ ] SSO (Single Sign-On) support

## Testing

To test the portal:

1. **Manual Testing**:
   ```bash
   # Start development server
   npm run dev
   
   # Visit in browser
   open http://localhost:8787/signin.html
   ```

2. **Demo Access**:
   - Click "Demo Access" button
   - Explore all services without sign-up

3. **Sign Up Flow**:
   - Visit `/signup.html`
   - Fill in details
   - Should redirect to portal

## Support

For issues or questions:
- View main documentation: `README.md`
- API documentation: Visit `/` endpoint
- GitHub Issues: Open an issue in the repository

---

**DarCloud™ Client Services Portal**
Version 1.0.0 - February 2026
