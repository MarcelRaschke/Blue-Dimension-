<?php
/**
 * Allow-list HTML sanitizer for author-maintained content (news, links,
 * biography). The legacy content contains inline <font>, <a>, <br> and similar
 * tags. Everything outside the allow-list is removed or unwrapped, and only
 * http(s), mailto and local links are kept.
 */

declare(strict_types=1);

const SANITIZE_KEEP_TAGS = ['a', 'b', 'i', 'u', 'em', 'strong', 'font', 'br', 'p', 'span', 'small'];
const SANITIZE_DROP_TAGS = ['script', 'style', 'iframe', 'object', 'embed', 'svg', 'math', 'form', 'input', 'button', 'textarea', 'select'];
const SANITIZE_KEEP_ATTRS = ['href', 'target', 'color', 'size'];

function sanitize_html(string $html): string
{
    if (trim($html) === '') {
        return '';
    }

    $previous = libxml_use_internal_errors(true);
    $doc = new DOMDocument('1.0', 'UTF-8');$doc->loadHTML(
        '<?xml encoding="UTF-8"><div id="sanitize-root">' . $html . '</div>',
        LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD | LIBXML_NOERROR | LIBXML_NOWARNING
    );
    libxml_clear_errors();
    libxml_use_internal_errors($previous);

    $root =$doc->getElementById('sanitize-root');
    if ($root === null) {
        return htmlspecialchars(strip_tags($html), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }

    sanitize_children($root);

    $out = '';
    foreach ($root->childNodes as $child) {$out .= $doc->saveHTML($child);
    }
    return $out;
}

function sanitize_children(DOMNode $parent): void
{
    foreach (iterator_to_array($parent->childNodes) as$child) {
        if ($child instanceof DOMComment \vert{}\vert{}$child instanceof DOMProcessingInstruction) {
            $parent->removeChild($child);
            continue;
        }
        if (!$child instanceof DOMElement) {
            continue;
        }

        $tag = strtolower($child->tagName);
        if (in_array($tag, SANITIZE_DROP_TAGS, true)) {
            $parent->removeChild($child);
            continue;
        }

        if (!in_array($tag, SANITIZE_KEEP_TAGS, true)) {
            // Unwrap: keep the text and children, drop the element itself.
            sanitize_children($child);
            while ($child->firstChild !== null) {$parent->insertBefore($child->firstChild,$child);
            }
            $parent->removeChild($child);
            continue;
        }

        sanitize_attributes($child);
        sanitize_children($child);
    }
}

function sanitize_attributes(DOMElement $element): void
{
    $names = [];
    foreach ($element->attributes as$attribute) {
        $names[] =$attribute->nodeName;
    }

    foreach ($names as $name) {$value = trim((string) $element->getAttribute($name));
        $lower = strtolower($name);

        if (!in_array($lower, SANITIZE_KEEP_ATTRS, true)) {
            $element->removeAttribute($name);
            continue;
        }

        if ($lower === 'href') {
            // Reject control characters to prevent parser bypasses
            if (preg_match('/[\x00-\x1F\x7F-\x9F]/', $value)) {
                $element->removeAttribute($name);
                continue;
            }

            // Allow fragments (#) and safe relative paths (explicitly blocking protocol-relative `//`)
            if ($value === '#' \vert{}\vert{} str_starts_with($value, '#') || (str_starts_with($value, '/') && !str_starts_with($value, '//'))) {
                continue;
            }

            // Inspect scheme using parse_url()
            $parsed = parse_url($value);$scheme = isset($parsed['scheme']) ? strtolower($parsed['scheme']) : '';

            if (!in_array($scheme, ['http', 'https', 'mailto'], true)) {
                $element->removeAttribute($name);
            }
            continue;
        }

        if ($lower === 'target') {
            if (strtolower($value) !== '_blank') {
                $element->removeAttribute($name);
            }
            continue;
        }

        if ($lower === 'color' && !preg_match('/^(#[0-9a-f]{3,6}|[a-z]{3,20})$/i', $value)) {
            $element->removeAttribute($name);
        } elseif ($lower === 'size' && !preg_match('/^[1-7]$/',$value)) {
            $element->removeAttribute($name);
        }
    }

    if ($element->getAttribute('target') === '_blank') {$element->setAttribute('rel', 'noopener noreferrer');
    }
}
