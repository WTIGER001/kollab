# User Guide: Attachments & Media Previews

Kollab supports uploading files and attachments directly into your documents. For supported formats like Office documents (Word, Excel, PowerPoint), CAD drawings, and PDFs, Kollab will automatically generate a high-fidelity inline preview.

---

## 📎 How to Upload Attachments

You can upload files to your document in three ways:
1. **Drag and Drop**: Drag a file from your computer and drop it directly onto the editor canvas.
2. **Slash Command**: Type `/attachment` or `/file` on a new line and press **Enter** to open the file picker.
3. **Pasting**: Copy a file from your clipboard and paste it directly into the editor.

---

## 👁️ Document Previews

When you upload an office document (like a `.docx` or `.pptx`), Kollab sends the file to the dedicated Media Preview Service for processing.

1. **Processing State**: While the file is processing, you will see an animated loading indicator showing "Converting...".
2. **Interactive Preview**: Once completed, the file will be rendered as a fully interactive inline preview directly within your page. You can scroll through pages, zoom in/out, and read the document without ever downloading it.
3. **Downloading**: You can download the original, unmodified source file at any time by clicking the **Download** button on the top right corner of the attachment card.

### Supported Preview Formats
*   **Word Documents**: `.docx`, `.doc`
*   **Spreadsheets**: `.xlsx`, `.xls`
*   **Presentations**: `.pptx`, `.ppt`
*   **Vector/CAD Files**: `.dwg`, `.dxf`
*   **Images**: `.png`, `.jpg`, `.gif`, `.webp`

---

## ⚙️ Server Configuration

If you are a Workspace Administrator, you can configure the Media Preview Engine via the **Server Settings** page:
1. Click your profile icon and open **Server Settings**.
2. Navigate to the **Integrations** tab.
3. Under the **Aspose Media Engine** section, you can toggle the preview engine on or off.
4. If you have a commercial Aspose license XML file, you can upload it here to remove any trial watermarks from generated previews.
