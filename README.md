# 📸 Diarytime

A modern, web-based photo booth application that allows users to capture photos with selectable backgrounds and multiple template formats.

## Features

✨ **Core Features:**
- 📷 Real-time camera capture using WebRTC
- 🎨 Multiple background options (solid colors, gradients, custom upload)
- 📋 3 vertical template formats:
  - Single photo (1x1)
  - Three-photo strip (1x3 vertical)
  - Four-photo strip (1x4 vertical)
- 👁️ **Preview before download** - See your final photo strip before saving
- ✏️ Edit captured photos (replace/delete)
- 💾 Download photo strips as PNG images
- 📱 Responsive design for mobile and desktop
- 🎭 Modern UI with smooth animations

## Getting Started

### Prerequisites
- Modern web browser with camera access (Chrome, Firefox, Safari, Edge)
- WebRTC support enabled in browser

### Installation

1. **Clone or download the project:**
   ```bash
   git clone <repository-url>
   cd project_diarytime
   ```

2. **Open in browser:**
   - Simply open `index.html` in a modern web browser
   - OR use a local server:
     ```bash
     # Using Python 3
     python -m http.server 8000
     
     # Using Python 2
     python -m SimpleHTTPServer 8000
     
     # Using Node.js (if http-server installed)
     http-server
     ```

3. **Grant camera permissions:**
   - Allow camera access when prompted by the browser

## Usage

### Capturing Photos

1. **Select Background:**
   - Click one of the preset background buttons (Solid Blue, Red, Green, Gradient)
   - OR click "Upload" to select a custom background image

2. **Choose Template:**
   - Select your desired photo template (1, 2, 3, or 4 photos)
   - The maximum number of photos you can capture depends on the template

3. **Capture Photos:**
   - Click the "📷 Capture" button to take a photo
   - Repeat until you've captured all photos for your template
   - You can replace or delete photos using the controls

4. **Preview:**
   - Click the "👁️ Preview" button to see your final photo strip
   - Verify everything looks good before downloading

5. **Download:**
   - Click "💾 Download" from the preview or main screen
   - Your photo strip will be saved as a PNG image

6. **Reset:**
   - Click "🔄 Reset" to start over with a new photo booth session

## Project Structure

```
project_diarytime/
├── index.html          # Main HTML file with UI structure
├── css/
│   └── style.css       # Styling and responsive design
├── js/
│   └── photobooth.js   # Photo booth logic and camera handling
└── assets/             # Placeholder for future assets
```

## Technical Details

### Technologies Used
- **HTML5:** Semantic markup and Canvas API
- **CSS3:** Flexbox, Grid, animations, gradients
- **JavaScript:** MediaDevices API, Canvas API, FileReader API
- **WebRTC:** Real-time camera access

### Key JavaScript Classes/Methods

**PhotoBooth Class:**
- `setupCamera()` - Initializes camera stream
- `capturePhoto()` - Captures frame from video stream
- `handleBackgroundChange()` - Switches background style
- `handleTemplateChange()` - Switches photo template
- `generatePhotoStrip()` - Generates final composite image
- `showPreview()` - Displays preview modal
- `closePreview()` - Closes preview modal
- `downloadPhotoStrip()` - Downloads photo as PNG

## Browser Support

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome  | ✅ Full | Best compatibility |
| Firefox | ✅ Full | Works well |
| Safari  | ✅ Full | iOS 14.5+ for camera |
| Edge    | ✅ Full | Chromium-based |
| IE 11   | ❌ No   | No WebRTC support |

## Features in Detail

### Backgrounds
1. **Solid Colors** - Blue, Red, Green backgrounds
2. **Gradient** - Purple to blue gradient
3. **Custom Upload** - Upload your own background image

### Templates

| Template | Photos | Layout |
|----------|--------|--------|
| Single   | 1      | Full frame |
| Three-Vertical | 3    | Vertical stack |
| Four-Vertical | 4     | Vertical stack |

### Photo Controls
- **↻ Replace** - Remove and retake the photo
- **✕ Delete** - Remove the photo from strip
- **Upload Background** - Add custom background image

## Troubleshooting

### Camera Not Working
- Check browser permissions (Settings → Privacy → Camera)
- Ensure HTTPS if accessing remotely
- Try a different browser
- Check if camera is being used by another application

### Can't Upload Background
- Ensure file is an image (JPG, PNG, GIF, etc.)
- File size should be reasonable (<10MB)
- Check browser's file upload permissions

### Download Not Working
- Check browser's download settings
- Ensure pop-ups aren't blocked
- Try a different browser if issue persists

## Future Enhancements

- 🎬 Video recording support
- 🖼️ Custom frame overlays and borders
- ✨ Photo filters and effects
- 📸 Multiple camera support
- 🎨 More background templates
- 💫 Sticker/emoji overlays
- 🔊 Sound effects on capture
- 📤 Direct social media sharing
- 🖨️ Print-ready layouts

## Performance Tips

- Use solid colors or simple gradients for faster rendering
- Keep custom background images compressed
- Use modern browser for best performance
- Close other browser tabs for smooth camera streaming

## License

This project is open source and available for personal and commercial use.

## Support

For issues or feature requests, please check the browser console for error messages (F12 or right-click → Inspect).

---

**Made with ❤️ for photo booth enthusiasts!**
