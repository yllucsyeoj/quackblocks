---
datasources:
  penguins: ./penguins.parquet
  islands: ./islands.parquet
plotDefaults:
  color:
    legend: true
  width: 720
  height: 380
---

# QuackBlocks — Palmer Penguins Report

> This report is built entirely from SQL queries against Parquet files. Every table and chart below is generated live inside Obsidian via DuckDB WASM. When you export this note to PDF, the SVG charts render with explicit dimensions and survive intact.

---

## Executive Summary

```quack
caption="Dataset overview"
SELECT
  COUNT(*) AS total_penguins,
  COUNT(DISTINCT species) AS species_count,
  COUNT(DISTINCT island) AS island_count,
  ROUND(AVG(body_mass_g), 1) AS avg_mass_g,
  ROUND(AVG(flipper_length_mm), 1) AS avg_flipper_mm
FROM penguins
```

---

## 1. Species Overview

### 1.1 Population by species

```quack
chart=bar caption="Penguin counts by species" { "x": "species", "y": "count", "color": "species" }
SELECT species, COUNT(*) AS count
FROM penguins
GROUP BY species
ORDER BY count DESC
```

### 1.2 Average measurements by species

```quack
chart=bar caption="Average body mass (g) by species" { "x": "species", "y": "avg_mass", "color": "species" }
SELECT species, ROUND(AVG(body_mass_g), 1) AS avg_mass
FROM penguins
GROUP BY species
ORDER BY avg_mass DESC
```

---

## 2. Morphology Analysis

### 2.1 Bill dimensions scatter

```quack
chart=dot caption="Bill length vs. bill depth, coloured by species" { "x": "bill_length_mm", "y": "bill_depth_mm", "stroke": "species", "tip": true }
SELECT bill_length_mm, bill_depth_mm, species
FROM penguins
WHERE bill_length_mm IS NOT NULL AND bill_depth_mm IS NOT NULL
```

### 2.2 Flipper length distribution

```quack
chart=boxY caption="Flipper length distribution by species" { "x": "species", "y": "flipper_length_mm", "fill": "species" }
SELECT species, flipper_length_mm
FROM penguins
WHERE flipper_length_mm IS NOT NULL
```

### 2.3 Body mass vs. flipper length

```quack
chart=dot caption="Body mass vs. flipper length, sized by bill depth" { "x": "flipper_length_mm", "y": "body_mass_g", "stroke": "species", "r": "bill_depth_mm", "tip": true }
SELECT flipper_length_mm, body_mass_g, bill_depth_mm, species
FROM penguins
WHERE flipper_length_mm IS NOT NULL AND body_mass_g IS NOT NULL
```

---

## 3. Island Geography

### 3.1 Island metadata

```quack
caption="Island reference data"
SELECT * FROM islands ORDER BY area_km2 DESC
```

### 3.2 Penguin density by island

```quack
chart=bar caption="Penguins per island" { "x": "island", "y": "count", "color": "island" }
SELECT island, COUNT(*) AS count
FROM penguins
GROUP BY island
ORDER BY count DESC
```

### 3.3 Average mass by island area

```quack
chart=dot caption="Island area vs. average penguin mass" { "x": "area_km2", "y": "avg_mass", "stroke": "island", "tip": true }
SELECT
  i.island,
  i.area_km2,
  ROUND(AVG(p.body_mass_g), 1) AS avg_mass
FROM penguins p
JOIN islands i ON p.island = i.island
GROUP BY i.island, i.area_km2
ORDER BY i.area_km2 DESC
```

---

## 4. Sexual Dimorphism

### 4.1 Mass by sex and species

```quack
chart=bar caption="Average body mass by species and sex" { "x": "species", "y": "avg_mass", "fill": "sex" }
SELECT species, sex, ROUND(AVG(body_mass_g), 1) AS avg_mass
FROM penguins
WHERE sex IS NOT NULL
GROUP BY species, sex
ORDER BY species, sex
```

### 4.2 Faceted body mass distribution

```quack
chart=boxY caption="Body mass distribution by species (faceted by sex)" { "x": "species", "y": "body_mass_g", "fx": "sex", "fill": "species" }
SELECT species, sex, body_mass_g
FROM penguins
WHERE sex IS NOT NULL
```

---

## 5. Correlation Heatmap

### 5.1 Pearson correlation matrix

```quack
caption="Correlation matrix of morphological traits"
SELECT
  ROUND(CORR(bill_length_mm, bill_depth_mm), 3) AS bill_len_depth,
  ROUND(CORR(bill_length_mm, flipper_length_mm), 3) AS bill_len_flipper,
  ROUND(CORR(bill_length_mm, body_mass_g), 3) AS bill_len_mass,
  ROUND(CORR(bill_depth_mm, flipper_length_mm), 3) AS bill_depth_flipper,
  ROUND(CORR(bill_depth_mm, body_mass_g), 3) AS bill_depth_mass,
  ROUND(CORR(flipper_length_mm, body_mass_g), 3) AS flipper_mass
FROM penguins
```

---

## 6. Full Dataset

```quack
caption="All 60 penguin records"
SELECT * FROM penguins ORDER BY species, body_mass_g DESC
```

---

## About this report

- **Data source:** Palmer Penguins dataset (simplified to 60 representative rows)
- **Engine:** DuckDB WASM running entirely inside Obsidian
- **Visualisation:** Observable Plot rendered as SVG for crisp PDF export
- **No external servers:** All computation happens locally in your browser

> Inspired by [Evidence.dev](https://evidence.dev) — the markdown-based BI framework that proved SQL and documents belong together.
