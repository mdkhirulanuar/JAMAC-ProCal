# Formula Notes

## Meter connection type

### Direct Meter

```text
Multiplier = 1
Energy = Pulse / Meter Constant
```

### CT Operated Meter

```text
CT Ratio = CT Primary / CT Secondary
Multiplier = CT Ratio
Energy = Pulse / Meter Constant × Multiplier
```

### CT/PT Operated Meter

```text
CT Ratio = CT Primary / CT Secondary
VT Ratio = VT Primary / VT Secondary
Multiplier = CT Ratio × VT Ratio
Energy = Pulse / Meter Constant × Multiplier
```

## Register basis

Primary/billing register readings normally already include multiplier. Do not apply CT/VT multiplier again.

Raw/secondary pulse readings normally use the nameplate meter constant and need the multiplier unless the value has already been converted.

## MWh handling

The app internally converts MWh to kWh base for calculation. Meter constant remains in `imp/kWh` unless the meter nameplate explicitly states otherwise.

## Accuracy error

```text
Error % = ((Meter Energy - Reference Energy) / Reference Energy) × 100
```

Pass/fail tolerance must follow official SOP or regulator procedure.
