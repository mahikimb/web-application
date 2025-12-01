# How to Add Project Videos

## 📹 Adding Video URLs to Projects

The portfolio section now supports video popups for each project. Here's how to add your video URLs:

### Step 1: Get Your Video Embed URL

#### For YouTube Videos:
1. Go to your YouTube video
2. Click "Share" → "Embed"
3. Copy the `src` URL from the iframe code
4. Example: `https://www.youtube.com/embed/VIDEO_ID`

**Or manually:**
- Take your YouTube video URL: `https://www.youtube.com/watch?v=VIDEO_ID`
- Convert to embed format: `https://www.youtube.com/embed/VIDEO_ID`

#### For Vimeo Videos:
1. Go to your Vimeo video
2. Click "Share" → "Embed"
3. Copy the `src` URL from the iframe code
4. Example: `https://player.vimeo.com/video/VIDEO_ID`

**Or manually:**
- Take your Vimeo video URL: `https://vimeo.com/VIDEO_ID`
- Convert to embed format: `https://player.vimeo.com/video/VIDEO_ID`

### Step 2: Add URL to Portfolio Component

Open `src/components/Portfolio.js` and find the `projects` array. Add your video URL to the `videoUrl` field:

```javascript
{
  id: 1,
  title: 'E-Commerce Platform',
  description: 'A full-featured e-commerce solution...',
  image: '🛒',
  videoUrl: 'https://www.youtube.com/embed/YOUR_VIDEO_ID', // Add your video URL here
  videoDescription: 'Watch how we built a comprehensive e-commerce platform...'
}
```

### Step 3: Update Video Description (Optional)

You can also customize the `videoDescription` field to provide more context about the video.

## ✅ Example

```javascript
{
  id: 1,
  title: 'E-Commerce Platform',
  description: 'A full-featured e-commerce solution with payment integration...',
  image: '🛒',
  videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
  videoDescription: 'Watch how we built a comprehensive e-commerce platform with seamless payment processing and real-time inventory management.'
}
```

## 🎬 Features

- **Click any project card** to open the video modal
- **Responsive design** - works on all devices
- **Keyboard support** - Press `Escape` to close
- **Click outside** to close the modal
- **Smooth animations** for better user experience

## 📝 Notes

- If `videoUrl` is empty, the modal will show "Video coming soon"
- Videos are embedded using iframes for security
- Make sure your videos are set to "Public" or "Unlisted" on YouTube/Vimeo
- The modal automatically handles different video platforms

