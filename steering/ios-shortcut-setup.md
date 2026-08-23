# iOS Shortcut — Instagram to MISE Import

Share any Instagram recipe post directly from your phone to import it into your MISE library.

## Prerequisites

- Your MISE app deployed to Vercel (or running publicly)
- `IMPORT_API_TOKEN` set in your environment variables
- `ADMIN_EMAIL` set to your account email

## Create the Shortcut

1. Open **Shortcuts** app on your iPhone
2. Tap **+** to create a new shortcut
3. Name it: **Import to MISE**

### Configure Share Sheet Trigger

4. Tap the **ⓘ** (info) icon at the bottom
5. Enable **Show in Share Sheet**
6. Under "Share Sheet Types", select **URLs** only

### Add Actions

7. Add action: **Get URLs from Input**
   - This extracts the URL when sharing from Instagram

8. Add action: **Get Contents of URL**
   - Configure as:
     - **Method**: POST
     - **URL**: `https://YOUR-APP.vercel.app/api/import-instagram`
     - **Headers**:
       - `Authorization`: `Bearer YOUR_IMPORT_API_TOKEN`
       - `Content-Type`: `application/json`
     - **Request Body** (JSON):
       ```json
       {
         "url": "URLs"  ← tap this and select the "URLs" variable from step 7
       }
       ```

9. Add action: **Get Dictionary Value**
   - Get value for key: `title` from the previous result

10. Add action: **Show Notification**
    - Title: `Recipe Imported`
    - Body: Select the dictionary value (title) from step 9

### (Optional) Error Handling

11. Add action: **If**
    - Condition: "Get Dictionary Value" for key `error` from step 8 **has any value**
    - Then: **Show Notification** with title "Import Failed" and body set to the error value

## Usage

1. Open Instagram
2. Find a recipe post
3. Tap the **Share** button (paper plane icon)
4. Scroll the share sheet and tap **Import to MISE**
5. Wait 5-10 seconds for the notification confirming the import
6. Recipe appears in your MISE Library

## Generating Your Token

Run this in your terminal to generate a secure token:

```bash
openssl rand -hex 32
```

Add the result to your Vercel environment:
```
IMPORT_API_TOKEN=your-generated-token
```

Then use the same token in step 8 above.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Unauthorized" | Check your bearer token matches `IMPORT_API_TOKEN` in Vercel env |
| "Invalid Instagram URL" | Make sure you're sharing the post link, not a story or profile |
| "Could not extract content" | The post may be from a private account |
| "No recipe found" | The post doesn't contain recipe-like content |
| Notification doesn't appear | Check Shortcuts has notification permissions in Settings |

## How It Works

```
Instagram Share → iOS Shortcut → POST /api/import-instagram
  → Scrape post (oEmbed/meta tags)
  → Claude extracts structured recipe
  → Save to Supabase → Appears in Library
```

## Supported Post Types

- ✅ Single-image posts with recipe in caption
- ✅ Carousel posts (first image + caption)
- ✅ Reels with recipe in caption
- ⚠️ Posts where recipe is only in images (Phase 4 — vision OCR)
- ❌ Stories (ephemeral, can't be shared via URL)
- ❌ Private accounts
