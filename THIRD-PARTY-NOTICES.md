# Third-party notices

## @gullabs/flipbook-core 3.2.2

Used by the standalone Mushaf reader for HTML page-curl animation and right-to-left reading direction.

- Source code: https://github.com/gul-labs/flipbook
- Package: https://www.npmjs.com/package/@gullabs/flipbook-core
- License: Mozilla Public License 2.0 (MPL-2.0)
- License text: licenses/flipbook-core-MPL-2.0.txt

The unmodified package is loaded from the npm distribution through esm.sh. Its source form is available from the linked public repository. This website does not copy or modify the engine source.

## Upstream StPageFlip notice

The maintained fork preserves upstream notices for StPageFlip:

- Source code: https://github.com/Nodlik/StPageFlip
- Copyright (c) 2020 Nodlik
- License: MIT
- License text: licenses/stpageflip-MIT.txt

## Quran page images

The 604 Hafs/Tajweed page PNG files are bundled locally under `assets/mushaf/hafsTajweed/` and served from this website, rather than fetched from the upstream host at reading time.

- Upstream project: https://github.com/Zizwar/mushaf-mauri
- Upstream source ref: `expo55`
- Upstream path: `_archive/assets/pages/hafsTajweed/`
- Upstream license: MIT
- Copyright: (c) 2021 Ibrahim BIDI

The upstream MIT license text is reproduced in `licenses/mushaf-mauri-MIT.txt`. The website caches locally served page images on demand in a dedicated browser cache; it does not precache all 604 pages during installation.

## Hadith library data and takhrij

The website requests book indexes, chapter indexes, and chapter hadiths at runtime from the documented Al Furqan Hadith API:

- API documentation: https://alfurqan.online/docs
- API source credits identify Hadith-JSON as the upstream collection data: https://github.com/AhmedBaset/hadith-json/tree/v1.2.0
- This website does not bundle or mirror the full hadith database; requests are made to the provider's documented endpoints.

The upstream Hadith-JSON README states that its dataset was collected from Sunnah.com. Sunnah.com currently prohibits scraping and mass reproduction of entire collections on other websites and describes its own API as requiring an API key. Accordingly, this project does not copy those JSON collections into this repository. Before independently re-hosting the dataset, confirm redistribution permission with the relevant source owners.

Hadith takhrij lookup currently opens the official Dorar Hadith Encyclopedia search page in a new tab:

- https://dorar.net/hadith/search

The Dorar legacy JSONP guide is documented here:

- https://dorar.net/article/389

Dorar's current electronic-services terms require an individually approved access request, a private token, server-side calls (not a client-side token), visible attribution and a clickable source URL, and unmodified hadith grading. This static GitHub Pages site does not store a Dorar token or call the authenticated service directly. It therefore links users to the official search page instead of displaying unverified or unauthorised API results:

- Current access request and terms: https://dorar.net/index.php/api-services/request

If an authorised server-side integration is added later, it must show the source's returned reference URL and complete grading without alteration.
