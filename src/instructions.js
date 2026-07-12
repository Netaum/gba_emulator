const Flags = Object.freeze({
    Zero: 1 << 7,
    Substraction: 1 << 6,
    HalfCarry: 1 << 5,
    Carry: 1 << 4,
});

export const condZ = (cpu) => (cpu.registers.F & Flags.Zero) !== 0;
export const condNZ = (cpu) => (cpu.registers.F & Flags.Zero) === 0;
export const condC = (cpu) => (cpu.registers.F & Flags.Carry) !== 0;
export const condNC = (cpu) => (cpu.registers.F & Flags.Carry) === 0;

export const readHLMemoryAddress = (cpu) => {
    const address = readHLAddress(cpu);
    return cpu.readMemory(address, false);
}

export const readHLAddress = (cpu) => {
    return ((cpu.registers.H << 8) | cpu.registers.L) & 0xffff;
}

export const writeHLAddress = (cpu, value) => {
    const address = readHLAddress(cpu);
    cpu.writeMemory(address, value, false);
}

export const writeHL = (cpu, value) => {
    cpu.registers.H = (value >> 8) & 0xff;
    cpu.registers.L = value & 0xff;
}

export const readR16Address = (cpu, registerHigh, registerLow) => {
    const address = ((cpu.registers[registerHigh] << 8) | cpu.registers[registerLow]) & 0xffff;
    return cpu.readMemory(address, false) & 0xffff;
}

export const writeR16Address = (cpu, registerHigh, registerLow, value) => {
    const address = ((cpu.registers[registerHigh] << 8) | cpu.registers[registerLow]) & 0xffff;
    cpu.writeMemory(address, value & 0xffff, false);
}

export const applySignExtension = (value) => {
    return (value << 24) >> 24;
}

/*
List of abbreviations used in this document.

r8
Any of the 8-bit registers (A, B, C, D, E, H, L).
r16
Any of the general-purpose 16-bit registers (BC, DE, HL).
n8
8-bit integer constant.
n16
16-bit integer constant.
e8
8-bit offset (-128 to 127).
u3
3-bit unsigned integer constant (0 to 7).
cc
Condition codes:
Z
Execute if Z is set.
NZ
Execute if Z is not set.
C
Execute if C is set.
NC
Execute if C is not set.
! cc
Negates a condition code.
vec
One of the RST vectors (0x00, 0x08, 0x10, 0x18, 0x20, 0x28, 0x30, and 0x38).
*/

const carry = (cpu) => {
    return (cpu.registers.F & Flags.Carry) !== 0 ? 1 : 0;
}

const halfCarry = (cpu) => {
    return (cpu.registers.F & Flags.HalfCarry) !== 0 ? 1 : 0;
}

const substraction = (cpu) => {
    return (cpu.registers.F & Flags.Substraction) !== 0 ? true : false;
}

const zero = (cpu) => {
    return (cpu.registers.F & Flags.Zero) !== 0 ? true : false;
}

const addToAccumulator = (cpu, value, useCarry) => {
    const carryIn = useCarry ? carry(cpu) : 0;
    const a = cpu.registers.A & 0xff;
    const operand = value & 0xff;
    const sum = a + operand + carryIn;

    const halfCarry = ((a & 0x0f) + (operand & 0x0f) + carryIn) > 0x0f;
    const carryOut = sum > 0xff;

    cpu.registers.A = sum & 0xff;

    cpu.registers.F = 0x00;
    cpu.registers.F |= (cpu.registers.A === 0) ? Flags.Zero : 0x00;
    cpu.registers.F |= halfCarry ? Flags.HalfCarry : 0x00;
    cpu.registers.F |= carryOut ? Flags.Carry : 0x00;
}

export const addRegWithCarryToAccumulator = (cpu, register) => {
    const cycles = 1;

    const value = cpu.registers[register];
    addToAccumulator(cpu, value, true);

    return cycles;
};

export const addHLAddressWithCarryToAccumulator = (cpu) => {
    const cycles = 2;
    const address = ((cpu.registers.H << 8) | cpu.registers.L) & 0xffff;
    const value = cpu.readMemory(address, false);

    addToAccumulator(cpu, value, true);

    return cycles;
}

export const addValueWithCarryToAccumulator = (cpu, value) => {
    const cycles = 2;
    addToAccumulator(cpu, value, true);
    return cycles;
}

