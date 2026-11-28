# StudyVault

## Run locally

Use a recent Node.js LTS release. Configure Google OAuth before signing in:

1. In Google Cloud Console, enable the Google Drive API, create an OAuth 2.0 **Web application** client, and add `http://localhost:5173` as both an authorized JavaScript origin and an authorized redirect URI.
2. Copy `backend/.env.example` to `backend/.env` and set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and a long random `JWT_SECRET`. Keep `GOOGLE_REDIRECT_URI=http://localhost:5173` for the local frontend.
3. Copy `frontend/.env.example` to `frontend/.env` and set `VITE_CLIENT_ID` to the same client ID. Keep `VITE_API_URL=http://localhost:3000/api`.
4. Create a Gemini API key in [Google AI Studio](https://aistudio.google.com/apikey) and add `GEMINI_API_KEY=<your-key>` to `backend/.env`. This is separate from the Google OAuth client secret.
5. In a terminal, start the backend:

   ```powershell
   cd backend
   npm install
   npm run dev
   ```

6. In a second terminal, start the frontend:

   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

Open the URL Vite prints, usually `http://localhost:5173`.

The backend listens on port `3000`. If you change either port, update the frontend API URL and backend `FRONTEND_URL` to match.

## Revision / Exam Mode

Open **Revision / Exam Mode** and select **Build / refresh index** after saving materials. The app reads files stored in this browser and the signed-in user's `Study_Vault` Google Drive folder. Text extraction happens in the browser; text is sent to Gemini to create embeddings and the local vector index stays in this browser, separated by Google account. Study questions send relevant excerpts to Gemini for grounded answers and citations. General chat sends the conversation to Gemini without retrieving study files.

Indexing supports PDF, DOCX, PPTX, TXT, Markdown, CSV, and images via OCR. Legacy DOC/PPT files need conversion. Rebuild the index after changing study materials.

## Local file previews

Open a saved file from a unit to route it to the matching local viewer:

- `/pdf/:lid` uses `react-pdf` to render PDF pages.
- `/docx/:lid` renders document pages locally with `docx-preview` and provides page navigation, zoom, and rotation. Page breaks use the DOCX file's stored break markers; the renderer does not dynamically repaginate text, so its page count can differ from Word when those markers are absent.
- `/pptx/:lid` renders `.pptx` files locally with `pptx-viewer` and legacy `.ppt` files with `@file-viewer/ppt`. Scroll the mouse wheel over the viewer to move between slides; both also show slide navigation controls. Legacy PPT parsing runs in a browser worker. Older PowerPoint formats have limited fidelity, and unsupported legacy effects may not render.
- `/image/:lid` uses the browser's image renderer with zoom and rotation controls; no image-rendering dependency is required.

Each route loads its file by `lid` from IndexedDB through `subjectService.getFileByLid`. `UnitPage` selects the route from the file MIME type, falling back to the filename extension when needed, and opens the viewer in a new tab. Legacy `.doc` files must be converted to `.docx`; legacy `.ppt` files are supported by the local PowerPoint 97–2003 renderer.
