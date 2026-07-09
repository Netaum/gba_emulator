# Game Boy Emulator Study Plan

## Purpose
This file is the study guide and reference for building a Game Boy emulator in JavaScript. It is designed to keep the learning path clear and reusable later.

## Core topics
- Game Boy CPU: Sharp LR35902 (Z80-like)
- Registers: A, F, B, C, D, E, H, L, SP, PC
- Flags: Z, N, H, C
- Memory map and banked memory
- Cartridge types and MBC controllers
- PPU / LCD rendering pipeline
- Input handling, timers, and interrupts
- ROM header format and boot process
- Optional: APU / sound later

## Study phases

### Phase 1: Hardware overview
- Understand the LR35902 CPU architecture
- Learn the Game Boy memory map
- Study cartridge structure and MBCs
- Review boot ROM and startup sequence

### Phase 2: ROMs and cartridge banking
- Parse Game Boy ROM headers
- Identify cartridge type and MBC requirements
- Implement basic ROM banking logic
- Add support for cartridge RAM if needed

### Phase 3: CPU implementation
- Build CPU registers and flag operations
- Create fetch-decode-execute loop
- Implement opcodes progressively
- Validate with simple instruction tests

### Phase 4: Memory and I/O
- Construct a memory bus
- Route reads/writes to correct regions
- Implement VRAM, WRAM, OAM, and I/O locations
- Add I/O registers for LCD control, joypad, and timers

### Phase 5: Graphics / PPU
- Understand LCD modes: OAM search, pixel transfer, HBlank, VBlank
- Render background tiles and window
- Add sprite rendering and palette handling
- Draw output to an HTML canvas

### Phase 6: Input, timers, interrupts
- Map keyboard or gamepad input to Game Boy buttons
- Implement timer/counter registers
- Trigger interrupts correctly
- Keep CPU and PPU timing aligned

### Phase 7: Optional audio
- Learn the Game Boy APU structure
- Implement audio channels later, after graphics and CPU are stable

## Recommended resources
- Pan Docs Game Boy documentation
- LR35902 opcode reference
- Game Boy ROM header docs
- Emulator development writeups and tutorials
- CPU and PPU test ROMs for validation

## Initial next step
Start with Phase 1: Game Boy CPU and memory map. Learn the register set and the overall system layout before writing code.
