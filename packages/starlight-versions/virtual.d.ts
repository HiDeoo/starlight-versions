declare module 'virtual:starlight-versions-config' {
  const StarlightVersionsConfig: import('./index').StarlightVersionsConfig

  export default StarlightVersionsConfig
}

declare module 'virtual:starlight/user-config' {
  const StarlightConfig: import('@astrojs/starlight/types').StarlightConfig

  export default StarlightConfig
}

declare module 'virtual:starlight/project-context' {
  const ProjectContext: {
    root: string
    srcDir: string
    trailingSlash: import('astro').AstroConfig['trailingSlash']
    build: {
      format: import('astro').AstroConfig['build']['format']
    }
  }
  export default ProjectContext
}
