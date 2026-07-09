import test from 'node:test';
import assert from 'node:assert/strict';

import { addRegWithCarryToAccumulator, addRegToAccumulator, addValueWithCarryToAccumulator, addValueToAccumulator, addValueToSP, andRegWithAccumulator, andHLWithAccumulator, andValueWithAccumulator, testBitInReg, testBitInHL, callFunction, callFunctionConditional, condZ, condNZ, condC, condNC, compareRegistryFromAccumulator, compareHLAddressFromAccumulator, compareValueFromAccumulator } from '../src/instructions.js';
import { CPU } from '../src/cpu.js';

const Flags = Object.freeze({
  Zero: 1 << 7,
  Substraction: 1 << 6,
  HalfCarry: 1 << 5,
  Carry: 1 << 4,
});

function createCpu({ a = 0x00, f = 0x00, b = 0x00, c = 0x00, h = 0x00, l = 0x00, sp = 0x0000, memoryValue = 0x00 } = {}) {
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
    readMemory() {
      return memoryValue;
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
