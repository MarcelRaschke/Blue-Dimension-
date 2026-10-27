<?php

declare(strict_types=1);

require_once __DIR__ . '/../app/bootstrap.php';

$entries = load_content('guestbook');

render_page('Gästebuch', 'gbook.html', static function () use ($entries): void { ?>
    <h1>Gästebuch</h1>
    <p class="muted"><?= count($entries) ?> Einträge aus dem Archiv.</p>
    <?php foreach ($entries as $entry): ?>
        <article class="card">
            <header>
                <strong><?= h($entry['name']) ?></strong>
                <span class="muted"><?= h(format_date($entry['postedAt'])) ?></span>
                <?php if ($entry['website'] !== ''): ?>
                    · <a href="<?= h($entry['website']) ?>" rel="nofollow noopener noreferrer" target="_blank">Website</a>
                <?php endif; ?>
            </header>
            <p class="comment"><?= nl2br(h(trim($entry['comment']))) ?></p>
        </article>
    <?php endforeach; ?>
<?php });
