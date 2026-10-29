<?php

declare(strict_types=1);

require_once __DIR__ . '/../app/bootstrap.php';

$links = load_content('links');

render_page('Links', 'links.html', static function () use ($links): void { ?>
    <h1>Links</h1>
    <ul class="link-list">
        <?php foreach ($links as $link): ?>
            <li>
                <?php if ($link['url'] !== ''): ?>
                    <a href="<?= h(upgrade_https($link['url'])) ?>" rel="noopener noreferrer" target="_blank"><?= h($link['name']) ?></a>
                <?php else: ?>
                    <?= h($link['name']) ?>
                <?php endif; ?>
                <?php if (trim($link['info']) !== ''): ?>
                    <span class="muted">· <?= h($link['info']) ?></span>
                <?php endif; ?>
            </li>
        <?php endforeach; ?>
    </ul>
<?php });