export const addRegToAccumulator = (cpu, register) => {
    const cycles = 1;

    const value = cpu.registers[register];
    addToAccumulator(cpu, value, false);

    return cycles;
};

export const addHLAddressToAccumulator = (cpu) => {
    const cycles = 2;
    const address = ((cpu.registers.H << 8) | cpu.registers.L) & 0xffff;
    const value = cpu.readMemory(address, false);

    addToAccumulator(cpu, value, false);

    return cycles;
}

export const addValueToAccumulator = (cpu, value) => {
    const cycles = 2;
    addToAccumulator(cpu, value, false);
    return cycles;
}

// 0 0 0 0  - 0 0 0 0 - 0 0 0 0 - 0 0 0 0
//    F          F         F         F
export const addRegToHL = (cpu, registerHigh, registerLow) => {
    const cycles = 2;

    const value = ((cpu.registers[registerHigh] << 8) | cpu.registers[registerLow]) & 0xffff;

    addToHL(cpu, value);

    return cycles;
}

export const addSPToHl = (cpu) => {
    const cycles = 2;

    addToHL(cpu, cpu.sp);

    return cycles;
}

function addToHL(cpu, value) {

    const hl = ((cpu.registers.H << 8) | cpu.registers.L) & 0xffff;

    const sum = hl + value;
    const halfCarry = ((hl & 0x0fff) + (value & 0x0fff)) > 0x0fff;
    const carryOut = sum > 0xffff;

    cpu.registers.H = (sum >> 8) & 0xff;
    cpu.registers.L = sum & 0xff;

    cpu.registers.F = cpu.registers.F & Flags.Zero;
    cpu.registers.F |= halfCarry ? Flags.HalfCarry : 0x00;
    cpu.registers.F |= carryOut ? Flags.Carry : 0x00;
}

export const addValueToSP = (cpu, value) => {

    const cycles = 4;
    const e8 = applySignExtension(value);

    const halfCarry = ((cpu.sp & 0x0f) + (value & 0x0f)) > 0x0f;
    const carryOut = ((cpu.sp & 0xff) + (value & 0xff)) > 0xff;

    cpu.sp = (cpu.sp + e8) & 0xffff;
    cpu.registers.F = 0x00;
    cpu.registers.F |= halfCarry ? Flags.HalfCarry : 0x00;
    cpu.registers.F |= carryOut ? Flags.Carry : 0x00;

    return cycles;

}

function andWithAccumulator(cpu, value) {

    const a = cpu.registers.A & 0xff;
    const comp = a & value;

    cpu.registers.A = comp & 0xff;
    cpu.registers.F = 0x00;

    if (comp === 0)
        cpu.registers.F |= Flags.Zero;

    cpu.registers.F |= Flags.HalfCarry;
}

export const andRegWithAccumulator = (cpu, register) => {

    const cycles = 1;

    const value = cpu.registers[register] & 0xff;
    andWithAccumulator(cpu, value);

    return cycles;

}

export const andHLWithAccumulator = (cpu) => {

    const cycles = 2;

    const hl = ((cpu.registers.H << 8) | cpu.registers.L) & 0xffff;
    const value = cpu.readMemory(hl, false) & 0xff;

    andWithAccumulator(cpu, value);

    return cycles;

}

export const andValueWithAccumulator = (cpu, value) => {
    const cycles = 2;
    andWithAccumulator(cpu, value & 0xff);
    return cycles;
}

function testBit(cpu, value, bit) {
    const bitMask = 1 << bit;

    const comp = value & bitMask;

    cpu.registers.F = cpu.registers.F & Flags.Carry;
    cpu.registers.F |= (comp === 0) ? Flags.Zero : 0x00;
    cpu.registers.F |= Flags.HalfCarry;
}

export const testBitInReg = (cpu, register, bit) => {
    const cycles = 2;
    const value = cpu.registers[register] & 0xff;
    testBit(cpu, value, bit);
    return cycles;
}

export const testBitInHL = (cpu, bit) => {
    const cycles = 3;
    const hl = ((cpu.registers.H << 8) | cpu.registers.L) & 0xffff;
    const value = cpu.readMemory(hl, false) & 0xff;
    testBit(cpu, value, bit);
    return cycles;
}

