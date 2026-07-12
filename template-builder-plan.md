Plan to expand TemplatesView.tsx:
1. Support Categories: MARKETING, UTILITY, AUTHENTICATION
2. If AUTHENTICATION: 
   - Ask for Auth Type: ZERO_TAP / COPY_CODE
   - Pre-fill body and buttons accordingly (Meta requires strict formats for AUTH templates).
3. If MARKETING / UTILITY:
   - Header: None, Text, Image, Video, Document.
   - Body: Text (with vars).
   - Footer: Text.
   - Buttons: Array of buttons. Types:
     - Quick Reply (Custom text)
     - Call To Action: URL, Phone Number
4. Preview: Update the preview visually to show the media headers and various buttons.
