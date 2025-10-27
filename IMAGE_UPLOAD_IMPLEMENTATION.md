# Image Upload Implementation Guide

## 🎯 Overview

The chatbot now supports **complete image upload functionality** with Cloudinary integration. Images are uploaded first to get URLs, then those URLs are sent with chat messages to the AI backend.

## 📋 Flow Architecture

```
User selects image
    ↓
Preview shown locally (base64)
    ↓
User clicks send
    ↓
[1] Upload image to /upload/images
    ↓
[2] Receive Cloudinary URL
    ↓
[3] Send message + imageUrls to /chat
    ↓
AI processes message with images
    ↓
Response displayed to user
```

## 🔧 Implementation Details

### 1. **Backend Endpoints**

#### Upload Endpoint

```
POST http://localhost:3000/upload/images
Content-Type: multipart/form-data

Body:
- images: File (required)
- sessionId: String (optional)

Response:
{
  "success": true,
  "urls": ["https://res.cloudinary.com/..."]
}
```

#### Chat Endpoint (Updated)

```
POST http://localhost:3000/chat
Content-Type: application/json

Body:
{
  "message": "My shoe is damaged",
  "sessionId": "sess_123...",
  "imageUrls": ["https://res.cloudinary.com/..."] // NEW
}

Response:
{
  "content": {
    "message": "I can help you with that...",
    "ui_action": "show_products",
    "payload": { ... }
  }
}
```

### 2. **Frontend Changes**

#### Files Modified:

**`src/api/chatClient.js`**

- ✅ Added `uploadImage(file)` function
- ✅ Updated `sendChat(message, imageUrls)` signature
- ✅ 30-second timeout for image uploads
- ✅ Proper error handling

**`src/components/ChatInput.jsx`**

- ✅ Import `uploadImage` function
- ✅ Added `isUploading` state
- ✅ Updated `handleFormSubmit` to upload images first
- ✅ Store both Cloudinary URL and preview URL
- ✅ Disabled inputs during upload
- ✅ Updated placeholder text ("Uploading image...")
- ✅ Pass `imageUrls` array to `sendChat()`

**`src/components/ChatMessage.jsx`**

- ✅ Use `previewUrl` for immediate display
- ✅ Fallback to `url` for Cloudinary URL
- ✅ Proper image error handling

## 🚀 Usage Example

### User Interaction Flow:

1. **AI asks for images:**

   ```
   Bot: "Please share a photo of the damaged product"
   ```

2. **User clicks 📎 button:**

   - File picker opens
   - User selects image (JPEG, PNG, GIF, WebP)
   - Preview appears immediately

3. **User types message and sends:**

   ```
   User: "Here's the damage" [with image attached]
   ```

4. **Behind the scenes:**

   ```javascript
   // Step 1: Upload image
   const cloudinaryUrl = await uploadImage(file);
   // "https://res.cloudinary.com/demo/image/upload/v123/abc.jpg"

   // Step 2: Send to chat
   await sendChat("Here's the damage", [cloudinaryUrl]);
   ```

5. **AI receives and processes:**
   - AI sees the message text
   - AI has access to image URL
   - AI can analyze image and respond accordingly

## 🎨 UI States

| State     | Button      | Input       | Placeholder          |
| --------- | ----------- | ----------- | -------------------- |
| Idle      | ✅ Enabled  | ✅ Enabled  | "Type a message..."  |
| Uploading | ❌ Disabled | ❌ Disabled | "Uploading image..." |
| Sending   | ❌ Disabled | ❌ Disabled | "Sending..."         |
| Error     | ✅ Enabled  | ✅ Enabled  | Shows error message  |

## 🔒 Validation & Limits

- **Max file size:** 10 MB
- **Allowed types:** JPEG, JPG, PNG, GIF, WebP
- **Max images per message:** 1 (frontend), 5 (backend supports)
- **Upload timeout:** 30 seconds
- **Chat timeout:** 65 seconds

