<?php

declare(strict_types=1);

require_once __DIR__ . '/../app/bootstrap.php';

$events = load_content('events');

render_page('Galerie', 'gallery.php', static function () use ($events): void { ?>
    <h1>Galerie</h1>
    <?php foreach (array_reverse($events) as $event): ?>
        <?php if ($event['images'] === []) { continue; } ?>
        <section id="event-<?= (int) $event['id'] ?>">
            <h2>Event <?= (int) $event['id'] ?></h2>
            <div class="gallery">
                <?php foreach ($event['images'] as $image): ?>
                    <img
                        src="<?= h(GALLERY_BASE_URL . $image['file']) ?>"
                        width="<?= (int) $image['width'] ?>"
                        height="<?= (int) $image['height'] ?>"
                        alt="Event <?= (int) $event['id'] ?>"
                        loading="lazy">
                <?php endforeach; ?>
            </div>
        </section>
    <?php endforeach; ?>
<?php });
