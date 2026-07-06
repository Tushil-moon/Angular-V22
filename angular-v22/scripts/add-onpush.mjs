/**
 * Adds ChangeDetectionStrategy.OnPush to every @Component that lacks changeDetection.
 */
import fs from 'node:fs';
import path from 'node:path';

const appRoot = path.resolve(import.meta.dirname, '../src/app');

function walk(dir, files = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walk(full, files);
        } else if (entry.name.endsWith('.ts')) {
            files.push(full);
        }
    }
    return files;
}

function addChangeDetectionImport(content) {
    const singleLine = /import\s*\{([^}]+)\}\s*from\s*'@angular\/core';/;
    const match = content.match(singleLine);
    if (match) {
        if (match[1].includes('ChangeDetectionStrategy')) {
            return content;
        }
        return content.replace(
            singleLine,
            `import { ChangeDetectionStrategy, ${match[1].trim()} } from '@angular/core'`,
        );
    }

    const multiLine = /import\s*\{([\s\S]*?)\}\s*from\s*'@angular\/core';/;
    const multiMatch = content.match(multiLine);
    if (multiMatch && !multiMatch[1].includes('ChangeDetectionStrategy')) {
        const updated = multiMatch[1].trimEnd().replace(/\s*$/, '');
        const withStrategy = updated.startsWith('\n')
            ? `\n    ChangeDetectionStrategy,${updated}`
            : `ChangeDetectionStrategy, ${updated}`;
        return content.replace(multiLine, `import {${withStrategy}\n} from '@angular/core'`);
    }

    return content;
}

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (!content.includes('@Component')) {
        return false;
    }
    if (content.includes('changeDetection:')) {
        return false;
    }

    content = addChangeDetectionImport(content);
    content = content.replace(
        /@Component\(\{\r?\n/g,
        '@Component({\r\n    changeDetection: ChangeDetectionStrategy.OnPush,\r\n',
    );

    fs.writeFileSync(filePath, content);
    return true;
}

const files = walk(appRoot);
let updated = 0;

for (const file of files) {
    if (processFile(file)) {
        updated++;
        console.log(path.relative(appRoot, file));
    }
}

console.log(`\nUpdated ${updated} file(s).`);