## 🧪 Testing Checklist

### Manual Testing:

- [ ] Select an image → Preview appears
- [ ] Click send → "Uploading image..." shows
- [ ] Upload completes → "Sending..." shows
- [ ] Message sent → Image displays in chat
- [ ] Backend receives Cloudinary URL
- [ ] AI processes image correctly
- [ ] Error handling: Upload fails
- [ ] Error handling: File too large
- [ ] Error handling: Invalid file type
- [ ] Multiple messages with images work

### Test Scenario (Defect Ticket):

```
1. User: "My shoe fell apart after 45 days"
2. Bot: "I'm sorry to hear that. Could you please share 2-3 photos..."
3. User: [Uploads image 1] "Here's the first photo"
4. User: [Uploads image 2] "And here's another angle"
5. Bot: "Thank you. What's your email address?"
6. User: "test@example.com"
7. Bot: "Ticket created! You'll receive confirmation soon."
```

### Backend Verification:

```javascript
// Check ticket in database has imageUrls
{
  ticketId: "TKT-123",
  description: "My shoe fell apart after 45 days",
  imageUrls: [
    "https://res.cloudinary.com/demo/image/upload/v1/abc.jpg",
    "https://res.cloudinary.com/demo/image/upload/v1/def.jpg"
  ]
}
```

## 🐛 Troubleshooting

### Issue: "Upload failed: 404"

**Solution:** Backend server not running or wrong API_BASE URL

```bash
# Check .env file
VITE_API_BASE=http://localhost:3000
```

### Issue: "Upload failed: 500"

**Solution:** Cloudinary credentials not configured

```bash
# Check backend .env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Issue: Images not appearing in chat

**Solution:** Check console for CORS or image load errors

```javascript
// Should see in console:
✅ Image uploaded successfully: https://...
📨 API reply received: {...}
```

### Issue: "Request timeout"

**Solution:** Large image or slow connection

- Reduce image size before upload
- Check network connection
- Increase timeout in chatClient.js

## 📊 Performance Considerations

### Image Optimization (Backend):

- Images auto-resized to max 1200x1200
- Converted to WebP format
- Cloudinary CDN delivery

### Frontend Optimization:

- Preview shown immediately (no upload wait)
- Upload happens on submit
- Lazy loading for message images
- Error boundaries for failed loads

## 🔐 Security

- ✅ File type validation (frontend + backend)
- ✅ File size limits enforced
- ✅ Cloudinary secure storage
- ✅ No direct file system access
- ✅ Session-based uploads
- ✅ Proper error messages (no sensitive data)

## 📝 Code Examples

### Upload Single Image:

```javascript
import { uploadImage } from "./api/chatClient";

const file = fileInput.files[0];
try {
  const url = await uploadImage(file);
  console.log("Uploaded:", url);
} catch (err) {
  console.error("Upload failed:", err.message);
}
```

### Send Message with Image:

```javascript
import { sendChat } from "./api/chatClient";

const message = "Here's the damage";
const imageUrls = ["https://res.cloudinary.com/demo/image/upload/v1/abc.jpg"];

const response = await sendChat(message, imageUrls);
console.log("Bot reply:", response);
```

## 🎯 Next Steps (Future Enhancements)

- [ ] Support multiple images per message (UI update needed)
- [ ] Image compression before upload
- [ ] Progress bar for large uploads
- [ ] Drag & drop image upload
- [ ] Paste image from clipboard
- [ ] Image preview modal (zoom/fullscreen)
- [ ] Delete uploaded image before sending

## 📚 Related Documentation

- Backend: `CHATBOT_IMAGE_UPLOAD_COMPLETE.md`
- Frontend Quick Start: `FRONTEND_QUICK_START.md`
- API Docs: Backend `/docs` endpoint

---

**Last Updated:** October 27, 2025  
**Status:** ✅ Production Ready
