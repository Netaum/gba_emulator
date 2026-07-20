import test from 'node:test';
import assert from 'node:assert/strict';

import { addRegWithCarryToAccumulator, addRegToAccumulator, addValueWithCarryToAccumulator, addValueToAccumulator, addValueToSP, andRegWithAccumulator, andHLWithAccumulator, andValueWithAccumulator, testBitInReg, testBitInHL, callFunction, callFunctionConditional, condZ, condNZ, condC, condNC, compareRegistryFromAccumulator, compareHLAddressFromAccumulator, compareValueFromAccumulator, decimalAdjustAccumulator, decrementRegistry, decrementHLAddress, decrementR16, decrementSP, incrementRegistry, incrementHLAddress, incrementR16, incrementSP, jumpToAddress, jumpToAddressConditional, jumpToHLAddress, jumpRelativeN16, jumpRelativeN16Conditional, loadRegisterWithRegister, loadRegisterWithValue, loadRegister16WithValue, loadHLAddressWithRegister, loadHLAddressWithValue, loadRegisterWithHLAddress, loadMemoryR16WithAccumulator, loadMemoryAddressWithAccumulator, loadMemoryRegisterCWithAccumulator, loadMemoryHLWithAccumulatorInc, loadMemoryHLWithAccumulatorDec, loadAccumulatorHLAddressInc, loadAccumulatorHLAddressDec, loadMemoryWithSP, loadHLWithSP, loadHLWithSP28, orRegWithAccumulator, orHLWithAccumulator, orValueWithAccumulator, popRegister16, popRegisterAF, resetBitInReg, resetBitInHLMemoryAddress, returnFromSubrotine, returnFromSubrotineConditional, returnFromInterrupt, rotateRegisterLeftWithCarry, rotateHLAddressLeftWithCarry, rotateAccumulatorLeftWithCarry, rotateRegisterLeft, rotateHLAddressLeft, rotateAccumulatorLeft } from '../src/instructions.js';
import { CPU } from '../src/cpu.js';

const Flags = Object.freeze({
  Zero: 1 << 7,
  Substraction: 1 << 6,
  HalfCarry: 1 << 5,
  Carry: 1 << 4,
});

function createCpu({ a = 0x00, f = 0x00, b = 0x00, c = 0x00, h = 0x00, l = 0x00, sp = 0x0000, memoryValue = 0x00 } = {}) {
  const memory = new Uint8Array(0x10000);
  const hl = (h << 8) | l;
  memory[hl] = memoryValue;
  return {
    registers: {
      A: a,
      F: f,
      B: b,
      C: c,
      D: 0x00,
      E: 0x00,
      H: h,
      L: l,
    },
    sp,
    readMemory(address) {
      return memory[address & 0xffff];
    },
    writeMemory(address, value) {
      memory[address & 0xffff] = value & 0xff;
    },
  };
}

test('ADC A, B adds the register value and carry flag', () => {
  const cpu = createCpu({ a: 0x0f, b: 0x01, f: 0x00 });

  addRegWithCarryToAccumulator(cpu, 'B');

  assert.equal(cpu.registers.A, 0x10);
  assert.equal(cpu.registers.F & Flags.Zero, 0x00);
  assert.equal(cpu.registers.F & Flags.HalfCarry, Flags.HalfCarry);
  assert.equal(cpu.registers.F & Flags.Carry, 0x00);
});

test('ADC A, B sets zero and carry on overflow', () => {
  const cpu = createCpu({ a: 0xff, b: 0x01, f: 0x00 });

  addRegWithCarryToAccumulator(cpu, 'B');

  assert.equal(cpu.registers.A, 0x00);
  assert.equal(cpu.registers.F & Flags.Zero, Flags.Zero);
  assert.equal(cpu.registers.F & Flags.HalfCarry, Flags.HalfCarry);
  assert.equal(cpu.registers.F & Flags.Carry, Flags.Carry);
});

test('ADD A, B performs simple addition without carry', () => {
  const cpu = createCpu({ a: 0x03, b: 0x02, f: 0x00 });

  addRegToAccumulator(cpu, 'B');

  assert.equal(cpu.registers.A, 0x05);
  assert.equal(cpu.registers.F & Flags.Zero, 0x00);
  assert.equal(cpu.registers.F & Flags.HalfCarry, 0x00);
  assert.equal(cpu.registers.F & Flags.Carry, 0x00);
});

test('ADD immediate value wraps to 8-bit and sets flags', () => {
  const cpu = createCpu({ a: 0x80, f: 0x00 });

  addValueToAccumulator(cpu, 0x80);

  assert.equal(cpu.registers.A, 0x00);
  assert.equal(cpu.registers.F & Flags.Zero, Flags.Zero);
  assert.equal(cpu.registers.F & Flags.HalfCarry, 0x00);
  assert.equal(cpu.registers.F & Flags.Carry, Flags.Carry);
});

test('ADD SP, e8 adds a positive value to SP', () => {
  const cpu = createCpu({ sp: 0x0010 });

  addValueToSP(cpu, 0x04);

  assert.equal(cpu.sp, 0x0014);
  assert.equal(cpu.registers.F & Flags.Zero, 0x00);
  assert.equal(cpu.registers.F & Flags.HalfCarry, 0x00);
  assert.equal(cpu.registers.F & Flags.Carry, 0x00);
});

test('ADD SP, e8 adds a negative value to SP (sign extension)', () => {
  const cpu = createCpu({ sp: 0x0010 });

  addValueToSP(cpu, 0xfc); // 0xfc = -4 as signed byte

  assert.equal(cpu.sp, 0x000c);
  assert.equal(cpu.registers.F & Flags.Zero, 0x00);
});

test('ADD SP, e8 sets half-carry on lower nibble overflow', () => {
  const cpu = createCpu({ sp: 0x000f });

  addValueToSP(cpu, 0x01);

  assert.equal(cpu.sp, 0x0010);
  assert.equal(cpu.registers.F & Flags.HalfCarry, Flags.HalfCarry);
  assert.equal(cpu.registers.F & Flags.Carry, 0x00);
});

test('ADD SP, e8 sets carry on lower byte overflow', () => {
  const cpu = createCpu({ sp: 0x00ff });

  addValueToSP(cpu, 0x01);

  assert.equal(cpu.sp, 0x0100);
  assert.equal(cpu.registers.F & Flags.HalfCarry, Flags.HalfCarry);
  assert.equal(cpu.registers.F & Flags.Carry, Flags.Carry);
});

test('ADD SP, e8 wraps SP correctly at 0xffff boundary', () => {
  const cpu = createCpu({ sp: 0xffff });

  addValueToSP(cpu, 0x01);

  assert.equal(cpu.sp, 0x0000);
});

test('ADD SP, e8 always clears Z and N flags', () => {
  const cpu = createCpu({ sp: 0x0000, f: Flags.Zero });

  addValueToSP(cpu, 0x00);

  assert.equal(cpu.registers.F & Flags.Zero, 0x00);
});

test('AND A, B stores the bitwise AND result in A', () => {
  const cpu = createCpu({ a: 0b11001100, b: 0b10101010 });

  andRegWithAccumulator(cpu, 'B');

  assert.equal(cpu.registers.A, 0b10001000);
  assert.equal(cpu.registers.F & Flags.Zero, 0x00);
  assert.equal(cpu.registers.F & Flags.HalfCarry, Flags.HalfCarry);
  assert.equal(cpu.registers.F & Flags.Carry, 0x00);
});

