# Fix Port 3000 Already in Use

If you see an error like "Something is already running on port 3000", here are several solutions:

## Solution 1: Use a Different Port (Easiest)

React allows you to specify a different port. You can either:

### Option A: Set Port in Environment Variable
Create a `.env` file in your project root:

```env
PORT=3001
```

Then run:
```powershell
npm start
```

### Option B: Use Command Line Flag
```powershell
set PORT=3001 && npm start
```

Or in PowerShell:
```powershell
$env:PORT=3001; npm start
```

### Option C: Modify package.json
Add this to your `package.json` scripts:
```json
"start": "set PORT=3001 && react-scripts start"
```

**Note**: If you change the port, update ngrok accordingly:
```powershell
ngrok http 3001
```

## Solution 2: Find and Stop the Process Using Port 3000

### Step 1: Find What's Using Port 3000

Open PowerShell as Administrator and run:

```powershell
netstat -ano | findstr :3000
```

This will show you something like:
```
TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING       12345
```

The last number (12345) is the Process ID (PID).

### Step 2: Stop the Process

```powershell
taskkill /PID 12345 /F
```

Replace `12345` with the actual PID from Step 1.

### Alternative: Using Get-NetTCPConnection (PowerShell)

```powershell
# Find the process
$connection = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($connection) {
    $processId = $connection.OwningProcess
    $process = Get-Process -Id $processId
    Write-Host "Port 3000 is being used by: $($process.ProcessName) (PID: $processId)"
    
    # Stop the process
    Stop-Process -Id $processId -Force
    Write-Host "Process stopped successfully!"
}
```

## Solution 3: Kill All Node Processes (Nuclear Option)

⚠️ **Warning**: This will close ALL Node.js applications running on your computer.

```powershell
taskkill /F /IM node.exe
```

## Solution 4: Check for Other React Apps

If you have multiple React projects, you might have another one running. Check:

1. **Other terminal windows** - Look for terminals running `npm start`
2. **Task Manager** - Press `Ctrl+Shift+Esc` and look for Node.js processes
3. **Browser tabs** - Check if you have `http://localhost:3000` open from another project

## Solution 5: Use a Port Finder Script

Create a file `find-port.ps1`:

```powershell
$port = 3000
$connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue

if ($connections) {
    Write-Host "Port $port is in use by:"
    foreach ($conn in $connections) {
        $process = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
        if ($process) {
            Write-Host "  - $($process.ProcessName) (PID: $($conn.OwningProcess))"
            Write-Host "    Path: $($process.Path)"
        }
    }
} else {
    Write-Host "Port $port is available!"
}
```

Run it with:
```powershell
powershell -ExecutionPolicy Bypass -File find-port.ps1
```

## Recommended Approach

**For Quick Testing**: Use Solution 1 (different port) - it's the fastest and doesn't disrupt other projects.

**For Permanent Fix**: Use Solution 2 to identify and stop the conflicting process.

## After Fixing

Once port 3000 is free (or you're using a different port):

1. Start your React app:
   ```powershell
   npm start
   ```

2. Start ngrok (use the correct port):
   ```powershell
   ngrok http 3000
   ```
   Or if you changed the port:
   ```powershell
   ngrok http 3001
   ```

## Update the Batch Script

If you're using `start-with-ngrok.bat`, you may need to update it to use a different port. Edit the file and change:

```batch
ngrok http 3000
```

To:

```batch
ngrok http 3001
```

(Or whatever port you're using)

