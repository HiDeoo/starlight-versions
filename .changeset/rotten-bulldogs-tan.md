---
'starlight-versions': minor
---

⚠️ **BREAKING CHANGE:** The Starlight Versions plugin no longer [overrides](https://starlight.astro.build/guides/overriding-components/) the [`<Sidebar>`](https://starlight.astro.build/reference/overrides/#sidebar) and [`<Pagination>`](https://starlight.astro.build/reference/overrides/#pagination) components. If you were manually rendering `starlight-versions/components/VersionSidebar.astro` or `starlight-versions/components/VersionPagination.astro` in a custom override, you can now remove them.
