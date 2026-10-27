<?php
/**
 * Site configuration. Values can be overridden by environment variables.
 */

declare(strict_types=1);

const SITE_NAME = 'DJ Jesse Jay';
const SITE_TAGLINE = 'since 1997 the progressive music attack';

// Base URL under which the gallery image files are served. The image files
// are not part of this repository; see docs/CONTENT.md.
define('GALLERY_BASE_URL', rtrim(getenv('GALLERY_BASE_URL') ?: '/media/gallery', '/') . '/');

// Absolute base URL for social-card metadata (og:image). Crawlers need an absolute URL.
define('SITE_URL', rtrim(getenv('SITE_URL') ?: 'https://djjessejay.ch', '/') . '/');
