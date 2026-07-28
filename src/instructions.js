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

export const readMemoryFromHLAddress = (cpu) => {
    const address = readValueFromHLRegisters(cpu);
    return cpu.readMemory(address, false);
}

export const readValueFromHLRegisters = (cpu) => {
    return ((cpu.registers.H << 8) | cpu.registers.L) & 0xffff;
}

export const writeMemoryFromHLAddress = (cpu, value) => {
    const address = readValueFromHLRegisters(cpu);
    cpu.writeMemory(address, value, false);
}

export const writeValueIntoHLRegisters = (cpu, value) => {
    cpu.registers.H = (value >> 8) & 0xff;
    cpu.registers.L = value & 0xff;
}

export const readFromR16Address = (cpu, registerHigh, registerLow) => {
    const address = ((cpu.registers[registerHigh] << 8) | cpu.registers[registerLow]) & 0xffff;
    return cpu.readMemory(address, false) & 0xffff;
}

export const writeToR16Address = (cpu, registerHigh, registerLow, value) => {
    const address = ((cpu.registers[registerHigh] << 8) | cpu.registers[registerLow]) & 0xffff;
    cpu.writeMemory(address, value & 0xffff, false);
}

export const applySignExtension = (value) => {
    return (value << 24) >> 24;
}

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

const NOP = {
    id: 0x00,
    mnemonic: 'NOP',
    length: 1,
    cycles: 1,
    execute: function(cpu) {
        return this.cycles;
    }
};

const loadRegistersWithValue = (cpu, destRegisterHigh, destRegisterLow, value) => {
    cpu.registers[destRegisterHigh] = (value >> 8) & 0xff;
    cpu.registers[destRegisterLow] = value & 0xff;
}

const formatU16Value = (hi, lo) => {
    return ((hi << 8) | lo) & 0xffff;
}

const LD_BC_u16 = {
    id: 0x01,
    mnemonic: 'LD BC, u16',
    length: 3,
    cycles: 3,
    execute: function(cpu) {
        const lo = cpu.readMemoryFromProgramCounter();
        cpu.incProgramCounter();
        const hi = cpu.readMemoryFromProgramCounter();
        cpu.incProgramCounter();
        const value = formatU16Value(hi, lo);
        loadRegistersWithValue(cpu, 'B', 'C', value);
        return this.cycles;
    }
}

const loadMemoryR16WithAccumulator = (cpu, registerHigh, registerLow) => {
    const cycles = 2;

    const address = ((cpu.registers[registerHigh] << 8) | cpu.registers[registerLow]) & 0xffff;
    const value = cpu.registers.A & 0xff;
    cpu.writeMemory(address, value, false);
    return cycles;
}

