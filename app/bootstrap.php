<?php
/**
 * Shared bootstrap for all public pages. Loaded by public/*.php.
 */

declare(strict_types=1);

require __DIR__ . '/config.php';
require __DIR__ . '/html.php';
require __DIR__ . '/layout.php';

const CONTENT_DIR = __DIR__ . '/../content';

/**
 * Load one generated content file. Throws if the file is missing or invalid,
 * so a broken deployment fails loudly instead of rendering empty pages.
 */
function load_content(string $name): array
{
    $path = CONTENT_DIR . '/' . $name . '.json';
    $json = file_get_contents($path);
    if ($json === false) {
        throw new RuntimeException("Content file missing: $name.json (run scripts/build-content.php)");
    }
    return json_decode($json, true, 512, JSON_THROW_ON_ERROR);
}

/** HTML-escape for text output. */
function h(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

/** Format a unix timestamp for display, German locale style. */
function format_date(int $timestamp): string
{
    return date('d.m.Y', $timestamp);
}
