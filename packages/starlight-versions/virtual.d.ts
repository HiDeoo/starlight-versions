declare module 'virtual:starlight-versions-config' {
  const StarlightVersionsConfig: import('./index').StarlightVersionsConfig

  export default StarlightVersionsConfig
}

declare module 'virtual:starlight/user-config' {
  const StarlightConfig: import('@astrojs/starlight/types').StarlightConfig

  export default StarlightConfig
}
