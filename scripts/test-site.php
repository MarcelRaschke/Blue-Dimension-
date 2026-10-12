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
check('sanitize keeps font color', str_contains($clean, 'color="#0000ff"'), $clean);
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
        require __DIR__ . '/../public/' . $file;
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
require __DIR__ . '/../public/gbook.php';
$gbookHtml = (string) ob_get_clean();
check('gbook output contains no mailto', !str_contains($gbookHtml, 'mailto:'));
check('gbook output escapes markup', !str_contains($gbookHtml, '<script'));

printf("\n%d checks, %d failed\n", $checks, $failures);
exit($failures === 0 ? 0 : 1);
