/** Resolve hook for edition-loader.mjs: swap the authored modules for their stubs. */
let swaps = {}
export async function initialize(data) { swaps = data?.map || {} }
export async function resolve(specifier, context, nextResolve) {
  const result = await nextResolve(specifier, context)
  const hit = swaps[result.url.split('?')[0]]
  return hit ? { ...result, url: hit, shortCircuit: true } : result
}
