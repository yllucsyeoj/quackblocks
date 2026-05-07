# Generating the PDF Export Preview

The README references `assets/pdf-export-preview.png`. To generate it:

1. Open `examples/demo.md` in Obsidian with QuackBlocks enabled
2. Use **File → Export to PDF** (or Cmd+P → "Export to PDF")
3. Save the PDF as `examples/demo.pdf`
4. Convert the first page to a PNG image:

   ```bash
   # Using ImageMagick
   convert -density 150 examples/demo.pdf[0] -resize 1200x assets/pdf-export-preview.png

   # Using pdftoppm (poppler)
   pdftoppm -png -r 150 -f 1 -l 1 examples/demo.pdf assets/pdf-export-preview
   mv assets/pdf-export-preview-1.png assets/pdf-export-preview.png
   ```

5. Commit the image to the repo so the README renders correctly on GitHub