test('AND A, B sets zero flag when result is zero', () => {
  const cpu = createCpu({ a: 0b11110000, b: 0b00001111 });

  andRegWithAccumulator(cpu, 'B');

  assert.equal(cpu.registers.A, 0x00);
  assert.equal(cpu.registers.F & Flags.Zero, Flags.Zero);
  assert.equal(cpu.registers.F & Flags.HalfCarry, Flags.HalfCarry);
});

test('AND A, B always sets H and clears N and C', () => {
  const cpu = createCpu({ a: 0xff, b: 0xff, f: Flags.Carry });

  andRegWithAccumulator(cpu, 'B');

  assert.equal(cpu.registers.F & Flags.HalfCarry, Flags.HalfCarry);
  assert.equal(cpu.registers.F & Flags.Carry, 0x00);
});

test('AND A, [HL] ANDs the value at the HL address with A', () => {
  const cpu = createCpu({ a: 0b11001100, h: 0xc0, l: 0x00, memoryValue: 0b10101010 });

  andHLWithAccumulator(cpu);

  assert.equal(cpu.registers.A, 0b10001000);
  assert.equal(cpu.registers.F & Flags.Zero, 0x00);
  assert.equal(cpu.registers.F & Flags.HalfCarry, Flags.HalfCarry);
  assert.equal(cpu.registers.F & Flags.Carry, 0x00);
});

test('AND A, [HL] sets zero flag when result is zero', () => {
  const cpu = createCpu({ a: 0b11110000, h: 0xc0, l: 0x00, memoryValue: 0b00001111 });

  andHLWithAccumulator(cpu);

  assert.equal(cpu.registers.A, 0x00);
  assert.equal(cpu.registers.F & Flags.Zero, Flags.Zero);
  assert.equal(cpu.registers.F & Flags.HalfCarry, Flags.HalfCarry);
});

test('AND A, n8 ANDs an immediate value with A', () => {
  const cpu = createCpu({ a: 0b11001100 });

  andValueWithAccumulator(cpu, 0b10101010);

  assert.equal(cpu.registers.A, 0b10001000);
  assert.equal(cpu.registers.F & Flags.Zero, 0x00);
  assert.equal(cpu.registers.F & Flags.HalfCarry, Flags.HalfCarry);
  assert.equal(cpu.registers.F & Flags.Carry, 0x00);
});

test('AND A, n8 sets zero flag when result is zero', () => {
  const cpu = createCpu({ a: 0b11110000 });

  andValueWithAccumulator(cpu, 0b00001111);

  assert.equal(cpu.registers.A, 0x00);
  assert.equal(cpu.registers.F & Flags.Zero, Flags.Zero);
  assert.equal(cpu.registers.F & Flags.HalfCarry, Flags.HalfCarry);
});

test('BIT u3, r8 clears Z when the tested bit is 1', () => {
  const cpu = createCpu({ b: 0b00001000 });

  testBitInReg(cpu, 'B', 3);

  assert.equal(cpu.registers.F & Flags.Zero, 0x00);
  assert.equal(cpu.registers.F & Flags.HalfCarry, Flags.HalfCarry);
});

test('BIT u3, r8 sets Z when the tested bit is 0', () => {
  const cpu = createCpu({ b: 0b11110111 });

  testBitInReg(cpu, 'B', 3);

  assert.equal(cpu.registers.F & Flags.Zero, Flags.Zero);
  assert.equal(cpu.registers.F & Flags.HalfCarry, Flags.HalfCarry);
});

test('BIT u3, r8 preserves the carry flag', () => {
  const cpu = createCpu({ b: 0b00000001, f: Flags.Carry });

  testBitInReg(cpu, 'B', 0);

  assert.equal(cpu.registers.F & Flags.Carry, Flags.Carry);
});

test('BIT u3, r8 always clears N', () => {
  const cpu = createCpu({ b: 0xff, f: Flags.Substraction });

  testBitInReg(cpu, 'B', 0);

  assert.equal(cpu.registers.F & Flags.Substraction, 0x00);
});

test('BIT u3, [HL] clears Z when the tested bit is 1', () => {
  const cpu = createCpu({ h: 0xc0, l: 0x00, memoryValue: 0b00001000 });

  testBitInHL(cpu, 3);

  assert.equal(cpu.registers.F & Flags.Zero, 0x00);
  assert.equal(cpu.registers.F & Flags.HalfCarry, Flags.HalfCarry);
});

test('BIT u3, [HL] sets Z when the tested bit is 0', () => {
  const cpu = createCpu({ h: 0xc0, l: 0x00, memoryValue: 0b11110111 });

  testBitInHL(cpu, 3);

  assert.equal(cpu.registers.F & Flags.Zero, Flags.Zero);
  assert.equal(cpu.registers.F & Flags.HalfCarry, Flags.HalfCarry);
});

test('BIT u3, [HL] preserves the carry flag', () => {
  const cpu = createCpu({ h: 0xc0, l: 0x00, memoryValue: 0b00000001, f: Flags.Carry });

  testBitInHL(cpu, 0);

  assert.equal(cpu.registers.F & Flags.Carry, Flags.Carry);
});

test('CALL n16 pushes PC onto the stack and jumps to address', () => {
  const cpu = new CPU();
  cpu.pc = 0x0200;
  cpu.sp = 0xFFFE;

  callFunction(cpu, 0x0400);

  assert.equal(cpu.pc, 0x0400);
  assert.equal(cpu.sp, 0xFFFC);
  assert.equal(cpu.readMemory(0xFFFD), 0x02); // high byte of 0x0200
  assert.equal(cpu.readMemory(0xFFFC), 0x00); // low byte of 0x0200
});

test('CALL n16 SP wraps correctly at 0x0000 boundary', () => {
  const cpu = new CPU();
  cpu.pc = 0x0300;
  cpu.sp = 0x0001;

  callFunction(cpu, 0x0500);

  assert.equal(cpu.sp, 0xFFFF);
  assert.equal(cpu.readMemory(0x0000), 0x03); // high byte
  assert.equal(cpu.readMemory(0xFFFF), 0x00); // low byte
});

test('CALL cc, n16 calls when condition is true', () => {
  const cpu = new CPU();
  cpu.pc = 0x0200;
  cpu.sp = 0xFFFE;
  cpu.registers.F = Flags.Zero;

  const cycles = callFunctionConditional(cpu, 0x0400, condZ);

  assert.equal(cpu.pc, 0x0400);
  assert.equal(cpu.sp, 0xFFFC);
  assert.equal(cycles, 6);
});

test('CALL cc, n16 skips when condition is false', () => {
  const cpu = new CPU();
  cpu.pc = 0x0200;
  cpu.sp = 0xFFFE;
  cpu.registers.F = 0x00; // Z is clear

  const cycles = callFunctionConditional(cpu, 0x0400, condZ);

  assert.equal(cpu.pc, 0x0200); // PC unchanged
  assert.equal(cpu.sp, 0xFFFE); // SP unchanged
  assert.equal(cycles, 3);
});

test('CALL cc, n16 condNZ calls when Z is clear', () => {
  const cpu = new CPU();
  cpu.pc = 0x0200;
  cpu.sp = 0xFFFE;
  cpu.registers.F = 0x00; // Z is clear

  callFunctionConditional(cpu, 0x0400, condNZ);

  assert.equal(cpu.pc, 0x0400);
});

