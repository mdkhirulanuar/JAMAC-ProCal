# Formula Notes

## CT/VT Multiplier

```text
CT Ratio = CT Primary / CT Secondary
VT Ratio = VT Primary / VT Secondary
Total Multiplier = CT Ratio × VT Ratio
```

## Meter Constant

```text
Primary-side equivalent active constant = Nameplate imp/kWh / Total Multiplier
Primary-side equivalent reactive constant = Nameplate imp/kvarh / Total Multiplier
```

Use nameplate meter constant unless your SOP states otherwise.

## Pulse to Energy

```text
Energy = Pulse Count / Meter Constant × Effective Multiplier
```

Effective multiplier:

- Raw meter pulse/nameplate constant: apply CT/VT multiplier.
- Already primary/billing value: use multiplier = 1.

## Energy to Pulse

```text
Pulse = Energy(kWh base) × Meter Constant / Effective Multiplier
```

MWh is converted internally:

```text
1 MWh = 1000 kWh
```

Meter constant remains `imp/kWh` unless the reactive unit is selected, where it is `imp/kvarh`.

## Accuracy Error

```text
Error % = (Meter Energy - Reference Energy) / Reference Energy × 100
```

Result:

```text
PASS if abs(Error %) <= Tolerance %
FAIL if abs(Error %) > Tolerance %
```

Tolerance selection is a helper. Official pass/fail must follow the approved SOP.

## Maximum Demand

```text
Energy kWh = Pulse / imp_per_kWh × Effective Multiplier
MD kW = Energy kWh / (Interval minutes / 60)
```

This is calculated interval demand from pulse count, not a replacement for official registered MD unless validated.
