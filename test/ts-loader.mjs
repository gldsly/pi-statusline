export async function resolve(specifier, context, defaultResolve) {
  try {
    return await defaultResolve(specifier, context, defaultResolve);
  } catch (error) {
    const isRelative = specifier.startsWith("./") || specifier.startsWith("../");
    const hasKnownExtension = /\.[cm]?[jt]sx?$/.test(specifier);
    if (!isRelative || hasKnownExtension) {
      throw error;
    }

    return defaultResolve(`${specifier}.ts`, context, defaultResolve);
  }
}