test('CALL cc, n16 condC calls when C is set', () => {
  const cpu = new CPU();
  cpu.pc = 0x0200;
  cpu.sp = 0xFFFE;
  cpu.registers.F = Flags.Carry;

  callFunctionConditional(cpu, 0x0400, condC);

  assert.equal(cpu.pc, 0x0400);
});

test('CALL cc, n16 condNC calls when C is clear', () => {
  const cpu = new CPU();
  cpu.pc = 0x0200;
  cpu.sp = 0xFFFE;
  cpu.registers.F = 0x00; // C is clear

  callFunctionConditional(cpu, 0x0400, condNC);

  assert.equal(cpu.pc, 0x0400);
});

test('CP A, r8 sets Z when values are equal', () => {
  const cpu = createCpu({ a: 0x42, b: 0x42 });

  compareRegistryFromAccumulator(cpu, 'B');

  assert.equal(cpu.registers.A, 0x42); // A is not modified
  assert.equal(cpu.registers.F & Flags.Zero, Flags.Zero);
  assert.equal(cpu.registers.F & Flags.Substraction, Flags.Substraction);
  assert.equal(cpu.registers.F & Flags.Carry, 0x00);
});

test('CP A, r8 sets C when A is less than register', () => {
  const cpu = createCpu({ a: 0x01, b: 0x02 });

  compareRegistryFromAccumulator(cpu, 'B');

  assert.equal(cpu.registers.F & Flags.Zero, 0x00);
  assert.equal(cpu.registers.F & Flags.Carry, Flags.Carry);
  assert.equal(cpu.registers.F & Flags.Substraction, Flags.Substraction);
});

test('CP A, r8 sets H on lower nibble borrow', () => {
  const cpu = createCpu({ a: 0x10, b: 0x01 });

  compareRegistryFromAccumulator(cpu, 'B');

  assert.equal(cpu.registers.F & Flags.HalfCarry, Flags.HalfCarry);
  assert.equal(cpu.registers.F & Flags.Carry, 0x00);
});

test('CP A, [HL] sets Z when memory value equals A', () => {
  const cpu = createCpu({ a: 0x42, h: 0xc0, l: 0x00, memoryValue: 0x42 });

  compareHLAddressFromAccumulator(cpu);

  assert.equal(cpu.registers.A, 0x42);
  assert.equal(cpu.registers.F & Flags.Zero, Flags.Zero);
  assert.equal(cpu.registers.F & Flags.Substraction, Flags.Substraction);
});

test('CP A, [HL] sets C when memory value is greater than A', () => {
  const cpu = createCpu({ a: 0x01, h: 0xc0, l: 0x00, memoryValue: 0x02 });

  compareHLAddressFromAccumulator(cpu);

  assert.equal(cpu.registers.F & Flags.Carry, Flags.Carry);
  assert.equal(cpu.registers.F & Flags.Substraction, Flags.Substraction);
});

test('CP A, n8 sets Z when immediate value equals A', () => {
  const cpu = createCpu({ a: 0x42 });

  compareValueFromAccumulator(cpu, 0x42);

  assert.equal(cpu.registers.A, 0x42);
  assert.equal(cpu.registers.F & Flags.Zero, Flags.Zero);
  assert.equal(cpu.registers.F & Flags.Substraction, Flags.Substraction);
});

test('CP A, n8 sets C when immediate value is greater than A', () => {
  const cpu = createCpu({ a: 0x01 });

  compareValueFromAccumulator(cpu, 0x02);

  assert.equal(cpu.registers.F & Flags.Carry, Flags.Carry);
  assert.equal(cpu.registers.F & Flags.Substraction, Flags.Substraction);
});

test('DAA corrects A after BCD addition with invalid lower nibble', () => {
  // 9 + 1 = 0x0A in binary, DAA should correct to 0x10 (BCD 10)
  const cpu = createCpu({ a: 0x0a, f: 0x00 });

  decimalAdjustAccumulator(cpu);

  assert.equal(cpu.registers.A, 0x10);
  assert.equal(cpu.registers.F & Flags.Zero, 0x00);
  assert.equal(cpu.registers.F & Flags.HalfCarry, 0x00);
});

test('DAA corrects A after BCD addition with half-carry set', () => {
  // ADD left H set, lower nibble already wrapped
  const cpu = createCpu({ a: 0x00, f: Flags.HalfCarry });

  decimalAdjustAccumulator(cpu);

  assert.equal(cpu.registers.A, 0x06);
  assert.equal(cpu.registers.F & Flags.HalfCarry, 0x00);
});

test('DAA corrects A after BCD addition with upper nibble overflow', () => {
  // 0x99 + 0x01 = 0x9A, upper nibble also needs fixing
  const cpu = createCpu({ a: 0x9a, f: 0x00 });

  decimalAdjustAccumulator(cpu);

  assert.equal(cpu.registers.A, 0x00);
  assert.equal(cpu.registers.F & Flags.Zero, Flags.Zero);
  assert.equal(cpu.registers.F & Flags.Carry, Flags.Carry);
});

test('DAA sets Z when result is 0x00 after correction', () => {
  const cpu = createCpu({ a: 0x9a, f: 0x00 });

  decimalAdjustAccumulator(cpu);

  assert.equal(cpu.registers.A, 0x00);
  assert.equal(cpu.registers.F & Flags.Zero, Flags.Zero);
});

test('DAA corrects A after BCD subtraction with half-carry', () => {
  // subtraction left H set, lower nibble needs -0x06 correction
  const cpu = createCpu({ a: 0x0f, f: Flags.Substraction | Flags.HalfCarry });

  decimalAdjustAccumulator(cpu);

  assert.equal(cpu.registers.A, 0x09);
  assert.equal(cpu.registers.F & Flags.HalfCarry, 0x00);
});

test('DAA corrects A after BCD subtraction with carry', () => {
  // subtraction left C set, upper nibble needs -0x60 correction
  const cpu = createCpu({ a: 0xf0, f: Flags.Substraction | Flags.Carry });

  decimalAdjustAccumulator(cpu);

  assert.equal(cpu.registers.A, 0x90);
  assert.equal(cpu.registers.F & Flags.Carry, Flags.Carry);
});

test('DAA always clears H', () => {
  const cpu = createCpu({ a: 0x00, f: Flags.HalfCarry });

  decimalAdjustAccumulator(cpu);

  assert.equal(cpu.registers.F & Flags.HalfCarry, 0x00);
});

test('DEC r8 decrements the register by 1', () => {
  const cpu = createCpu({ b: 0x05 });

  decrementRegistry(cpu, 'B');

  assert.equal(cpu.registers.B, 0x04);
  assert.equal(cpu.registers.F & Flags.Zero, 0x00);
  assert.equal(cpu.registers.F & Flags.Substraction, Flags.Substraction);
  assert.equal(cpu.registers.F & Flags.HalfCarry, 0x00);
});

test('DEC r8 sets Z when result is 0', () => {
  const cpu = createCpu({ b: 0x01 });

  decrementRegistry(cpu, 'B');

  assert.equal(cpu.registers.B, 0x00);
  assert.equal(cpu.registers.F & Flags.Zero, Flags.Zero);
  assert.equal(cpu.registers.F & Flags.Substraction, Flags.Substraction);
});

test('DEC r8 wraps from 0x00 to 0xff', () => {
  const cpu = createCpu({ b: 0x00 });

  decrementRegistry(cpu, 'B');

  assert.equal(cpu.registers.B, 0xff);
  assert.equal(cpu.registers.F & Flags.Zero, 0x00);
});

