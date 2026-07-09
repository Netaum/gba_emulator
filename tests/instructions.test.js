import test from 'node:test';
import assert from 'node:assert/strict';

import { addRegWithCarryToAccumulator, addRegToAccumulator, addValueWithCarryToAccumulator, addValueToAccumulator } from '../src/instructions.js';

const Flags = Object.freeze({
  Zero: 1 << 0,
  HalfCarry: 1 << 2,
  Carry: 1 << 3,
});

function createCpu({ a = 0x00, f = 0x00, b = 0x00, c = 0x00 } = {}) {
  return {
    registers: {
      A: a,
      F: f,
      B: b,
      C: c,
      D: 0x00,
      E: 0x00,
      H: 0x00,
      L: 0x00,
    },
    readMemory() {
      return 0x00;
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
