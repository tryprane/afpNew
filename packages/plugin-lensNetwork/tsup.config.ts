import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    outDir: "dist",
    sourcemap: true,
    clean: true,
    format: ["esm"], // Ensure you're targeting CommonJS
    dts: {
        compilerOptions: {
            moduleResolution: "bundler",
            allowImportingTsExtensions: true,
            isolatedModules: true,
            esModuleInterop: true,
            skipLibCheck: true,
            strict: true
        }
    },
    external: [
        "@elizaos/core",
        "dotenv", // Externalize dotenv to prevent bundling
        "fs", // Externalize fs to use Node.js built-in module
        "path", // Externalize other built-ins if necessary
        "@reflink/reflink",
        "@node-llama-cpp",
        "https",
        "http",
        "agentkeepalive",
        "whatwg-url"
    ],
});