/**
 * Basic HTML sanitization for rich text sticky notes
 */

const ALLOWED_TAGS = new Set([
    'P',
    'BR',
    'STRONG',
    'B',
    'EM',
    'I',
    'U',
    'UL',
    'OL',
    'LI',
    'A',
    'H2',
    'H3',
    'BLOCKQUOTE',
    'DIV',
    'SPAN',
]);

export function sanitizeRichHtml(html: string): string {
    if (!html?.trim()) return '';

    const doc = new DOMParser().parseFromString(html, 'text/html');
    const walk = (node: Node): void => {
        const children = [...node.childNodes];
        for (const child of children) {
            if (child.nodeType === Node.ELEMENT_NODE) {
                const el = child as HTMLElement;
                if (!ALLOWED_TAGS.has(el.tagName)) {
                    const fragment = document.createDocumentFragment();
                    while (el.firstChild) fragment.appendChild(el.firstChild);
                    el.replaceWith(fragment);
                    walk(node);
                    continue;
                }
                [...el.attributes].forEach((attr) => {
                    if (el.tagName === 'A' && attr.name === 'href') {
                        if (!/^https?:\/\//i.test(attr.value) && !/^mailto:/i.test(attr.value)) {
                            el.removeAttribute('href');
                        }
                        return;
                    }
                    el.removeAttribute(attr.name);
                });
            }
            walk(child);
        }
    };
    walk(doc.body);
    return doc.body.innerHTML.trim();
}

export function richTextToPlainText(html: string): string {
    if (!html?.trim()) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim();
}

export function truncatePlainText(text: string, max = 140): string {
    if (text.length <= max) return text;
    return `${text.slice(0, max).trim()}…`;
}
