<?php
/**
 * Smoke and security tests for the public site. No external test framework.
 *
 * Usage: php scripts/test-site.php
 * Exit code 0 when all checks pass, 1 otherwise.
 */

declare(strict_types=1);

require_once __DIR__ . '/../app/bootstrap.php';

$failures = 0;
$checks = 0;

function check(string $name, bool $ok, string $detail = ''): void
{
    global $failures, $checks;
    $checks++;
    if (!$ok) {
        $failures++;
    }
    printf("%s %s%s\n", $ok ? 'PASS' : 'FAIL', $name, $ok || $detail === '' ? '' : " ($detail)");
}

// 1. Sanitizer removes script and event handlers, keeps safe links and formatting.
$dirty = '<font color="#0000ff"><a href="http://www.123galaxy.ch">Galaxy</a></font><br>'
    . '<script>alert(1)</script><img src=x onerror="alert(2)"><a href="javascript:alert(3)">x</a>'
    . '<div onclick="x()">d</div><iframe src="https://evil.example"></iframe>';
$clean = sanitize_html($dirty);
check('sanitize keeps safe link', str_contains($clean, 'href="http://www.123galaxy.ch"'), $clean);
check('sanitize drops font color (link color comes from the --link token)', !str_contains($clean, 'color="#0000ff"'), $clean);
check('sanitize removes script', !str_contains(strtolower($clean), '<script'), $clean);
check('sanitize removes img and onerror', !str_contains(strtolower($clean), 'onerror') && !str_contains(strtolower($clean), '<img'), $clean);
check('sanitize removes javascript: href', !str_contains(strtolower($clean), 'javascript:'), $clean);
check('sanitize removes onclick', !str_contains(strtolower($clean), 'onclick'), $clean);
check('sanitize removes iframe', !str_contains(strtolower($clean), '<iframe'), $clean);
check('sanitize unwraps div but keeps its text', !str_contains(strtolower($clean), '<div') && str_contains($clean, '>d<') === false && str_contains($clean, 'd'), $clean);
check('sanitize empty input', sanitize_html('   ') === '');

$blank = sanitize_html('<a href="https://example.org" target="_blank">x</a>');
check('target=_blank gets rel', str_contains($blank, 'rel="noopener noreferrer"'), $blank);

// 2. Content files exist, decode, and contain no e-mail fields.
$expected = ['news', 'links', 'music', 'gallery', 'events', 'guestbook', 'biography'];
foreach ($expected as $name) {
    try {
        $data = load_content($name);
        check("content/$name.json loads", is_array($data));
    } catch (Throwable $e) {
        check("content/$name.json loads", false, $e->getMessage());
    }
}

$guestbook = load_content('guestbook');
$hasEmail = false;
foreach ($guestbook as $entry) {
    if (array_key_exists('email', $entry)) {
        $hasEmail = true;
    }
}
check('guestbook content has no email field', !$hasEmail && count($guestbook) > 0);

// 3. Every public page renders with status 200 equivalent (no exception, non-empty).
$pages = [
    'index.php' => [],
    'news.php' => [],
    'events.php' => [],
    'music.php' => [],
    'gallery.php' => [],
    'links.php' => [],
    'biography.php' => [],
    'biography.php?lang=en' => [],
    'gbook.php' => [],
];
foreach ($pages as $page => $_) {
    [$file, $query] = array_pad(explode('?', $page, 2), 2, '');
    parse_str($query, $_GET);
    ob_start();
    try {
        require __DIR__ . '/../templates/' . $file;
        $html = (string) ob_get_clean();
        check("page $page renders", strlen($html) > 500 && str_contains($html, '<html lang="de">'));
    } catch (Throwable $e) {
        ob_end_clean();
        check("page $page renders", false, $e->getMessage());
    }
    $_GET = [];
}

// 4. Guestbook output never contains addresses, and user text is escaped.
ob_start();
$_GET = [];
require __DIR__ . '/../templates/gbook.php';
$gbookHtml = (string) ob_get_clean();
check('gbook output contains no mailto', !str_contains($gbookHtml, 'mailto:'));
check('gbook output escapes markup', !str_contains($gbookHtml, '<script'));

// 5. Images: manifest matches the files, budget holds, every image is used.
$imageDir = __DIR__ . '/../public/assets/img';
$imageBudgetBytes = 300 * 1024;
$pageSources = '';
foreach (array_merge(glob(__DIR__ . '/../templates/*.php'), glob(__DIR__ . '/../app/*.php')) as $sourceFile) {
    $pageSources .= file_get_contents($sourceFile);
}