test('DEC r8 sets H when lower nibble borrows from bit 4', () => {
  const cpu = createCpu({ b: 0x10 });

  decrementRegistry(cpu, 'B');

  assert.equal(cpu.registers.B, 0x0f);
  assert.equal(cpu.registers.F & Flags.HalfCarry, Flags.HalfCarry);
});

test('DEC r8 preserves the carry flag', () => {
  const cpu = createCpu({ b: 0x05, f: Flags.Carry });

  decrementRegistry(cpu, 'B');

  assert.equal(cpu.registers.F & Flags.Carry, Flags.Carry);
});

test('DEC [HL] decrements the value at the HL address', () => {
  const cpu = createCpu({ h: 0xc0, l: 0x00, memoryValue: 0x05 });

  decrementHLAddress(cpu);

  assert.equal(cpu.readMemory(0xc000), 0x04);
  assert.equal(cpu.registers.F & Flags.Substraction, Flags.Substraction);
});

test('DEC [HL] sets Z when result is 0', () => {
  const cpu = createCpu({ h: 0xc0, l: 0x00, memoryValue: 0x01 });

  decrementHLAddress(cpu);

  assert.equal(cpu.readMemory(0xc000), 0x00);
  assert.equal(cpu.registers.F & Flags.Zero, Flags.Zero);
});

test('DEC r16 decrements a 16-bit register pair', () => {
  const cpu = createCpu({ b: 0x00, c: 0x01 });

  decrementR16(cpu, 'B', 'C');

  assert.equal(cpu.registers.B, 0x00);
  assert.equal(cpu.registers.C, 0x00);
});

test('DEC r16 borrows across high and low bytes', () => {
  const cpu = createCpu({ b: 0x01, c: 0x00 });

  decrementR16(cpu, 'B', 'C');

  assert.equal(cpu.registers.B, 0x00);
  assert.equal(cpu.registers.C, 0xff);
});

test('DEC r16 does not affect flags', () => {
  const cpu = createCpu({ b: 0x00, c: 0x01, f: Flags.Zero | Flags.Carry });

  decrementR16(cpu, 'B', 'C');

  assert.equal(cpu.registers.F, Flags.Zero | Flags.Carry);
});

test('DEC SP decrements SP by 1', () => {
  const cpu = createCpu({ sp: 0x0010 });

  decrementSP(cpu);

  assert.equal(cpu.sp, 0x000f);
});

test('DEC SP wraps from 0x0000 to 0xffff', () => {
  const cpu = createCpu({ sp: 0x0000 });

  decrementSP(cpu);

  assert.equal(cpu.sp, 0xffff);
});

test('INC r8 increments the register by 1', () => {
  const cpu = createCpu({ b: 0x04 });

  incrementRegistry(cpu, 'B');

  assert.equal(cpu.registers.B, 0x05);
  assert.equal(cpu.registers.F & Flags.Zero, 0x00);
  assert.equal(cpu.registers.F & Flags.Substraction, 0x00);
  assert.equal(cpu.registers.F & Flags.HalfCarry, 0x00);
});

test('INC r8 sets Z when result wraps to 0', () => {
  const cpu = createCpu({ b: 0xff });

  incrementRegistry(cpu, 'B');

  assert.equal(cpu.registers.B, 0x00);
  assert.equal(cpu.registers.F & Flags.Zero, Flags.Zero);
});

test('INC r8 sets H when lower nibble overflows', () => {
  const cpu = createCpu({ b: 0x0f });

  incrementRegistry(cpu, 'B');

  assert.equal(cpu.registers.B, 0x10);
  assert.equal(cpu.registers.F & Flags.HalfCarry, Flags.HalfCarry);
  assert.equal(cpu.registers.F & Flags.Zero, 0x00);
});

test('INC r8 preserves the carry flag', () => {
  const cpu = createCpu({ b: 0x04, f: Flags.Carry });

  incrementRegistry(cpu, 'B');

  assert.equal(cpu.registers.F & Flags.Carry, Flags.Carry);
});

test('INC r8 clears N flag', () => {
  const cpu = createCpu({ b: 0x04, f: Flags.Substraction });

  incrementRegistry(cpu, 'B');

  assert.equal(cpu.registers.F & Flags.Substraction, 0x00);
});

test('INC [HL] increments the value at the HL address', () => {
  const cpu = createCpu({ h: 0xc0, l: 0x00, memoryValue: 0x04 });

  incrementHLAddress(cpu);

  assert.equal(cpu.readMemory(0xc000), 0x05);
  assert.equal(cpu.registers.F & Flags.Substraction, 0x00);
});

test('INC [HL] sets H when lower nibble overflows', () => {
  const cpu = createCpu({ h: 0xc0, l: 0x00, memoryValue: 0x0f });

  incrementHLAddress(cpu);

  assert.equal(cpu.readMemory(0xc000), 0x10);
  assert.equal(cpu.registers.F & Flags.HalfCarry, Flags.HalfCarry);
});

test('INC r16 increments a 16-bit register pair', () => {
  const cpu = createCpu({ b: 0x00, c: 0xff });

  incrementR16(cpu, 'B', 'C');

  assert.equal(cpu.registers.B, 0x01);
  assert.equal(cpu.registers.C, 0x00);
});

test('INC r16 wraps from 0xffff to 0x0000', () => {
  const cpu = createCpu({ b: 0xff, c: 0xff });

  incrementR16(cpu, 'B', 'C');

  assert.equal(cpu.registers.B, 0x00);
  assert.equal(cpu.registers.C, 0x00);
});

test('INC r16 does not affect flags', () => {
  const cpu = createCpu({ b: 0x00, c: 0xff, f: Flags.Zero | Flags.Carry });

  incrementR16(cpu, 'B', 'C');

  assert.equal(cpu.registers.F, Flags.Zero | Flags.Carry);
});

test('INC SP increments SP by 1', () => {
  const cpu = createCpu({ sp: 0x000f });

  incrementSP(cpu);

  assert.equal(cpu.sp, 0x0010);
});

test('INC SP wraps from 0xffff to 0x0000', () => {
  const cpu = createCpu({ sp: 0xffff });

  incrementSP(cpu);

  assert.equal(cpu.sp, 0x0000);
});

test('JP n16 sets PC to the given address', () => {
  const cpu = createCpu();

  jumpToAddress(cpu, 0x0400);

  assert.equal(cpu.pc, 0x0400);
});

test('JP n16 masks address to 16 bits', () => {
  const cpu = createCpu();

  jumpToAddress(cpu, 0x10400);

  assert.equal(cpu.pc, 0x0400);
});

test('JP cc, n16 jumps when condition is true', () => {
  const cpu = createCpu({ f: Flags.Zero });

  const cycles = jumpToAddressConditional(cpu, 0x0400, condZ);

  assert.equal(cpu.pc, 0x0400);
  assert.equal(cycles, 4);
});

test('JP cc, n16 skips when condition is false', () => {
  const cpu = createCpu({ f: 0x00 });
  cpu.pc = 0x0200;

  const cycles = jumpToAddressConditional(cpu, 0x0400, condZ);

  assert.equal(cpu.pc, 0x0200);
  assert.equal(cycles, 3);
});

test('JP cc, n16 condNZ jumps when Z is clear', () => {
  const cpu = createCpu({ f: 0x00 });

  jumpToAddressConditional(cpu, 0x0400, condNZ);

  assert.equal(cpu.pc, 0x0400);
});

