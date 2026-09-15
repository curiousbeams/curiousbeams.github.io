# Curious Beams Landing Content

This project stores the MyST Markdown content that powers the Curious Beams research site.

## Editing Content

1. Update the relevant `.md` page(s) with your changes.
2. If you add a new page, remember to update the table of contents in `curvenote.yml` (`project.toc`) so the file is included in builds and navigation.
3. Run the following commands to update the landing page content:
    ```bash
    curvenote work push --public -y
    curvenote site init curious-beams --set-content
    ```