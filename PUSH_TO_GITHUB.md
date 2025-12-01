# How to Push Your Project to GitHub

Follow these steps to push your Softica Labs website to GitHub.

## Prerequisites

1. **Git installed** on your computer
   - Check if installed: `git --version`
   - Download from: [https://git-scm.com/download/win](https://git-scm.com/download/win)

2. **GitHub account** created
   - Sign up at: [https://github.com/signup](https://github.com/signup)

## Step 1: Initialize Git Repository

Open PowerShell in your project directory and run:

```powershell
git init
```

## Step 2: Add All Files

```powershell
git add .
```

## Step 3: Create Initial Commit

```powershell
git commit -m "Initial commit: Softica Labs website"
```

## Step 4: Create Repository on GitHub

1. Go to [https://github.com/new](https://github.com/new)
2. **Repository name**: `softica-labs` (or any name you prefer)
3. **Description**: "Softica Labs - Innovative Digital Solutions Website"
4. Choose **Public** or **Private**
5. **DO NOT** initialize with README, .gitignore, or license (we already have these)
6. Click **Create repository**

## Step 5: Connect Local Repository to GitHub

After creating the repository, GitHub will show you commands. Use these:

```powershell
git remote add origin https://github.com/YOUR_USERNAME/softica-labs.git
```

Replace `YOUR_USERNAME` with your actual GitHub username.

## Step 6: Push to GitHub

```powershell
git branch -M main
git push -u origin main
```

If prompted for credentials:
- **Username**: Your GitHub username
- **Password**: Use a Personal Access Token (not your GitHub password)

### Creating a Personal Access Token

If you need to create a token:

1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a name (e.g., "Softica Labs Project")
4. Select scopes: **repo** (full control of private repositories)
5. Click "Generate token"
6. **Copy the token immediately** (you won't see it again)
7. Use this token as your password when pushing

## Alternative: Using SSH (Recommended for Frequent Use)

### Set Up SSH Key

1. Generate SSH key:
```powershell
ssh-keygen -t ed25519 -C "your_email@example.com"
```
Press Enter to accept default location.

2. Add SSH key to GitHub:
   - Copy your public key: `cat ~/.ssh/id_ed25519.pub`
   - Go to GitHub → Settings → SSH and GPG keys → New SSH key
   - Paste the key and save

3. Use SSH URL instead:
```powershell
git remote add origin git@github.com:YOUR_USERNAME/softica-labs.git
```

## Step 7: Verify

Go to your GitHub repository page. You should see all your files!

## Future Updates

After making changes to your code:

```powershell
git add .
git commit -m "Description of your changes"
git push
```

## Quick Reference Commands

```powershell
# Check status
git status

# See what files changed
git diff

# Add specific file
git add filename.js

# Commit changes
git commit -m "Your commit message"

# Push to GitHub
git push

# Pull latest changes (if working with others)
git pull
```

## Troubleshooting

### Issue: "fatal: remote origin already exists"
**Solution**: Remove and re-add:
```powershell
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/softica-labs.git
```

### Issue: "Permission denied"
**Solution**: 
- Check your GitHub username
- Use Personal Access Token instead of password
- Or set up SSH keys

### Issue: "Large files" error
**Solution**: Make sure `node_modules` is in `.gitignore` (it already is)

### Issue: Want to exclude batch files
If you don't want to commit the `.bat` files, add to `.gitignore`:
```
*.bat
```

## What Gets Pushed

✅ **Will be pushed:**
- All source code (`src/` folder)
- Configuration files (`package.json`, etc.)
- Public assets (`public/` folder)
- Documentation (`.md` files)
- Batch scripts (`.bat` files)

❌ **Will NOT be pushed** (thanks to `.gitignore`):
- `node_modules/` folder
- `.env` files
- Build files
- IDE settings

## Next Steps After Pushing

1. **Add a description** to your GitHub repository
2. **Add topics/tags** like: `react`, `website`, `portfolio`, `softica-labs`
3. **Enable GitHub Pages** (optional) to host your site:
   - Go to Settings → Pages
   - Source: Deploy from a branch
   - Branch: `main` / `root`
   - Save

---

**Need Help?** Visit [GitHub Docs](https://docs.github.com) for more information.