test('JP cc, n16 condC jumps when C is set', () => {
  const cpu = createCpu({ f: Flags.Carry });

  jumpToAddressConditional(cpu, 0x0400, condC);

  assert.equal(cpu.pc, 0x0400);
});

test('JP cc, n16 condNC jumps when C is clear', () => {
  const cpu = createCpu({ f: 0x00 });

  jumpToAddressConditional(cpu, 0x0400, condNC);

  assert.equal(cpu.pc, 0x0400);
});

test('JP HL sets PC to the value of HL', () => {
  const cpu = createCpu({ h: 0x04, l: 0x00 });

  jumpToHLAddress(cpu);

  assert.equal(cpu.pc, 0x0400);
});

test('JP HL does not read memory at HL', () => {
  const cpu = createCpu({ h: 0xc0, l: 0x00, memoryValue: 0xff });

  jumpToHLAddress(cpu);

  assert.equal(cpu.pc, 0xc000); // jumps to HL value, not what memory[HL] contains
});

test('JR e8 adds a positive offset to PC', () => {
  const cpu = createCpu();
  cpu.pc = 0x0200;

  jumpRelativeN16(cpu, 0x05);

  assert.equal(cpu.pc, 0x0205);
});

test('JR e8 adds a negative offset to PC (sign extension)', () => {
  const cpu = createCpu();
  cpu.pc = 0x0210;

  jumpRelativeN16(cpu, 0xfc); // 0xfc = -4 as signed byte

  assert.equal(cpu.pc, 0x020c);
});

test('JR e8 with offset 0xfe creates a backward jump of 2 (self loop)', () => {
  const cpu = createCpu();
  cpu.pc = 0x0210;

  jumpRelativeN16(cpu, 0xfe); // -2

  assert.equal(cpu.pc, 0x020e);
});

test('JR e8 wraps correctly at 0xffff boundary', () => {
  const cpu = createCpu();
  cpu.pc = 0xffff;

  jumpRelativeN16(cpu, 0x01);

  assert.equal(cpu.pc, 0x0000);
});

test('JR cc, e8 jumps when condition is true', () => {
  const cpu = createCpu({ f: Flags.Zero });
  cpu.pc = 0x0200;

  const cycles = jumpRelativeN16Conditional(cpu, 0x05, condZ);

  assert.equal(cpu.pc, 0x0205);
  assert.equal(cycles, 3);
});

test('JR cc, e8 skips when condition is false', () => {
  const cpu = createCpu({ f: 0x00 });
  cpu.pc = 0x0200;

  const cycles = jumpRelativeN16Conditional(cpu, 0x05, condZ);

  assert.equal(cpu.pc, 0x0200);
  assert.equal(cycles, 2);
});

test('JR cc, e8 condNZ jumps when Z is clear', () => {
  const cpu = createCpu({ f: 0x00 });
  cpu.pc = 0x0200;

  jumpRelativeN16Conditional(cpu, 0x05, condNZ);

  assert.equal(cpu.pc, 0x0205);
});

test('JR cc, e8 condC jumps when C is set', () => {
  const cpu = createCpu({ f: Flags.Carry });
  cpu.pc = 0x0200;

  jumpRelativeN16Conditional(cpu, 0x05, condC);

  assert.equal(cpu.pc, 0x0205);
});

test('JR cc, e8 condNC jumps when C is clear', () => {
  const cpu = createCpu({ f: 0x00 });
  cpu.pc = 0x0200;

  jumpRelativeN16Conditional(cpu, 0x05, condNC);

  assert.equal(cpu.pc, 0x0205);
});

test('LD r8, r8 copies register value', () => {
  const cpu = createCpu({ b: 0x42 });

  loadRegisterWithRegister(cpu, 'A', 'B');

  assert.equal(cpu.registers.A, 0x42);
  assert.equal(cpu.registers.B, 0x42); // source unchanged
});

test('LD r8, n8 loads immediate value into register', () => {
  const cpu = createCpu();

  loadRegisterWithValue(cpu, 'B', 0x42);

  assert.equal(cpu.registers.B, 0x42);
});

test('LD r8, n8 masks value to 8 bits', () => {
  const cpu = createCpu();

  loadRegisterWithValue(cpu, 'B', 0x142);

  assert.equal(cpu.registers.B, 0x42);
});

test('LD r16, n16 loads 16-bit value into register pair', () => {
  const cpu = createCpu();

  loadRegister16WithValue(cpu, 'B', 'C', 0x1234);

  assert.equal(cpu.registers.B, 0x12);
  assert.equal(cpu.registers.C, 0x34);
});

test('LD [HL], r8 writes register value to memory at HL', () => {
  const cpu = createCpu({ h: 0xc0, l: 0x00, b: 0x42 });

  loadHLAddressWithRegister(cpu, 'B');

  assert.equal(cpu.readMemory(0xc000), 0x42);
});

test('LD [HL], n8 writes immediate value to memory at HL', () => {
  const cpu = createCpu({ h: 0xc0, l: 0x00 });

  loadHLAddressWithValue(cpu, 0x42);

  assert.equal(cpu.readMemory(0xc000), 0x42);
});

test('LD r8, [HL] loads value from memory at HL into register', () => {
  const cpu = createCpu({ h: 0xc0, l: 0x00, memoryValue: 0x42 });

  loadRegisterWithHLAddress(cpu, 'B');

  assert.equal(cpu.registers.B, 0x42);
});

test('LD [r16], A writes A to memory at register pair address', () => {
  const cpu = createCpu({ a: 0x42, b: 0xc0, c: 0x00 });

  loadMemoryR16WithAccumulator(cpu, 'B', 'C');

  assert.equal(cpu.readMemory(0xc000), 0x42);
});

test('LD [n16], A writes A to the given address', () => {
  const cpu = createCpu({ a: 0x42 });

  loadMemoryAddressWithAccumulator(cpu, 0xc000);

  assert.equal(cpu.readMemory(0xc000), 0x42);
});

test('LD [C], A writes A to 0xFF00 + C', () => {
  const cpu = createCpu({ a: 0x42, c: 0x40 });

  loadMemoryRegisterCWithAccumulator(cpu);

  assert.equal(cpu.readMemory(0xff40), 0x42);
});

test('LD [HL+], A writes A to [HL] then increments HL', () => {
  const cpu = createCpu({ a: 0x42, h: 0xc0, l: 0x00 });

  loadMemoryHLWithAccumulatorInc(cpu);

  assert.equal(cpu.readMemory(0xc000), 0x42);
  assert.equal(cpu.registers.H, 0xc0);
  assert.equal(cpu.registers.L, 0x01);
});

test('LD [HL+], A increments HL across byte boundary', () => {
  const cpu = createCpu({ a: 0x42, h: 0xc0, l: 0xff });

  loadMemoryHLWithAccumulatorInc(cpu);

  assert.equal(cpu.registers.H, 0xc1);
  assert.equal(cpu.registers.L, 0x00);
});

test('LD [HL-], A writes A to [HL] then decrements HL', () => {
  const cpu = createCpu({ a: 0x42, h: 0xc0, l: 0x01 });

  loadMemoryHLWithAccumulatorDec(cpu);

  assert.equal(cpu.readMemory(0xc001), 0x42);
  assert.equal(cpu.registers.H, 0xc0);
  assert.equal(cpu.registers.L, 0x00);
});