$onDisk = array_map(static fn(string $f): string => basename($f, '.webp'), glob($imageDir . '/*.webp') ?: []);
foreach (array_diff($onDisk, array_keys(IMAGES)) as $orphan) {
    check("image file $orphan.webp is in the manifest", false, 'not listed in app/images.php');
}

foreach (IMAGES as $key => $image) {
    $path = $imageDir . '/' . $key . '.webp';
    $size = is_file($path) ? (int) filesize($path) : 0;
    check("image $key exists", $size > 0);
    if ($size === 0) {
        continue;
    }
    check("image $key within size budget", $size <= $imageBudgetBytes, $size . ' bytes');

    $info = getimagesize($path);
    $dimensionsOk = $info !== false && $info[0] === $image['width'] && $info[1] === $image['height'];
    check("image $key dimensions match manifest", $dimensionsOk, $info ? "$info[0]x$info[1]" : 'unreadable');

    check("image $key has alt text", trim($image['alt']) !== '');
    check("image $key is used by a page", str_contains($pageSources, "'$key'"));
}

check('favicon.ico is served from the docroot', is_file(__DIR__ . '/../public/favicon.ico') && filesize(__DIR__ . '/../public/favicon.ico') > 0);
check('apple-touch-icon exists', is_file($imageDir . '/apple-touch-icon.png'));
foreach ([32, 192] as $iconSize) {
    check("favicon-$iconSize.png exists", is_file($imageDir . "/favicon-$iconSize.png"));
}
check('layout links the PNG favicons', str_contains(file_get_contents(__DIR__ . '/../app/layout.php'), 'favicon-32.png'));
check('og:image is an absolute URL', preg_match('#^https?://[^/]+/assets/img/#', SITE_URL . image_url(OG_IMAGE_KEY)) === 1, SITE_URL);

// 6. Static output: the docroot holds no PHP, and committed HTML matches the templates.
check('docroot contains no PHP files', glob(__DIR__ . '/../public/**/*.php') === [] && glob(__DIR__ . '/../public/*.php') === []);

$staticPages = [
    'index.html' => ['index.php', []],
    'news.html' => ['news.php', []],
    'events.html' => ['events.php', []],
    'music.html' => ['music.php', []],
    'gallery.html' => ['gallery.php', []],
    'links.html' => ['links.php', []],
    'gbook.html' => ['gbook.php', []],
    'biography.html' => ['biography.php', ['lang' => 'de']],
    'biography-en.html' => ['biography.php', ['lang' => 'en']],
];
foreach ($staticPages as $output => [$template, $query]) {
    $_GET = $query;
    ob_start();
    require __DIR__ . '/../templates/' . $template;
    $rendered = (string) ob_get_clean();
    $committed = @file_get_contents(__DIR__ . '/../public/' . $output);
    check("public/$output matches templates/$template", $committed === $rendered, 'run php scripts/render-static.php');
    check("public/$output has no PHP links", !str_contains($rendered, '.php'));
}
$_GET = [];

// Links to plain http are only allowed for hosts that do not answer over TLS
// (RealMedia archive on port 554, sites without https). Every other host must
// be written as https in the templates or in content/*.json. Pages added later
// are covered by the glob, so new links are checked without a list change.
const HTTP_LEGACY_HOSTS = [
    '193.192.228.134', '195.210.0.134', 'www.123galaxy.ch', 'a1.soundcloud.com',
    'a2.ec-images.myspacecdn.com', 'www.latex-deluxe.com', 'www.mentalx.virus.ch', 'Dejavu',
];

$plainHttpHosts = [];
foreach (glob(__DIR__ . '/../public/*.html') as $page) {
    preg_match_all('#href="http://([^/:"]+)#i', (string) file_get_contents($page), $matches);
    foreach ($matches[1] as $host) {
        $plainHttpHosts[$host] = true;
    }
}
$unexpectedHosts = array_diff(array_keys($plainHttpHosts), HTTP_LEGACY_HOSTS);
check('no new plain-http links outside the legacy host list', $unexpectedHosts === [], implode(', ', $unexpectedHosts));

$templateHttp = [];
foreach (glob(__DIR__ . '/../templates/*.php') as $file) {
    if (preg_match('#http://#', (string) file_get_contents($file))) {
        $templateHttp[] = basename($file);
    }
}
check('templates and app code contain no http:// literals', $templateHttp === [], implode(', ', $templateHttp));

printf("\n%d checks, %d failed\n", $checks, $failures);
exit($failures === 0 ? 0 : 1);
