# DuckDB WASM Spike Test (Spike 2)

Requires the `datasql-spike` plugin to be enabled.

## Test 1: Basic SELECT

```datasql
SELECT * FROM revenue
```

## Test 2: Aggregation

```datasql
SELECT region, SUM(amount) as total FROM revenue GROUP BY region ORDER BY total DESC
```

## Test 3: Deliberate error (should show red box)

```datasql
SELECT * FROM nonexistent_table
```

## Test 4: Empty result

```datasql
SELECT * FROM revenue WHERE amount > 100000
```