export const callFunction = (cpu, address) => {
    const cycles = 6;

    const pc = cpu.pc & 0xffff;
    cpu.sp = (cpu.sp - 1) & 0xffff;
    cpu.writeMemory(cpu.sp, (pc >> 8) & 0xff, false);
    cpu.sp = (cpu.sp - 1) & 0xffff;
    cpu.writeMemory(cpu.sp, pc & 0xff, false);

    cpu.pc = address & 0xffff;

    return cycles;
}

export const callFunctionConditional = (cpu, address, condition) => {
    if (!condition(cpu)) {
        return 3;
    } else {
        return callFunction(cpu, address);
    }
}

export const complementCarryFlag = (cpu) => {
    const cycles = 1;
    const previous = cpu.registers.F & Flags.Zero;
    const carryFlag = carry(cpu) === 0 ? Flags.Carry : 0x00;
    cpu.registers.F = 0x00;
    cpu.registers.F |= previous;
    cpu.registers.F |= carryFlag;
    return cycles;
}

function compareWithAccumulator(cpu, value) {

    const sub = (cpu.registers.A & 0xff) - value;

    cpu.registers.F = 0x00;
    cpu.registers.F |= sub === 0 ? Flags.Zero : 0x00;
    cpu.registers.F |= Flags.Substraction;
    cpu.registers.F |= value > cpu.registers.A ? Flags.Carry : 0x00;
    cpu.registers.F |= (cpu.registers.A & 0x0f) < (value & 0x0f) ? Flags.HalfCarry : 0x00;

}

export const compareRegistryFromAccumulator = (cpu, register) => {
    const cycles = 1;

    const value = cpu.registers[register] & 0xff;
    compareWithAccumulator(cpu, value);

    return cycles;
}

export const compareHLAddressFromAccumulator = (cpu) => {
    const cycles = 2;

    const value = readHLMemoryAddress(cpu) & 0xff;
    compareWithAccumulator(cpu, value);

    return cycles;
}

export const compareValueFromAccumulator = (cpu, value) => {
    const cycles = 2;

    compareWithAccumulator(cpu, value & 0xff);

    return cycles;
}

export const complementAccumulator = (cpu) => {
    const cycles = 1;
    cpu.registers.A = (~cpu.registers.A) & 0xff;
    cpu.registers.F |= Flags.Substraction;
    cpu.registers.F |= Flags.HalfCarry;
    return cycles;
}

export const decimalAdjustAccumulator = (cpu) => {
    const cycles = 1;

    const a = cpu.registers.A & 0xff;
    let correction = 0;
    let carryFlag = carry(cpu) !== 0;

    if (!substraction(cpu)) {
        if (((a & 0x0f) > 0x09) || halfCarry(cpu)) {
            correction |= 0x06;
        }

        if (((a + correction) & 0xff) > 0x99 || carry(cpu)) {
            correction |= 0x60;
            carryFlag = true;
        }
        cpu.registers.A = (a + correction) & 0xff;

    }
    else {
        if (halfCarry(cpu)) {
            correction |= 0x06;
        }

        if (carry(cpu)) {
            correction |= 0x60;
        }

        cpu.registers.A = (a - correction) & 0xff;

    }


    cpu.registers.F &= ~Flags.HalfCarry;
    cpu.registers.F &= ~Flags.Zero;

    cpu.registers.F |= cpu.registers.A === 0 ? Flags.Zero : 0x00;
    cpu.registers.F = carryFlag ?
        cpu.registers.F | Flags.Carry :
        cpu.registers.F & ~Flags.Carry;

    return cycles;
}

function decrementFlags(cpu, originalValue, newValue) {
    let flags = cpu.registers.F & Flags.Carry;
    flags |= newValue === 0 ? Flags.Zero : 0x00;
    flags |= Flags.Substraction;
    flags |= (originalValue & 0x0f) === 0x00 ? Flags.HalfCarry : 0x00;

    cpu.registers.F = flags;
}

function incrementFlags(cpu, originalValue, newValue) {
    let flags = cpu.registers.F & Flags.Carry;
    flags |= newValue === 0 ? Flags.Zero : 0x00;
    flags |= (originalValue & 0x0f) === 0x0f ? Flags.HalfCarry : 0x00;

    cpu.registers.F = flags;
}

export const decrementRegistry = (cpu, register) => {
    const cycles = 1;

    const reg = cpu.registers[register] & 0xff;
    const newValue = (reg - 1) & 0xff;
    decrementFlags(cpu, reg, newValue);
    cpu.registers[register] = newValue;

    return cycles;
}

