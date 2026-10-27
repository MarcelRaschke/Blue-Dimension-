<?php

declare(strict_types=1);

require_once __DIR__ . '/../app/bootstrap.php';

$biography = load_content('biography');
$lang = ($_GET['lang'] ?? 'de') === 'en' ? 'en' : 'de';

render_page('Biografie', 'biography.php', static function () use ($biography, $lang): void { ?>
    <h1>Biografie</h1>
    <nav class="lang-switch" aria-label="Sprache">
        <a href="biography.php?lang=de"<?= $lang === 'de' ? ' aria-current="true"' : '' ?>>Deutsch</a>
        <a href="biography.php?lang=en"<?= $lang === 'en' ? ' aria-current="true"' : '' ?>>English</a>
    </nav>
    <?= figure_tag('dj-controller', 'DJ Jesse Jay, 3D-Darstellung') ?>
    <article class="prose">
        <?= sanitize_html(str_replace('%09', "\t", $biography[$lang])) ?>
    </article>
<?php });
