const Flags = Object.freeze({
    Zero: 1 << 0,
    Substraction: 1 << 1,
    HalfCarry: 1 << 2,
    Carry: 1 << 3,
});

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