test('LD A, [HL+] reads from [HL] into A then increments HL', () => {
  const cpu = createCpu({ h: 0xc0, l: 0x00, memoryValue: 0x42 });

  loadAccumulatorHLAddressInc(cpu);

  assert.equal(cpu.registers.A, 0x42);
  assert.equal(cpu.registers.H, 0xc0);
  assert.equal(cpu.registers.L, 0x01);
});

test('LD A, [HL-] reads from [HL] into A then decrements HL', () => {
  const cpu = createCpu({ h: 0xc0, l: 0x01, memoryValue: 0x42 });

  loadAccumulatorHLAddressDec(cpu);

  assert.equal(cpu.registers.A, 0x42);
  assert.equal(cpu.registers.H, 0xc0);
  assert.equal(cpu.registers.L, 0x00);
});

test('LD [n16], SP writes SP low byte then high byte to memory', () => {
  const cpu = createCpu({ sp: 0x1234 });

  loadMemoryWithSP(cpu, 0xc000);

  assert.equal(cpu.readMemory(0xc000), 0x34); // low byte
  assert.equal(cpu.readMemory(0xc001), 0x12); // high byte
});

test('LD HL, SP copies SP into HL', () => {
  const cpu = createCpu({ sp: 0x1234 });

  loadHLWithSP(cpu);

  assert.equal(cpu.registers.H, 0x12);
  assert.equal(cpu.registers.L, 0x34);
});

test('LD HL, SP+e8 adds positive offset to SP and stores in HL', () => {
  const cpu = createCpu({ sp: 0xfff0 });

  loadHLWithSP28(cpu, 0x05);

  assert.equal(cpu.registers.H, 0xff);
  assert.equal(cpu.registers.L, 0xf5);
  assert.equal(cpu.registers.F & Flags.Zero, 0x00);
  assert.equal(cpu.registers.F & Flags.Substraction, 0x00);
});

test('LD HL, SP+e8 adds negative offset to SP and stores in HL', () => {
  const cpu = createCpu({ sp: 0xfff0 });

  loadHLWithSP28(cpu, 0xfc); // -4

  assert.equal(cpu.registers.H, 0xff);
  assert.equal(cpu.registers.L, 0xec);
});

test('LD HL, SP+e8 sets H and C flags correctly', () => {
  const cpu = createCpu({ sp: 0x00ff });

  loadHLWithSP28(cpu, 0x01);

  assert.equal(cpu.registers.H, 0x01);
  assert.equal(cpu.registers.L, 0x00);
  assert.equal(cpu.registers.F & Flags.HalfCarry, Flags.HalfCarry);
  assert.equal(cpu.registers.F & Flags.Carry, Flags.Carry);
});

test('LD HL, SP+e8 does not modify SP', () => {
  const cpu = createCpu({ sp: 0xfff0 });

  loadHLWithSP28(cpu, 0x05);

  assert.equal(cpu.sp, 0xfff0);
});

test('OR A, r8 ORs register with accumulator', () => {
  const cpu = createCpu({ a: 0b10110000, b: 0b00001101 });

  orRegWithAccumulator(cpu, 'B');

  assert.equal(cpu.registers.A, 0b10111101);
  assert.equal(cpu.registers.F & Flags.Zero, 0x00);
  assert.equal(cpu.registers.F & Flags.Substraction, 0x00);
  assert.equal(cpu.registers.F & Flags.HalfCarry, 0x00);
  assert.equal(cpu.registers.F & Flags.Carry, 0x00);
});

test('OR A, r8 sets Zero flag when result is zero', () => {
  const cpu = createCpu({ a: 0x00, b: 0x00 });

  orRegWithAccumulator(cpu, 'B');

  assert.equal(cpu.registers.A, 0x00);
  assert.equal(cpu.registers.F & Flags.Zero, Flags.Zero);
});

test('OR A, r8 clears all flags when result is non-zero', () => {
  const cpu = createCpu({ a: 0x01, b: 0x01, f: Flags.Substraction | Flags.HalfCarry | Flags.Carry });

  orRegWithAccumulator(cpu, 'B');

  assert.equal(cpu.registers.F, 0x00);
});

test('OR A, r8 returns 1 cycle', () => {
  const cpu = createCpu({ a: 0x01, b: 0x02 });
  assert.equal(orRegWithAccumulator(cpu, 'B'), 1);
});

test('OR A, [HL] ORs memory at HL with accumulator', () => {
  const cpu = createCpu({ a: 0b11000000, h: 0x20, l: 0x00, memoryValue: 0b00111100 });

  orHLWithAccumulator(cpu);

  assert.equal(cpu.registers.A, 0b11111100);
  assert.equal(cpu.registers.F & Flags.Zero, 0x00);
});

test('OR A, [HL] sets Zero flag when result is zero', () => {
  const cpu = createCpu({ a: 0x00, h: 0x20, l: 0x00, memoryValue: 0x00 });

  orHLWithAccumulator(cpu);

  assert.equal(cpu.registers.A, 0x00);
  assert.equal(cpu.registers.F & Flags.Zero, Flags.Zero);
});

test('OR A, [HL] returns 2 cycles', () => {
  const cpu = createCpu({ a: 0x01, h: 0x20, l: 0x00, memoryValue: 0x02 });
  assert.equal(orHLWithAccumulator(cpu), 2);
});

test('OR A, n8 ORs immediate value with accumulator', () => {
  const cpu = createCpu({ a: 0b10100101 });

  orValueWithAccumulator(cpu, 0b01011010);

  assert.equal(cpu.registers.A, 0xff);
  assert.equal(cpu.registers.F & Flags.Zero, 0x00);
});

test('OR A, n8 sets Zero flag when result is zero', () => {
  const cpu = createCpu({ a: 0x00 });

  orValueWithAccumulator(cpu, 0x00);

  assert.equal(cpu.registers.A, 0x00);
  assert.equal(cpu.registers.F & Flags.Zero, Flags.Zero);
});

test('OR A, n8 returns 2 cycles', () => {
  const cpu = createCpu({ a: 0x01 });
  assert.equal(orValueWithAccumulator(cpu, 0x01), 2);
});

test('POP r16 reads low byte into low register and high byte into high register', () => {
  const cpu = createCpu({ sp: 0xFFFC });
  cpu.writeMemory(0xFFFC, 0x34); // low byte → C
  cpu.writeMemory(0xFFFD, 0x12); // high byte → B
  popRegister16(cpu, 'B', 'C');
  assert.equal(cpu.registers.B, 0x12);
  assert.equal(cpu.registers.C, 0x34);
});

test('POP r16 increments SP by 2', () => {
  const cpu = createCpu({ sp: 0xFFFC });
  cpu.writeMemory(0xFFFC, 0x00);
  cpu.writeMemory(0xFFFD, 0x00);
  popRegister16(cpu, 'B', 'C');
  assert.equal(cpu.sp, 0xFFFE);
});

test('POP r16 wraps SP correctly at 0xFFFF', () => {
  const cpu = createCpu({ sp: 0xFFFF });
  cpu.writeMemory(0xFFFF, 0xAB); // low byte
  cpu.writeMemory(0x0000, 0xCD); // high byte (wraps)
  popRegister16(cpu, 'D', 'E');
  assert.equal(cpu.registers.E, 0xAB);
  assert.equal(cpu.registers.D, 0xCD);
  assert.equal(cpu.sp, 0x0001);
});

