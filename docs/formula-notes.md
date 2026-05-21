# Formula Notes

## Multiplier

Direct meter:

```text
M = 1
```

CT operated meter:

```text
M = CT Primary / CT Secondary
```

CT + VT operated meter:

```text
M = (CT Primary / CT Secondary) × (VT Primary / VT Secondary)
```

## Primary-side equivalent pulse constant

```text
Primary-side equivalent constant = Meter nameplate constant / Total multiplier
```

Example:

```text
Meter constant = 1000 imp/kWh
CT = 800/5
Multiplier = 160
Primary-side equivalent constant = 1000 / 160 = 6.25 imp/kWh
```

## Energy from pulse

```text
Energy = Pulse Count / Meter Constant × Multiplier
```

Assumption: Meter Constant is the meter nameplate constant, e.g. imp/kWh or imp/kvarh.

## Pulse from energy

```text
Pulse = Energy × Meter Constant / Multiplier
```

## Maximum Demand

```text
Energy during interval = Pulse Count / Meter Constant × Multiplier
MD = Energy during interval / (Interval Minutes / 60)
```

## Accuracy Test: Register Comparison

```text
Meter Difference = Meter End Reading - Meter Start Reading
Error % = ((Meter Difference - Reference Energy) / Reference Energy) × 100
```

Validation:

```text
Reference Energy > 0
End Reading > Start Reading
Tolerance > 0
```

## Accuracy Test: Pulse Output Test

```text
Meter Energy = Pulse Count / Meter Constant × Multiplier
Error % = ((Meter Energy - Reference Energy) / Reference Energy) × 100
```

Validation:

```text
Pulse Count > 0
Meter Constant > 0
Multiplier > 0
Reference Energy > 0
Tolerance > 0
```

## Common mistakes

- Do not double-apply multiplier.
- Do not mix primary-side and secondary-side values without conversion.
- Do not use OCR result as CT/VT verification.
- Verify CT secondary and VT secondary against site records.


## Reading Basis

Primary / Billing basis means the calculation applies CT/VT multiplier to convert meter-side pulse or raw values into actual billed energy.

Secondary / Raw basis means the entered value is already treated as meter-side/raw energy and no CT/VT multiplier is applied unless the module explicitly asks for normalization.

Use Primary / Billing for most CT/VT pulse-to-energy field calculations when the pulse constant is the meter nameplate constant. Use Secondary / Raw only when comparing raw meter-side quantities.
