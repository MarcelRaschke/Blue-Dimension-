<?php
/**
 * Shared page layout: header, navigation, footer.
 */

declare(strict_types=1);

const NAV_ITEMS = [
    'index.php' => 'Start',
    'biography.php' => 'Biografie',
    'news.php' => 'News',
    'events.php' => 'Events',
    'music.php' => 'Musik',
    'gallery.php' => 'Galerie',
    'links.php' => 'Links',
    'gbook.php' => 'Gästebuch',
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
</head>
<body>
<header class="site-header">
    <a class="brand" href="index.php"><?= h(SITE_NAME) ?></a>
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
    <p><?= h(SITE_NAME) ?> · <?= h(SITE_TAGLINE) ?></p>
</footer>
</body>
</html>
<?php
}
