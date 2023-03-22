# mailing.gruenetools.ch

Simple web tool to transform Webling export data into print-ready data for
mailings. Generates

- address line 1
- address line 2
- greeting formal
- greeting informal
- reference number (optional)

while respecting the user's language, and coping with missing data.

## Dev guide

### Getting started

1. Install [node 18](https://nodejs.org/)
1. Install [yarn](https://yarnpkg.com/getting-started/install)
1. Run `yarn install` to fetch all dependencies
1. Start dev server: `yarn run dev`

### The stack

This is a simple [React](https://react.dev/) single-page app written in
[Typescript](https://www.typescriptlang.org/) and built with
[Vite](https://vitejs.dev/). It uses no backend, no SSR etc. Just a plain simple
single-page app.

### Deps

- [SheetJS](https://docs.sheetjs.com/) for excel file processing
  [react-dropzone](https://react-dropzone.js.org/) for drag-and-drop file
- [iban](https://www.npmjs.com/package/iban) for IBAN validation
- [i18next](https://www.i18next.com/) and
  [i18next-browser-languageDetector](https://github.com/i18next/i18next-browser-languageDetector) for
  localization.

And of course React, Vite and Typescript 😅

### Deploy

```bash
# 0. Remove old build folder
rm -rf dist

# 1. Build the application
yarn run build

# 2. Copy the build folder to the server
rsync -avz --delete dist/ root@server:/var/www/html
```
