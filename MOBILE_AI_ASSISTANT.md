# 📱 DarCloud Mobile AI Assistant - Installation Guide

## Your Always-On, Learning AI Agent

This mobile AI assistant connects directly to your DarCloud & Fungi Mesh Network infrastructure, providing:
- ✅ **Always-On Access** - Works offline with service worker
- ✅ **Continuous Learning** - Learns from every conversation
- ✅ **Real-Time Monitoring** - Live network status
- ✅ **AI-Powered Chat** - Powered by GPT-4
- ✅ **Push Notifications** - Stay updated on the go
- ✅ **Home Screen Install** - Full app experience

---

## 🚀 Installation Steps

### For iPhone/iPad (iOS/iPadOS)

1. **Open in Safari**
   - Go to: `https://daralnas-chatgpt.oabu77.workers.dev/assistant`
   - (Replace with your actual worker URL)

2. **Add to Home Screen**
   - Tap the Share button (square with arrow)
   - Scroll down and tap "Add to Home Screen"
   - Name it "DarCloud AI"
   - Tap "Add"

3. **Open the App**
   - Find the new DarCloud AI icon on your home screen
   - Tap to open - it runs like a native app!

4. **Enable Notifications (Optional)**
   - When prompted, tap "Allow" for notifications
   - Get real-time updates about your network

---

### For Android

1. **Open in Chrome**
   - Go to: `https://daralnas-chatgpt.oabu77.workers.dev/assistant`

2. **Install the App**
   - Chrome will show an install banner at the bottom
   - Tap "Install" or "Add DarCloud AI"
   - Or tap the menu (⋮) → "Install app"

3. **Open the App**
   - Find DarCloud AI in your app drawer
   - Works just like a native app!

4. **Enable Notifications (Optional)**
   - Grant notification permissions when prompted

---

## 📲 Local Development Testing

### Test on Your Phone (Same Network)

1. **Find Your Local IP**
   ```bash
   # On Linux/Mac
   hostname -I | awk '{print $1}'
   
   # Or check your network settings
   ```

2. **Start Dev Server**
   ```bash
   npm run dev
   ```

3. **Access from Phone**
   - Connect phone to same WiFi network
   - Open: `http://YOUR_LOCAL_IP:8787/assistant`
   - Example: `http://192.168.1.100:8787/assistant`

### Test with Ngrok/Cloudflare Tunnel

```bash
# Using Cloudflare Tunnel (already in your setup)
cloudflared tunnel --url http://localhost:8787

# Or using ngrok
ngrok http 8787
```

Then access the provided HTTPS URL on your phone.

---

## 🎯 Features & Usage

### Quick Actions
Tap the quick action buttons at the top:
- **📊 Status** - Check DarCloud & Fungi Mesh status
- **🚚 Shipments** - View recent shipments
- **❓ Help** - Get help and tips
- **🧠 Teach Me** - Train the AI with your preferences

### Chat Interface
- Type any question or command
- The AI learns from every conversation
- Responses are optimized for mobile
- Works offline (cached responses)

### Always Learning
The assistant stores conversations in D1 database to:
- Remember your preferences
- Learn usage patterns
- Provide personalized responses
- Improve over time

---

## 🔧 Configuration

### Environment Variables Required

Add to your Cloudflare Workers environment:

```bash
OPENAI_API_KEY=sk-...your-openai-key...
```

Set in Cloudflare Dashboard:
1. Go to Workers & Pages → Your Worker → Settings
2. Variables → Add variable
3. Name: `OPENAI_API_KEY`
4. Value: Your OpenAI API key
5. Save

Or via wrangler:
```bash
wrangler secret put OPENAI_API_KEY
```

---

## 🛠️ Customization

### Update App Info

Edit `public/manifest.json`:
```json
{
  "name": "Your Custom Name",
  "short_name": "CustomAI",
  "theme_color": "#YOUR_COLOR"
}
```

### Customize UI

