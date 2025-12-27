import type { Plugin } from './types';

/**
 * Loads an external plugin from a raw string of code.
 * WARNING: This evaluates arbitrary code. Only use with trusted sources.
 * 
 * The code is expected to be a module that:
 * 1. Exports a default class or instance implementing the Plugin interface.
 * 2. OR returns the plugin instance directly if it's an IIFE.
 * 
 * For this MVP, we will assume the code is a CommonJS-style or simple Class definition 
 * that we can instantiate or that assigns to `module.exports` or `exports.default`.
 */
export async function loadExternalPlugin(id: string, code: string): Promise<Plugin> {
    console.log(`[Loader] Loading external plugin: ${id}`);

    try {
        // Simple sandbox (not secure, just isolation)
        const module = { exports: {} as any };
        const exports = module.exports;

        // Wrap code in a function to provide module/exports context
        // We use 'new Function' to evaluate the code string
        const evaluator = new Function('module', 'exports', 'require', `
            ${code}
        `);

        // Execute the code
        // We provide a mock 'require' that explicitly fails or provides limited globals if needed.
        // For now, external plugins shouldn't rely on 'require' unless we bundle them.
        evaluator(module, exports, (mod: string) => {
            throw new Error(`External require('${mod}') not supported in MVP loader.`);
        });

        // Check for default export
        let PluginClass = module.exports.default || module.exports;

        // If it's a class, instantiate it
        if (typeof PluginClass === 'function') {
            try {
                return new PluginClass();
            } catch (e) {
                // It might be a factory function or just the instance itself (if not a class)
                // If new fails, maybe it wasn't a constructor.
                console.warn('[Loader] Default export is not a constructor, using as instance?', e);
                return PluginClass;
            }
        }

        // If it's an object, assume it's the plugin instance
        if (typeof PluginClass === 'object') {
            return PluginClass;
        }

        throw new Error('Plugin code did not export a valid Plugin instance or class.');

    } catch (e) {
        console.error(`[Loader] Failed to load plugin ${id}:`, e);
        throw e;
    }
}
