<?php
/**
 * Allow-list HTML sanitizer for author-maintained content (news, links,
 * biography). The legacy content contains inline <font>, <a>, <br> and similar
 * tags. Everything outside the allow-list is removed or unwrapped, and only
 * http(s), mailto and local links are kept.
 *
 * `color` and `size` on <font> are presentational attributes from the legacy
 * dumps (e.g. <font color="#0000ff">) and are dropped here: the site's link
 * color comes entirely from the --link design token now, so a leftover
 * color="#0000ff" would silently fight the token the moment any stylesheet
 * (print, reader mode, a future redesign) stops overriding presentational
 * attributes. The <font> tag itself is kept for its structural/bold wrapping
 * in older content.
 */

declare(strict_types=1);

const SANITIZE_KEEP_TAGS = ['a', 'b', 'i', 'u', 'em', 'strong', 'font', 'br', 'p', 'span', 'small'];
const SANITIZE_DROP_TAGS = ['script', 'style', 'iframe', 'object', 'embed', 'svg', 'math', 'form', 'input', 'button', 'textarea', 'select'];
const SANITIZE_KEEP_ATTRS = ['href', 'target'];

/**
 * Hosts that answered over HTTPS on 2026-10-28 (HTTP 200, 301 or 302).
 * Links to these hosts are emitted as https://. Other hosts stay as written.
 * Extend only after checking that the host answers over TLS.
 */
const HTTPS_VERIFIED_HOSTS = [
    'myspace.com', 'www.myspace.com', 'soundcloud.com', 'www.facebook.com',
    'www.kolonko.ch', 'www.laby.ch', 'www.lora.ch', 'www.gayromeo.com',
    'www.djdream.ch', 'www.putzfrauenagentur.ch', 'www.streetparade.ch', 'www.trance.fm',
];

/** Rewrites http:// links to a verified host to https://. Everything else is returned unchanged. */
function upgrade_https(string $url): string
{
    if (!preg_match('#^http://([^/:?\#]+)#i', $url, $m)) {
        return $url;
    }
    return in_array(strtolower($m[1]), HTTPS_VERIFIED_HOSTS, true)
        ? 'https://' . substr($url, strlen('http://'))
        : $url;
}

function sanitize_html(string $html): string
{
    if (trim($html) === '') {
        return '';
    }

    $previous = libxml_use_internal_errors(true);
    $doc = new DOMDocument('1.0', 'UTF-8');
    $doc->loadHTML(
        '<?xml encoding="UTF-8"><div id="sanitize-root">' . $html . '</div>',
        LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD | LIBXML_NOERROR | LIBXML_NOWARNING
    );
    libxml_clear_errors();
    libxml_use_internal_errors($previous);

    $root = $doc->getElementById('sanitize-root');
    if ($root === null) {
        return h(strip_tags($html));
    }

    sanitize_children($root);

    $out = '';
    foreach ($root->childNodes as $child) {
        $out .= $doc->saveHTML($child);
    }
    return $out;
}

function sanitize_children(DOMNode $parent): void
{
    foreach (iterator_to_array($parent->childNodes) as $child) {
        if ($child instanceof DOMComment || $child instanceof DOMProcessingInstruction) {
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
            while ($child->firstChild !== null) {
                $parent->insertBefore($child->firstChild, $child);
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
    foreach ($element->attributes as $attribute) {
        $names[] = $attribute->nodeName;
    }

    foreach ($names as $name) {
        $value = trim((string) $element->getAttribute($name));
        $lower = strtolower($name);

        if (!in_array($lower, SANITIZE_KEEP_ATTRS, true)) {
            $element->removeAttribute($name);
            continue;
        }

        if ($lower === 'href') {
            if (!preg_match('#^(https?://|mailto:|/|\#)#i', $value)) {
                $element->removeAttribute($name);
            } else {
                $element->setAttribute($name, upgrade_https($value));
            }
            continue;
        }

        if ($lower === 'target' && strtolower($value) !== '_blank') {
            $element->removeAttribute($name);
        }
    }

    if ($element->getAttribute('target') === '_blank') {
        $element->setAttribute('rel', 'noopener noreferrer');
    }
}
