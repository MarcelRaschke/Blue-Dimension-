<?php
/**
 * Shared page layout: header, navigation, footer.
 */

declare(strict_types=1);

const NAV_ITEMS = [
    'index.html' => 'Start',
    'biography.html' => 'Biografie',
    'news.html' => 'News',
    'events.html' => 'Events',
    'music.html' => 'Musik',
    'gallery.html' => 'Galerie',
    'links.html' => 'Links',
    'gbook.html' => 'Gästebuch',
];

/**
 * Render a full HTML page. $body is a callable that echoes the page content.
 */
function render_page(string $title, string $activeFile, callable $body): void
{
    $pageTitle = $title === '' ? SITE_NAME : $title . ' · ' . SITE_NAME;
    ?>
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title><?= h($pageTitle) ?></title>
    <meta name="description" content="<?= h(SITE_TAGLINE) ?>">
    <link rel="stylesheet" href="assets/site.css">
    <link rel="icon" href="favicon.ico" sizes="any">
    <link rel="icon" type="image/png" sizes="32x32" href="<?= h(IMAGE_BASE_PATH . 'favicon-32.png') ?>">
    <link rel="icon" type="image/png" sizes="192x192" href="<?= h(IMAGE_BASE_PATH . 'favicon-192.png') ?>">
    <link rel="apple-touch-icon" href="<?= h(IMAGE_BASE_PATH . 'apple-touch-icon.png') ?>">
    <meta property="og:type" content="website">
    <meta property="og:title" content="<?= h($pageTitle) ?>">
    <meta property="og:image" content="<?= h(SITE_URL . image_url(OG_IMAGE_KEY)) ?>">
    <meta property="og:image:width" content="<?= (int) image_def(OG_IMAGE_KEY)['width'] ?>">
    <meta property="og:image:height" content="<?= (int) image_def(OG_IMAGE_KEY)['height'] ?>">
    <meta property="og:image:alt" content="<?= h(image_def(OG_IMAGE_KEY)['alt']) ?>">
    <meta name="twitter:card" content="summary_large_image">
</head>
<body>
<header class="site-header">
    <a class="brand" href="index.html"><?= image_tag('logo-badge', 'brand-logo', true, '') ?><span><?= h(SITE_NAME) ?></span></a>
    <nav class="site-nav" aria-label="Hauptnavigation">
        <?php foreach (NAV_ITEMS as $file => $label): ?>
            <a href="<?= h($file) ?>"<?= $file === $activeFile ? ' aria-current="page"' : '' ?>><?= h($label) ?></a>
        <?php endforeach; ?>
    </nav>
</header>
<main class="site-main">
    <?php $body(); ?>
</main>
<footer class="site-footer">
    <div class="footer-inner">
        <?= image_tag('logo-badge', 'footer-logo', false, '') ?>
        <div>
            <p><?= h(SITE_NAME) ?> · <?= h(SITE_TAGLINE) ?></p>
            <p class="muted">Radio LoRa 97.5 · Blue Dimension · Zürich</p>
            <p class="muted">Design: TwoDivision</p>
        </div>
    </div>
</footer>
</body>
</html>
<?php
}
