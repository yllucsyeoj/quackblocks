---
datasources:
  penguins: ./penguins.parquet
  islands: ./islands.parquet
plotDefaults:
  color:
    legend: true
---

# QuackBlocks Demo — Palmer Penguins

This note demonstrates what QuackBlocks can do. The data comes from the Palmer Penguins dataset (60 representative rows).

## Table output

```quack
SELECT species, island, sex, body_mass_g
FROM penguins
ORDER BY species, body_mass_g DESC
LIMIT 10
```

## Bar chart — Average body mass by species

```quack
chart=bar caption="Average body mass by species" { "x": "species", "y": "avg_mass" }
SELECT species, AVG(body_mass_g)::INT AS avg_mass
FROM penguins
GROUP BY species
ORDER BY avg_mass DESC
```

## Dot plot — Bill dimensions

```quack
chart=dot caption="Bill length vs depth" { "x": "bill_length_mm", "y": "bill_depth_mm", "stroke": "species" }
SELECT bill_length_mm, bill_depth_mm, species
FROM penguins
```

## Box plot — Body mass distribution

```quack
chart=boxY caption="Body mass distribution by species" { "x": "species", "y": "body_mass_g" }
SELECT species, body_mass_g
FROM penguins
```

## Join — Penguins with island metadata

```quack
chart=bar caption="Average body mass by island area" { "x": "island", "y": "avg_mass" }
SELECT
  i.island,
  i.area_km2,
  AVG(p.body_mass_g)::INT AS avg_mass
FROM penguins p
JOIN islands i ON p.island = i.island
GROUP BY i.island, i.area_km2
ORDER BY avg_mass DESC
```

## Faceted — Flipper length by species and sex

```quack
chart=dot caption="Flipper length by species and sex" { "x": "body_mass_g", "y": "flipper_length_mm", "fx": "species", "stroke": "sex" }
SELECT body_mass_g, flipper_length_mm, species, sex
FROM penguins
```

## All penguins as a table

```quack
caption="Full dataset (60 rows)"
SELECT * FROM penguins
```
