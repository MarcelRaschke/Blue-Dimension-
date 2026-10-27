<?php
/**
 * Renders the public pages from templates/ into static HTML files in public/.
 * Build step only: the web server serves the result without PHP. Run after
 * every template, content or layout change, then commit public/*.html.
 *
 * Usage: php scripts/render-static.php
 */

declare(strict_types=1);

require_once __DIR__ . '/../app/bootstrap.php';

const STATIC_PAGES = [
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

$publicDir = __DIR__ . '/../public';

foreach (STATIC_PAGES as $output => [$template, $query]) {
    $_GET = $query;
    ob_start();
    require __DIR__ . '/../templates/' . $template;
    $html = (string) ob_get_clean();
    file_put_contents($publicDir . '/' . $output, $html);
    printf("wrote public/%s (%d bytes)\n", $output, strlen($html));
}
