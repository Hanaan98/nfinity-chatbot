# Changelog

## [Unreleased] - 2025-10-27

### ✨ Added - Image Upload Feature

#### New Features
- **Complete image upload workflow** with Cloudinary integration
- **Real-time upload progress** indicators
- **Image preview** before sending
- **Error handling** for upload failures
- **Validation** for file types and sizes

#### Modified Files

**`src/api/chatClient.js`**
- Added `uploadImage(file)` function to upload images to `/upload/images` endpoint
- Updated `sendChat(message, imageUrls)` to accept optional imageUrls array
- Enhanced error handling for upload failures
- Added 30-second timeout for image uploads

**`src/components/ChatInput.jsx`**
- Added `isUploading` state for upload progress tracking
- Modified `handleFormSubmit` to upload images before sending messages
- Updated UI to show "Uploading image..." placeholder
- Disabled inputs during upload process
- Store both Cloudinary URL (for backend) and preview URL (for display)
- Enhanced error messages for upload failures

**`src/components/ChatMessage.jsx`**
- Updated to use `previewUrl` for immediate display
- Fallback to Cloudinary `url` if preview not available
- Maintained existing image error handling

#### How It Works

1. **User selects image** → Local preview shown immediately
2. **User clicks send** → Image uploads to Cloudinary
3. **Upload completes** → Cloudinary URL received
4. **Message sent** → Chat message includes imageUrls array
5. **AI processes** → Backend receives message + image URLs

#### Technical Details

**Upload Flow:**
```
File Selection → Preview → Upload to /upload/images → Get URL → Send to /chat
```

**API Integration:**
- Upload: `POST /upload/images` (multipart/form-data)
- Chat: `POST /chat` (with imageUrls array)

**Validation:**
- Max file size: 10 MB
- Allowed types: JPEG, PNG, GIF, WebP
- Upload timeout: 30 seconds
- Chat timeout: 65 seconds

#### UI/UX Improvements

**Loading States:**
- "Uploading image..." - during Cloudinary upload
- "Sending..." - during chat API call
- Disabled inputs during both states

**Error Handling:**
- File validation errors shown immediately
- Upload failures display error message
- Retry option available on failure

**User Feedback:**
- Image preview with file name and size
- Remove image button (X) before sending
- Progress indicators (pulse animation)

#### Testing Notes

**Test Scenarios:**
1. Upload single image with text message ✅
2. Upload image without text (sends "Image uploaded") ✅
3. File too large (shows error) ✅
4. Invalid file type (shows error) ✅
5. Upload failure handling (shows error with retry) ✅
6. Multiple sequential uploads ✅

**Backend Integration:**
- Works with existing `/upload/images` endpoint
- Compatible with `/chat` endpoint's imageUrls parameter
- AI can access and process image URLs
- Images included in support ticket attachments

#### Documentation Added

- `IMAGE_UPLOAD_IMPLEMENTATION.md` - Complete implementation guide
- `CHANGELOG.md` - This file

#### Configuration Required

**`.env` file:**
```
VITE_API_BASE=http://localhost:3000
VITE_HTTP_TIMEOUT_MS=60000
```

**Backend must have:**
- Cloudinary credentials configured
- `/upload/images` endpoint active
- `/chat` endpoint accepting imageUrls

---

## Previous Changes

(No previous changelog entries)
