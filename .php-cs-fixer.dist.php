<?php

$finder = PhpCsFixer\Finder::create()
    ->in([__DIR__])
    ->exclude(['vendor', '.git', 'node_modules'])
    ->notPath('tests/Fixtures')
    ->name('*.php');

return (new PhpCsFixer\Config())
    ->setRiskyAllowed(true)
    ->setRules([
        '@PSR12' => true,
        '@PSR12:risky' => true,
        'strict_comparison' => true,
        'strict_param' => true,
        'array_syntax' => ['syntax' => 'short'],
        'declare_strict_types' => false,
        'no_unused_imports' => true,
        'ordered_imports' => [
            'sort_algorithm' => 'alpha',
        ],
        'php_unit_construct' => true,
        'php_unit_strict' => true,
        'trailing_comma_in_multiline' => [
            'elements' => ['arrays', 'arguments', 'parameters'],
        ],
    ])
    ->setFinder($finder);
