<?php

declare(strict_types=1);

require_once __DIR__ . '/../app/bootstrap.php';

$news = array_slice(load_content('news'), 0, 3);

render_page('', 'index.php', static function () use ($news): void { ?>
    <section class="hero">
        <h1><?= h(SITE_NAME) ?></h1>
        <p class="tagline"><?= h(SITE_TAGLINE) ?></p>
        <p>Radio LoRa, Donnerstag 00:00–06:00: Blue Dimension und Galaxy Space Night.</p>
    </section>

    <section>
        <h2>Neueste News</h2>
        <?php foreach ($news as $item): ?>
            <article class="card">
                <p><?= sanitize_html($item['text']) ?></p>
            </article>
        <?php endforeach; ?>
        <p><a href="news.php">Alle News</a></p>
    </section>
<?php });