test('POP r16 returns 3 cycles', () => {
  const cpu = createCpu({ sp: 0xFFFC });
  cpu.writeMemory(0xFFFC, 0x00);
  cpu.writeMemory(0xFFFD, 0x00);
  assert.equal(popRegister16(cpu, 'H', 'L'), 3);
});

test('POP AF reads A and masks lower nibble of F', () => {
  const cpu = createCpu({ sp: 0xFFFC });
  cpu.writeMemory(0xFFFC, 0xFF); // would-be F value with lower nibble set
  cpu.writeMemory(0xFFFD, 0x42); // A value
  popRegisterAF(cpu);
  assert.equal(cpu.registers.A, 0x42);
  assert.equal(cpu.registers.F, 0xF0); // lower nibble masked to 0
});

test('POP AF clears lower nibble of F regardless of stack value', () => {
  const cpu = createCpu({ sp: 0xFFFC });
  cpu.writeMemory(0xFFFC, 0x1F); // lower nibble = 0xF
  cpu.writeMemory(0xFFFD, 0x00);
  popRegisterAF(cpu);
  assert.equal(cpu.registers.F, 0x10); // 0x1F & 0xF0 = 0x10
});

test('POP AF increments SP by 2', () => {
  const cpu = createCpu({ sp: 0xFFFC });
  cpu.writeMemory(0xFFFC, 0x00);
  cpu.writeMemory(0xFFFD, 0x00);
  popRegisterAF(cpu);
  assert.equal(cpu.sp, 0xFFFE);
});

test('POP AF returns 3 cycles', () => {
  const cpu = createCpu({ sp: 0xFFFC });
  cpu.writeMemory(0xFFFC, 0x00);
  cpu.writeMemory(0xFFFD, 0x00);
  assert.equal(popRegisterAF(cpu), 3);
});

test('RES u3, r8 clears the target bit', () => {
  const cpu = createCpu({ b: 0b11111111 });
  resetBitInReg(cpu, 'B', 3);
  assert.equal(cpu.registers.B, 0b11110111);
});

test('RES u3, r8 leaves other bits unchanged', () => {
  const cpu = createCpu({ b: 0b10101010 });
  resetBitInReg(cpu, 'B', 1);
  assert.equal(cpu.registers.B, 0b10101000);
});

test('RES u3, r8 clearing an already-clear bit is a no-op', () => {
  const cpu = createCpu({ b: 0b00000000 });
  resetBitInReg(cpu, 'B', 5);
  assert.equal(cpu.registers.B, 0b00000000);
});

test('RES u3, r8 does not affect flags', () => {
  const cpu = createCpu({ b: 0xff, f: Flags.Zero | Flags.Carry });
  resetBitInReg(cpu, 'B', 0);
  assert.equal(cpu.registers.F, Flags.Zero | Flags.Carry);
});

test('RES u3, r8 returns 2 cycles', () => {
  const cpu = createCpu({ b: 0xff });
  assert.equal(resetBitInReg(cpu, 'B', 0), 2);
});

test('RES u3, [HL] clears the target bit in memory', () => {
  const cpu = createCpu({ h: 0xc0, l: 0x00, memoryValue: 0b11111111 });
  resetBitInHLMemoryAddress(cpu, 3);
  assert.equal(cpu.readMemory(0xc000), 0b11110111);
});

test('RES u3, [HL] leaves other bits in memory unchanged', () => {
  const cpu = createCpu({ h: 0xc0, l: 0x00, memoryValue: 0b10101010 });
  resetBitInHLMemoryAddress(cpu, 1);
  assert.equal(cpu.readMemory(0xc000), 0b10101000);
});

test('RES u3, [HL] does not affect flags', () => {
  const cpu = createCpu({ h: 0xc0, l: 0x00, memoryValue: 0xff, f: Flags.Carry });
  resetBitInHLMemoryAddress(cpu, 0);
  assert.equal(cpu.registers.F, Flags.Carry);
});

test('RES u3, [HL] returns 4 cycles', () => {
  const cpu = createCpu({ h: 0xc0, l: 0x00, memoryValue: 0xff });
  assert.equal(resetBitInHLMemoryAddress(cpu, 0), 4);
});

test('RET pops address from stack and sets PC', () => {
  const cpu = createCpu({ sp: 0xFFFC });
  cpu.writeMemory(0xFFFC, 0x03); // low byte
  cpu.writeMemory(0xFFFD, 0x02); // high byte → PC = 0x0203
  returnFromSubrotine(cpu);
  assert.equal(cpu.pc, 0x0203);
});

test('RET increments SP by 2', () => {
  const cpu = createCpu({ sp: 0xFFFC });
  cpu.writeMemory(0xFFFC, 0x00);
  cpu.writeMemory(0xFFFD, 0x00);
  returnFromSubrotine(cpu);
  assert.equal(cpu.sp, 0xFFFE);
});

test('RET wraps SP correctly at 0xFFFF', () => {
  const cpu = createCpu({ sp: 0xFFFF });
  cpu.writeMemory(0xFFFF, 0x00); // low byte
  cpu.writeMemory(0x0000, 0x01); // high byte (wraps)
  returnFromSubrotine(cpu);
  assert.equal(cpu.pc, 0x0100);
  assert.equal(cpu.sp, 0x0001);
});

test('RET returns 4 cycles', () => {
  const cpu = createCpu({ sp: 0xFFFC });
  cpu.writeMemory(0xFFFC, 0x00);
  cpu.writeMemory(0xFFFD, 0x00);
  assert.equal(returnFromSubrotine(cpu), 4);
});

test('RET cc returns and sets PC when condition is true', () => {
  const cpu = createCpu({ sp: 0xFFFC, f: Flags.Zero });
  cpu.writeMemory(0xFFFC, 0x03);
  cpu.writeMemory(0xFFFD, 0x02);
  returnFromSubrotineConditional(cpu, condZ);
  assert.equal(cpu.pc, 0x0203);
  assert.equal(cpu.sp, 0xFFFE);
});

test('RET cc does not return when condition is false', () => {
  const cpu = createCpu({ sp: 0xFFFC, f: 0x00 });
  cpu.pc = 0x0100;
  returnFromSubrotineConditional(cpu, condZ);
  assert.equal(cpu.pc, 0x0100); // PC unchanged
  assert.equal(cpu.sp, 0xFFFC); // SP unchanged
});

test('RET cc returns 5 cycles when condition is true', () => {
  const cpu = createCpu({ sp: 0xFFFC, f: Flags.Zero });
  cpu.writeMemory(0xFFFC, 0x00);
  cpu.writeMemory(0xFFFD, 0x00);
  assert.equal(returnFromSubrotineConditional(cpu, condZ), 5);
});

test('RET cc returns 2 cycles when condition is false', () => {
  const cpu = createCpu({ sp: 0xFFFC, f: 0x00 });
  assert.equal(returnFromSubrotineConditional(cpu, condZ), 2);
});

test('RETI pops address from stack, sets PC, and enables IME', () => {
  const cpu = createCpu({ sp: 0xFFFC });
  cpu.ime = false;
  cpu.writeMemory(0xFFFC, 0x03);
  cpu.writeMemory(0xFFFD, 0x02);
  returnFromInterrupt(cpu);
  assert.equal(cpu.pc, 0x0203);
  assert.equal(cpu.ime, true);
});

