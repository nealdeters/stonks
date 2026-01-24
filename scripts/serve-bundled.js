import { execSync, spawn } from 'child_process';
import { existsSync, mkdirSync, readdirSync, copyFileSync, rmSync, writeFileSync } from 'fs';
import { resolve, join } from 'path';

const run = async () => {
    console.log("🏗️  Building functions for production...");
    try {
        execSync('npx netlify build', { stdio: 'inherit' });
    } catch (e) {
        console.error("❌ Build failed.");
        process.exit(1);
    }

    const buildDir = resolve(process.cwd(), '.netlify/functions');
    const serveDir = resolve(process.cwd(), 'bundled-functions');

    // Clean previous bundle
    if (existsSync(serveDir)) {
        rmSync(serveDir, { recursive: true, force: true });
    }
    mkdirSync(serveDir);

    // 🚨 CRITICAL FIX: Force CommonJS for the bundled directory.
    // Your project is "type": "module", but Netlify's esbuild bundler outputs CommonJS (require/module.exports).
    // Without this, Node.js tries to run the bundled CJS code as ESM and fails with 500 errors.
    writeFileSync(join(serveDir, 'package.json'), JSON.stringify({ type: "commonjs" }));

    console.log("📦 Preparing bundled functions...");
    if (!existsSync(buildDir)) {
        console.error(`❌ Build directory not found: ${buildDir}`);
        process.exit(1);
    }

    const files = readdirSync(buildDir);
    let count = 0;

    for (const file of files) {
        const src = join(buildDir, file);
        const dest = join(serveDir, file);

        if (file.endsWith('.js') || file.endsWith('.map')) {
            copyFileSync(src, dest);
            count++;
        } else if (file.endsWith('.zip')) {
            try {
                // Unzip into the serve directory so netlify dev can read the JS
                execSync(`unzip -o "${src}" -d "${serveDir}"`, { stdio: 'ignore' });
                count++;
            } catch (e) {
                console.warn(`⚠️  Failed to unzip ${file}. Ensure 'unzip' is installed.`);
            }
        }
    }

    console.log(`🚀 Starting Netlify Dev with ${count} bundled functions...`);
    spawn('npx', ['netlify', 'dev', '--functions', 'bundled-functions'], { stdio: 'inherit' });
};

run();