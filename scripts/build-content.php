<?php
/**
 * Build the public content files from the legacy phpMyAdmin dumps.
 *
 * Reads news.sql, links.sql, soundTable.sql, imageTable.sql, guestbook.sql and
 * biography.xml from the repository root and writes JSON files to content/.
 * Guestbook e-mail addresses are dropped here and never written to content/.
 *
 * Usage: php scripts/build-content.php
 */

declare(strict_types=1);

require __DIR__ . '/sql-dump-parser.php';

$root = dirname(__DIR__);
$outDir = $root . '/content';

function read_dump(string $root, string $name): array
{
    $path = $root . '/' . $name . '.sql';
    if (!is_file($path)) {
        throw new RuntimeException("Missing dump: $path");
    }
    return parse_sql_dump((string) file_get_contents($path));
}

function normalize_url(string $url): string
{
    $url = trim($url);
    if ($url === '' || $url === 'http://' || $url === 'https://') {
        return '';
    }
    return preg_match('#^[a-z][a-z0-9+.-]*://#i', $url) ? $url : 'http://' . $url;
}

$news = [];
foreach (read_dump($root, 'news')['news'] ?? [] as $row) {
    $news[] = ['text' => $row['news'], 'archive' => $row['news1']];
}

$links = [];
foreach (read_dump($root, 'links')['links'] ?? [] as $row) {
    $links[] = [
        'id' => (int) $row['index'],
        'name' => $row['links'],
        'url' => normalize_url($row['url']),
        'info' => $row['info'],
    ];
}
usort($links, static fn(array $a, array $b): int => $a['id'] <=> $b['id']);

$sounds = [];
foreach (read_dump($root, 'soundTable')['soundTable'] ?? [] as $row) {
    $sounds[] = [
        'id' => (int) $row['soundID'],
        'eventId' => (int) $row['eventID'],
        'style' => $row['style'],
        'play' => normalize_url($row['urlAbspielen']),
        'download' => normalize_url($row['urlDownload']),
    ];
}

$images = [];
foreach (read_dump($root, 'imageTable')['imageTable'] ?? [] as $row) {
    $images[] = [
        'id' => (int) $row['imgID'],
        'eventId' => (int) $row['eventID'],
        'file' => ltrim($row['imgName'], '/'),
        'width' => (int) $row['imgWidth'],
        'height' => (int) $row['imgHeight'],
    ];
}

// Sessions are not stored in their own table; group tracks and photos by eventID.
$events = [];
foreach ($sounds as $sound) {
    $events[$sound['eventId']]['id'] = $sound['eventId'];
    $events[$sound['eventId']]['tracks'][] = $sound;
}
foreach ($images as $image) {
    $events[$image['eventId']]['id'] = $image['eventId'];
    $events[$image['eventId']]['images'][] = $image;
}
ksort($events);
$events = array_values(array_map(static fn(array $e): array => [
    'id' => $e['id'],
    'tracks' => $e['tracks'] ?? [],
    'images' => $e['images'] ?? [],
], $events));

$guestbook = [];
foreach (read_dump($root, 'guestbook')['guestbook'] ?? [] as $row) {
    $guestbook[] = [
        'id' => (int) $row['idnum'],
        'postedAt' => (int) $row['whenposted'],
        'name' => $row['name'],
        'website' => normalize_url((string) $row['www']),
        'comment' => $row['comments'],
    ];
}
usort($guestbook, static fn(array $a, array $b): int => $b['postedAt'] <=> $a['postedAt']);

$biographyPath = $root . '/biography.xml';
$xml = simplexml_load_file($biographyPath);
if ($xml === false) {
    throw new RuntimeException("Cannot parse $biographyPath");
}
$biography = [];
foreach ($xml->xpath('//table[@name="biography"]') ?: [] as $table) {
    foreach ($table->column as $column) {
        $biography[(string) $column['name']] = (string) $column;
    }
}
$biographyOut = [
    'de' => $biography['german'] ?? '',
    'en' => $biography['english'] ?? '',
];

$files = [
    'news.json' => $news,
    'links.json' => $links,
    'music.json' => $sounds,
    'gallery.json' => $images,
    'events.json' => $events,
    'guestbook.json' => $guestbook,
    'biography.json' => $biographyOut,
];

if (!is_dir($outDir) && !mkdir($outDir, 0755, true) && !is_dir($outDir)) {
    throw new RuntimeException("Cannot create $outDir");
}

foreach ($files as $name => $data) {
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    file_put_contents($outDir . '/' . $name, $json . "\n");
    printf("wrote content/%s (%d bytes)\n", $name, strlen($json));
}