test('RETI returns 4 cycles', () => {
  const cpu = createCpu({ sp: 0xFFFC });
  cpu.ime = false;
  cpu.writeMemory(0xFFFC, 0x00);
  cpu.writeMemory(0xFFFD, 0x00);
  assert.equal(returnFromInterrupt(cpu), 4);
});

test('RL r8 rotates left through carry, carry-in becomes bit 0', () => {
  const cpu = createCpu({ b: 0b00000000, f: Flags.Carry });
  rotateRegisterLeftWithCarry(cpu, 'B');
  assert.equal(cpu.registers.B, 0b00000001);
});

test('RL r8 old bit 7 becomes new carry', () => {
  const cpu = createCpu({ b: 0b10000000, f: 0x00 });
  rotateRegisterLeftWithCarry(cpu, 'B');
  assert.equal(cpu.registers.B, 0b00000000);
  assert.equal(cpu.registers.F & Flags.Carry, Flags.Carry);
});

test('RL r8 sets Zero flag when result is zero', () => {
  const cpu = createCpu({ b: 0b00000000, f: 0x00 });
  rotateRegisterLeftWithCarry(cpu, 'B');
  assert.equal(cpu.registers.F & Flags.Zero, Flags.Zero);
});

test('RL r8 clears Zero flag when result is non-zero', () => {
  const cpu = createCpu({ b: 0b00000001, f: 0x00 });
  rotateRegisterLeftWithCarry(cpu, 'B');
  assert.equal(cpu.registers.F & Flags.Zero, 0x00);
});

test('RL r8 clears N and H flags', () => {
  const cpu = createCpu({ b: 0b00000001, f: Flags.Substraction | Flags.HalfCarry });
  rotateRegisterLeftWithCarry(cpu, 'B');
  assert.equal(cpu.registers.F & Flags.Substraction, 0x00);
  assert.equal(cpu.registers.F & Flags.HalfCarry, 0x00);
});

test('RL r8 returns 2 cycles', () => {
  const cpu = createCpu({ b: 0x01 });
  assert.equal(rotateRegisterLeftWithCarry(cpu, 'B'), 2);
});

test('RL [HL] rotates memory value left through carry', () => {
  const cpu = createCpu({ h: 0xc0, l: 0x00, memoryValue: 0b10110010, f: Flags.Carry });
  rotateHLAddressLeftWithCarry(cpu);
  assert.equal(cpu.readMemory(0xc000), 0b01100101);
  assert.equal(cpu.registers.F & Flags.Carry, Flags.Carry);
});

test('RL [HL] sets Zero flag when result is zero', () => {
  const cpu = createCpu({ h: 0xc0, l: 0x00, memoryValue: 0b00000000, f: 0x00 });
  rotateHLAddressLeftWithCarry(cpu);
  assert.equal(cpu.registers.F & Flags.Zero, Flags.Zero);
});

test('RL [HL] returns 4 cycles', () => {
  const cpu = createCpu({ h: 0xc0, l: 0x00, memoryValue: 0x01 });
  assert.equal(rotateHLAddressLeftWithCarry(cpu), 4);
});

test('RLA rotates accumulator left through carry', () => {
  const cpu = createCpu({ a: 0b10110010, f: Flags.Carry });
  rotateAccumulatorLeftWithCarry(cpu);
  assert.equal(cpu.registers.A, 0b01100101);
  assert.equal(cpu.registers.F & Flags.Carry, Flags.Carry);
});

test('RLA always clears Zero flag even when result is zero', () => {
  const cpu = createCpu({ a: 0b00000000, f: 0x00 });
  rotateAccumulatorLeftWithCarry(cpu);
  assert.equal(cpu.registers.F & Flags.Zero, 0x00);
});

test('RLA clears N and H flags', () => {
  const cpu = createCpu({ a: 0x01, f: Flags.Substraction | Flags.HalfCarry });
  rotateAccumulatorLeftWithCarry(cpu);
  assert.equal(cpu.registers.F & Flags.Substraction, 0x00);
  assert.equal(cpu.registers.F & Flags.HalfCarry, 0x00);
});

test('RLA returns 1 cycle', () => {
  const cpu = createCpu({ a: 0x01 });
  assert.equal(rotateAccumulatorLeftWithCarry(cpu), 1);
});

test('RLC r8 rotates left, old bit 7 becomes both bit 0 and carry', () => {
  const cpu = createCpu({ b: 0b10110010, f: 0x00 });
  rotateRegisterLeft(cpu, 'B');
  assert.equal(cpu.registers.B, 0b01100101);
  assert.equal(cpu.registers.F & Flags.Carry, Flags.Carry);
});

test('RLC r8 carry-in is ignored, bit 0 comes from old bit 7', () => {
  const cpu = createCpu({ b: 0b00000010, f: Flags.Carry });
  rotateRegisterLeft(cpu, 'B');
  assert.equal(cpu.registers.B, 0b00000100);
  assert.equal(cpu.registers.F & Flags.Carry, 0x00);
});

test('RLC r8 sets Zero flag when result is zero', () => {
  const cpu = createCpu({ b: 0b00000000, f: 0x00 });
  rotateRegisterLeft(cpu, 'B');
  assert.equal(cpu.registers.F & Flags.Zero, Flags.Zero);
});

test('RLC r8 clears N and H flags', () => {
  const cpu = createCpu({ b: 0b00000001, f: Flags.Substraction | Flags.HalfCarry });
  rotateRegisterLeft(cpu, 'B');
  assert.equal(cpu.registers.F & Flags.Substraction, 0x00);
  assert.equal(cpu.registers.F & Flags.HalfCarry, 0x00);
});

test('RLC r8 returns 2 cycles', () => {
  const cpu = createCpu({ b: 0x01 });
  assert.equal(rotateRegisterLeft(cpu, 'B'), 2);
});

test('RLC [HL] rotates memory value left, old bit 7 becomes bit 0 and carry', () => {
  const cpu = createCpu({ h: 0xc0, l: 0x00, memoryValue: 0b10110010 });
  rotateHLAddressLeft(cpu);
  assert.equal(cpu.readMemory(0xc000), 0b01100101);
  assert.equal(cpu.registers.F & Flags.Carry, Flags.Carry);
});

test('RLC [HL] sets Zero flag when result is zero', () => {
  const cpu = createCpu({ h: 0xc0, l: 0x00, memoryValue: 0b00000000 });
  rotateHLAddressLeft(cpu);
  assert.equal(cpu.registers.F & Flags.Zero, Flags.Zero);
});

test('RLC [HL] returns 4 cycles', () => {
  const cpu = createCpu({ h: 0xc0, l: 0x00, memoryValue: 0x01 });
  assert.equal(rotateHLAddressLeft(cpu), 4);
});

test('RLCA rotates accumulator left, old bit 7 becomes bit 0 and carry', () => {
  const cpu = createCpu({ a: 0b10110010, f: 0x00 });
  rotateAccumulatorLeft(cpu);
  assert.equal(cpu.registers.A, 0b01100101);
  assert.equal(cpu.registers.F & Flags.Carry, Flags.Carry);
});

test('RLCA always clears Zero flag even when result is zero', () => {
  const cpu = createCpu({ a: 0b00000000, f: 0x00 });
  rotateAccumulatorLeft(cpu);
  assert.equal(cpu.registers.F & Flags.Zero, 0x00);
});

test('RLCA returns 1 cycle', () => {
  const cpu = createCpu({ a: 0x01 });
  assert.equal(rotateAccumulatorLeft(cpu), 1);
});
