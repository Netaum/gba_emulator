# Phase 1: Game Boy CPU and Memory Map

## Goal
Learn the Game Boy CPU architecture and the overall memory layout. This is the foundation for everything else in the emulator.

## CPU overview
The Game Boy uses the Sharp LR35902 CPU, which is a hybrid between the Intel 8080 and the Z80.

### Key features
- 8-bit CPU with 16-bit address bus
- 8-bit registers: A, F, B, C, D, E, H, L
- 16-bit register pairs: AF, BC, DE, HL
- Stack pointer: SP
- Program counter: PC
- Flags in F register: Z (zero), N (subtract), H (half-carry), C (carry)

### Register roles
- A: accumulator for arithmetic and logic operations
- F: flags register
- B/C/D/E/H/L: general-purpose registers, often used in pairs
- HL: common memory pointer for loads/stores
- SP: stack pointer for pushes/pops and interrupts
- PC: program counter for instruction flow

## Interrupts
Game Boy supports 5 interrupt sources:
- VBlank
- LCD STAT
- Timer
- Serial
- Joypad

Two key registers:
- `IF` (interrupt flag)
- `IE` (interrupt enable)

Interrupt handling uses the `IME` master interrupt enable flag and specific vectors.

## Memory map
The Game Boy memory map is divided into fixed regions:

- `0000-3FFF`: ROM Bank 0
- `4000-7FFF`: Switchable ROM bank
- `8000-9FFF`: Video RAM (VRAM)
- `A000-BFFF`: Cartridge RAM (battery-backed RAM)
- `C000-DFFF`: Work RAM (WRAM)
- `E000-FDFF`: Echo RAM (mirror of `C000-DDFF`)
- `FE00-FE9F`: OAM (Object Attribute Memory) for sprites
- `FEA0-FEFF`: Unusable
- `FF00-FF7F`: I/O Registers
- `FF80-FFFE`: High RAM (HRAM)
- `FFFF`: Interrupt Enable register

## Recommended reading
- LR35902 CPU register and instruction summary
- Game Boy memory map and IO registers
- Basic ROM header structure

## Practical tasks
1. Read the LR35902 register set and flag behavior.
2. Draw or write out the Game Boy memory map.
3. Compare the GB CPU to the CHIP-8 CPU you already implemented.
4. Identify the first opcodes to implement in JavaScript (NOP, LD, INC, DEC).

## Next step
When ready, move to a minimal JavaScript CPU skeleton with registers and the fetch-decode-execute loop.
