<?php
/**
 * Image catalogue for the public site. Every key is the file name without
 * extension in public/assets/img/. Width and height must match the file;
 * scripts/test-site.php checks that. Build and mapping: docs/BILDER.md.
 */

declare(strict_types=1);

const IMAGE_BASE_PATH = 'assets/img/';

/** Image used for social cards (og:image) on every page. */
const OG_IMAGE_KEY = 'neon-plate';

const IMAGES = [
    'hero-wordmark' => ['width' => 1536, 'height' => 646, 'alt' => 'DJ Jesse Jay Schriftzug mit gelbem Logo auf blauem Grund'],
    'neon-plate' => ['width' => 1200, 'height' => 675, 'alt' => 'Neon-Schild: DJ Jesse Jay, Progressive Music Attack, Zürich, Radio LoRa 97.5'],
    'logo-badge' => ['width' => 256, 'height' => 256, 'alt' => 'Logo J·Γ im blauen Ring'],
    'logo-vinyl' => ['width' => 1024, 'height' => 1024, 'alt' => 'Vinyl-Logo DJ Jesse Jay mit Tonarm, Zürich, est. 1997'],
    'radio-lora-97-5' => ['width' => 1200, 'height' => 641, 'alt' => 'Radio LoRa 97.5 als Pixel-Mosaik mit Zürcher Silhouetten, Kassette, Schallplatte und Mikrofon'],
    'dj-controller' => ['width' => 1200, 'height' => 504, 'alt' => 'DJ-Controller mit dem Schriftzug DJ Jesse Jay (3D-Darstellung)'],
    'event-poster-cyber-space-night' => ['width' => 1200, 'height' => 800, 'alt' => 'Poster Blue Dimension Cy8er Space Night, Electronic Music Festival, Zürich'],
    'infographic-elektronische-musik' => ['width' => 1536, 'height' => 864, 'alt' => 'Infografik: Produktionsprozess elektronischer Musik von der Idee bis zum Feedback, mit Klangquellen, Studio und Musikstilen'],
    'art-ibm370-clean' => ['width' => 1200, 'height' => 900, 'alt' => 'Pixel-Art: IBM System 370 mit Rechnerschränken, Bandlaufwerken und kleinen Figuren'],
    'art-ibm370-cy8er' => ['width' => 760, 'height' => 428, 'alt' => 'Pixel-Art: IBM System 370 mit Crew-Figuren an den Konsolen'],
    'art-ibm370-variant' => ['width' => 760, 'height' => 428, 'alt' => 'Pixel-Art: IBM System 370 in einer Variante mit mehr Figuren und Laptops'],
    'art-signature-bridge' => ['width' => 1200, 'height' => 800, 'alt' => 'Architekturübersicht DJJJ Signature Bridge v1: vom Audiosignal über Events und OSC bis zur Renderer-Ebene'],
    'credit-twodivision' => ['width' => 1536, 'height' => 512, 'alt' => 'Schriftzug designed by TwoDivision & @R†'],
];

/** Relative URL of an image, usable from any page in public/. */
function image_url(string $key): string
{
    return IMAGE_BASE_PATH . $key . '.webp';
}

/** Manifest entry for a key. Unknown keys fail loudly, as load_content() does. */
function image_def(string $key): array
{
    return IMAGES[$key] ?? throw new InvalidArgumentException("Unknown image: $key");
}

/**
 * <img> element with intrinsic size (no layout shift) and alt text from the
 * manifest. Pass $alt = '' for decorative images. $priority marks above-the-fold
 * images; everything else loads lazily.
 */
function image_tag(string $key, string $class = '', bool $priority = false, ?string $alt = null): string
{
    $def = image_def($key);
    return sprintf(
        '<img src="%s" width="%d" height="%d" alt="%s"%s loading="%s" decoding="async">',
        h(image_url($key)),
        $def['width'],
        $def['height'],
        h($alt ?? $def['alt']),
        $class === '' ? '' : ' class="' . h($class) . '"',
        $priority ? 'eager' : 'lazy'
    );
}

/** <figure> with optional <figcaption>. */
function figure_tag(string $key, string $caption = '', bool $priority = false): string
{
    $figcaption = $caption === '' ? '' : '<figcaption>' . h($caption) . '</figcaption>';
    return '<figure class="art">' . image_tag($key, '', $priority) . $figcaption . '</figure>';
}
