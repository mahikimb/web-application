# How to Add Logo and Team Images

## 📁 Folder Structure

Your images should be placed in the `public/images/` folder:

```
public/
  images/
    logo/
      logo.png (or .svg, .jpg)
    team/
      sarah-johnson.jpg (or .png)
      michael-chen.jpg
      emily-rodriguez.jpg
      david-kim.jpg
      joseph-mwaka.jpg
      lucas-mahikimba.jpg
```

## 🎨 Adding Your Logo

1. **Find your logo image file** on your computer
2. **Copy it** to: `public/images/logo/`
3. **Rename it** to one of these:
   - `logo.png` (recommended)
   - `logo.svg`
   - `logo.jpg`

**Recommended logo specifications:**
- Format: PNG or SVG (with transparent background)
- Size: At least 200x200 pixels
- The logo will automatically scale to fit

## 👥 Adding Team Profile Pictures

1. **Find your team member photos** on your computer
2. **Copy them** to: `public/images/team/`
3. **Rename each file** using this naming convention:
   - `sarah-johnson.jpg` (or .png)
   - `michael-chen.jpg`
   - `emily-rodriguez.jpg`
   - `david-kim.jpg`
   - `joseph-mwaka.jpg`
   - `lucas-mahikimba.jpg`

**Recommended photo specifications:**
- Format: JPG or PNG
- Size: 400x400 pixels (square images work best)
- All photos should be the same size for consistency
- Use professional headshots with good lighting

## ✅ How It Works

- **Logo**: The component will automatically try to load `logo.png` first, then `logo.svg`, then `logo.jpg`. If none are found, it shows the default SVG logo.

- **Team Photos**: The component will try to load `.jpg` first, then `.png`. If an image is not found, it will show an emoji placeholder.

## 🚀 After Adding Images

1. Save your image files in the correct folders
2. Restart your development server if it's running:
   ```bash
   # Stop the server (Ctrl+C) and restart:
   npm start
   ```
3. The images should now appear on your website!

## 📝 Notes

- File names are case-sensitive - make sure they match exactly
- Supported formats: PNG, JPG/JPEG, SVG
- Images in the `public` folder are served directly and don't need to be imported in code
- If you want to use different file names, you'll need to update the component code

