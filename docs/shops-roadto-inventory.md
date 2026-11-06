# RoadToSmartBaking shop inventory

## Purpose

This is a source register for the 43 posters in `Shops_Roadto`. It preserves each original image filename alongside the shop name and place shown on its poster. The companion CSV is the import-ready source for a future unified database.

## Excel enrichment

`shops-roadto-inventory.csv` now includes the product line, sector, post-publication flag, source note, and first article URL available in `RoadToSmartBaking.xls`.

- 35 shops have one reliable workbook record.
- 3 shops have multiple possible workbook records and are labelled `Review multiple records`.
- 5 shops have no reliable workbook match.
- The workbook has no dedicated address column. Only DeRoma and Glory Pop contain street addresses inside free-text notes; every other `address` value is intentionally blank.

The original workbook remains a read-only source. The CSV is the working inventory for later database import.

## Web location enrichment

The CSV includes a Google Maps search URL for every shop, plus a current address where web research found one. `web_location_status` and `web_location_note` preserve multi-location, conflicting, and unconfirmed cases rather than presenting them as a single verified address.

## Extraction rules

- `shop_name` is the visible shop/brand name on the poster, not necessarily the filename. For example, `2026_roadtosmartbaking_Andrea-Serra_1.jpg` shows **Bedin**.
- `place` is transcribed exactly as displayed on the poster. It is not a verified postal address, geographic coordinate, or country assignment.
- Every row was read from the poster and visually checked. Do not use this file as proof of a current business address; enrich and verify those fields before publication.

## Inventory

| Year | Shop | Place | Image filename |
| --- | --- | --- | --- |
| 2024 | FICO | Singapore | `01_2024_roadtosmartbaking_fico-singapore.jpg` |
| 2025 | Sorellina | Philadelphia | `01_2025_roadtosmartbaking_sorellina_joe-cicale.jpg` |
| 2024 | Vinarte | Agropoli | `2024_roadtosmartbaking_10-9_Vinarte_1.jpg` |
| 2024 | 90 Seconds | Shenzhen | `2024_roadtosmartbaking_90-seconds_1.jpg` |
| 2024 | 'A Puteca | Firenze | `2024_roadtosmartbaking_a-puteca_1.jpg` |
| 2024 | Brunda | Brindisi | `2024_roadtosmartbaking_Brunda_1.jpg` |
| 2024 | CapVin | Amsterdam | `2024_roadtosmartbaking_CapVin_1.jpg` |
| 2024 | Carlo Fiamma | Amalfi | `2024_roadtosmartbaking_Carlo-Fiamma_1.jpg` |
| 2024 | Pizzeria Cavalese | Jakarta | `2024_roadtosmartbaking_Cavalese_1.jpg` |
| 2024 | Desdott | Milano | `2024_roadtosmartbaking_desdott_1.jpg` |
| 2024 | Elysium | Roma | `2024_roadtosmartbaking_Elysium_1.jpg` |
| 2024 | Mamma Pizza | Las Palmas | `2024_roadtosmartbaking_Mamma-Pizzza_1.jpg` |
| 2024 | Pizza dei Signori | Vicenza | `2024_roadtosmartbaking_Matteo-Grandi_1.jpg` |
| 2024 | nNea Pizza | Amsterdam | `2024_roadtosmartbaking_nNea-Pizza_1.jpg` |
| 2024 | Paglià | Pagliare del Tronto | `2024_roadtosmartbaking_Paglià_1.jpg` |
| 2024 | Sileo | Nucetto | `2024_roadtosmartbaking_Sileo_1_Alternativa.jpg` |
| 2024 | The Italian Cousins | Stockholm | `2024_roadtosmartbaking_the-italian-cousins_01.jpg` |
| 2024 | Triticum | Lugano | `2024_roadtosmartbaking_Triticum_1.jpg` |
| 2024 | Valerio Barralis Patisserie | Magenta | `2024_roadtosmartbaking_Valerio-Barralis_1.jpg` |
| 2025 | Café Grensen | Oslo | `2025_roadtosmartbaking_cafe-grensen_1.jpg` |
| 2025 | Campana | Corigliano Calabro | `2025_roadtosmartbaking_Campana_1.jpg` |
| 2025 | Casa Tobago | Milano | `2025_roadtosmartbaking_Casa-Tobago_1.jpg` |
| 2025 | Cheesefarm | Tbilisi | `2025_roadtosmartbaking_Cheese-farm_1.jpg` |
| 2025 | Impasto | New York | `2025_roadtosmartbaking_Impasto_1.jpg` |
| 2025 | Maiori Pizzeria | Australia's Sunshine Coast | `2025_roadtosmartbaking_maiori-pizzeria_01.jpg` |
| 2025 | Ultra Milano | Milano | `2025_roadtosmartbaking_Ultra.jpg` |
| 2025 | Zia | Roma | `2025_roadtosmartbaking_Zia-Restaurant_1.jpg` |
| 2026 | 22K Pizza | Linz | `2026_roadtosmartbaking_22kPizza_01.jpg` |
| 2026 | Bedin | Genova | `2026_roadtosmartbaking_Andrea-Serra_1.jpg` |
| 2026 | Azzurra | Eski Datça | `2026_roadtosmartbaking_Azzurra_1.jpg` |
| 2026 | Bella Napoli Pizzeria | Riga | `2026_roadtosmartbaking_BellaNapoliRiga_1.jpg` |
| 2026 | Bianca Sicilian Trattoria | Los Angeles | `2026_roadtosmartbaking_Bianca_1.jpg` |
| 2026 | Casa Cinquanta | Roma | `2026_roadtosmartbaking_Casa-50_1.jpg` |
| 2026 | DeRoma | Roma | `2026_roadtosmartbaking_DeRoma_1.jpg` |
| 2026 | Glory Pop | Milano | `2026_roadtosmartbaking_Glorypop_1.jpg` |
| 2026 | Imperfetto | Paris | `2026_roadtosmartbaking_Imperfetto_1.jpg` |
| 2026 | L'Industrie Pizzeria | New York | `2026_roadtosmartbaking_L'Industrie_1.jpg` |
| 2026 | Panificio San Giuseppe | Catania | `2026_roadtosmartbaking_Panificio-San-Giuseppe_IG_01.jpg` |
| 2026 | Romanaccia | Los Angeles | `2026_roadtosmartbaking_Romanaccia_IG_01.jpg` |
| 2026 | Saccharum | Altavilla Milicia | `2026_roadtosmartbaking_Saccharum_1.jpg` |
| 2026 | Salentu | Kelkheim | `2026_roadtosmartbaking_Salentu_1.jpg` |
| 2026 | Trizza Pizza | Novi Sad | `2026_roadtosmartbaking_TrizzaPizza_1.jpg` |
| 2026 | Zio Rigo | Vilnius | `2026_roadtosmartbaking_Zio-Rigo_1.jpg` |
