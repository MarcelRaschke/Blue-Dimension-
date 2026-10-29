<?php

declare(strict_types=1);

require_once __DIR__ . '/../app/bootstrap.php';

$tracks = load_content('music');
usort($tracks, static fn(array $a, array $b): int => $b['id'] <=> $a['id']);

// Label für den "Anhören"-Link: unterscheidbar statt generisch (WCAG 2.4.4).
// Lora-Archiv-URLs tragen das Sendedatum im Dateinamen (YYYYMMDD.rm) – daraus
// lässt sich das Jahr ableiten; sonst bleibt das Event als Unterscheidungsmerkmal.
$listenLabel = static function (string $playUrl, int $eventId): string {
    if (preg_match('#/(\d{4})\d{4}\.rm#', $playUrl, $m) === 1) {
        return 'Aufnahme ' . $m[1] . ' anhören';
    }

    return 'Aufnahme zu Event ' . $eventId . ' anhören';
};

render_page('Musik', 'music.html', static function () use ($tracks, $listenLabel): void { ?>
    <h1>Musik</h1>
    <p class="muted">Radio-Archiv von Blue Dimension und Galaxy Space Night.</p>
    <?= figure_tag('infographic-elektronische-musik', 'Der Produktionsprozess elektronischer Musik') ?>
    <p><a href="<?= h(image_url('infographic-elektronische-musik')) ?>">Infografik in voller Größe öffnen</a></p>
    <table class="table">
        <thead>
            <tr><th>Style</th><th>Event</th><th>Anhören</th></tr>
        </thead>
        <tbody>
            <?php foreach ($tracks as $track): ?>
                <tr>
                    <td><?= h($track['style']) ?></td>
                    <td><a href="events.html#event-<?= (int) $track['eventId'] ?>"><?= (int) $track['eventId'] ?></a></td>
                    <td>
                        <?php if ($track['play'] !== ''): ?>
                            <a href="<?= h($track['play']) ?>" rel="noopener noreferrer"><?= h($listenLabel($track['play'], (int) $track['eventId'])) ?></a>
                        <?php else: ?>
                            –
                        <?php endif; ?>
                    </td>
                </tr>
            <?php endforeach; ?>
        </tbody>
    </table>
<?php });
