<?php
/**
 * Minimal parser for phpMyAdmin INSERT dumps.
 * Returns rows as associative arrays keyed by the column list of each INSERT.
 */

declare(strict_types=1);

function parse_sql_dump(string $sql): array
{
    $tables = [];
    $offset = 0;
    $length = strlen($sql);

    while (preg_match('/INSERT INTO `([^`]+)`\s*\(([^)]*)\)\s*VALUES\s*/i', $sql, $m, PREG_OFFSET_CAPTURE, $offset)) {
        $table = $m[1][0];
        $columns = array_map(
            static fn(string $c): string => trim($c, " `\t\r\n"),
            explode(',', $m[2][0])
        );
        $pos = $m[0][1] + strlen($m[0][0]);

        while ($pos < $length) {
            $char = $sql[$pos];
            if ($char === '(') {
                [$values, $pos] = parse_sql_tuple($sql, $pos + 1);
                $tables[$table][] = array_combine($columns, $values);
            } elseif ($char === ',' || ctype_space($char)) {
                $pos++;
            } elseif ($char === ';') {
                $pos++;
                break;
            } else {
                throw new RuntimeException("Unexpected character '$char' at offset $pos in $table");
            }
        }
        $offset = $pos;
    }

    return $tables;
}

/** @return array{0: array<int, mixed>, 1: int} values and position after the closing parenthesis */
function parse_sql_tuple(string $sql, int $pos): array
{
    $values = [];
    $length = strlen($sql);

    while ($pos < $length) {
        $char = $sql[$pos];

        if ($char === ' ' || $char === "\n" || $char === "\r" || $char === "\t" || $char === ',') {
            $pos++;
        } elseif ($char === ')') {
            return [$values, $pos + 1];
        } elseif ($char === "'") {
            $value = '';
            $pos++;
            while (true) {
                if ($pos >= $length) {
                    throw new RuntimeException('Unterminated string literal');
                }
                $c = $sql[$pos];
                if ($c === '\\' && $pos + 1 < $length) {
                    $value .= match ($sql[$pos + 1]) {
                        'n' => "\n",
                        'r' => "\r",
                        't' => "\t",
                        '0' => "\0",
                        default => $sql[$pos + 1],
                    };
                    $pos += 2;
                } elseif ($c === "'" && ($pos + 1 < $length) && $sql[$pos + 1] === "'") {
                    $value .= "'";
                    $pos += 2;
                } elseif ($c === "'") {
                    $pos++;
                    break;
                } else {
                    $value .= $c;
                    $pos++;
                }
            }
            $values[] = $value;
        } elseif (preg_match('/\G(NULL|-?\d+(?:\.\d+)?)/i', $sql, $m, 0, $pos)) {
            $values[] = strcasecmp($m[1], 'NULL') === 0 ? null : (str_contains($m[1], '.') ? (float) $m[1] : (int) $m[1]);
            $pos += strlen($m[1]);
        } else {
            throw new RuntimeException("Unexpected token at offset $pos");
        }
    }

    throw new RuntimeException('Unterminated tuple');
}
