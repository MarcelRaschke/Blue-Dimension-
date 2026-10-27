<?php

declare(strict_types=1);

require_once __DIR__ . '/../app/bootstrap.php';

$events = load_content('events');

render_page('Events', 'events.html', static function () use ($events): void { ?>
    <h1>Events</h1>
    <p class="muted">Archiv der Sessions, gruppiert nach Event-ID.</p>
    <?= figure_tag('event-poster-cyber-space-night', 'Poster Blue Dimension Cy8er Space Night') ?>
    <?php foreach (array_reverse($events) as $event): ?>
        <section class="card" id="event-<?= (int) $event['id'] ?>">
            <h2>Event <?= (int) $event['id'] ?></h2>
            <p>
                <?= count($event['tracks']) ?> Tracks ·
                <?= count($event['images']) ?> Fotos
                <?php if ($event['images'] !== []): ?>
                    · <a href="gallery.html#event-<?= (int) $event['id'] ?>">zur Galerie</a>
                <?php endif; ?>
            </p>
            <?php if ($event['tracks'] !== []): ?>
                <ul>
                    <?php foreach ($event['tracks'] as $track): ?>
                        <li>
                            <?= h($track['style']) ?>
                            <?php if ($track['play'] !== ''): ?>
                                · <a href="<?= h($track['play']) ?>" rel="noopener noreferrer">anhören</a>
                            <?php endif; ?>
                        </li>
                    <?php endforeach; ?>
                </ul>
            <?php endif; ?>
        </section>
    <?php endforeach; ?>
<?php });
