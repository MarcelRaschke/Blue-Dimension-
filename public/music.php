<?php

declare(strict_types=1);

require_once __DIR__ . '/../app/bootstrap.php';

$tracks = load_content('music');
usort($tracks, static fn(array $a, array $b): int => $b['id'] <=> $a['id']);

render_page('Musik', 'music.php', static function () use ($tracks): void { ?>
    <h1>Musik</h1>
    <p class="muted">Radio-Archiv von Blue Dimension und Galaxy Space Night.</p>
    <table class="table">
        <thead>
            <tr><th>Style</th><th>Event</th><th>Anhören</th><th>Download</th></tr>
        </thead>
        <tbody>
            <?php foreach ($tracks as $track): ?>
                <tr>
                    <td><?= h($track['style']) ?></td>
                    <td><a href="events.php#event-<?= (int) $track['eventId'] ?>"><?= (int) $track['eventId'] ?></a></td>
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