export const decrementHLAddress = (cpu) => {
    const cycles = 3;

    const hl = readHLMemoryAddress(cpu) & 0xff;
    const newValue = (hl - 1) & 0xff;
    decrementFlags(cpu, hl, newValue);
    writeHLAddress(cpu, newValue);
    return cycles;
}

export const decrementR16 = (cpu, registerHigh, registerLow) => {
    const cycles = 2;

    const value = ((cpu.registers[registerHigh] << 8) | cpu.registers[registerLow]) & 0xffff;
    const newValue = (value - 1) & 0xffff;

    cpu.registers[registerHigh] = (newValue >> 8) & 0xff;
    cpu.registers[registerLow] = newValue & 0xff;

    return cycles;
}

export const decrementSP = (cpu) => {
    const cycles = 2;
    
    cpu.sp = (cpu.sp - 1) & 0xffff;

    return cycles;
}

export const disableInterrupts = (cpu) => {
    const cycles = 1;
    cpu.ime = false;
    return cycles;
}

export const enableInterrupts = (cpu) => {
    const cycles = 1;
    cpu.ime = true;
    return cycles;
}

export const haltCPU = (cpu) => {
    const cycles = 4;
    cpu.halted = true;
    return cycles;
}

export const incrementRegistry = (cpu, register) => {
    const cycles = 1;
    const reg = cpu.registers[register] & 0xff;
    const newValue = (reg + 1) & 0xff;
    incrementFlags(cpu, reg, newValue);
    cpu.registers[register] = newValue;
    return cycles;
}

export const incrementHLAddress = (cpu) => {
    const cycles = 3;
    const hl = readHLMemoryAddress(cpu) & 0xff;

    const newValue = (hl + 1) & 0xff;
    incrementFlags(cpu, hl, newValue);
    writeHLAddress(cpu, newValue);
    return cycles;
}

export const incrementR16 = (cpu, registerHigh, registerLow) => {
    const cycles = 2;

    const value = ((cpu.registers[registerHigh] << 8) | cpu.registers[registerLow]) & 0xffff;
    const newValue = (value + 1) & 0xffff;
        
    cpu.registers[registerHigh] = (newValue >> 8) & 0xff;
    cpu.registers[registerLow] = newValue & 0xff;

    return cycles;
}

export const incrementSP = (cpu) => {
    const cycles = 2;
    cpu.sp = (cpu.sp + 1) & 0xffff;
    return cycles;
}

export const jumpToAddress = (cpu, address) => {
    const cycles = 4;

    cpu.pc = address & 0xffff;

    return cycles;
}

export const jumpToAddressConditional = (cpu, address, condition) => {
    if (!condition(cpu)) {
        return 3;
    }

    return jumpToAddress(cpu, address);
}

export const jumpToHLAddress = (cpu) => {
    const cycles = 1;

    const address = readHLAddress(cpu);
    cpu.pc = address;
    
    return cycles;
}

export const jumpRelativeN16 = (cpu, offset) => {
    const cycles = 3;

    const e8 = applySignExtension(offset);
    
    cpu.pc = (cpu.pc + e8) & 0xffff;

    return cycles;
}

export const jumpRelativeN16Conditional = (cpu, offset, condition) => {
    if (!condition(cpu)) {
        return 2;
    }

    return jumpRelativeN16(cpu, offset);
}

export const loadRegisterWithRegister = (cpu, destRegister, srcRegister) => {
    const cycles = 1;

    cpu.registers[destRegister] = cpu.registers[srcRegister];

    return cycles;
}

export const loadRegisterWithValue = (cpu, destRegister, value) => {
    const cycles = 2;
    
    cpu.registers[destRegister] = value & 0xff;

    return cycles;
}

export const loadRegister16WithValue = (cpu, destRegisterHigh, destRegisterLow, value) => {
    const cycles = 3;

    cpu.registers[destRegisterHigh] = (value >> 8) & 0xff;
    cpu.registers[destRegisterLow] = value & 0xff;

    return cycles;
}

export const loadHLAddressWithRegister = (cpu, srcRegister) => {
    const cycles = 2;
    
    const value = cpu.registers[srcRegister] & 0xff;
    writeHLAddress(cpu, value);

    return cycles;
}

export const loadHLAddressWithValue = (cpu, value) => {
    const cycles = 3;

    writeHLAddress(cpu, value & 0xff);

    return cycles;
}