Edit `public/assistant.html`:
- Update colors in the `<style>` section
- Modify quick actions
- Add custom features

### Add Custom Icons

Place icons in `public/icons/`:
- icon-192x192.png
- icon-512x512.png
- (Other sizes from manifest.json)

Generate icons from a single image:
```bash
# Using ImageMagick
for size in 72 96 128 144 152 192 384 512; do
  convert your-icon.png -resize ${size}x${size} public/icons/icon-${size}x${size}.png
done
```

---

## 📊 Monitoring & Analytics

### Check Conversation History

```sql
-- Query recent conversations
SELECT * FROM ai_conversations 
ORDER BY created_at DESC 
LIMIT 50;

-- Check learning patterns
SELECT * FROM learning_patterns 
ORDER BY confidence_score DESC;
```

### View Usage Stats

Access Cloudflare Workers Analytics:
- Workers & Pages → Your Worker → Analytics
- See request counts, errors, and latency

---

## 🔐 Security & Privacy

### Data Storage
- Conversations stored in D1 database
- No third-party tracking
- Data stays in your Cloudflare account

### API Security
- OpenAI API key stored as encrypted secret
- HTTPS enforced for all connections
- Service Worker validates requests

### Offline Mode
- Cached responses available offline
- Syncs when connection restored
- No data sent without connectivity

---

## 🚀 Deployment

### Deploy with Auto-Deploy

Already configured! Just push to main:
```bash
git add .
git commit -m "Add mobile AI assistant"
git push origin main
```

Auto-deployment will:
1. Run tests
2. Apply database migrations (including new AI tables)
3. Deploy worker with public assets
4. Enable the /assistant endpoint

### Manual Deploy

```bash
# Apply migrations first
wrangler d1 migrations apply DB --remote

# Deploy worker
wrangler deploy
```

---

## ✅ Verification

### Test the Installation

1. **Check Health**
   ```bash
   curl https://your-worker.workers.dev/assistant
   ```
   Should return HTML

2. **Test Chat Endpoint**
   ```bash
   curl -X POST https://your-worker.workers.dev/assistant/chat \
     -H "Content-Type: application/json" \
     -d '{"messages":[{"role":"user","content":"Hello!"}]}'
   ```

3. **Verify Manifest**
   ```bash
   curl https://your-worker.workers.dev/manifest.json
   ```

4. **Check Service Worker**
   ```bash
   curl https://your-worker.workers.dev/sw.js
   ```

---

## 📱 Usage Tips

### Best Practices
- Install to home screen for best experience
- Enable notifications for real-time updates
- Use quick actions for common tasks
- Teach the AI your preferences regularly

### Voice Input (Mobile)
- Tap the microphone on your mobile keyboard
- Speak your message
- Works great for hands-free operation

### Offline Usage
- App caches responses for offline access
- Status checks work when online
- Messages queue when offline, send when connected

---

## 🎉 You're All Set!

Your mobile AI assistant is now:
- ✅ Deployed and accessible
- ✅ Learning from conversations
- ✅ Connected to DarCloud & Fungi Mesh
- ✅ Available offline
- ✅ Receiving updates automatically

**Access it now**: `https://your-worker.workers.dev/assistant`

Install it on your phone and enjoy your always-on AI agent! 🚀

---

## 🆘 Troubleshooting

### App Won't Install
- Make sure you're using Safari (iOS) or Chrome (Android)
- Check that the site is served over HTTPS
- Clear browser cache and try again

### Chat Not Working
- Verify OPENAI_API_KEY is set in Cloudflare
- Check Workers logs for errors
- Ensure database migrations are applied

### Notifications Not Showing
- Check notification permissions in phone settings
- Re-grant permissions in browser settings
- Verify service worker is registered

### Offline Mode Not Working
- Clear cache and reinstall
- Check service worker in browser DevTools
- Ensure HTTPS is enabled

---

**Need help?** Check the logs:
```bash
wrangler tail
```
