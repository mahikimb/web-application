# How to Launch Your React App Locally Using Ngrok

Ngrok creates a secure tunnel to expose your local React development server to the internet, allowing you to share your website or test it on mobile devices.

## Prerequisites

1. Your React app should be running locally on `http://localhost:3000`
2. Ngrok installed on your computer

## Step 1: Install Ngrok

### Option A: Download from Website (Recommended)
1. Go to [https://ngrok.com/download](https://ngrok.com/download)
2. Download ngrok for Windows
3. Extract the `ngrok.exe` file to a folder (e.g., `C:\ngrok\`)
4. Add ngrok to your system PATH, or use the full path when running commands

### Option B: Using Package Manager
If you have Chocolatey installed:
```powershell
choco install ngrok
```

Or using Scoop:
```powershell
scoop install ngrok
```

## Step 2: Sign Up for Ngrok (Free)

1. Go to [https://dashboard.ngrok.com/signup](https://dashboard.ngrok.com/signup)
2. Create a free account
3. Get your authtoken from the dashboard
4. Configure ngrok with your authtoken:
```powershell
ngrok config add-authtoken YOUR_AUTHTOKEN_HERE
```

## Step 3: Start Your React App

In your project directory, start the React development server:

```powershell
npm start
```

Wait until you see:
```
Compiled successfully!
You can now view softica-labs in the browser.
  Local:            http://localhost:3000
```

**Keep this terminal window open!**

## Step 4: Start Ngrok Tunnel

Open a **new terminal/PowerShell window** and run:

```powershell
ngrok http 3000
```

You'll see output like:
```
ngrok

Session Status                online
Account                       Your Name (Plan: Free)
Version                       3.x.x
Region                        United States (us)
Latency                       -
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123.ngrok-free.app -> http://localhost:3000

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

## Step 5: Access Your App

1. **Copy the HTTPS URL** from the ngrok output (e.g., `https://abc123.ngrok-free.app`)
2. **Share this URL** with others or use it on mobile devices
3. **Access the web interface** at `http://127.0.0.1:4040` to see request logs and inspect traffic

## Important Notes

### Free Plan Limitations
- **Random URLs**: Each time you restart ngrok, you get a new URL
- **Session Timeout**: Free plan has session time limits
- **Request Limits**: Limited requests per minute

### Paid Plans
If you need:
- **Fixed domain**: Same URL every time
- **No session limits**: Keep tunnel open indefinitely
- **More requests**: Higher rate limits

Consider upgrading at [https://ngrok.com/pricing](https://ngrok.com/pricing)

## Alternative: Using ngrok with Custom Domain (Free)

You can use a custom subdomain with ngrok (requires account setup):

```powershell
ngrok http 3000 --domain=your-custom-name.ngrok-free.app
```

## Troubleshooting

### Issue: "ngrok: command not found"
**Solution**: Add ngrok to your system PATH or use the full path:
```powershell
C:\path\to\ngrok.exe http 3000
```

### Issue: "ERR_NGROK_3200" - Too many connections
**Solution**: You've hit the free plan limit. Wait a few minutes or upgrade your plan.

### Issue: React app not loading through ngrok
**Solution**: 
1. Make sure React app is running on `localhost:3000`
2. Check that ngrok is forwarding to the correct port
3. Try restarting both the React app and ngrok

### Issue: "This site can't be reached"
**Solution**:
1. Verify React app is running: Open `http://localhost:3000` in your browser
2. Check ngrok status in the web interface at `http://127.0.0.1:4040`
3. Restart ngrok tunnel

## Quick Start Script

You can create a batch file to start both at once:

**start-with-ngrok.bat**:
```batch
@echo off
echo Starting React app...
start cmd /k "npm start"
timeout /t 10
echo Starting ngrok...
start cmd /k "ngrok http 3000"
echo Both services are starting!
pause
```

## Security Note

⚠️ **Important**: When using ngrok, your local development server is exposed to the internet. Only share the ngrok URL with trusted people. Don't expose production servers or sensitive data through ngrok.

## Stopping the Services

1. **Stop React app**: Press `Ctrl+C` in the terminal running `npm start`
2. **Stop ngrok**: Press `Ctrl+C` in the terminal running `ngrok`

## Next Steps

- Test your website on mobile devices using the ngrok URL
- Share with clients or team members for feedback
- Use ngrok web interface to inspect API requests and responses
- Set up webhooks for testing (if your app has backend integration)

---

**Need Help?** Visit [https://ngrok.com/docs](https://ngrok.com/docs) for more information.

