<?php

declare(strict_types=1);

require_once __DIR__ . '/../app/bootstrap.php';

$events = load_content('events');

render_page('Galerie', 'gallery.html', static function () use ($events): void { ?>
    <h1>Galerie</h1>
    <section id="artwork">
        <h2>Artwork</h2>
        <div class="art-grid">
            <?= figure_tag('art-ibm370-clean', 'IBM System 370 · Pixel-Art') ?>
            <?= figure_tag('art-ibm370-cy8er', 'IBM System 370 · Crew-Version') ?>
            <?= figure_tag('art-ibm370-variant', 'IBM System 370 · Variante') ?>
            <?= figure_tag('art-signature-bridge', 'DJJJ Signature Bridge v1 · Architektur') ?>
            <?= figure_tag('neon-plate', 'Progressive Music Attack') ?>
            <?= figure_tag('logo-vinyl', 'Logo') ?>
            <?= figure_tag('credit-twodivision', 'Design: TwoDivision') ?>
        </div>
    </section>
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
