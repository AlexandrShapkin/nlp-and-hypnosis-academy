# Media and brand editing: maintainer guide

All image tasks are completed in the authenticated CMS at `http://localhost:8080/admin`. No file paths, internal media IDs, shell commands or code edits are needed.

## Uploading images

Open **Media library** (`/admin/media`). Choose a JPEG, PNG or WebP image smaller than 5 MB. Supply clear **alternative text** describing the image, and provide credit/license information when relevant. Click **Upload image**.

The file is optimized and stored in `public/uploads`; its metadata is saved in SQLite. The media library can search images by description, caption or credit. You can edit these descriptions here later.

You can also choose **Upload and select** inside any visual image picker in the page editor, card editor, site settings or SEO settings. This uploads the image to the same media library and selects it in the current draft; **save the editor** to retain the new reference.

## Placing multiple photos in a section

1. Open **Pages & sections** (`/admin/pages`) and select the homepage or another page.
2. Expand the section you want to edit.
3. Use **Featured section image** to select one main image (especially for hero and about sections).
4. Use **Additional section images** to open the visual library and choose any number of photos. In a `media_gallery` section this control is called **Gallery images**.
5. Selected images appear as thumbnails. Use **↑ / ↓** to order them, and **Remove** to unlink an image from the section.
6. Click **Save draft**, open **Preview saved draft on site**, then **Publish**. Draft changes do not update the public website until published.

Images added to a section are rendered in a responsive image grid. Removing an image from a section does **not** delete it from the media library.

## Card images and placement

Open **Cards & reusable content** (`/admin/cards`), select a card and use **Card images** to choose and reorder its photos. The first image is the card thumbnail on the homepage; all selected images appear on its detail page. Choose **Place card in section** to attach it to a named homepage section instead of typing a section ID. Save and publish.

## Logo and browser icon

Open **Site settings** (`/admin/settings`). Under **Brand images**:

- **Header logo**: logo shown next to the brand label on light backgrounds.
- **Footer logo**: optional alternative for the dark footer.
- **Browser tab icon (favicon)**: preferably a square image.

Choose an existing image visually or upload and select a new one. Then click **Save settings**. If a header or footer logo is not chosen, the original brand symbol is used. The text next to it is controlled by **Header brand label**.

Raster logos are supported (PNG, JPEG or WebP); files are transformed to WebP by the upload pipeline. Do not upload SVG files with untrusted scripting.

## Social sharing images

Use **Search metadata & indexing → Social sharing image** in Pages, Cards or global Site settings. Pick an image visually; no media ID must be copied.

## Safety and troubleshooting

- Uploads are private administrative operations. A media file is only referenced on public pages when the relevant content is published, or when site settings are saved.
- Images in use by content, logos, favicon or SEO settings cannot be deleted from the media library. Remove references first.
- All photos need meaningful alternative text and approved usage rights.
- Uploads and SQLite must both be included in deployment backups.
- If an image does not appear publicly, check that the page/card is published, not just saved as a draft.
