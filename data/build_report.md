# Build report — LAPaL patent coverage snapshot

Generated 27 Oct 2026 20:50. Snapshot: `data/patents_data.json`.

- **124 entries** from 127 confirmed workbook rows (4 excluded)
- **46 with MedsPaL data**, 78 from LAPaL cards (marked preliminary)
- **46 HIV entries**, of which 21 with MedsPaL data (the set for the "by country" view)
- 397 patent families; 396 with a real filing date, 1 estimated (expiry − 20 y), 3 with no expiry date
- Card families: 79 read as a structured list, 19 from free text, 67 with no countries, 4 with no status

## Excluded rows

- Follow-up row 81: row cleared in the review sheet
- Follow-up row 2: row cleared in the review sheet
- Follow-up row 162: row cleared in the review sheet
- Follow-up row 165: row cleared in the review sheet

## Rows merged into one entry (same LAPaL page)

- DSM265 ← rows [20, 86] (DSM265; DSM-265)
- Glecaprevir Pibrentasvir LA injection ← rows [88, 3] (Glecaprevir Pibrentasvir LA injection; TECH SDN + Glecapevir/Pibrentasvir (LAI))
- Rilpivirine 2-monthly ← rows [50, 110] (Rilpivirine; Rilpivirine 2-monthly)

## MedsPaL uuid choices

- Glecaprevir Pibrentasvir LA injection: no MedsPaL uuid on the LAPaL page; workbook uuid 5e0b6eb4-b061-4094-aea5-d00507846656 used
- Paliperidone Palmitate Once-Monthly (PP1M): page uses MedsPaL 6c0bd7c7-b69d-4dba-82f1-bf76db170624, workbook row(s) [104] give 63975d01-65fd-4b2b-adbb-6d6d9c502de3; page uuid used

## Low- and middle-income countries only

High-income and unclassified countries are left out (Lobna, 27 Oct): 13032 family × country records dropped. The check below compares LMICs only.

## Check against the MedsPaL report map

34 of 46 MedsPaL entries give exactly the same granted and filed LMICs as medspal.org today, for both "any patent" and "compound patent". Remaining differences: "Rejected - under appeal" is not in force here but filed on medspal.org, and a few regional EA / ARIPO / EP records.

- **Bedaquiline**: any/filed: only ours -; only MedsPaL ['EG']
- **Cabotegravir**: any/granted: only ours ['AZ', 'KG']; only MedsPaL - | any/filed: only ours -; only MedsPaL ['AZ', 'KG']
- **Glecaprevir (G)**: compound/granted: only ours ['AZ', 'KG']; only MedsPaL - | compound/filed: only ours -; only MedsPaL ['AZ', 'KG']
- **Islatravir (ISL)**: compound/granted: only ours -; only MedsPaL ['BA', 'MK']
- **Tenofovir alafenamide (TAF)**: any/granted: only ours ['MW']; only MedsPaL - | any/filed: only ours -; only MedsPaL ['EC', 'MW']
- **Bedaquiline Long-Acting**: any/filed: only ours -; only MedsPaL ['EG']
- **CAB-LA (Cabotegravir 2-Monthly)**: any/granted: only ours ['AZ', 'KG']; only MedsPaL - | any/filed: only ours -; only MedsPaL ['AZ', 'KG']
- **Cabotegravir + Rilpivirine**: compound/filed: only ours -; only MedsPaL ['VE']
- **Glecaprevir Pibrentasvir LA injection**: compound/granted: only ours ['AZ', 'KG']; only MedsPaL - | compound/filed: only ours -; only MedsPaL ['AZ', 'KG']
- **MK-8591D Islatravir + Lenacapavir**: any/filed: only ours -; only MedsPaL ['EG'] | compound/granted: only ours -; only MedsPaL ['BA', 'MK'] | compound/filed: only ours ['MK']; only MedsPaL ['EG']
- **Rilpivirine 2-monthly**: any/filed: only ours -; only MedsPaL ['EG'] | compound/filed: only ours -; only MedsPaL ['VE']
- **Tenofovir-Lamivudine-Dolutegravir (TLD) - long-acting injectable (LAI) (TLD LAI)**: any/granted: only ours ['MW']; only MedsPaL - | any/filed: only ours -; only MedsPaL ['EC', 'MW'] | compound/filed: only ours -; only MedsPaL ['GM', 'MW']

Countries with no MedsPaL record for a family use the family-level status from the summary in the product JSON (as the LAPaL patent map does). These are excluded from the check above, which compares MedsPaL records only.

- LMICs: 282 granted, 60 filed, 362 not in force (family × country). For these, the map can differ from medspal.org.