export const loadRegisterWithHLAddress = (cpu, destRegister) => {
    const cycles = 2;

    const value = readHLMemoryAddress(cpu) & 0xff;
    cpu.registers[destRegister] = value;

    return cycles;
}

export const loadMemoryR16WithAccumulator = (cpu, registerHigh, registerLow) => {
    const cycles = 2;
    
    const address = ((cpu.registers[registerHigh] << 8) | cpu.registers[registerLow]) & 0xffff;
    const value = cpu.registers.A & 0xff;
    cpu.writeMemory(address, value, false);
    return cycles;
}

export const loadMemoryAddressWithAccumulator = (cpu, address) => {
    const cycles = 4;
    
    cpu.writeMemory(address & 0xffff, cpu.registers.A & 0xff, false);

    return cycles;
}

export const loadMemoryAddressConditionalWithAccumulator = (cpu, address) => {
    const cycles = 3;

    cpu.writeMemory(address & 0xffff, cpu.registers.A & 0xff, false);

    return cycles;
}

export const loadMemoryRegisterCWithAccumulator = (cpu) => {
    const cycles = 2;
    
    const address = 0xFF00 | (cpu.registers.C & 0xff);
    cpu.writeMemory(address, cpu.registers.A & 0xff, true);
    return cycles;
}

export const loadMemoryHLWithAccumulatorInc = (cpu) => {
    const cycles = 2;
    
    const address = readHLAddress(cpu);
    cpu.writeMemory(address, cpu.registers.A & 0xff, false);

    const hl = (address + 1) & 0xffff;
    cpu.registers.H = (hl >> 8) & 0xff;
    cpu.registers.L = hl & 0xff;

    return cycles;
}

export const loadMemoryHLWithAccumulatorDec = (cpu) => {
    const cycles = 2;
    
    const address = readHLAddress(cpu);
    cpu.writeMemory(address, cpu.registers.A & 0xff, false);

    const hl = (address - 1) & 0xffff;
    cpu.registers.H = (hl >> 8) & 0xff;
    cpu.registers.L = hl & 0xff;

    return cycles;
}   

export const loadAccumulatorHLAddressInc = (cpu) => {
    const cycles = 2;
    
    const address = readHLAddress(cpu);
    const value = cpu.readMemory(address, false) & 0xff;
    cpu.registers.A = value;

    const hl = (address + 1) & 0xffff;
    cpu.registers.H = (hl >> 8) & 0xff;
    cpu.registers.L = hl & 0xff;

    return cycles;
}

export const loadAccumulatorHLAddressDec = (cpu) => {
    const cycles = 2;
    
    const address = readHLAddress(cpu);
    const value = cpu.readMemory(address, false) & 0xff;
    cpu.registers.A = value;

    const hl = (address - 1) & 0xffff;
    cpu.registers.H = (hl >> 8) & 0xff;
    cpu.registers.L = hl & 0xff;
    
    return cycles;
}

export const loadSPWithValue = (cpu, value) => {
    const cycles = 3;
    cpu.sp = value & 0xffff;
    return cycles;
}

export const loadMemoryWithSP = (cpu, address) => {
    const cycles = 5;
    cpu.writeMemory(address & 0xffff, cpu.sp & 0xff, false);
    cpu.writeMemory((address + 1) & 0xffff, (cpu.sp >> 8) & 0xff, false);
    return cycles;
}

export const loadHLWithSP = (cpu) => {
    const cycles = 2;
    const value = cpu.sp & 0xffff;
    cpu.registers.H = (value >> 8) & 0xff;
    cpu.registers.L = value & 0xff;

    return cycles;
}

export const loadHLWithSP28 = (cpu, value) => {

    const cycles = 3;
    const e8 = applySignExtension(value);

    const halfCarry = ((cpu.sp & 0x0f) + (value & 0x0f)) > 0x0f;
    const carryOut = ((cpu.sp & 0xff) + (value & 0xff)) > 0xff;

    const newValue = (cpu.sp + e8) & 0xffff;

    writeHL(cpu, newValue);
    
    cpu.registers.F = 0x00;
    cpu.registers.F |= halfCarry ? Flags.HalfCarry : 0x00;
    cpu.registers.F |= carryOut ? Flags.Carry : 0x00;

    return cycles;

}

export const NOP = (cpu) => {
    const cycles = 1;
    return cycles;
}

