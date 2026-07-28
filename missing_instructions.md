# Missing Instructions

| Opcode | Mnemonic       | Notes |
|--------|----------------|-------|
| `0x0A` | `LD A, [BC]`   | Load A from memory at BC. Can share a generic `loadAccumulatorFromR16Memory(cpu, regHigh, regLow)` with `0x1A`. |
| `0x10` | `STOP`         | Stop CPU/LCD until button pressed. |
| `0x1A` | `LD A, [DE]`   | Load A from memory at DE. |
| `0xE0` | `LDH [n8], A`  | Write A to `0xFF00 + n8`. `loadMemoryAddressConditionalWithAccumulator` exists but takes a raw address — dispatcher must add `0xFF00`. |
| `0xF0` | `LDH A, [n8]`  | Read A from `0xFF00 + n8`. Completely missing. |
| `0xF2` | `LD A, [C]`    | Read A from `0xFF00 + C`. Completely missing. |
| `0xF9` | `LD SP, HL`    | Copy HL into SP. Completely missing. |
| `0xFA` | `LD A, [n16]`  | Read A from 16-bit immediate address. Completely missing. |
