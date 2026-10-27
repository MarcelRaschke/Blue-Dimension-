<?php

declare(strict_types=1);

require_once __DIR__ . '/../app/bootstrap.php';

$tracks = load_content('music');
usort($tracks, static fn(array $a, array $b): int => $b['id'] <=> $a['id']);

render_page('Musik', 'music.html', static function () use ($tracks): void { ?>
    <h1>Musik</h1>
    <p class="muted">Radio-Archiv von Blue Dimension und Galaxy Space Night.</p>
    <?= figure_tag('infographic-elektronische-musik', 'Der Produktionsprozess elektronischer Musik') ?>
    <p><a href="<?= h(image_url('infographic-elektronische-musik')) ?>">Infografik in voller Größe öffnen</a></p>
    <table class="table">
        <thead>
            <tr><th>Style</th><th>Event</th><th>Anhören</th><th>Download</th></tr>
        </thead>
        <tbody>
            <?php foreach ($tracks as $track): ?>
                <tr>
                    <td><?= h($track['style']) ?></td>
                    <td><a href="events.html#event-<?= (int) $track['eventId'] ?>"><?= (int) $track['eventId'] ?></a></td>
                    <td>
                        <?php if ($track['play'] !== ''): ?>
                            <a href="<?= h($track['play']) ?>" rel="noopener noreferrer">anhören</a>
                        <?php else: ?>
                            –
                        <?php endif; ?>
                    </td>
                    <td>
                        <?php if ($track['download'] !== ''): ?>
                            <a href="<?= h($track['download']) ?>" rel="noopener noreferrer">download</a>
                        <?php else: ?>
                            –
                        <?php endif; ?>
                    </td>
                </tr>
            <?php endforeach; ?>
        </tbody>
    </table>
<?php });
