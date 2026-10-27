<?php

declare(strict_types=1);

require_once __DIR__ . '/../app/bootstrap.php';

$news = load_content('news');

render_page('News', 'news.php', static function () use ($news): void { ?>
    <h1>News</h1>
    <?= figure_tag('radio-lora-97-5', 'Radio LoRa 97.5, Sendeplatz von Blue Dimension') ?>
    <?php foreach ($news as $item): ?>
        <article class="card">
            <p><?= sanitize_html($item['text']) ?></p>
            <?php if (trim($item['archive']) !== ''): ?>
                <p class="muted"><?= sanitize_html($item['archive']) ?></p>
            <?php endif; ?>
        </article>
    <?php endforeach; ?>
<?php });
