const Flags = Object.freeze({
    Zero: 1 << 0,
    Substraction: 1 << 1,
    HalfCarry: 1 << 2,
    Carry: 1 << 3
});

export class CPU {
  constructor() {
    this.registers = {
      A: 0x00,
      F: 0x00,
      B: 0x00,
      C: 0x00,
      D: 0x00,
      E: 0x00,
      H: 0x00,
      L: 0x00,
    };

    this.pc = 0x0000;
    this.sp = 0xFFFE;
    this.ime = false;
    this.mode = 'idle';
  }

  reset() {
    this.registers = {
      A: 0x00,
      F: 0x00,
      B: 0x00,
      C: 0x00,
      D: 0x00,
      E: 0x00,
      H: 0x00,
      L: 0x00,
    };
    this.pc = 0x0000;
    this.sp = 0xFFFE;
    this.ime = false;
    this.mode = 'idle';
  }

  step() {
    // TODO: Implement fetch-decode-execute cycle here.
  }
}
