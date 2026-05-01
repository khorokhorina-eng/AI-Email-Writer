# AI Email Writer

Browser extension prototype for generating email drafts from short prompts.

## Current scope

- Side panel UI based on the `pdf text to speech` extension shell
- Three modes: `Write`, `Reply`, `Rewrite`
- Prompt-based subject and body generation
- Insert generated text into the currently focused editable field on any web page

## Local loading

1. Open `chrome://extensions`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select `/Users/n.khorokhorina/AI Email Writer`

## Notes

- This is currently a local MVP.
- Email generation is heuristic in `popup.js`; it is not yet connected to a real AI backend.
- Some inherited template files from the PDF project still remain in the repo for later cleanup or reuse.
