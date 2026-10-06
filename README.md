<div align\="center">

# J-Card Maker

### A free online studio for cassette J-cards, tape labels, and mixtape artwork.

Design it in your browser. Arrange it on the page. Print it at home.

[![Free](https://img.shields.io/badge/price-free-197c68?style=flat-square)](#)
[![Runs in your browser](https://img.shields.io/badge/runs-in%20your%20browser-5265a5?style=flat-square)](#)
[![No account required](https://img.shields.io/badge/account-not%20required-8a5b9b?style=flat-square)](#)

<br>

![Illustration of a cassette and custom J-card artwork](assets/readme-banner.svg)

<br>

**Make a cassette cover worth rewinding for.**

</div>

***

Looking for a **J-card maker**, **cassette J-card template**, **cassette cover designer**, or **cassette label maker**? Create custom artwork for mixtapes, demos, independent releases, and personal collections—right in your browser.

## Make it yours

| 🎨 Design                                                                                                                               | 🧩 Arrange                                                                                                                                      | 🖨️ Print                                                                                                             |
| :-------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------- |
| Customize the J-card front and back, plus both cassette labels. Add artwork, text, tracklists, barcodes, logos, and production details. | Add colored shapes, crop and position images, reorder layers, adjust label bevels, and use canvas zoom, dark mode, grids, and alignment guides. | Preview the folded J-card and both labels on A4. Move items manually or auto-pack them, then export a multi-page PDF. |

### Made for the little details

* **Get a feel for the final piece:** inspect your design in an interactive 3D cassette and case preview.
* **Keep your layout in control:** drag artwork layers forward or backward, and use alignment guides as you position them.
* **Tune your labels:** set bevel size and choose top and/or bottom corners.
* **Start quickly:** use the built-in interactive tutorial, then keep creating at your own pace.
* **Save your work:** store a project in this browser or share/download a JSON snapshot.

## Start designing

If you are visiting the live GitHub Pages site, the editor is ready to use—no sign-up, installation, or paid subscription.

To run it locally:

1. Download or clone this repository.
2. Open `index.html` in a current desktop browser.
3. For the most reliable behavior, serve the project folder with a local static web server.

The app is a static site; it has no build step or application backend.

## From blank tape to print

1. Enter an album and artist name, then edit the Side A and Side B tracklists.
2. Add text, artwork, shapes, logos, or production details. Drag items on the canvas to position them.
3. Select **Save** to keep the project in this browser, or **Share project** to create a JSON snapshot.
4. Select **Export** to open the print preview.
5. Turn on **Manual placement** to move the J-card and labels, or choose **Auto-pack page** to restore the suggested layout.
6. Select **Save to PDF** in the preview.

## Print it right

The PDF uses **A4 landscape** pages. Page 1 places the folded J-card and both cassette labels together; additional pages show front and back reference artwork.

For accurate sizing, choose **100% / Actual size** in your print dialog and turn off “Fit to page.” Printer margins vary, so make a test print before printing multiple copies. Check the preview for overlaps and page placement before exporting.

## Host it free with GitHub Pages

J-Card Maker can be served as a static website:

1. Create a GitHub repository and add the project files. Keep `index.html`, `css/`, `js/`, and `assets/` in their existing relative locations.
2. Open the repository's **Settings → Pages**.
3. Under **Build and deployment**, select **Deploy from a branch**, choose the branch and repository root (`/`), then save.
4. When publishing finishes, open the URL shown in the Pages settings.

There is no server or database to maintain. Hosting providers can change their usage limits and terms, so check the current GitHub Pages documentation before publishing.

## Privacy & internet connection

* Your design is edited in the browser. **Save** stores project data in local storage in that browser on that device.
* **Share project** creates a JSON snapshot for you to download or share. Keep a separate backup of work you care about.
* PDF export loads jsPDF from cdnjs; the 3D preview loads Three.js from cdnjs; interface fonts load from Google Fonts. These features need an internet connection unless the libraries and fonts are hosted locally.
* Avoid putting sensitive information in artwork or project files you share publicly.

## Help people find it

**Suggested repository description**

> Free online cassette J-card maker and cassette label designer. Create custom cassette artwork and export A4 print-ready PDF pages.

**Suggested GitHub topics**

`j-card-maker` · `cassette` · `cassette-tape` · `j-card` · `cassette-artwork` · `label-maker` · `printable-template` · `web-app`

**Search phrases:** free J-card maker, online cassette J-card maker, cassette J-card template, cassette cover maker, cassette artwork editor, cassette insert designer, cassette label maker, cassette tape cover design, mixtape cover maker, printable cassette labels.

> Search engines determine rankings independently, so no README can guarantee the top result. A descriptive project name, a working live demo link, useful documentation, and relevant GitHub topics all help people discover the project.