Family records that MedsPaL has not linked to the product are left out, as on medspal.org: 1219 records across 17 products.

## MedsPaL families with no countries (timeline only)

None

## MedsPaL documents not in any of the product's families

None

## Statuses not mapped to a colour

None
- card WO2015084859 (compounds/10e84imab#2): ZA To be confirmed

## Country codes not in the World Bank list

None

Former states on old MedsPaL records, left off the map: YU (138), CS (50), SU (38)

## Voluntary licences

Territories read from `licence-territory-dashboard/data/HIV_PrEP_licence_territories_v2_3.xlsx` (LMICs only).

- **Cabotegravir** (ViiV Healthcare, MPP licence): 113 LMICs in territory; entries: compounds/cabotegravir, formulations/cab-la-cabotegravir-2-monthly
- **Lenacapavir** (Gilead Sciences, bilateral licence): 106 LMICs in territory; entries: compounds/lenacapavir-len, formulations/lenacapavir-6-monthly, formulations/lenacapavir-once-yearly
- **Alimatravir** (MSD, bilateral licence): 115 LMICs in territory; entries: compounds/alimatravir-mk-8527

## Card filing dates (Google Patents)

168 of 169 card families have the real filing date of their representative patent from Google Patents; 1 still estimated (expiry − 20 y), 0 with no date.

All lookups succeeded.

### Filing date and card expiry not about 20 years apart (26) — please check the card

| Card family | Representative patent | Filed (Google Patents) | Expiry on card | Years |
|---|---|---|---|---|
| compounds/atovaquone#1 | US5053432 | 1989-12-26 | 2003-04-14 | 13.3 |
| compounds/n6ls-vh3810109#1 | WO2023114951 | 2022-12-16 | 2046-02-16 | 23.2 |
| compounds/rifabutin#1 | US4219478 | 1978-06-06 | 1996-06-02 | 18.0 |
| formulations/aripiprazole#1 | US8759351B2 | 2012-10-10 | 2035-03-13 | 22.4 |
| formulations/delamanid-lipid-based-nanoparticle-formulation#1 | WO2011050388A1 | 2009-10-30 | 2012-12-30 | 3.2 |
| formulations/gemcitabine-intravesical-lai#4 | US4808614 | 1987-06-04 | 2010-05-05 | 22.9 |
| formulations/insulin-efsitora#4 | WO2016178905 | 2016-04-28 | 2025-04-28 | 9.0 |
| formulations/paliperidone-palmitate-three-monthly-pp3m#1 | WO2016164218 | 2016-03-30 | 2026-03-30 | 10.0 |
| technology/enhanced-antibody-drug-conjugates-adc#1 | US11510993B2 | 2016-09-30 | 2038-11-15 | 22.1 |
| technology/enhanced-antibody-drug-conjugates-adc#3 | US20220033518A1 | 2020-08-26 | 2022-03-02 | 1.5 |
| technology/fluidcrystal#1 | WO2005117830 | 2005-06-06 | 2035-06-06 | 30.0 |
| technology/hydrogel-microspheres-with-v-eliminative-linker-technology#4 | US10413594B2 | 2018-06-22 | 2024-06-22 | 6.0 |
| technology/in-situ-microimplants#3 | US10182982B2 | 2018-04-04 | 2031-05-31 | 13.2 |
| technology/in-situ-microimplants#5 | US20180318208A1 | 2018-07-11 | 2024-05-31 | 5.9 |
| technology/in-situ-microimplants#4 | US11007139B2 | 2019-06-28 | 2031-05-31 | 11.9 |
| technology/in-situ-microimplants#2 | US11918682B2 | 2021-02-10 | 2032-04-16 | 11.2 |
| technology/intasyl-self-delivery-technology#2 | US10240149B2 | 2015-06-02 | 2031-03-24 | 15.8 |
| technology/mesoporous-silica-nanoparticles-msnp#1 | US10343903B2 | 2017-09-07 | 2031-07-13 | 13.8 |
| technology/mesoporous-silica-nanoparticles-msnp#2 | US10668024B2 | 2018-06-01 | 2028-12-08 | 10.5 |
| technology/multi-arm-polymer-conjugated-immmunotherapies#1 | WO2018132496A1 | 2018-01-10 | 2019-10-17 | 1.8 |
| technology/poz-polymer-lai#2 | US11224595B2 | 2019-06-10 | 2032-06-18 | 13.0 |
| technology/scalable-process-to-achieve-la-injectable-delivery-of-insoluble-medicines#1 | WO2022101623 (A1) | 2021-11-10 | 2034-05-14 | 12.5 |
| technology/starsilon-transdermal-patch#3 | WO2020118091A! | 2019-12-05 | 2019-12-05 | 0.0 |
| technology/thin-film-polycaprolactone-device-implant#1 | US11185499B2 | 2020-04-17 | 2032-04-12 | 12.0 |
| technology/transcon-technology#1 | AU2023201709B2 | 2023-03-20 | 2037-09-28 | 14.5 |
| technology/transcon-technology#2 | AU2023210599B2 | 2023-08-02 | 2037-05-01 | 13.7 |

## Card families with no expiry date on the card

- formulations/aripiprazole#2 — US20240131024A1
- formulations/atazanavir-ritonavir-tenofovir-nanoparticle-suspension#1 — US20230270677A1
- technology/starsilon-transdermal-patch#4 — EP4351536A1

## Card status text not understood

None

## Errors

None

## Entries

| Entry | Type | TA | Source | Families | Countries (granted / filed / not in force) |
|---|---|---|---|---|---|
| [10E8.4/iMab](https://lapal.ch/compounds/10e84imab) | Compound | HIV | LAPaL card (preliminary) | 2 | 0 / 0 / 6 |
| [Acoziborole](https://lapal.ch/compounds/acoziborole) | Compound | Sleeping sickness | LAPaL card (preliminary) | 1 | 17 / 0 / 1 |
| [AKG-100](https://lapal.ch/compounds/akg-100) | Compound | Other(s), TB | LAPaL card (preliminary) | 2 | 28 / 25 / 0 |
| [albuvirtide (ABT)](https://lapal.ch/compounds/albuvirtide) | Compound | HIV | LAPaL card (preliminary) | 2 | 1 / 1 / 7 |
| [Alimatravir MK-8527](https://lapal.ch/compounds/alimatravir-mk-8527) | Compound | HIV | MedsPaL | 1 | 42 / 8 / 17 |
| [Atovaquone](https://lapal.ch/compounds/atovaquone) | Compound | Malaria | LAPaL card (preliminary) | 1 | 0 / 0 / 0 |
| [Bedaquiline](https://lapal.ch/compounds/bedaquiline) | Compound | TB | MedsPaL | 5 | 42 / 4 / 32 |
| [Bictegravir (BIC)](https://lapal.ch/compounds/bictegravir-bic) | Compound | HIV | MedsPaL | 3 | 74 / 6 / 5 |
| [Budigalimab](https://lapal.ch/compounds/budigalimab) | Compound | Cancer, HIV | LAPaL card (preliminary) | 2 | 9 / 2 / 9 |
| [Cabotegravir](https://lapal.ch/compounds/cabotegravir) | Compound | HIV | MedsPaL | 4 | 20 / 0 / 10 |
| [CIS43LS (mAb)](https://lapal.ch/compounds/cis43ls) | Compound | Malaria | LAPaL card (preliminary) | 1 | 0 / 0 / 5 |
| [Clesrovimab](https://lapal.ch/compounds/clesrovimab) | Compound | RSV | MedsPaL | 2 | 30 / 17 / 18 |
| [Dapivirine (DPV)](https://lapal.ch/compounds/dapivirine-dpv) | Compound | HIV | MedsPaL | 2 | 0 / 0 / 53 |
| [DSM265](https://lapal.ch/compounds/dsm265) | Compound | Malaria | LAPaL card (preliminary) | 1 | 8 / 0 / 0 |
| [Efruxifermin (mAb)](https://lapal.ch/compounds/efruxifermin) | Compound | MASH | LAPaL card (preliminary) | 4 | 19 / 32 / 2 |
| [ELQ-331](https://lapal.ch/compounds/elq-331) | Compound | Malaria | LAPaL card (preliminary) | 1 | 0 / 0 / 0 |
| [Fluphenazine](https://lapal.ch/compounds/fluphenazine) | Compound | Mental health | LAPaL card (preliminary) | 1 | 0 / 0 / 0 |
| [Glecaprevir (G)](https://lapal.ch/compounds/glecaprevir-and-pibrentasvir-gp) | Compound | HCV | MedsPaL | 14 | 34 / 3 / 2 |
| [Ibalizumab](https://lapal.ch/compounds/ibalizumab) | Compound | HIV | LAPaL card (preliminary) | 2 | 0 / 0 / 0 |
| [Islatravir (ISL)](https://lapal.ch/compounds/islatravir-isl) | Compound | HIV | MedsPaL | 2 | 25 / 8 / 6 |
| [Ivermectin](https://lapal.ch/compounds/ivermectin) | Compound | COVID 19, Malaria, Other(s) | LAPaL card (preliminary) | 2 | 0 / 0 / 0 |
| [L9LS (mAb)](https://lapal.ch/compounds/l9ls) | Compound | Malaria | LAPaL card (preliminary) | 1 | 0 / 5 / 0 |
| [Lenacapavir (LEN)](https://lapal.ch/compounds/lenacapavir-len) | Compound | HIV | MedsPaL | 5 | 63 / 7 / 10 |
| [Lenacapavir pacfosacil (GS-4182)](https://lapal.ch/compounds/lenacapavir-pacfosacil-gs-4182) | Compound | HIV | LAPaL card (preliminary) | 5 | 0 / 48 / 0 |
| [lepetegravir (GS-1720)](https://lapal.ch/compounds/lepetegravir-gs-1720) | Compound | HIV | MedsPaL | 1 | 9 / 39 / 6 |
| [Lotivibart (N6LS) (VH3810109) (mAb)](https://lapal.ch/compounds/n6ls-vh3810109) | Compound | HIV | LAPaL card (preliminary) | 4 | 3 / 9 / 0 |
| [naltrexone](https://lapal.ch/compounds/naltrexone) | Compound | Substance use disorders | MedsPaL | 2 | 0 / 0 / 10 |
| [Niclosamide](https://lapal.ch/compounds/niclosamide) | Compound | COVID 19 | LAPaL card (preliminary) | 1 | 0 / 0 / 0 |
| [Nirsevimab Beyfortus](https://lapal.ch/compounds/nirsevimab) | Compound |  | MedsPaL | 4 | 20 / 7 / 5 |
| [Paliperidone](https://lapal.ch/compounds/paliperidone) | Compound | Mental health | MedsPaL | 4 | 16 / 4 / 35 |
| [PGDM1400 (mAb)](https://lapal.ch/compounds/pgdm1400) | Compound | HIV | LAPaL card (preliminary) | 1 | 0 / 0 / 0 |
| [PGT-121 (mAb)](https://lapal.ch/compounds/pgt-121) | Compound | HIV | LAPaL card (preliminary) | 1 | 0 / 0 / 0 |
| [Clulevibart (RB0026)](https://lapal.ch/compounds/rb0026) | Compound |  | LAPaL card (preliminary) | 1 | 1 / 5 / 0 |
| [retatrutide](https://lapal.ch/compounds/retatrutide) | Compound | Cardiovascular, Diabetes, Kidney Disease, Metabolic Dysfunction-Associated Steatohepatitis (MASH/NASH), Obesity / Weight Management, Obstructive sleep apnea, Ostheoarthritis, Pain management (incl. joints, lower back, knee) | MedsPaL | 2 | 29 / 15 / 19 |
| [rifabutin](https://lapal.ch/compounds/rifabutin) | Compound | TB | LAPaL card (preliminary) | 1 | 0 / 0 / 0 |
| [Risperidone](https://lapal.ch/compounds/risperidone) | Compound | Mental health : "incl. schizophrenia" | LAPaL card (preliminary) | 3 | 0 / 0 / 0 |
| [survodutide](https://lapal.ch/compounds/survodutide) | Compound | Cardiovascular, Diabetes, Kidney Disease, Metabolic Dysfunction-Associated Steatohepatitis (MASH/NASH), Obesity / Weight Management | MedsPaL | 3 | 28 / 3 / 20 |
| [TBAJ-587 fumarate](https://lapal.ch/compounds/tbaj-587-fumarate) | Compound | TB | LAPaL card (preliminary) | 1 | 11 / 0 / 0 |
| [Tenofovir alafenamide (TAF)](https://lapal.ch/compounds/tenofovir-alafenamide-taf) | Compound |  | MedsPaL | 3 | 39 / 4 / 32 |
| [Retavibart TNM-001](https://lapal.ch/compounds/tnm-001) | Compound | RSV | MedsPaL | 2 | 2 / 5 / 6 |
| [ulonivirine (ULO)](https://lapal.ch/compounds/ulonivirine-mk-8507) | Compound | HIV | MedsPaL | 1 | 39 / 13 / 16 |
| [VH-184 (VH-4524184) Long-Acting HIV Treatment Compound](https://lapal.ch/compounds/vh-184-vh-4524184) | Compound | HIV | LAPaL card (preliminary) | 2 | 19 / 12 / 4 |
| [VH-310 (VH-4367310; cabotegravir stearate; XVIR-110)](https://lapal.ch/compounds/vh-310-vh-4367310) | Compound | HIV | LAPaL card (preliminary) | 5 | 9 / 5 / 9 |
| [fremocapavir (VH-499)](https://lapal.ch/compounds/vh-499-vh-4011499) | Compound | HIV | MedsPaL | 3 | 28 / 9 / 0 |
| [VRC01 (mAb)](https://lapal.ch/compounds/vrc01) | Compound | HIV | LAPaL card (preliminary) | 1 | 2 / 0 / 0 |
| [VRC07-523LS (mAb) (TMB-380)](https://lapal.ch/compounds/vrc07-523ls) | Compound | HIV | LAPaL card (preliminary) | 1 | 0 / 7 / 0 |
| [Aripiprazole](https://lapal.ch/formulations/aripiprazole) | Formulation & regimen | Mental health | LAPaL card (preliminary) | 2 | 0 / 0 / 0 |
| [Atazanavir + Ritonavir + Tenofovir Nanoparticle suspension](https://lapal.ch/formulations/atazanavir-ritonavir-tenofovir-nanoparticle-suspension) | Formulation & regimen | HIV | LAPaL card (preliminary) | 1 | 0 / 0 / 0 |
| [Bedaquiline Long-Acting](https://lapal.ch/formulations/bedaquiline-long-acting) | Formulation & regimen | TB | MedsPaL | 5 | 42 / 4 / 32 |
| [Bictegravir-PLGA nanoformulation](https://lapal.ch/formulations/bictegravir-plga-nanoformulation) | Formulation & regimen | HIV | LAPaL card (preliminary) | 2 | 0 / 0 / 0 |
| [Buprenorphine](https://lapal.ch/formulations/buprenorphine) | Formulation & regimen | Substance use disorders | LAPaL card (preliminary) | 2 | 17 / 2 / 1 |
| [CAB-LA (Cabotegravir 2-Monthly)](https://lapal.ch/formulations/cab-la-cabotegravir-2-monthly) | Formulation & regimen | HIV | MedsPaL | 4 | 20 / 0 / 10 |
| [Cabotegravir 4-Monthly (Q4M)](https://lapal.ch/formulations/cabotegravir-4-monthly-q4m) | Formulation & regimen | HIV | MedsPaL | 4 | 9 / 2 / 22 |
| [Cabotegravir & Lenacapavir](https://lapal.ch/formulations/cabotegravir-lenacapavir) | Formulation & regimen | HIV | MedsPaL | 9 | 64 / 7 / 10 |
| [cabotegravir PH20](https://lapal.ch/formulations/cabotegravir-ph20) | Formulation & regimen | HIV | LAPaL card (preliminary) | 1 | 0 / 0 / 0 |
| [Cabotegravir + Rilpivirine](https://lapal.ch/formulations/cabotegravir-rilpivirine) | Formulation & regimen | HIV | MedsPaL | 10 | 42 / 2 / 26 |
| [CD388](https://lapal.ch/formulations/cd388-mab) | Formulation & regimen | Other(s) | LAPaL card (preliminary) | 2 | 3 / 28 / 18 |
| [Delamanid Lipid-Based Nanoparticle Formulation](https://lapal.ch/formulations/delamanid-lipid-based-nanoparticle-formulation) | Formulation & regimen | TB | LAPaL card (preliminary) | 1 | 0 / 0 / 0 |
| [Depulfavirine nanosphere LAI](https://lapal.ch/formulations/depulfavirine-nanosphere-lai) | Formulation & regimen | HIV | LAPaL card (preliminary) | 1 | 8 / 2 / 4 |
| [Gemcitabine Intravesical LAI](https://lapal.ch/formulations/gemcitabine-intravesical-lai) | Formulation & regimen | Oncology | LAPaL card (preliminary) | 4 | 11 / 0 / 2 |
| [Glecaprevir Pibrentasvir LA injection](https://lapal.ch/formulations/glecaprevir-pibrentasvir-la-injection) | Formulation & regimen |  | MedsPaL | 13 | 34 / 3 / 2 |
| [Insulin Efsitora](https://lapal.ch/formulations/insulin-efsitora) | Formulation & regimen | Diabetes | LAPaL card (preliminary) | 4 | 34 / 27 / 0 |
| [Insulin Icodec](https://lapal.ch/formulations/insulin-icodec) | Formulation & regimen | Diabetes | MedsPaL | 2 | 16 / 2 / 6 |
| [Lenacapavir 6-Monthly](https://lapal.ch/formulations/lenacapavir-6-monthly) | Formulation & regimen | HIV | MedsPaL | 8 | 63 / 7 / 11 |
| [Lenacapavir Once-Yearly](https://lapal.ch/formulations/lenacapavir-once-yearly) | Formulation & regimen | HIV | MedsPaL | 8 | 63 / 7 / 11 |
| [lenacapavir + teropavimab + zinlirvimab](https://lapal.ch/formulations/lenacapavir-teropavimab-zinlirvimab) | Formulation & regimen | HIV | LAPaL card (preliminary) | 1 | 0 / 7 / 0 |
| [Lopinavir, Ritonavir, and Tenofovir (LRT) TLC-ART 101](https://lapal.ch/formulations/lopinavir-ritonavir-and-tenofovir-lrt-tlc-art-101) | Formulation & regimen | HIV | LAPaL card (preliminary) | 1 | 0 / 2 / 0 |
| [LY03010 (Paliperidone Palmitate PP1M)](https://lapal.ch/formulations/ly03010-paliperidone-palmitate-once-monthly-pp1m) | Formulation & regimen | Mental health | LAPaL card (preliminary) | 1 | 2 / 0 / 0 |
| [MK-8591B Islatravir + Ulonivirine](https://lapal.ch/formulations/mk-8591b-islatravir-ulonivirine) | Formulation & regimen | HIV | MedsPaL | 3 | 40 / 17 / 11 |
| [MK-8591D Islatravir + Lenacapavir](https://lapal.ch/formulations/mk-8591d-islatravir-and-lenacapavir) | Formulation & regimen | HIV | MedsPaL | 8 | 48 / 8 / 27 |
| [Olanzapine Pamoate](https://lapal.ch/formulations/olanzapine-pamoate) | Formulation & regimen | psychotic disorders | LAPaL card (preliminary) | 2 | 0 / 0 / 0 |
| [ORKA-001 (mAb)](https://lapal.ch/formulations/orka-001-mab) | Formulation & regimen | Psoriasis | LAPaL card (preliminary) | 1 | 0 / 14 / 0 |
| [Paliperidone Palmitate Once-Monthly (PP1M)](https://lapal.ch/formulations/paliperidone-palmitate-once-monthly-pp1m) | Formulation & regimen | psychotic disorders | MedsPaL | 4 | 16 / 4 / 35 |
| [Paliperidone Palmitate Six-Monthly (PP6M)](https://lapal.ch/formulations/paliperidone-palmitate-six-monthly-pp6m) | Formulation & regimen | psychotic disorders | LAPaL card (preliminary) | 3 | 12 / 0 / 2 |
| [Paliperidone Palmitate Three Monthly (PP3M)](https://lapal.ch/formulations/paliperidone-palmitate-three-monthly-pp3m) | Formulation & regimen | psychotic disorders | LAPaL card (preliminary) | 2 | 15 / 0 / 1 |
| [Pembrolizumab Keytruda](https://lapal.ch/formulations/pembrolizumab) | Formulation & regimen | Oncology | MedsPaL | 5 | 16 / 7 / 4 |
| [Rifapentine LAI](https://lapal.ch/formulations/rifapentine-lai) | Formulation & regimen | TB | LAPaL card (preliminary) | 2 | 0 / 7 / 0 |
| [Rilpivirine 2-monthly](https://lapal.ch/formulations/rilpivirine-2-monthly) | Formulation & regimen | HIV | MedsPaL | 5 | 43 / 3 / 23 |
| [Rilpivirine Prodrug Nanoformulation (NM3RPV)](https://lapal.ch/formulations/rilpivirine-prodrug-nanoformulation-nm3rpv) | Formulation & regimen | HIV | LAPaL card (preliminary) | 2 | 0 / 0 / 5 |
| [Semaglutide](https://lapal.ch/formulations/semaglutide-sema) | Formulation & regimen | Diabetes, Obesity | MedsPaL | 6 | 19 / 6 / 10 |
| [Sorfequiline (TBAJ-876) tartrate](https://lapal.ch/formulations/sorfequiline-tbaj-876-tartrate) | Formulation & regimen | TB | LAPaL card (preliminary) | 1 | 11 / 0 / 0 |
| [Tenofovir-Lamivudine-Dolutegravir (TLD) - long-acting injectable (LAI) (TLD LAI)](https://lapal.ch/formulations/tenofovir-lamivudine-dolutegravir-tld-long-acting-injectable-lai-tld-lai) | Formulation & regimen | HBV, HIV | MedsPaL | 17 | 41 / 4 / 40 |
| [Teropavimab + Zinlirvimab](https://lapal.ch/formulations/teropavimab-zinlirvimab) | Formulation & regimen | HIV | LAPaL card (preliminary) | 3 | 13 / 1 / 0 |
| [Tirzepatide TIRZE](https://lapal.ch/formulations/tirzepatide-tirze) | Formulation & regimen | Diabetes, Obesity, Other(s) | MedsPaL | 2 | 41 / 7 / 14 |
| [Ultra-Long-Acting Dimeric Bictegravir Prodrug](https://lapal.ch/formulations/ultra-long-acting-dimeric-bictegravir-prodrug) | Formulation & regimen | HIV | LAPaL card (preliminary) | 1 | 1 / 5 / 0 |
| [Ultra Long-Acting Tenofovir ProTide](https://lapal.ch/formulations/ultra-long-acting-tenofovir-protide) | Formulation & regimen | HBV, HIV | LAPaL card (preliminary) | 1 | 0 / 0 / 5 |
| [3D printed intravaginal rings](https://lapal.ch/technology/3d-printed-intravaginal-rings) | Technology | platform | MedsPaL | 1 | 8 / 0 / 0 |
| [BEPO®](https://lapal.ch/technology/bepo) | Technology |  | MedsPaL | 3 | 16 / 4 / 11 |
| [Cloudbreak (r)](https://lapal.ch/technology/cloudbreak-r) | Technology | HIV, Oncology, Other(s) | LAPaL card (preliminary) | 3 | 3 / 28 / 18 |
| [Dapivirine Monthly Vaginal Ring](https://lapal.ch/technology/dapivirine-monthly-vaginal-ring) | Technology |  | MedsPaL | 2 | 0 / 0 / 53 |
| [DelSiTech Silica Matrix Drug Delivery](https://lapal.ch/technology/delsitech-silica-matrix-drug-delivery) | Technology |  | MedsPaL | 3 | 8 / 0 / 5 |
| [DepoFoam (Proprietary multivesicular liposome (pMVL) technology)](https://lapal.ch/technology/depofoam-proprietary-multivesicular-liposome-pmvl-technology) | Technology | platform | LAPaL card (preliminary) | 2 | 0 / 0 / 0 |
| [Diffusphere Intraarticular Injectable Technology](https://lapal.ch/technology/diffusphere-intraarticular-injectable-technology) | Technology | platform | LAPaL card (preliminary) | 1 | 0 / 0 / 0 |
| [Drug Combination Nanoparticles (DcNP)](https://lapal.ch/technology/drug-combination-nanoparticles-dcnp) | Technology | HIV | MedsPaL | 20 | 44 / 0 / 41 |
| [Enhanced Antibody Drug Conjugates (ADC)](https://lapal.ch/technology/enhanced-antibody-drug-conjugates-adc) | Technology | Cancer | LAPaL card (preliminary) | 3 | 0 / 0 / 0 |
| [Ethylene Vinyl Acetate Implant (VitalDose®)](https://lapal.ch/technology/ethylene-vinyl-acetate-implant-vitaldose) | Technology | platform | LAPaL card (preliminary) | 4 | 3 / 6 / 0 |
| [Extruded Polymer Device (EXPD)](https://lapal.ch/technology/extruded-polymer-device-expd) | Technology | Contraception, HIV, Multipurpose technology, Other(s) | MedsPaL | 1 | 1 / 5 / 0 |
| [Fatty acid bundles](https://lapal.ch/technology/fatty-acid-bundles) | Technology | Diabetes, Oncology, Other(s) | MedsPaL | 1 | 1 / 4 / 7 |
| [FluidCrystal®](https://lapal.ch/technology/fluidcrystal) | Technology | platform | LAPaL card (preliminary) | 3 | 18 / 2 / 0 |
| [Fusogenic Liposome-coated Porous Silicon Nanoparticles](https://lapal.ch/technology/fusogenic-liposome-coated-porous-silicon-nanoparticles) | Technology | platform | LAPaL card (preliminary) | 1 | 0 / 0 / 0 |
| [Hydrogel Microspheres with β-eliminative Linker Technology](https://lapal.ch/technology/hydrogel-microspheres-with-v-eliminative-linker-technology) | Technology | platform | LAPaL card (preliminary) | 4 | 0 / 0 / 0 |
| [In-situ Microimplants](https://lapal.ch/technology/in-situ-microimplants) | Technology | platform | LAPaL card (preliminary) | 5 | 0 / 0 / 0 |
| [INTASYL self-delivery technology](https://lapal.ch/technology/intasyl-self-delivery-technology) | Technology | platform | LAPaL card (preliminary) | 3 | 0 / 0 / 0 |
| [LAPSCOVERY (Long Acting Protein / Peptide Discovery Platform Technology)](https://lapal.ch/technology/lapscovery-long-acting-protein-peptide-discovery-platform-technology) | Technology | platform | LAPaL card (preliminary) | 3 | 1 / 2 / 1 |
| [Long-acting hyFc Fusion Technology](https://lapal.ch/technology/long-acting-hyfc-fusion-technology) | Technology | Diabetes, Oncology, Other(s) | LAPaL card (preliminary) | 7 | 2 / 7 / 0 |
| [Long-Acting Injectable Solid Drug Nanoparticle (SDN) Platform](https://lapal.ch/technology/long-acting-injectable-solid-drug-nanoparticle-sdn-platform) | Technology |  | MedsPaL | 17 | 54 / 0 / 19 |
| [LYNX](https://lapal.ch/technology/lynx) | Technology | platform | LAPaL card (preliminary) | 3 | 4 / 5 / 0 |
| [Mesoporous silica nanoparticles (MSNP)](https://lapal.ch/technology/mesoporous-silica-nanoparticles-msnp) | Technology | platform | LAPaL card (preliminary) | 2 | 0 / 0 / 0 |
| [Multi-Arm Polymer Conjugated Immmunotherapies](https://lapal.ch/technology/multi-arm-polymer-conjugated-immmunotherapies) | Technology |  | LAPaL card (preliminary) | 1 | 0 / 0 / 0 |
| [MZCL Intravaginal Ring](https://lapal.ch/technology/mzcl-intravaginal-ring) | Technology | platform | LAPaL card (preliminary) | 4 | 0 / 0 / 12 |
| [Nanocrystalline Prodrug Technology](https://lapal.ch/technology/nanocrystalline-prodrug-technology) | Technology | HIV | LAPaL card (preliminary) | 1 | 9 / 5 / 9 |
| [NanoPortal™](https://lapal.ch/technology/nanoportal) | Technology | Diabetes, Oncology, Other(s) | LAPaL card (preliminary) | 4 | 1 / 5 / 0 |
| [Peptide-like hydrogels as a long-acting injectable drug delivery platform](https://lapal.ch/technology/peptide-like-hydrogels-as-a-long-acting-injectable-drug-delivery-platform) | Technology | Contraception, HIV, Malaria, Mental health, Multipurpose technology, Oncology, Substance use disorders | LAPaL card (preliminary) | 1 | 0 / 6 / 0 |
| [Plexis Long-acting Injectable](https://lapal.ch/technology/plexis-long-acting-injectable) | Technology | Other(s), Pain management | LAPaL card (preliminary) | 2 | 6 / 0 / 3 |
| [POZ™ polymer LAI](https://lapal.ch/technology/poz-polymer-lai) | Technology |  | LAPaL card (preliminary) | 2 | 0 / 0 / 0 |
| [Refillable Nanofluidic Implant](https://lapal.ch/technology/refillable-nanofluidic-implant) | Technology | platform | LAPaL card (preliminary) | 2 | 0 / 5 / 0 |
| [SAFA (anti-Serum Albumin Fab Associated) platform technology](https://lapal.ch/technology/safa-anti-serum-albumin-fab-associated-platform-technology) | Technology | Oncology, Other(s) | LAPaL card (preliminary) | 7 | 14 / 21 / 2 |
| [Scalable process to achieve LA injectable delivery of insoluble medicines](https://lapal.ch/technology/scalable-process-to-achieve-la-injectable-delivery-of-insoluble-medicines) | Technology | platform | LAPaL card (preliminary) | 1 | 0 / 0 / 0 |
| [STARSILON Transdermal Patch](https://lapal.ch/technology/starsilon-transdermal-patch) | Technology | platform | LAPaL card (preliminary) | 4 | 0 / 0 / 0 |
| [Thin Film Polycaprolactone Device Implant](https://lapal.ch/technology/thin-film-polycaprolactone-device-implant) | Technology | platform | LAPaL card (preliminary) | 1 | 0 / 0 / 0 |
| [TransCon Technology](https://lapal.ch/technology/transcon-technology) | Technology | platform | LAPaL card (preliminary) | 2 | 0 / 0 / 0 |
| [Tunable Biodegradable Ultra-Long-Acting Polymeric Solid Implant (PSI)](https://lapal.ch/technology/tunable-biodegradable-ultra-long-acting-polymeric-solid-implant-psi) | Technology |  | MedsPaL | 3 | 24 / 0 / 5 |
| [Ultra-Long-Acting Multi-Purpose In-situ Forming Implant (ISFI)](https://lapal.ch/technology/ultra-long-acting-multi-purpose-in-situ-forming-implant-isfi) | Technology |  | MedsPaL | 1 | 0 / 4 / 6 |
| [Vaginal Film (MATRIX)](https://lapal.ch/technology/vaginal-film-matrix) | Technology | platform | LAPaL card (preliminary) | 2 | 0 / 0 / 0 |
