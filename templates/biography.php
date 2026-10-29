<?php

declare(strict_types=1);

require_once __DIR__ . '/../app/bootstrap.php';

$biography = load_content('biography');
$lang = ($_GET['lang'] ?? 'de') === 'en' ? 'en' : 'de';
$title = $lang === 'en' ? 'Biography' : 'Biografie';

render_page($title, 'biography.html', static function () use ($biography, $lang, $title): void { ?>
    <h1><?= h($title) ?></h1>
    <nav class="lang-switch" aria-label="Sprache">
        <a href="biography.html"<?= $lang === 'de' ? ' aria-current="true"' : '' ?>>Deutsch</a>
        <a href="biography-en.html"<?= $lang === 'en' ? ' aria-current="true"' : '' ?>>English</a>
    </nav>
    <?= figure_tag('dj-controller', 'DJ Jesse Jay, 3D-Darstellung') ?>
    <article class="prose">
        <?= sanitize_html(str_replace('%09', "\t", $biography[$lang])) ?>
    </article>
<?php });