const LD_BC_Accumulator = {
    id: 0x01,
    mnemonic: 'LD BC, A',
    length: 1,
    cycles: 2,
    execute: function(cpu) {
        const lo = cpu.readMemoryFromProgramCounter();
        cpu.incProgramCounter();
        const hi = cpu.readMemoryFromProgramCounter();
        cpu.incProgramCounter();
        const value = formatU16Value(hi, lo);
        loadRegistersWithValue(cpu, 'B', 'C', value);
        return this.cycles;
    }
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

    const value = readMemoryFromHLAddress(cpu) & 0xff;
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

    const hl = readMemoryFromHLAddress(cpu) & 0xff;
    const newValue = (hl - 1) & 0xff;
    decrementFlags(cpu, hl, newValue);
    writeMemoryFromHLAddress(cpu, newValue);
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
    const hl = readMemoryFromHLAddress(cpu) & 0xff;

    const newValue = (hl + 1) & 0xff;
    incrementFlags(cpu, hl, newValue);
    writeMemoryFromHLAddress(cpu, newValue);
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

    const address = readValueFromHLRegisters(cpu);
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



export const loadHLAddressWithRegister = (cpu, srcRegister) => {
    const cycles = 2;

    const value = cpu.registers[srcRegister] & 0xff;
    writeMemoryFromHLAddress(cpu, value);

    return cycles;
}

export const loadHLAddressWithValue = (cpu, value) => {
    const cycles = 3;

    writeMemoryFromHLAddress(cpu, value & 0xff);

    return cycles;
}

export const loadRegisterWithHLAddress = (cpu, destRegister) => {
    const cycles = 2;

    const value = readMemoryFromHLAddress(cpu) & 0xff;
    cpu.registers[destRegister] = value;

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

    const address = readValueFromHLRegisters(cpu);
    cpu.writeMemory(address, cpu.registers.A & 0xff, false);

    const hl = (address + 1) & 0xffff;
    cpu.registers.H = (hl >> 8) & 0xff;
    cpu.registers.L = hl & 0xff;

    return cycles;
}

export const loadMemoryHLWithAccumulatorDec = (cpu) => {
    const cycles = 2;

    const address = readValueFromHLRegisters(cpu);
    cpu.writeMemory(address, cpu.registers.A & 0xff, false);

    const hl = (address - 1) & 0xffff;
    cpu.registers.H = (hl >> 8) & 0xff;
    cpu.registers.L = hl & 0xff;

    return cycles;
}

export const loadAccumulatorHLAddressInc = (cpu) => {
    const cycles = 2;

    const address = readValueFromHLRegisters(cpu);
    const value = cpu.readMemory(address, false) & 0xff;
    cpu.registers.A = value;

    const hl = (address + 1) & 0xffff;
    cpu.registers.H = (hl >> 8) & 0xff;
    cpu.registers.L = hl & 0xff;

    return cycles;
}

export const loadAccumulatorHLAddressDec = (cpu) => {
    const cycles = 2;

    const address = readValueFromHLRegisters(cpu);
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

    writeValueIntoHLRegisters(cpu, newValue);

    cpu.registers.F = 0x00;
    cpu.registers.F |= halfCarry ? Flags.HalfCarry : 0x00;
    cpu.registers.F |= carryOut ? Flags.Carry : 0x00;

    return cycles;

}

export const NOP = (cpu) => {
    const cycles = 1;
    return cycles;
}

function orWithAccumulator(cpu, value) {
    const a = cpu.registers.A & 0xff;
    const comp = a | value;

    cpu.registers.A = comp & 0xff;
    cpu.registers.F = 0x00;

    if (comp === 0)
        cpu.registers.F |= Flags.Zero;
}

export const orRegWithAccumulator = (cpu, register) => {
    const cycles = 1;

    const value = cpu.registers[register] & 0xff;

    orWithAccumulator(cpu, value);

    return cycles;
}

export const orHLWithAccumulator = (cpu) => {
    const cycles = 2;

    const hl = readMemoryFromHLAddress(cpu) & 0xff;
    orWithAccumulator(cpu, hl);

    return cycles;
}

export const orValueWithAccumulator = (cpu, value) => {
    const cycles = 2;

    orWithAccumulator(cpu, value & 0xff);

    return cycles;
}

export const popRegisterAF = (cpu) => {
    const cycles = 3;
    const low = cpu.readMemory(cpu.sp) & 0xff;
    cpu.sp = (cpu.sp + 1) & 0xffff;
    const high = cpu.readMemory(cpu.sp) & 0xff;
    cpu.sp = (cpu.sp + 1) & 0xffff;


    cpu.registers.F = low & 0xf0;
    cpu.registers.A = high & 0xff;

    return cycles;
}

export const popRegister16 = (cpu, registerHigh, registerLow) => {
    const cycles = 3;

    const low = cpu.readMemory(cpu.sp) & 0xff;
    cpu.sp = (cpu.sp + 1) & 0xffff;
    const high = cpu.readMemory(cpu.sp) & 0xff;
    cpu.sp = (cpu.sp + 1) & 0xffff;

    cpu.registers[registerHigh] = high & 0xff;
    cpu.registers[registerLow] = low & 0xff;

    return cycles;
}

export const pushRegisterAF = (cpu) => {
    const cycles = 4;

    cpu.sp = (cpu.sp - 1) & 0xffff;
    cpu.writeMemory(cpu.sp, cpu.registers.A & 0xff, false);
    cpu.sp = (cpu.sp - 1) & 0xffff;
    cpu.writeMemory(cpu.sp, cpu.registers.F & 0xff, false);

    return cycles;
}

export const pushRegister16 = (cpu, registerHigh, registerLow) => {
    const cycles = 4;

    cpu.sp = (cpu.sp - 1) & 0xffff;
    cpu.writeMemory(cpu.sp, cpu.registers[registerHigh] & 0xff, false);
    cpu.sp = (cpu.sp - 1) & 0xffff;
    cpu.writeMemory(cpu.sp, cpu.registers[registerLow] & 0xff, false);

    return cycles;
}

export const resetBitInReg = (cpu, register, bit) => {
    const cycles = 2;

    const value = cpu.registers[register] & 0xff;
    const bitMask = ~(1 << bit);
    const newValue = value & bitMask;

    cpu.registers[register] = newValue & 0xff;

    return cycles;
}

export const resetBitInHLMemoryAddress = (cpu, bit) => {
    const cycles = 4;

    const value = readMemoryFromHLAddress(cpu) & 0xff;
    const bitMask = ~(1 << bit);
    const newValue = value & bitMask;

    writeMemoryFromHLAddress(cpu, newValue & 0xff);

    return cycles;
}

export const returnFromSubrotine = (cpu) => {
    const cycles = 4;

    const low = cpu.readMemory(cpu.sp) & 0xff;
    cpu.sp = (cpu.sp + 1) & 0xffff;
    const high = cpu.readMemory(cpu.sp) & 0xff;
    cpu.sp = (cpu.sp + 1) & 0xffff;

    cpu.pc = ((high << 8) | low) & 0xffff;

    return cycles;
}

export const returnFromSubrotineConditional = (cpu, condition) => {
    if (!condition(cpu)) {
        return 2;
    }

    return returnFromSubrotine(cpu) + 1;
}

export const returnFromInterrupt = (cpu) => {
    cpu.ime = true;

    return returnFromSubrotine(cpu);
}

function rotateLeftThroughCarry(cpu, value) {
    const carryIn = carry(cpu);
    const newValue = ((value << 1) | carryIn) & 0xff;

    cpu.registers.F = 0x00;
    cpu.registers.F |= newValue === 0 ? Flags.Zero : 0x00;
    cpu.registers.F |= (value & 0x80) !== 0 ? Flags.Carry : 0x00;

    return newValue;
}

function rotateRightThroughCarry(cpu, value) {
    const carryIn = carry(cpu);
    const newValue = ((carryIn << 7) | (value >> 1)) & 0xff;

    cpu.registers.F = 0x00;
    cpu.registers.F |= newValue === 0 ? Flags.Zero : 0x00;
    cpu.registers.F |= (value & 0x01) !== 0 ? Flags.Carry : 0x00;

    return newValue;
}

function rotateLeft(cpu, value) {

    const bitZero = value >> 7;
    const newValue = ((value << 1) | bitZero) & 0xff;
    cpu.registers.F  = 0x00;
    cpu.registers.F |= newValue === 0 ? Flags.Zero : 0x00;
    cpu.registers.F |= bitZero !== 0 ? Flags.Carry : 0x00;

    return newValue;
}

function rotateRight(cpu, value) {

    const bitZero = value & 0b0000001;
    const newValue = ((bitZero << 7) | (value >> 1)) & 0xff;
    cpu.registers.F  = 0x00;
    cpu.registers.F |= newValue === 0 ? Flags.Zero : 0x00;
    cpu.registers.F |= bitZero !== 0 ? Flags.Carry : 0x00;

    return newValue;
}

export const rotateRegisterLeftWithCarry = (cpu, register) => {
    const cycles = 2;

    const value = cpu.registers[register] & 0xff;

    const newValue = rotateLeftThroughCarry(cpu, value);

    cpu.registers[register] = newValue;

    return cycles;
}

export const rotateHLAddressLeftWithCarry = (cpu) => {
    const cycles = 4;

    const value = readMemoryFromHLAddress(cpu) & 0xff;

    const newValue = rotateLeftThroughCarry(cpu, value);

    writeMemoryFromHLAddress(cpu, newValue);

    return cycles;
}

export const rotateAccumulatorLeftWithCarry = (cpu) => {
    const cycles = 1;

    const value = cpu.registers.A & 0xff;

    const newValue = rotateLeftThroughCarry(cpu, value);

    cpu.registers.A = newValue;

    cpu.registers.F &= ~Flags.Zero;

    return cycles;
}

export const rotateRegisterLeft = (cpu, register) => {
    const cycles = 2;

    const value = cpu.registers[register] & 0xff;

    const newValue = rotateLeft(cpu, value);

    cpu.registers[register] = newValue;

    return cycles;
}

export const rotateHLAddressLeft = (cpu) => {
    const cycles = 4;

    const value = readMemoryFromHLAddress(cpu) & 0xff;

    const newValue = rotateLeft(cpu, value);

    writeMemoryFromHLAddress(cpu, newValue);

    return cycles;
}

export const rotateAccumulatorLeft = (cpu) => {
    const cycles = 1;

    const value = cpu.registers.A & 0xff;

    const newValue = rotateLeft(cpu, value);

    cpu.registers.A = newValue;

    cpu.registers.F &= ~Flags.Zero;

    return cycles;
}


export const rotateRegisterRightWithCarry = (cpu, register) => {
    const cycles = 2;

    const value = cpu.registers[register] & 0xff;

    const newValue = rotateRightThroughCarry(cpu, value);

    cpu.registers[register] = newValue;

    return cycles;
}

export const rotateHLAddressRightWithCarry = (cpu) => {
    const cycles = 4;

    const value = readMemoryFromHLAddress(cpu) & 0xff;

    const newValue = rotateRightThroughCarry(cpu, value);

    writeMemoryFromHLAddress(cpu, newValue);

    return cycles;
}

export const rotateAccumulatorRightWithCarry = (cpu) => {
    const cycles = 1;

    const value = cpu.registers.A & 0xff;

    const newValue = rotateRightThroughCarry(cpu, value);

    cpu.registers.A = newValue;

    cpu.registers.F &= ~Flags.Zero;

    return cycles;
}

export const rotateRegisterRight = (cpu, register) => {
    const cycles = 2;

    const value = cpu.registers[register] & 0xff;

    const newValue = rotateRight(cpu, value);

    cpu.registers[register] = newValue;

    return cycles;
}

export const rotateHLAddressRight = (cpu) => {
    const cycles = 4;

    const value = readMemoryFromHLAddress(cpu) & 0xff;

    const newValue = rotateRight(cpu, value);

    writeMemoryFromHLAddress(cpu, newValue);

    return cycles;
}

export const rotateAccumulatorRight = (cpu) => {
    const cycles = 1;

    const value = cpu.registers.A & 0xff;

    const newValue = rotateRight(cpu, value);

    cpu.registers.A = newValue;

    cpu.registers.F &= ~Flags.Zero;

    return cycles;
}

export const restartVec = (cpu, vec) => {
    const cycles = 4;

    const pc = cpu.pc & 0xffff;
    cpu.sp = (cpu.sp - 1) & 0xffff;
    cpu.writeMemory(cpu.sp, (pc >> 8) & 0xff, false);
    cpu.sp = (cpu.sp - 1) & 0xffff;
    cpu.writeMemory(cpu.sp, pc & 0xff, false);

    cpu.pc = vec & 0xffff;

    return cycles;
}

const subtractFromAccumulator = (cpu, value, useCarry) => {
    const carryIn = useCarry ? carry(cpu) : 0;
    const a = cpu.registers.A & 0xff;
    const operand = value & 0xff;
    const diff = a - (operand + carryIn);

    const halfCarry =  ((operand & 0x0f) + carryIn) > (a & 0x0f);
    const carryOut = (operand + carryIn) > a;

    cpu.registers.A = diff & 0xff;

    cpu.registers.F = Flags.Substraction;
    cpu.registers.F |= (cpu.registers.A === 0) ? Flags.Zero : 0x00;
    cpu.registers.F |= halfCarry ? Flags.HalfCarry : 0x00;
    cpu.registers.F |= carryOut ? Flags.Carry : 0x00;
}

export const subtractRegWithCarryFromAccumulator = (cpu, register) => {
    const cycles = 1;

    const value = cpu.registers[register];
    subtractFromAccumulator(cpu, value, true);

    return cycles;
};

export const subtractHLWithCarryFromAccumulator = (cpu) => {
    const cycles = 2;

    const value = readMemoryFromHLAddress(cpu);
    subtractFromAccumulator(cpu, value, true);

    return cycles;
}

export const subtractValueWithCarryFromAccumulator = (cpu, value) => {
    const cycles = 2;

    subtractFromAccumulator(cpu, value, true);

    return cycles;
}

export const subtractRegFromAccumulator = (cpu, register) => {
    const cycles = 1;

    const value = cpu.registers[register];
    subtractFromAccumulator(cpu, value, false);

    return cycles;
};

export const subtractHLFromAccumulator = (cpu) => {
    const cycles = 2;

    const value = readMemoryFromHLAddress(cpu);
    subtractFromAccumulator(cpu, value, false);

    return cycles;
}

export const subtractValueFromAccumulator = (cpu, value) => {
    const cycles = 2;

    subtractFromAccumulator(cpu, value, false);

    return cycles;
}

export const setCarryFlag = (cpu) => {
    const cycles = 1;

    let flags = cpu.registers.F & Flags.Zero;
    flags |= Flags.Carry;


    cpu.registers.F = flags;

    return cycles;
}

const swap = (cpu, value) => {
    const hi = value & 0xf0;
    const low = value & 0xf;

    const newValue = (low << 4) | (hi >> 4);

    cpu.registers.F = 0x00;
    cpu.registers.F |= newValue == 0 ? Flags.Zero : 0x00;

    return newValue;
}

export const swapRegister = (cpu, register) => {
    const cycles = 2;

    const reg = cpu.registers[register];

    cpu.registers[register] = swap(cpu, reg);

    return cycles;
}

export const swapHL = (cpu) => {
    const cycles = 4;

    const hl = readMemoryFromHLAddress(cpu);
    const newValue = swap(cpu, hl);

    writeMemoryFromHLAddress(cpu, newValue);

    return cycles;
}

const xorWithAccumulator = (cpu, value) => {
    const result = cpu.registers.A ^ value;

    cpu.registers.F = result === 0 ? Flags.Zero : 0x00;

    cpu.registers.A = result & 0xff;

}

export const xorRegisterWithAccumulator = (cpu, register) => {
    const cycles = 1;

    xorWithAccumulator(cpu, cpu.registers[register]);
    
    return cycles;
}

export const xorHLWithAccumulator = (cpu) => {
    const cycles = 2;

    xorWithAccumulator(cpu, readMemoryFromHLAddress(cpu));
    
    return cycles;
}

export const xorValueWithAccumulator = (cpu, value) => {
    const cycles = 2;

    xorWithAccumulator(cpu, value);
    
    return cycles;
}


export const setBitInReg = (cpu, register, bit) => {
    const cycles = 2;

    const value = cpu.registers[register] & 0xff;
    const bitMask = (1 << bit);
    const newValue = value | bitMask;

    cpu.registers[register] = newValue & 0xff;

    return cycles;
}

export const setBitInHLMemoryAddress = (cpu, bit) => {
    const cycles = 4;

    const value = readMemoryFromHLAddress(cpu) & 0xff;
    const bitMask = (1 << bit);
    const newValue = value | bitMask;

    writeMemoryFromHLAddress(cpu, newValue & 0xff);

    return cycles;
}

const leftShiftWithCarry = (cpu, value) => {

    const newValue = (value << 1) & 0xff;
    cpu.registers.F = 0x00;
    cpu.registers.F |= newValue === 0 ? Flags.Zero : 0x00;
    cpu.registers.F |= (value & 0x80) !== 0 ? Flags.Carry : 0x00;

    return newValue;
}

export const leftShiftRegister = (cpu, register) => {
    const cycles = 2;

    const value = cpu.registers[register];
    cpu.registers[register] = leftShiftWithCarry(cpu, value);

    return cycles;
}

export const leftShiftHL = (cpu) => {
    const cycles = 4;

    const value = readMemoryFromHLAddress(cpu);
    const newValue = leftShiftWithCarry(cpu, value) & 0xff;

    writeMemoryFromHLAddress(cpu, newValue);

    return cycles;
}

const rightShiftWithCarry = (cpu, value, preserveBit) => {

    const bit7 = preserveBit ? (value & 0x80) : 0x00;
    const newValue = (bit7 | (value >> 1)) & 0xff;
    cpu.registers.F = 0x00;
    cpu.registers.F |= newValue === 0 ? Flags.Zero : 0x00;
    cpu.registers.F |= (value & 0x01) !== 0 ? Flags.Carry : 0x00;

    return newValue;
}

export const rightShiftRegister = (cpu, register) => {
    const cycles = 2;

    const value = cpu.registers[register];
    cpu.registers[register] = rightShiftWithCarry(cpu, value, true);

    return cycles;
}

export const rightShiftHL = (cpu) => {
    const cycles = 4;

    const value = readMemoryFromHLAddress(cpu);
    const newValue = rightShiftWithCarry(cpu, value, true) & 0xff;

    writeMemoryFromHLAddress(cpu, newValue);

    return cycles;
}


export const rightShiftLogicallyRegister = (cpu, register) => {
    const cycles = 2;

    const value = cpu.registers[register];
    cpu.registers[register] = rightShiftWithCarry(cpu, value, false);

    return cycles;
}

export const rightShiftLogicallyHL = (cpu) => {
    const cycles = 4;

    const value = readMemoryFromHLAddress(cpu);
    const newValue = rightShiftWithCarry(cpu, value, false) & 0xff;

    writeMemoryFromHLAddress(cpu, newValue);

    return cycles;
}

