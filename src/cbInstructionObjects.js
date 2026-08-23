const Flags = Object.freeze({
  Zero: 0x80,
  Substraction: 0x40,
  HalfCarry: 0x20,
  Carry: 0x10,
});

const registers = ['B', 'C', 'D', 'E', 'H', 'L', null, 'A'];

function hlAddress(cpu) {
  return ((cpu.registers.H << 8) | cpu.registers.L) & 0xffff;
}

function readOperand(cpu, register) {
  return register === null ? cpu.readMemory(hlAddress(cpu)) : cpu.registers[register] & 0xff;
}

function writeOperand(cpu, register, value) {
  if (register === null) {
    cpu.writeMemory(hlAddress(cpu), value & 0xff);
    return;
  }

  cpu.registers[register] = value & 0xff;
}

function writeRotateFlags(cpu, result, carry) {
  cpu.registers.F = (result === 0 ? Flags.Zero : 0) | (carry ? Flags.Carry : 0);
}

const transforms = [
  {
    mnemonic: 'RLC',
    apply(value) {
      const carry = (value & 0x80) !== 0;
      return { result: ((value << 1) | (carry ? 1 : 0)) & 0xff, carry };
    },
  },
  {
    mnemonic: 'RRC',
    apply(value) {
      const carry = (value & 0x01) !== 0;
      return { result: ((value >> 1) | (carry ? 0x80 : 0)) & 0xff, carry };
    },
  },
  {
    mnemonic: 'RL',
    apply(value, carryIn) {
      const carry = (value & 0x80) !== 0;
      return { result: ((value << 1) | carryIn) & 0xff, carry };
    },
  },
  {
    mnemonic: 'RR',
    apply(value, carryIn) {
      const carry = (value & 0x01) !== 0;
      return { result: ((value >> 1) | (carryIn ? 0x80 : 0)) & 0xff, carry };
    },
  },
  {
    mnemonic: 'SLA',
    apply(value) {
      const carry = (value & 0x80) !== 0;
      return { result: (value << 1) & 0xff, carry };
    },
  },
  {
    mnemonic: 'SRA',
    apply(value) {
      const carry = (value & 0x01) !== 0;
      return { result: ((value >> 1) | (value & 0x80)) & 0xff, carry };
    },
  },
  {
    mnemonic: 'SWAP',
    apply(value) {
      return { result: ((value << 4) | (value >> 4)) & 0xff, carry: false };
    },
  },
  {
    mnemonic: 'SRL',
    apply(value) {
      const carry = (value & 0x01) !== 0;
      return { result: value >> 1, carry };
    },
  },
];

function createTransformInstruction(index, transform, register) {
  const operand = register === null ? '[HL]' : register;

  return {
    mnemonic: `${transform.mnemonic} ${operand}`,
    index,
    execute(cpu) {
      const value = readOperand(cpu, register);
      const carryIn = (cpu.registers.F & Flags.Carry) !== 0 ? 1 : 0;
      const { result, carry } = transform.apply(value, carryIn);

      writeOperand(cpu, register, result);
      writeRotateFlags(cpu, result, carry);
      return register === null ? 4 : 2;
    },
  };
}

function createBitInstruction(index, bit, register) {
  const operand = register === null ? '[HL]' : register;
  const mask = 1 << bit;

  return {
    mnemonic: `BIT ${bit}, ${operand}`,
    index,
    execute(cpu) {
      const value = readOperand(cpu, register);
      const carry = cpu.registers.F & Flags.Carry;
      cpu.registers.F = carry | Flags.HalfCarry | ((value & mask) === 0 ? Flags.Zero : 0);
      return register === null ? 3 : 2;
    },
  };
}

function createSetResetInstruction(index, operation, bit, register) {
  const operand = register === null ? '[HL]' : register;
  const mask = 1 << bit;

  return {
    mnemonic: `${operation} ${bit}, ${operand}`,
    index,
    execute(cpu) {
      const value = readOperand(cpu, register);
      const result = operation === 'SET' ? value | mask : value & ~mask;
      writeOperand(cpu, register, result);
      return register === null ? 4 : 2;
    },
  };
}

// CB opcodes are arranged in eight blocks of 0x20 entries.
export const cbInstructionObjects = Array.from({ length: 256 }, (_, index) => {
  const register = registers[index & 0x07];

  if (index < 0x40) {
    return createTransformInstruction(index, transforms[index >> 3], register);
  }

  const bit = (index >> 3) & 0x07;
  if (index < 0x80) return createBitInstruction(index, bit, register);
  if (index < 0xc0) return createSetResetInstruction(index, 'RES', bit, register);
  return createSetResetInstruction(index, 'SET', bit, register);
});
