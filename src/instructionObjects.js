import { readValueFromHLRegisters } from "./instructions";

const Flags = Object.freeze({
    Zero: 0x80,
    Substraction: 0x40,
    HalfCarry: 0x20,
    Carry: 0x10,
});

function carryFlag(cpu) {
    return (cpu.registers.F & Flags.Carry) !== 0 ? 1 : 0;
}

function halfCarryFlag(cpu) {
    return (cpu.registers.F & Flags.HalfCarry) !== 0 ? 1 : 0;
}

function zeroFlag(cpu) {
    return (cpu.registers.F & Flags.Zero) !== 0 ? 1 : 0;
}

function substractionFlag(cpu) {
    return (cpu.registers.F & Flags.Substraction) !== 0 ? 1 : 0;
}

function signedValue(raw) {
    return raw > 0x7f ? raw - 0x100 : raw;
}

function condZ(cpu) { return (cpu.registers.F & Flags.Zero) !== 0; }
function condNZ(cpu) { return (cpu.registers.F & Flags.Zero) === 0; }
function condC(cpu) { return (cpu.registers.F & Flags.Carry) !== 0; }
function condNC(cpu) { return (cpu.registers.F & Flags.Carry) === 0; }

// Pattern: no operands
export const NOP = {
    mnemonic: 'NOP',
    index: 0x00,
    execute(cpu) {
        return 1;
    },
};

function hiLoToU16(hi, lo) {
    return ((hi << 8) | lo) & 0xffff;
}

function u16ToHiLo(u16) {

    const values = {
        Hi: (u16 >> 8) & 0xff,
        Lo: u16 & 0xff
    };

    return values;
}

function readU16(cpu) {
    const lo = cpu.readMemoryFromProgramCounter();
    cpu.incProgramCounter();
    const hi = cpu.readMemoryFromProgramCounter();
    cpu.incProgramCounter();

    return {
        Hi: hi & 0xff,
        Lo: lo & 0xff,
        Value: hiLoToU16(hi, lo)
    };
}

function loadRegister16U16(cpu, registerHi, registerLo) {
    const hilo = readU16(cpu);

    cpu.registers[registerHi] = hilo.Hi;
    cpu.registers[registerLo] = hilo.Lo;
    return 3;
}

function loadRegisterFromHLMemory(cpu, registerTo) {
    const address = hiLoToU16(cpu.registers.H, cpu.registers.L);
    const value = cpu.readMemory(address);
    cpu.registers[registerTo] = value & 0xff;
    return 2;
}

function addRegisterFromValue(cpu, registerTo, value, useCarry = false) {
    const to = cpu.registers[registerTo] & 0xff;
    const carryIn = carryFlag(cpu) ? 1 : 0;

    const sum = value + to + carryIn;

    const halfCarry = ((value & 0x0f) + (to & 0x0f) + carryIn) > 0x0f;
    const carryOut = sum > 0xff;

    cpu.registers[registerTo] = sum & 0xff;

    cpu.registers.F = 0x00;
    cpu.registers.F |= (cpu.registers[registerTo] === 0) ? Flags.Zero : 0x00;
    cpu.registers.F |= halfCarry ? Flags.HalfCarry : 0x00;
    cpu.registers.F |= carryOut ? Flags.Carry : 0x00;
}

function addRegisterFromRegister(cpu, registerTo, registerFrom) {
    const from = cpu.registers[registerFrom] & 0xff;
    addRegisterFromValue(cpu, registerTo, from, false);
    return 1;
}

function addRegisterFromRegisterWithCarry(cpu, registerTo, registerFrom) {
    const from = cpu.registers[registerFrom] & 0xff;
    addRegisterFromValue(cpu, registerTo, from, true);
    return 1;
}

function subtractRegisterFromValue(cpu, registerTo, value, useCarry = false) {
    const carryIn = useCarry ? carryFlag(cpu) : 0;
    const to = cpu.registers[registerTo] & 0xff;

    const operand = value & 0xff;
    const diff = to - (operand + carryIn);

    const halfCarry = ((operand & 0x0f) + carryIn) > (to & 0x0f);
    const carryOut = (operand + carryIn) > to;

    cpu.registers[registerTo] = diff & 0xff;

    cpu.registers.F = Flags.Substraction;
    cpu.registers.F |= (cpu.registers[registerTo] === 0) ? Flags.Zero : 0x00;
    cpu.registers.F |= halfCarry ? Flags.HalfCarry : 0x00;
    cpu.registers.F |= carryOut ? Flags.Carry : 0x00;
}

function subtractRegisterFromRegister(cpu, registerTo, registerFrom) {
    const from = cpu.registers[registerFrom] & 0xff;
    subtractRegisterFromValue(cpu, registerTo, from, false);
    return 1;
}

function subtractRegisterFromRegisterWithCarry(cpu, registerTo, registerFrom) {
    const from = cpu.registers[registerFrom] & 0xff;
    subtractRegisterFromValue(cpu, registerTo, from, true);
    return 1;
}

function andRegisterWithValue(cpu, registerTo, value) {
    const to = cpu.registers[registerTo] & 0xff;
    const comp = to & value;

    cpu.registers[registerTo] = comp & 0xff;
    cpu.registers.F = 0x00;

    if (comp === 0)
        cpu.registers.F |= Flags.Zero;

    cpu.registers.F |= Flags.HalfCarry;
}

function andRegisterWithRegister(cpu, registerTo, registerFrom) {
    const from = cpu.registers[registerFrom] & 0xff;
    andRegisterWithValue(cpu, registerTo, from);
    return 1;
}

function xorRegisterWithValue(cpu, registerTo, value) {
    const to = cpu.registers[registerTo] & 0xff;
    const result = to ^ value;

    cpu.registers[registerTo] = result & 0xff;
    cpu.registers.F = result === 0 ? Flags.Zero : 0x00;
}

function xorRegisterWithRegister(cpu, registerTo, registerFrom) {
    const from = cpu.registers[registerFrom] & 0xff;
    xorRegisterWithValue(cpu, registerTo, from);
    return 1;
}

// #region LD REGISTER 16   

export const LD_BC_u16 = {
    mnemonic: 'LD BC, u16',
    index: 0x01,
    execute(cpu) {
        return loadRegister16U16(cpu, 'B', 'C');
    },
};

export const LD_DE_u16 = {
    mnemonic: 'LD DE, u16',
    index: 0x11,
    execute(cpu) {
        return loadRegister16U16(cpu, 'D', 'E');
    },
};

export const LD_HL_u16 = {
    mnemonic: 'LD HL, u16',
    index: 0x21,
    execute(cpu) {
        return loadRegister16U16(cpu, 'H', 'L');
    },
};

export const LD_SP_u16 = {
    mnemonic: 'LD SP, u16',
    index: 0x31,
    execute(cpu) {
        const hilo = readU16(cpu);
        cpu.sp = hilo.Value;

        return 3;
    },
};

// #endregion

// #region LD INDIRECT REGISTER 16  
export const LD_iBC_A = {
    mnemonic: 'LD [BC], A',
    index: 0x02,
    execute(cpu) {
        const address = hiLoToU16(cpu.registers.B, cpu.registers.C);
        cpu.writeMemory(address, cpu.registers.A);
        return 2;
    },
};

export const LD_iDE_A = {
    mnemonic: 'LD [DE], A',
    index: 0x12,
    execute(cpu) {
        const address = hiLoToU16(cpu.registers.D, cpu.registers.E);
        cpu.writeMemory(address, cpu.registers.A);
        return 2;
    },
};

export const LD_iHLp_A = {
    mnemonic: 'LD [HL+], A',
    index: 0x22,
    execute(cpu) {
        const address = hiLoToU16(cpu.registers.H, cpu.registers.L);
        const newAddress = address + 1;
        cpu.writeMemory(address, cpu.registers.A);
        const hilo = u16ToHiLo(newAddress & 0xffff);
        cpu.registers.H = hilo.Hi;
        cpu.registers.L = hilo.Lo;
        return 2;
    },
};

export const LD_iHLn_A = {
    mnemonic: 'LD [HL-], A',
    index: 0x32,
    execute(cpu) {
        const address = hiLoToU16(cpu.registers.H, cpu.registers.L);
        const newAddress = address - 1;
        cpu.writeMemory(address, cpu.registers.A);
        const hilo = u16ToHiLo(newAddress & 0xffff);
        cpu.registers.H = hilo.Hi;
        cpu.registers.L = hilo.Lo;
        return 2;
    },
};

// #endregion

// #region INCREMENT REGISTER 16  

function incrementRegister16(cpu, registerHi, registerLo) {
    const value = (hiLoToU16(cpu.registers[registerHi], cpu.registers[registerLo]) + 1) & 0xffff;
    const hilo = u16ToHiLo(value);
    cpu.registers[registerHi] = hilo.Hi;
    cpu.registers[registerLo] = hilo.Lo;

    return 2;
}

export const INC_BC = {
    mnemonic: 'INC BC',
    index: 0x03,
    execute(cpu) {
        return incrementRegister16(cpu, 'B', 'C');
    }
}

export const INC_DE = {
    mnemonic: 'INC DE',
    index: 0x13,
    execute(cpu) {
        return incrementRegister16(cpu, 'D', 'E');
    }
}

export const INC_HL = {
    mnemonic: 'INC HL',
    index: 0x23,
    execute(cpu) {
        return incrementRegister16(cpu, 'H', 'L');
    }
}

export const INC_SP = {
    mnemonic: 'INC SP',
    index: 0x33,
    execute(cpu) {
        cpu.sp = (cpu.sp + 1) & 0xffff;
        return 2;
    }
}

// #endregion

// #region INCREMENT REGISTER 8   

function incrementRegister(cpu, register) {

    const oldValue = cpu.registers[register] & 0xff;
    const newValue = (oldValue + 1) & 0xff;

    let newFlags = cpu.registers.F & Flags.Carry;
    newFlags |= newValue === 0 ? Flags.Zero : 0;
    newFlags |= (oldValue & 0x0f) === 0x0f ? Flags.HalfCarry : 0;

    cpu.registers[register] = newValue;
    cpu.registers.F = newFlags;

    return 1;
}

export const INC_B = {
    mnemonic: 'INC B',
    index: 0x04,
    execute(cpu) {
        return incrementRegister(cpu, 'B');
    },
};

export const INC_D = {
    mnemonic: 'INC D',
    index: 0x14,
    execute(cpu) {
        return incrementRegister(cpu, 'D');
    },
};

export const INC_H = {
    mnemonic: 'INC H',
    index: 0x24,
    execute(cpu) {
        return incrementRegister(cpu, 'H');
    },
};

export const INC_C = {
    mnemonic: 'INC C',
    index: 0x0C,
    execute(cpu) {
        return incrementRegister(cpu, 'C');
    },
};

export const INC_E = {
    mnemonic: 'INC E',
    index: 0x1C,
    execute(cpu) {
        return incrementRegister(cpu, 'E');
    },
};

export const INC_L = {
    mnemonic: 'INC L',
    index: 0x2C,
    execute(cpu) {
        return incrementRegister(cpu, 'L');
    },
};

export const INC_A = {
    mnemonic: 'INC A',
    index: 0x3C,
    execute(cpu) {
        return incrementRegister(cpu, 'A');
    },
};

// #endregion

// #region DECREMENT REGISTER 8   

function decrementRegister(cpu, register) {
    const oldValue = cpu.registers[register];
    const newValue = (oldValue - 1) & 0xff;

    let newFlags = cpu.registers.F & Flags.Carry;
    newFlags |= newValue === 0 ? Flags.Zero : 0x00;
    newFlags |= Flags.Substraction;
    newFlags |= (oldValue & 0x0f) === 0x00 ? Flags.HalfCarry : 0x00;

    cpu.registers[register] = newValue;
    cpu.registers.F = newFlags;

    return 1;
}

export const DEC_B = {
    mnemonic: 'DEC B',
    index: 0x05,
    execute(cpu) {
        return decrementRegister(cpu, 'B');
    }
}

export const DEC_D = {
    mnemonic: 'DEC D',
    index: 0x15,
    execute(cpu) {
        return decrementRegister(cpu, 'D');
    }
}

export const DEC_H = {
    mnemonic: 'DEC H',
    index: 0x25,
    execute(cpu) {
        return decrementRegister(cpu, 'H');
    }
}

export const DEC_C = {
    mnemonic: 'DEC C',
    index: 0x0D,
    execute(cpu) {
        return decrementRegister(cpu, 'C');
    }
}

export const DEC_E = {
    mnemonic: 'DEC E',
    index: 0x1D,
    execute(cpu) {
        return decrementRegister(cpu, 'E');
    }
}

export const DEC_L = {
    mnemonic: 'DEC L',
    index: 0x2D,
    execute(cpu) {
        return decrementRegister(cpu, 'L');
    }
}

export const DEC_A = {
    mnemonic: 'DEC A',
    index: 0x3D,
    execute(cpu) {
        return decrementRegister(cpu, 'A');
    }
}

// #endregion

export const INC_iHL = {
    mnemonic: 'INC [HL]',
    index: 0x34,
    execute(cpu) {
        const address = hiLoToU16(cpu.registers.H, cpu.registers.L);
        const oldValue = cpu.readMemory(address);
        const newValue = (oldValue + 1) & 0xff;
        cpu.writeMemory(address, newValue);

        let newFlags = cpu.registers.F & Flags.Carry;
        newFlags |= newValue === 0 ? Flags.Zero : 0;
        newFlags |= (oldValue & 0x0f) === 0x0f ? Flags.HalfCarry : 0;

        cpu.registers.F = newFlags;

        return 3;
    },
};

export const DEC_iHL = {
    mnemonic: 'DEC [HL]',
    index: 0x35,
    execute(cpu) {
        const address = hiLoToU16(cpu.registers.H, cpu.registers.L);
        const oldValue = cpu.readMemory(address);
        const newValue = (oldValue - 1) & 0xff;
        cpu.writeMemory(address, newValue);

        let newFlags = cpu.registers.F & Flags.Carry;
        newFlags |= newValue === 0 ? Flags.Zero : 0x00;
        newFlags |= Flags.Substraction;
        newFlags |= (oldValue & 0x0f) === 0x00 ? Flags.HalfCarry : 0x00;

        cpu.registers.F = newFlags;

        return 3;
    },
};

// #region LD REGISTER 8  

function loadRegisterN8(cpu, register) {
    const value = cpu.readMemoryFromProgramCounter() & 0xff;
    cpu.incProgramCounter();
    cpu.registers[register] = value;
    return 2
}

export const LD_B_n8 = {
    mnemonic: 'LD B, u8',
    index: 0x06,
    execute(cpu) {
        return loadRegisterN8(cpu, 'B');
    }
}

export const LD_D_n8 = {
    mnemonic: 'LD D, u8',
    index: 0x16,
    execute(cpu) {
        return loadRegisterN8(cpu, 'D');
    }
}

export const LD_H_n8 = {
    mnemonic: 'LD H, u8',
    index: 0x26,
    execute(cpu) {
        return loadRegisterN8(cpu, 'H');
    }
}

export const LD_C_n8 = {
    mnemonic: 'LD C, u8',
    index: 0x0E,
    execute(cpu) {
        return loadRegisterN8(cpu, 'C');
    }
}

export const LD_E_n8 = {
    mnemonic: 'LD E, u8',
    index: 0x1E,
    execute(cpu) {
        return loadRegisterN8(cpu, 'E');
    }
}

export const LD_L_n8 = {
    mnemonic: 'LD L, u8',
    index: 0x2E,
    execute(cpu) {
        return loadRegisterN8(cpu, 'L');
    }
}

export const LD_A_n8 = {
    mnemonic: 'LD A, u8',
    index: 0x3E,
    execute(cpu) {
        return loadRegisterN8(cpu, 'A');
    }
}

// #endregion

export const LD_iHL_u8 = {
    mnemonic: 'LD [HL], u8',
    index: 0x36,
    execute(cpu) {
        const address = hiLoToU16(cpu.registers.H, cpu.registers.L);
        const value = cpu.readMemoryFromProgramCounter();
        cpu.incProgramCounter();
        cpu.writeMemory(address, value & 0xff);
        return 3;
    }
}

// #region ROTATE LEFT   
function rotateLeft(value) {
    const bit7 = value >> 7;
    const newValue = ((value << 1) | bit7) & 0xff;
    return newValue;
}

export const RLCA = {
    mnemonic: 'RLCA',
    index: 0x07,
    execute(cpu) {

        const value = cpu.registers.A;
        const newValue = rotateLeft(value);

        cpu.registers.A = newValue;
        cpu.registers.F = 0x00;
        cpu.registers.F |= (value & 0x80) !== 0 ? Flags.Carry : 0x00;

        return 1;
    }
}

export const RLA = {
    mnemonic: 'RLA',
    index: 0x17,
    execute(cpu) {

        const value = cpu.registers.A;
        const cbit = carryFlag(cpu);

        const newValue = ((value << 1) | cbit) & 0xff;

        cpu.registers.A = newValue;

        cpu.registers.F = 0x00;
        cpu.registers.F |= (value & 0x80) !== 0 ? Flags.Carry : 0x00;

        return 1;
    }
}

// #endregion

// #region JUMP CONDITIONAL

function jump(cpu, cycles) {

    const address = cpu.readMemoryFromProgramCounter() & 0xff;
    cpu.incProgramCounter();
    const signedOffset = signedValue(address);
    cpu.pc = (cpu.pc + signedOffset) & 0xffff;
    return cycles;

}

function jumpConditional(cpu, cyclesNot, cyclesYes, condFn) {

    const address = cpu.readMemoryFromProgramCounter() & 0xff;
    cpu.incProgramCounter();

    if (!condFn(cpu)) return cyclesNot;

    const signedOffset = signedValue(address);
    cpu.pc = (cpu.pc + signedOffset) & 0xffff;
    return cyclesYes;
}

export const JR_NZ_i8 = {
    mnemonic: 'JR NZ, i8',
    index: 0x20,
    execute(cpu) {
        return jumpConditional(cpu, 2, 3, condNZ);
    }
}

export const JR_NC_i8 = {
    mnemonic: 'JR NC, i8',
    index: 0x30,
    execute(cpu) {
        return jumpConditional(cpu, 2, 3, condNC);
    }
}

export const JR_i8 = {
    mnemonic: 'JR i8',
    index: 0x18,
    execute(cpu) {
        return jump(cpu, 3);
    }
}

export const JR_Z_i8 = {
    mnemonic: 'JR Z, i8',
    index: 0x28,
    execute(cpu) {
        return jumpConditional(cpu, 2, 3, condZ);
    }
}

export const JR_C_i8 = {
    mnemonic: 'JR C, i8',
    index: 0x38,
    execute(cpu) {
        return jumpConditional(cpu, 2, 3, condC);
    }
}

// #endregion

export const SCF = {
    mnemonic: 'SCF',
    index: 0x37,
    execute(cpu) {

        let flags = cpu.registers.F & Flags.Zero;
        flags |= Flags.Carry;

        cpu.registers.F = flags;
        return 1;
    }
}

export const DAA = {
    mnemonic: 'DAA',
    index: 0x27,
    execute(cpu) {

        const a = cpu.registers.A & 0xff;

        let correction = 0;
        let cf = carryFlag(cpu) !== 0;

        if (!substractionFlag(cpu)) {
            if (((a & 0x0f) > 0x09) || halfCarryFlag(cpu)) {
                correction |= 0x06;
            }

            if (a > 0x99 || carryFlag(cpu)) {
                correction |= 0x60;
                cf = true;
            }
            cpu.registers.A = (a + correction) & 0xff;

        }
        else {
            if (halfCarryFlag(cpu)) {
                correction |= 0x06;
            }

            if (carryFlag(cpu)) {
                correction |= 0x60;
            }

            cpu.registers.A = (a - correction) & 0xff;

        }


        cpu.registers.F &= ~Flags.HalfCarry;
        cpu.registers.F &= ~Flags.Zero;

        cpu.registers.F |= cpu.registers.A === 0 ? Flags.Zero : 0x00;
        cpu.registers.F = cf ?
            cpu.registers.F | Flags.Carry :
            cpu.registers.F & ~Flags.Carry;

        return 1;
    }
}

function rotateRightThroughCarry(cpu, value) {

    const carryIn = carryFlag(cpu);
    const newValue = ((carryIn << 7) | (value >> 1)) & 0xff;

    cpu.registers.F = 0x00;
    cpu.registers.F |= newValue === 0 ? Flags.Zero : 0x00;
    cpu.registers.F |= (value & 0x01) !== 0 ? Flags.Carry : 0x00;

    return newValue;
}

export const RRCA = {
    mnemonic: 'RRCA',
    index: 0x0F,
    execute(cpu) {

        const value = cpu.registers.A;
        const bitZero = value & 0b0000001;
        const newValue = ((bitZero << 7) | (value >> 1)) & 0xff;

        cpu.registers.A = newValue;
        cpu.registers.F = 0x00;
        cpu.registers.F |= bitZero !== 0 ? Flags.Carry : 0x00;

        return 1;
    }
}

export const RRA = {
    mnemonic: 'RRA',
    index: 0x1F,
    execute(cpu) {

        const value = cpu.registers.A;
        cpu.registers.A = rotateRightThroughCarry(cpu, value);
        cpu.registers.F &= ~Flags.Zero;
        return 1;
    }
}


export const LD_iu16_SP = {
    mnemonic: 'LD [u16], SP',
    index: 0x08,
    execute(cpu) {

        const hilo = readU16(cpu);
        const address = hilo.Value;
        cpu.writeMemory(address, cpu.sp & 0xff);
        cpu.writeMemory((address + 1) & 0xffff, (cpu.sp >> 8) & 0xff);

        return 5;
    }
}

// #region ADD

function addRegister16ToRegister16(cpu, regHiFrom, regLoFrom, regHiTo, regLoTo) {

    const from = hiLoToU16(cpu.registers[regHiFrom], cpu.registers[regLoFrom]);
    const to = hiLoToU16(cpu.registers[regHiTo], cpu.registers[regLoTo]);

    const sum = (from + to);

    const halfCarry = ((to & 0x0fff) + (from & 0x0fff)) > 0x0fff;
    const carryOut = sum > 0xffff;

    const hilo = u16ToHiLo(sum);

    cpu.registers[regHiTo] = hilo.Hi;
    cpu.registers[regLoTo] = hilo.Lo;

    cpu.registers.F = cpu.registers.F & Flags.Zero;
    cpu.registers.F |= halfCarry ? Flags.HalfCarry : 0x00;
    cpu.registers.F |= carryOut ? Flags.Carry : 0x00;

    return 2;
}

export const ADD_HL_BC = {
    mnemonic: 'ADD HL, BC',
    index: 0x09,
    execute(cpu) {
        return addRegister16ToRegister16(cpu, 'B', 'C', 'H', 'L');
    }
}

export const ADD_HL_DE = {
    mnemonic: 'ADD HL, DE',
    index: 0x19,
    execute(cpu) {
        return addRegister16ToRegister16(cpu, 'D', 'E', 'H', 'L');
    }
}

export const ADD_HL_HL = {
    mnemonic: 'ADD HL, HL',
    index: 0x29,
    execute(cpu) {
        return addRegister16ToRegister16(cpu, 'H', 'L', 'H', 'L');
    }
}

export const ADD_HL_SP = {
    mnemonic: 'ADD HL, SP',
    index: 0x39,
    execute(cpu) {

        const from = cpu.sp & 0xffff;

        const to = hiLoToU16(cpu.registers.H, cpu.registers.L);

        const sum = (from + to);

        const halfCarry = ((to & 0x0fff) + (from & 0x0fff)) > 0x0fff;
        const carryOut = sum > 0xffff;

        const hilo = u16ToHiLo(sum);

        cpu.registers.H = hilo.Hi;
        cpu.registers.L = hilo.Lo;

        cpu.registers.F = cpu.registers.F & Flags.Zero;
        cpu.registers.F |= halfCarry ? Flags.HalfCarry : 0x00;
        cpu.registers.F |= carryOut ? Flags.Carry : 0x00;

        return 2;
    }
}

// #endregion


// #region LOAD ACCUMULATOR INDIRECT REGISTER


function loadAccumulatorWithRegister16(cpu, regHi, regLo) {
    const hi = cpu.registers[regHi];
    const lo = cpu.registers[regLo];

    const registerValue = hiLoToU16(hi, lo);
    const value = cpu.readMemory(registerValue);

    cpu.registers.A = value & 0xff;

    return 2;
}

export const LD_A_iBC = {
    mnemonic: 'LD A, [BC]',
    index: 0x0A,
    execute(cpu) {
        return loadAccumulatorWithRegister16(cpu, 'B', 'C');
    }
}

export const LD_A_iDE = {
    mnemonic: 'LD A, [DE]',
    index: 0x1A,
    execute(cpu) {
        return loadAccumulatorWithRegister16(cpu, 'D', 'E');
    }
}

export const LD_A_iHLp = {
    mnemonic: 'LD A, [HL+]',
    index: 0x2A,
    execute(cpu) {
        const hi = cpu.registers.H;
        const lo = cpu.registers.L;

        const registerValue = hiLoToU16(hi, lo);
        const value = cpu.readMemory(registerValue);
        const hilo = u16ToHiLo((registerValue + 1) & 0xffff);

        cpu.registers.A = value & 0xff;
        cpu.registers.H = hilo.Hi;
        cpu.registers.L = hilo.Lo;

        return 2;
    }
}

export const LD_A_iHLn = {
    mnemonic: 'LD A, [HL-]',
    index: 0x3A,
    execute(cpu) {
        const hi = cpu.registers.H;
        const lo = cpu.registers.L;

        const registerValue = hiLoToU16(hi, lo);
        const value = cpu.readMemory(registerValue);
        const hilo = u16ToHiLo((registerValue - 1) & 0xffff);

        cpu.registers.A = value & 0xff;
        cpu.registers.H = hilo.Hi;
        cpu.registers.L = hilo.Lo;

        return 2;
    }
}

// #endregion

// #region DEC

function decreaseRegister16(cpu, regHi, regLo) {
    const oldValue = hiLoToU16(cpu.registers[regHi], cpu.registers[regLo]);
    const newValue = (oldValue - 1) & 0xffff;

    const hilo = u16ToHiLo(newValue);

    cpu.registers[regHi] = hilo.Hi;
    cpu.registers[regLo] = hilo.Lo;

    return 2;
}

export const DEC_BC = {
    mnemonic: 'DEC BC',
    index: 0x0B,
    execute(cpu) {
        return decreaseRegister16(cpu, 'B', 'C');
    }
}

export const DEC_DE = {
    mnemonic: 'DEC DE',
    index: 0x1B,
    execute(cpu) {
        return decreaseRegister16(cpu, 'D', 'E');
    }
}

export const DEC_HL = {
    mnemonic: 'DEC HL',
    index: 0x2B,
    execute(cpu) {
        return decreaseRegister16(cpu, 'H', 'L');
    }
}

export const DEC_SP = {
    mnemonic: 'DEC SP',
    index: 0x3B,
    execute(cpu) {
        cpu.sp = (cpu.sp - 1) & 0xffff;
        return 2;
    }
}

// #endregion

export const CPL = {
    mnemonic: 'CPL',
    index: 0x2f,
    execute(cpu) {

        cpu.registers.A = (~cpu.registers.A) & 0xff;
        cpu.registers.F |= Flags.Substraction;
        cpu.registers.F |= Flags.HalfCarry;
        return 1;
    }
}

export const CCF = {
    mnemonic: 'CCF',
    index: 0x3f,
    execute(cpu) {

        const previous = cpu.registers.F & Flags.Zero;
        const carry = carryFlag(cpu) === 0 ? Flags.Carry : 0x00;
        cpu.registers.F = 0x00;
        cpu.registers.F |= previous;
        cpu.registers.F |= carry;

        return 1;
    }
}

export const STOP = {
    mnemonic: 'STOP',
    index: 0x10,
    execute(cpu) {
        cpu.mode = 'low_power';
        cpu.readMemoryFromProgramCounter();
        cpu.incProgramCounter();
        return 0;
    }
}

export const HALT = {
    mnemonic: 'HALT',
    index: 0x76,
    execute(cpu) {
        cpu.halted = true;
        return 4;
    }
}

function loadRegisterFromRegister(cpu, registerTo, registerFrom) {
    cpu.registers[registerTo] = cpu.registers[registerFrom];
    return 1;
}

// #region RB
export const LD_B_B = {
    mnemonic: 'LD B, B',
    index: 0x40,
    execute(cpu) {
        return loadRegisterFromRegister(cpu, 'B', 'B');
    }
}

export const LD_D_B = {
    mnemonic: 'LD D, B',
    index: 0x50,
    execute(cpu) {
        return loadRegisterFromRegister(cpu, 'D', 'B');
    }
}

export const LD_H_B = {
    mnemonic: 'LD H, B',
    index: 0x60,
    execute(cpu) {
        return loadRegisterFromRegister(cpu, 'H', 'B');
    }
}

export const LD_C_B = {
    mnemonic: 'LD C, B',
    index: 0x48,
    execute(cpu) {
        return loadRegisterFromRegister(cpu, 'C', 'B');
    }
}

export const LD_E_B = {
    mnemonic: 'LD E, B',
    index: 0x58,
    execute(cpu) {
        return loadRegisterFromRegister(cpu, 'E', 'B');
    }
}

export const LD_L_B = {
    mnemonic: 'LD L, B',
    index: 0x68,
    execute(cpu) {
        return loadRegisterFromRegister(cpu, 'L', 'B');
    }
}

export const LD_A_B = {
    mnemonic: 'LD A, B',
    index: 0x78,
    execute(cpu) {
        return loadRegisterFromRegister(cpu, 'A', 'B');
    }
}

function loadHLMemoryFromRegister(cpu, registerFrom) {
    const address = hiLoToU16(cpu.registers.H, cpu.registers.L);
    const value = cpu.registers[registerFrom];
    cpu.writeMemory(address, value & 0xff);
    return 2;
}

export const LD_iHL_B = {
    mnemonic: 'LD [HL], B',
    index: 0x70,
    execute(cpu) {
        return loadHLMemoryFromRegister(cpu, 'B');
    }
}
// #endregion

// #region RC
export const LD_B_C = {
    mnemonic: 'LD B, C',
    index: 0x41,
    execute(cpu) {
        return loadRegisterFromRegister(cpu, 'B', 'C');
    }
}


export const LD_D_C = {
    mnemonic: 'LD D, C',
    index: 0x51,
    execute(cpu) {
        return loadRegisterFromRegister(cpu, 'D', 'C');
    }
}

export const LD_H_C = {
    mnemonic: 'LD H, C',
    index: 0x61,
    execute(cpu) {
        return loadRegisterFromRegister(cpu, 'H', 'C');
    }
}

export const LD_iHL_C = {
    mnemonic: 'LD [HL], C',
    index: 0x71,
    execute(cpu) {
        return loadHLMemoryFromRegister(cpu, 'C');
    }
}

export const LD_C_C = {
    mnemonic: 'LD C, C',
    index: 0x49,
    execute(cpu) {
        return loadRegisterFromRegister(cpu, 'C', 'C');
    }
}

export const LD_E_C = {
    mnemonic: 'LD E, C',
    index: 0x59,
    execute(cpu) {
        return loadRegisterFromRegister(cpu, 'E', 'C');
    }
}

export const LD_L_C = {
    mnemonic: 'LD L, C',
    index: 0x69,
    execute(cpu) {
        return loadRegisterFromRegister(cpu, 'L', 'C');
    }
}

export const LD_A_C = {
    mnemonic: 'LD A, C',
    index: 0x79,
    execute(cpu) {
        return loadRegisterFromRegister(cpu, 'A', 'C');
    }
}
//#endregion

// #region RD

export const LD_B_D = {
    mnemonic: 'LD B, D',
    index: 0x42,
    execute(cpu) {
        return loadRegisterFromRegister(cpu, 'B', 'D');
    }
}

export const LD_D_D = {
    mnemonic: 'LD D, D',
    index: 0x52,
    execute(cpu) {
        return loadRegisterFromRegister(cpu, 'D', 'D');
    }
}

export const LD_H_D = {
    mnemonic: 'LD H, D',
    index: 0x62,
    execute(cpu) {
        return loadRegisterFromRegister(cpu, 'H', 'D');
    }
}

export const LD_iHL_D = {
    mnemonic: 'LD [HL], D',
    index: 0x72,
    execute(cpu) {
        return loadHLMemoryFromRegister(cpu, 'D');
    }
}

export const LD_C_D = {
    mnemonic: 'LD C, D',
    index: 0x4a,
    execute(cpu) {
        return loadRegisterFromRegister(cpu, 'C', 'D');
    }
}

export const LD_E_D = {
    mnemonic: 'LD E, D',
    index: 0x5a,
    execute(cpu) {
        return loadRegisterFromRegister(cpu, 'E', 'D');
    }
}

export const LD_L_D = {
    mnemonic: 'LD L, D',
    index: 0x6a,
    execute(cpu) {
        return loadRegisterFromRegister(cpu, 'L', 'D');
    }
}

export const LD_A_D = {
    mnemonic: 'LD A, D',
    index: 0x7a,
    execute(cpu) {
        return loadRegisterFromRegister(cpu, 'A', 'D');
    }
}

// #endregion

// #region RE

export const LD_B_E = {
    mnemonic: 'LD B, E',
    index: 0x43,
    execute(cpu) {
        return loadRegisterFromRegister(cpu, 'B', 'E');
    }
}

export const LD_D_E = {
    mnemonic: 'LD D, E',
    index: 0x53,
    execute(cpu) {
        return loadRegisterFromRegister(cpu, 'D', 'E');
    }
}

export const LD_H_E = {
    mnemonic: 'LD H, E',
    index: 0x63,
    execute(cpu) {
        return loadRegisterFromRegister(cpu, 'H', 'E');
    }
}

export const LD_iHL_E = {
    mnemonic: 'LD [HL], E',
    index: 0x73,
    execute(cpu) {
        return loadHLMemoryFromRegister(cpu, 'E');
    }
}

export const LD_C_E = {
    mnemonic: 'LD C, E',
    index: 0x4b,
    execute(cpu) {
        return loadRegisterFromRegister(cpu, 'C', 'E');
    }
}

export const LD_E_E = {
    mnemonic: 'LD E, E',
    index: 0x5b,
    execute(cpu) {
        return loadRegisterFromRegister(cpu, 'E', 'E');
    }
}

export const LD_L_E = {
    mnemonic: 'LD L, E',
    index: 0x6b,
    execute(cpu) {
        return loadRegisterFromRegister(cpu, 'L', 'E');
    }
}

export const LD_A_E = {
    mnemonic: 'LD A, E',
    index: 0x7b,
    execute(cpu) {
        return loadRegisterFromRegister(cpu, 'A', 'E');
    }
}

// #endregion

// #region RH
export const LD_B_H = {
    mnemonic: 'LD B, H',
    index: 0x44,
    execute(cpu) {
        return loadRegisterFromRegister(cpu, 'B', 'H');
    }
}

export const LD_D_H = {
    mnemonic: 'LD D, H',
    index: 0x54,
    execute(cpu) {
        return loadRegisterFromRegister(cpu, 'D', 'H');
    }
}

export const LD_H_H = {
    mnemonic: 'LD H, H',
    index: 0x64,
    execute(cpu) {
        return loadRegisterFromRegister(cpu, 'H', 'H');
    }
}

export const LD_iHL_H = {
    mnemonic: 'LD [HL], H',
    index: 0x74,
    execute(cpu) {
        return loadHLMemoryFromRegister(cpu, 'H');
    }
}

export const LD_C_H = {
    mnemonic: 'LD C, H',
    index: 0x4c,
    execute(cpu) {
        return loadRegisterFromRegister(cpu, 'C', 'H');
    }
}

export const LD_E_H = {
    mnemonic: 'LD E, H',
    index: 0x5c,
    execute(cpu) {
        return loadRegisterFromRegister(cpu, 'E', 'H');
    }
}

export const LD_L_H = {
    mnemonic: 'LD L, H',
    index: 0x6c,
    execute(cpu) {
        return loadRegisterFromRegister(cpu, 'L', 'H');
    }
}

export const LD_A_H = {
    mnemonic: 'LD A, H',
    index: 0x7c,
    execute(cpu) {
        return loadRegisterFromRegister(cpu, 'A', 'H');
    }
}

// #endregion

// #region RL
export const LD_B_L = {
    mnemonic: 'LD B, L',
    index: 0x45,
    execute(cpu) {
        return loadRegisterFromRegister(cpu, 'B', 'L');
    }
}

export const LD_D_L = {
    mnemonic: 'LD D, L',
    index: 0x55,
    execute(cpu) {
        return loadRegisterFromRegister(cpu, 'D', 'L');
    }
}

export const LD_H_L = {
    mnemonic: 'LD H, L',
    index: 0x65,
    execute(cpu) {
        return loadRegisterFromRegister(cpu, 'H', 'L');
    }
}

export const LD_iHL_L = {
    mnemonic: 'LD [HL], L',
    index: 0x75,
    execute(cpu) {
        return loadHLMemoryFromRegister(cpu, 'L');
    }
}

export const LD_C_L = {
    mnemonic: 'LD C, L',
    index: 0x4d,
    execute(cpu) {
        return loadRegisterFromRegister(cpu, 'C', 'L');
    }
}

export const LD_E_L = {
    mnemonic: 'LD E, L',
    index: 0x5d,
    execute(cpu) {
        return loadRegisterFromRegister(cpu, 'E', 'L');
    }
}

export const LD_L_L = {
    mnemonic: 'LD L, L',
    index: 0x6d,
    execute(cpu) {
        return loadRegisterFromRegister(cpu, 'L', 'L');
    }
}

export const LD_A_L = {
    mnemonic: 'LD A, L',
    index: 0x7d,
    execute(cpu) {
        return loadRegisterFromRegister(cpu, 'A', 'L');
    }
}

// #endregion

// #region RA

export const LD_B_A = {
    mnemonic: 'LD B, A',
    index: 0x47,
    execute(cpu) {
        return loadRegisterFromRegister(cpu, 'B', 'A');
    }
}

export const LD_D_A = {
    mnemonic: 'LD D, A',
    index: 0x57,
    execute(cpu) {
        return loadRegisterFromRegister(cpu, 'D', 'A');
    }
}

export const LD_H_A = {
    mnemonic: 'LD H, A',
    index: 0x67,
    execute(cpu) {
        return loadRegisterFromRegister(cpu, 'H', 'A');
    }
}

export const LD_iHL_A = {
    mnemonic: 'LD [HL], A',
    index: 0x77,
    execute(cpu) {
        return loadHLMemoryFromRegister(cpu, 'A');
    }
}

export const LD_C_A = {
    mnemonic: 'LD C, A',
    index: 0x4f,
    execute(cpu) {
        return loadRegisterFromRegister(cpu, 'C', 'A');
    }
}

export const LD_E_A = {
    mnemonic: 'LD E, A',
    index: 0x5f,
    execute(cpu) {
        return loadRegisterFromRegister(cpu, 'E', 'A');
    }
}

export const LD_L_A = {
    mnemonic: 'LD L, A',
    index: 0x6f,
    execute(cpu) {
        return loadRegisterFromRegister(cpu, 'L', 'A');
    }
}

export const LD_A_A = {
    mnemonic: 'LD A, A',
    index: 0x7f,
    execute(cpu) {
        return loadRegisterFromRegister(cpu, 'A', 'A');
    }
}
// #endregion

// #region LOAD REGISTER 8 FROM HL MEMORY

export const LD_C_iHL = {
    mnemonic: 'LD C, [HL]',
    index: 0x4e,
    execute(cpu) {
        return loadRegisterFromHLMemory(cpu, 'C');
    }
}

export const LD_E_iHL = {
    mnemonic: 'LD E, [HL]',
    index: 0x5e,
    execute(cpu) {
        return loadRegisterFromHLMemory(cpu, 'E');
    }
}

export const LD_L_iHL = {
    mnemonic: 'LD L, [HL]',
    index: 0x6e,
    execute(cpu) {
        return loadRegisterFromHLMemory(cpu, 'L');
    }
}

export const LD_A_iHL = {
    mnemonic: 'LD A, [HL]',
    index: 0x7e,
    execute(cpu) {
        return loadRegisterFromHLMemory(cpu, 'A');
    }
}

// #endregion

// #region LD r8, [HL]
export const LD_B_iHL = {
    mnemonic: 'LD B, [HL]',
    index: 0x46,
    execute(cpu) {

        return loadRegisterFromHLMemory(cpu, 'B');
    }
}

export const LD_D_iHL = {
    mnemonic: 'LD D, [HL]',
    index: 0x56,
    execute(cpu) {

        return loadRegisterFromHLMemory(cpu, 'D');
    }
}

export const LD_H_iHL = {
    mnemonic: 'LD H, [HL]',
    index: 0x66,
    execute(cpu) {

        return loadRegisterFromHLMemory(cpu, 'H');
    }
}

// #endregion

// #region ADD A, r8

export const ADD_A_B = {
    mnemonic: 'ADD A, B',
    index: 0x80,
    execute(cpu) {
        return addRegisterFromRegister(cpu, 'A', 'B');
    }
}

export const ADD_A_C = {
    mnemonic: 'ADD A, C',
    index: 0x81,
    execute(cpu) {
        return addRegisterFromRegister(cpu, 'A', 'C');
    }
}

export const ADD_A_D = {
    mnemonic: 'ADD A, D',
    index: 0x82,
    execute(cpu) {
        return addRegisterFromRegister(cpu, 'A', 'D');
    }
}

export const ADD_A_E = {
    mnemonic: 'ADD A, E',
    index: 0x83,
    execute(cpu) {
        return addRegisterFromRegister(cpu, 'A', 'E');
    }
}

export const ADD_A_H = {
    mnemonic: 'ADD A, H',
    index: 0x84,
    execute(cpu) {
        return addRegisterFromRegister(cpu, 'A', 'H');
    }
}

export const ADD_A_L = {
    mnemonic: 'ADD A, L',
    index: 0x85,
    execute(cpu) {
        return addRegisterFromRegister(cpu, 'A', 'L');
    }
}

export const ADD_A_iHL = {
    mnemonic: 'ADD A, [HL]',
    index: 0x86,
    execute(cpu) {
        const address = hiLoToU16(cpu.registers.H, cpu.registers.L);
        const oldValue = cpu.readMemory(address) & 0xff;
        addRegisterFromValue(cpu, 'A', oldValue);
        return 2;
    }
}

export const ADD_A_A = {
    mnemonic: 'ADD A, A',
    index: 0x87,
    execute(cpu) {
        return addRegisterFromRegister(cpu, 'A', 'A');
    }
}

// #endregion

// #region ADC A, r8

export const ADC_A_B = {
    mnemonic: 'ADC A, B',
    index: 0x88,
    execute(cpu) {
        return addRegisterFromRegisterWithCarry(cpu, 'A', 'B');
    }
}

export const ADC_A_C = {
    mnemonic: 'ADC A, C',
    index: 0x89,
    execute(cpu) {
        return addRegisterFromRegisterWithCarry(cpu, 'A', 'C');
    }
}

export const ADC_A_D = {
    mnemonic: 'ADC A, D',
    index: 0x8a,
    execute(cpu) {
        return addRegisterFromRegisterWithCarry(cpu, 'A', 'D');
    }
}

export const ADC_A_E = {
    mnemonic: 'ADC A, E',
    index: 0x8b,
    execute(cpu) {
        return addRegisterFromRegisterWithCarry(cpu, 'A', 'E');
    }
}

export const ADC_A_H = {
    mnemonic: 'ADC A, H',
    index: 0x8c,
    execute(cpu) {
        return addRegisterFromRegisterWithCarry(cpu, 'A', 'H');
    }
}

export const ADC_A_L = {
    mnemonic: 'ADC A, L',
    index: 0x8d,
    execute(cpu) {
        return addRegisterFromRegisterWithCarry(cpu, 'A', 'L');
    }
}

export const ADC_A_A = {
    mnemonic: 'ADC A, A',
    index: 0x8f,
    execute(cpu) {
        return addRegisterFromRegisterWithCarry(cpu, 'A', 'A');
    }
}

export const ADC_A_iHL = {
    mnemonic: 'ADC A, [HL]',
    index: 0x8e,
    execute(cpu) {
        const address = hiLoToU16(cpu.registers.H, cpu.registers.L);
        const oldValue = cpu.readMemory(address) & 0xff;
        addRegisterFromValueWithCarry(cpu, 'A', oldValue);
        return 2;
    }
}

// #endregion

// #region SUB A, r8

export const SUB_A_B = {
    mnemonic: 'SUB A, B',
    index: 0x90,
    execute(cpu) {
        return subtractRegisterFromRegister(cpu, 'A', 'B');
    }
}

export const SUB_A_C = {
    mnemonic: 'SUB A, C',
    index: 0x91,
    execute(cpu) {
        return subtractRegisterFromRegister(cpu, 'A', 'C');
    }
}

export const SUB_A_D = {
    mnemonic: 'SUB A, D',
    index: 0x92,
    execute(cpu) {
        return subtractRegisterFromRegister(cpu, 'A', 'D');
    }
}

export const SUB_A_E = {
    mnemonic: 'SUB A, E',
    index: 0x93,
    execute(cpu) {
        return subtractRegisterFromRegister(cpu, 'A', 'E');
    }
}

export const SUB_A_H = {
    mnemonic: 'SUB A, H',
    index: 0x94,
    execute(cpu) {
        return subtractRegisterFromRegister(cpu, 'A', 'H');
    }
}

export const SUB_A_L = {
    mnemonic: 'SUB A, L',
    index: 0x95,
    execute(cpu) {
        return subtractRegisterFromRegister(cpu, 'A', 'L');
    }
}

export const SUB_A_A = {
    mnemonic: 'SUB A, A',
    index: 0x97,
    execute(cpu) {
        return subtractRegisterFromRegister(cpu, 'A', 'A');
    }
}

export const SUB_A_iHL = {
    mnemonic: 'SUB A, [HL]',
    index: 0x96,
    execute(cpu) {
        const address = hiLoToU16(cpu.registers.H, cpu.registers.L);
        const oldValue = cpu.readMemory(address) & 0xff;
        subtractRegisterFromValue(cpu, 'A', oldValue);
        return 2;
    }
}

// #endregion

// #region SBC A, r8

export const SBC_A_B = {
    mnemonic: 'SBC A, B',
    index: 0x98,
    execute(cpu) {
        return subtractRegisterFromRegisterWithCarry(cpu, 'A', 'B');
    }
}

export const SBC_A_C = {
    mnemonic: 'SBC A, C',
    index: 0x99,
    execute(cpu) {
        return subtractRegisterFromRegisterWithCarry(cpu, 'A', 'C');
    }
}

export const SBC_A_D = {
    mnemonic: 'SBC A, D',
    index: 0x9a,
    execute(cpu) {
        return subtractRegisterFromRegisterWithCarry(cpu, 'A', 'D');
    }
}

export const SBC_A_E = {
    mnemonic: 'SBC A, E',
    index: 0x9b,
    execute(cpu) {
        return subtractRegisterFromRegisterWithCarry(cpu, 'A', 'E');
    }
}

export const SBC_A_H = {
    mnemonic: 'SBC A, H',
    index: 0x9c,
    execute(cpu) {
        return subtractRegisterFromRegisterWithCarry(cpu, 'A', 'H');
    }
}

export const SBC_A_L = {
    mnemonic: 'SBC A, L',
    index: 0x9d,
    execute(cpu) {
        return subtractRegisterFromRegisterWithCarry(cpu, 'A', 'L');
    }
}

export const SBC_A_A = {
    mnemonic: 'SBC A, A',
    index: 0x9f,
    execute(cpu) {
        return subtractRegisterFromRegisterWithCarry(cpu, 'A', 'A');
    }
}

export const SBC_A_iHL = {
    mnemonic: 'SBC A, [HL]',
    index: 0x9e,
    execute(cpu) {
        const address = hiLoToU16(cpu.registers.H, cpu.registers.L);
        const oldValue = cpu.readMemory(address) & 0xff;
        subtractRegisterFromValue(cpu, 'A', oldValue, true);
        return 2;
    }
}

// #endregion

// #region AND A, r8

export const AND_A_B = {
    mnemonic: 'AND A, B',
    index: 0xa0,
    execute(cpu) {
        return andRegisterWithRegister(cpu, 'A', 'B');
    }
}

export const AND_A_C = {
    mnemonic: 'AND A, C',
    index: 0xa1,
    execute(cpu) {
        return andRegisterWithRegister(cpu, 'A', 'C');
    }
}

export const AND_A_D = {
    mnemonic: 'AND A, D',
    index: 0xa2,
    execute(cpu) {
        return andRegisterWithRegister(cpu, 'A', 'D');
    }
}

export const AND_A_E = {
    mnemonic: 'AND A, E',
    index: 0xa3,
    execute(cpu) {
        return andRegisterWithRegister(cpu, 'A', 'E');
    }
}

export const AND_A_H = {
    mnemonic: 'AND A, H',
    index: 0xa4,
    execute(cpu) {
        return andRegisterWithRegister(cpu, 'A', 'H');
    }
}

export const AND_A_L = {
    mnemonic: 'AND A, L',
    index: 0xa5,
    execute(cpu) {
        return andRegisterWithRegister(cpu, 'A', 'L');
    }
}

export const AND_A_A = {
    mnemonic: 'AND A, A',
    index: 0xa7,
    execute(cpu) {
        return andRegisterWithRegister(cpu, 'A', 'A');
    }
}

export const AND_A_iHL = {
    mnemonic: 'AND A, [HL]',
    index: 0xa6,
    execute(cpu) {
        const address = hiLoToU16(cpu.registers.H, cpu.registers.L);
        const oldValue = cpu.readMemory(address) & 0xff;
        andRegisterWithValue(cpu, 'A', oldValue);
        return 2;
    }
}

// #endregion

// #region XOR A, r8

export const XOR_A_B = {
    mnemonic: 'XOR A, B',
    index: 0xa8,
    execute(cpu) {
        return xorRegisterWithRegister(cpu, 'A', 'B');
    }
}

export const XOR_A_C = {
    mnemonic: 'XOR A, C',
    index: 0xa9,
    execute(cpu) {
        return xorRegisterWithRegister(cpu, 'A', 'C');
    }
}

export const XOR_A_D = {
    mnemonic: 'XOR A, D',
    index: 0xaa,
    execute(cpu) {
        return xorRegisterWithRegister(cpu, 'A', 'D');
    }
}

export const XOR_A_E = {
    mnemonic: 'XOR A, E',
    index: 0xab,
    execute(cpu) {
        return xorRegisterWithRegister(cpu, 'A', 'E');
    }
}

export const XOR_A_H = {
    mnemonic: 'XOR A, H',
    index: 0xac,
    execute(cpu) {
        return xorRegisterWithRegister(cpu, 'A', 'H');
    }
}

export const XOR_A_L = {
    mnemonic: 'XOR A, L',
    index: 0xad,
    execute(cpu) {
        return xorRegisterWithRegister(cpu, 'A', 'L');
    }
}

export const XOR_A_A = {
    mnemonic: 'XOR A, A',
    index: 0xaf,
    execute(cpu) {
        return xorRegisterWithRegister(cpu, 'A', 'A');
    }
}

export const XOR_A_iHL = {
    mnemonic: 'XOR A, [HL]',
    index: 0xae,
    execute(cpu) {
        const address = hiLoToU16(cpu.registers.H, cpu.registers.L);
        const oldValue = cpu.readMemory(address) & 0xff;
        xorRegisterWithValue(cpu, 'A', oldValue);
        return 2;
    }
}

// #endregion

// #region OR A, r8

function orRegisterWithValue(cpu, registerTo, value) {
    const to = cpu.registers[registerTo] & 0xff;
    const comp = value | to;

    cpu.registers[registerTo] = comp & 0xff;
    cpu.registers.F = 0x00;

    if (comp === 0)
        cpu.registers.F |= Flags.Zero;
}

function orRegisterWithRegister(cpu, registerTo, registerFrom) {
    const from = cpu.registers[registerFrom] & 0xff;
    orRegisterWithValue(cpu, registerTo, from);
    return 1;
}

export const OR_A_B = {
    mnemonic: 'OR A, B',
    index: 0xb0,
    execute(cpu) {
        return orRegisterWithRegister(cpu, 'A', 'B');
    }
}

export const OR_A_C = {
    mnemonic: 'OR A, C',
    index: 0xb1,
    execute(cpu) {
        return orRegisterWithRegister(cpu, 'A', 'C');
    }
}

export const OR_A_D = {
    mnemonic: 'OR A, D',
    index: 0xb2,
    execute(cpu) {
        return orRegisterWithRegister(cpu, 'A', 'D');
    }
}

export const OR_A_E = {
    mnemonic: 'OR A, E',
    index: 0xb3,
    execute(cpu) {
        return orRegisterWithRegister(cpu, 'A', 'E');
    }
}

export const OR_A_H = {
    mnemonic: 'OR A, H',
    index: 0xb4,
    execute(cpu) {
        return orRegisterWithRegister(cpu, 'A', 'H');
    }
}

export const OR_A_L = {
    mnemonic: 'OR A, L',
    index: 0xb5,
    execute(cpu) {
        return orRegisterWithRegister(cpu, 'A', 'L');
    }
}

export const OR_A_iHL = {
    mnemonic: 'OR A, [HL]',
    index: 0xb6,
    execute(cpu) {
        const address = hiLoToU16(cpu.registers.H, cpu.registers.L);
        const oldValue = cpu.readMemory(address) & 0xff;
        orRegisterWithValue(cpu, 'A', oldValue);
        return 2;
    }
}

export const OR_A_A = {
    mnemonic: 'OR A, A',
    index: 0xb7,
    execute(cpu) {
        return orRegisterWithRegister(cpu, 'A', 'A');
    }
}

// #endregion

// #region CP A, r8

function compareRegisterWithValue(cpu, registerTo, value) {

    const to = cpu.registers[registerTo] & 0xff;
    const sub = to - value;

    cpu.registers.F = 0x00;
    cpu.registers.F |= sub === 0 ? Flags.Zero : 0x00;
    cpu.registers.F |= Flags.Substraction;
    cpu.registers.F |= value > to ? Flags.Carry : 0x00;
    cpu.registers.F |= (to & 0x0f) < (value & 0x0f) ? Flags.HalfCarry : 0x00;
}

function compareRegisterWithRegister(cpu, registerTo, registerFrom) {
    const from = cpu.registers[registerFrom] & 0xff;
    compareRegisterWithValue(cpu, registerTo, from);
    return 1;
}


export const CP_A_B = {
    mnemonic: 'CP A, B',
    index: 0xb8,
    execute(cpu) {
        return compareRegisterWithRegister(cpu, 'A', 'B');
    }
}

export const CP_A_C = {
    mnemonic: 'CP A, C',
    index: 0xb9,
    execute(cpu) {
        return compareRegisterWithRegister(cpu, 'A', 'C');
    }
}

export const CP_A_D = {
    mnemonic: 'CP A, D',
    index: 0xba,
    execute(cpu) {
        return compareRegisterWithRegister(cpu, 'A', 'D');
    }
}

export const CP_A_E = {
    mnemonic: 'CP A, E',
    index: 0xbb,
    execute(cpu) {
        return compareRegisterWithRegister(cpu, 'A', 'E');
    }
}

export const CP_A_H = {
    mnemonic: 'CP A, H',
    index: 0xbc,
    execute(cpu) {
        return compareRegisterWithRegister(cpu, 'A', 'H');
    }
}

export const CP_A_L = {
    mnemonic: 'CP A, L',
    index: 0xbd,
    execute(cpu) {
        return compareRegisterWithRegister(cpu, 'A', 'L');
    }
}

export const CP_A_iHL = {
    mnemonic: 'CP A, [HL]',
    index: 0xbe,
    execute(cpu) {
        const address = hiLoToU16(cpu.registers.H, cpu.registers.L);
        const oldValue = cpu.readMemory(address) & 0xff;
        compareRegisterWithValue(cpu, 'A', oldValue);
        return 2;
    }
}

export const CP_A_A = {
    mnemonic: 'CP A, A',
    index: 0xbf,
    execute(cpu) {
        return compareRegisterWithRegister(cpu, 'A', 'A');
    }
}

// #endregion

// #region RET

function returnFromSubrotine(cpu) {

    const low = cpu.readMemory(cpu.sp) & 0xff;
    cpu.sp = (cpu.sp + 1) & 0xffff;
    const high = cpu.readMemory(cpu.sp) & 0xff;
    cpu.sp = (cpu.sp + 1) & 0xffff;
    cpu.pc = ((high << 8) | low) & 0xffff;

}

export const RET_NZ = {
    mnemonic: 'RET NZ',
    index: 0xc0,
    execute(cpu) {
        if (condNZ(cpu)) {
            returnFromSubrotine(cpu);
            return 5;
        }

        return 2;

    }
}

export const RET_NC = {
    mnemonic: 'RET NC',
    index: 0xd0,
    execute(cpu) {
        if (condNC(cpu)) {
            returnFromSubrotine(cpu);
            return 5;
        }

        return 2;

    }
}

export const RET_Z = {
    mnemonic: 'RET Z',
    index: 0xc8,
    execute(cpu) {
        if (condZ(cpu)) {
            returnFromSubrotine(cpu);
            return 5;
        }

        return 2;

    }
}

export const RET_C = {
    mnemonic: 'RET C',
    index: 0xd8,
    execute(cpu) {
        if (condC(cpu)) {
            returnFromSubrotine(cpu);
            return 5;
        }

        return 2;

    }
}

export const RET = {
    mnemonic: 'RET',
    index: 0xc9,
    execute(cpu) {
        returnFromSubrotine(cpu);
        return 4;
    }
}

export const RETI = {
    mnemonic: 'RETI',
    index: 0xd9,
    execute(cpu) {
        cpu.ime = true;
        returnFromSubrotine(cpu);
        return 4;
    }
}

// #endregion

// #region LD [$FF00+n8]

export const LD_iFF00_p_n8_A = {
    mnemonic: 'LD (FF00+u8),A',
    index: 0xe0,
    execute(cpu) {
        const value = cpu.readMemoryFromProgramCounter() & 0xff;
        cpu.incProgramCounter();
        const address = 0xff00 + value;
        cpu.writeMemory(address & 0xffff, cpu.registers.A);
        return 3;
    }
}

export const LD_A_iFF00_p_n8 = {
    mnemonic: 'LD A,(FF00+u8)',
    index: 0xf0,
    execute(cpu) {
        const value = cpu.readMemoryFromProgramCounter() & 0xff;
        cpu.incProgramCounter();
        const address = 0xff00 + value;
        const memoryValue = cpu.readMemory(address & 0xffff);
        cpu.registers.A = memoryValue & 0xff;
        return 3;
    }
}

export const LD_iFF00_p_C_A = {
    mnemonic: 'LD (FF00+C),A',
    index: 0xe2,
    execute(cpu) {
        const address = 0xff00 + cpu.registers.C;
        cpu.writeMemory(address & 0xffff, cpu.registers.A);
        return 2;
    }
}

export const LD_A_iFF00_p_C = {
    mnemonic: 'LD A,(FF00+C)',
    index: 0xf2,
    execute(cpu) {
        const address = 0xff00 + cpu.registers.C;
        const memoryValue = cpu.readMemory(address & 0xffff);
        cpu.registers.A = memoryValue & 0xff;
        return 2;
    }
}

export const LD_in16_A = {
    mnemonic: 'LD [u16],A',
    index: 0xea,
    execute(cpu) {

        const hi = cpu.readMemoryFromProgramCounter() & 0xff;
        cpu.incProgramCounter();

        const lo = cpu.readMemoryFromProgramCounter() & 0xff;
        cpu.incProgramCounter();

        const address = hiLoToU16(hi, lo);

        cpu.writeMemory(address, cpu.registers.A);

        return 4;
    }
}

export const LD_A_in16 = {
    mnemonic: 'LD A,[u16]',
    index: 0xfa,
    execute(cpu) {

        const hi = cpu.readMemoryFromProgramCounter() & 0xff;
        cpu.incProgramCounter();

        const lo = cpu.readMemoryFromProgramCounter() & 0xff;
        cpu.incProgramCounter();

        const address = hiLoToU16(hi, lo);
        const value = cpu.readMemory(address);

        cpu.registers.A = value;

        return 4;
    }
}

// #endregion

// #region PUSH POP

function popRegister16(cpu, regHigh, regLow) {

    const low = cpu.readMemory(cpu.sp) & 0xff;
    cpu.sp = (cpu.sp + 1) & 0xffff;
    const high = cpu.readMemory(cpu.sp) & 0xff;
    cpu.sp = (cpu.sp + 1) & 0xffff;

    cpu.registers[regHigh] = high & 0xff;
    cpu.registers[regLow] = low & 0xff;
}

function pushRegister16(cpu, regHigh, regLow) {
    cpu.sp = (cpu.sp - 1) & 0xffff;
    cpu.writeMemory(cpu.sp, cpu.registers[regHigh] & 0xff, false);
    cpu.sp = (cpu.sp - 1) & 0xffff;
    cpu.writeMemory(cpu.sp, cpu.registers[regLow] & 0xff, false);

}

export const POP_BC = {
    mnemonic: 'POP BC',
    index: 0xc1,
    execute(cpu) {
        popRegister16(cpu, 'B', 'C');
        return 3;
    }
}

export const POP_DE = {
    mnemonic: 'POP DE',
    index: 0xd1,
    execute(cpu) {
        popRegister16(cpu, 'D', 'E');
        return 3;
    }
}

export const POP_HL = {
    mnemonic: 'POP HL',
    index: 0xe1,
    execute(cpu) {
        popRegister16(cpu, 'H', 'L');
        return 3;
    }
}

export const POP_AF = {
    mnemonic: 'POP AF',
    index: 0xf1,
    execute(cpu) {

        const low = cpu.readMemory(cpu.sp) & 0xff;
        cpu.sp = (cpu.sp + 1) & 0xffff;
        const high = cpu.readMemory(cpu.sp) & 0xff;
        cpu.sp = (cpu.sp + 1) & 0xffff;


        cpu.registers.F = low & 0xf0;
        cpu.registers.A = high & 0xff;
        return 3;
    }
}

export const PUSH_BC = {
    mnemonic: 'PUSH BC',
    index: 0xc5,
    execute(cpu) {
        pushRegister16(cpu, 'B', 'C');
        return 4;
    }
}

export const PUSH_DE = {
    mnemonic: 'PUSH DE',
    index: 0xd5,
    execute(cpu) {
        pushRegister16(cpu, 'D', 'E');
        return 4;
    }
}

export const PUSH_HL = {
    mnemonic: 'PUSH HL',
    index: 0xe5,
    execute(cpu) {
        pushRegister16(cpu, 'H', 'L');
        return 4;
    }
}

export const PUSH_AF = {
    mnemonic: 'PUSH AF',
    index: 0xf5,
    execute(cpu) {
        cpu.sp = (cpu.sp - 1) & 0xffff;
        cpu.writeMemory(cpu.sp, cpu.registers.A & 0xff, false);
        cpu.sp = (cpu.sp - 1) & 0xffff;
        cpu.writeMemory(cpu.sp, cpu.registers.F & 0xf0, false);
        return 4;
    }
}

// #endregion

// #region JP

function jumpToAddress(cpu, address) {
    cpu.pc = address & 0xffff;
}

export const JP_NZ_n16 = {
    mnemonic: 'JP NZ, u16',
    index: 0xc2,
    execute(cpu) {

        const low = cpu.readMemory(cpu.sp) & 0xff;
        cpu.sp = (cpu.sp + 1) & 0xffff;
        const high = cpu.readMemory(cpu.sp) & 0xff;
        cpu.sp = (cpu.sp + 1) & 0xffff;

        const address = hiLoToU16(high, low);

        if (condNZ(cpu)) {
            jumpToAddress(cpu, address);
            return 4;
        }

        return 3;
    }
}

export const JP_NC_n16 = {
    mnemonic: 'JP NC, u16',
    index: 0xd2,
    execute(cpu) {

        const low = cpu.readMemory(cpu.sp) & 0xff;
        cpu.sp = (cpu.sp + 1) & 0xffff;
        const high = cpu.readMemory(cpu.sp) & 0xff;
        cpu.sp = (cpu.sp + 1) & 0xffff;

        const address = hiLoToU16(high, low);

        if (condNC(cpu)) {
            jumpToAddress(cpu, address);
            return 4;
        }

        return 3;
    }
}

export const JP_n16 = {
    mnemonic: 'JP u16',
    index: 0xc3,
    execute(cpu) {

        const low = cpu.readMemory(cpu.sp) & 0xff;
        cpu.sp = (cpu.sp + 1) & 0xffff;
        const high = cpu.readMemory(cpu.sp) & 0xff;
        cpu.sp = (cpu.sp + 1) & 0xffff;

        const address = hiLoToU16(high, low);
        jumpToAddress(cpu, address);
        return 4;
    }
}

export const JP_Z_n16 = {
    mnemonic: 'JP Z, u16',
    index: 0xca,
    execute(cpu) {

        const low = cpu.readMemory(cpu.sp) & 0xff;
        cpu.sp = (cpu.sp + 1) & 0xffff;
        const high = cpu.readMemory(cpu.sp) & 0xff;
        cpu.sp = (cpu.sp + 1) & 0xffff;

        const address = hiLoToU16(high, low);

        if (condZ(cpu)) {
            jumpToAddress(cpu, address);
            return 4;
        }

        return 3;
    }
}

export const JP_C_n16 = {
    mnemonic: 'JP C, u16',
    index: 0xda,
    execute(cpu) {

        const low = cpu.readMemory(cpu.sp) & 0xff;
        cpu.sp = (cpu.sp + 1) & 0xffff;
        const high = cpu.readMemory(cpu.sp) & 0xff;
        cpu.sp = (cpu.sp + 1) & 0xffff;

        const address = hiLoToU16(high, low);

        if (condC(cpu)) {
            jumpToAddress(cpu, address);
            return 4;
        }

        return 3;
    }
}


export const JP_HL = {
    mnemonic: 'JP HL',
    index: 0xe9,
    execute(cpu) {

        const address = readValueFromHLRegisters(cpu);
        jumpToAddress(cpu, address);
        return 1;
    }
}



// #endregion

// #region CALL RST

function callFunction(cpu, address) {
    const pc = cpu.pc & 0xffff;
    cpu.sp = (cpu.sp - 1) & 0xffff;
    cpu.writeMemory(cpu.sp, (pc >> 8) & 0xff, false);
    cpu.sp = (cpu.sp - 1) & 0xffff;
    cpu.writeMemory(cpu.sp, pc & 0xff, false);
    cpu.pc = address & 0xffff;
}

export const CALL_n16 = {
    mnemonic: 'CALL u16',
    index: 0xcd,
    execute(cpu) {
        const hilo = readU16(cpu);
        callFunction(cpu, hilo.Value);

        return 6;
    }
}

export const CALL_NZ_n16 = {
    mnemonic: 'CALL NZ,u16',
    index: 0xc4,
    execute(cpu) {
        const hilo = readU16(cpu);
        if (condNZ(cpu)) {
            callFunction(cpu, hilo.Value);
            return 6;
        }

        return 3;
    }
}

export const CALL_NC_n16 = {
    mnemonic: 'CALL NC,u16',
    index: 0xd4,
    execute(cpu) {
        const hilo = readU16(cpu);
        if (condNC(cpu)) {
            callFunction(cpu, hilo.Value);
            return 6;
        }

        return 3;
    }
}

export const CALL_Z_n16 = {
    mnemonic: 'CALL Z,u16',
    index: 0xcc,
    execute(cpu) {
        const hilo = readU16(cpu);
        if (condZ(cpu)) {
            callFunction(cpu, hilo.Value);
            return 6;
        }

        return 3;
    }
}

export const CALL_C_n16 = {
    mnemonic: 'CALL C,u16',
    index: 0xdc,
    execute(cpu) {
        const hilo = readU16(cpu);
        if (condC(cpu)) {
            callFunction(cpu, hilo.Value);
            return 6;
        }

        return 3;
    }
}

export const RST_00H = {
    mnemonic: 'RST 00H',
    index: 0xc7,
    execute(cpu) {
        callFunction(cpu, 0x00);
    }
}

export const RST_10H = {
    mnemonic: 'RST 10H',
    index: 0xd7,
    execute(cpu) {
        callFunction(cpu, 0x10);
    }
}

export const RST_20H = {
    mnemonic: 'RST 20H',
    index: 0xe7,
    execute(cpu) {
        callFunction(cpu, 0x20);
    }
}

export const RST_30H = {
    mnemonic: 'RST 30H',
    index: 0xf7,
    execute(cpu) {
        callFunction(cpu, 0x30);
    }
}


export const RST_08H = {
    mnemonic: 'RST 08H',
    index: 0xcf,
    execute(cpu) {
        callFunction(cpu, 0x08);
    }
}

export const RST_18H = {
    mnemonic: 'RST 18H',
    index: 0xdf,
    execute(cpu) {
        callFunction(cpu, 0x18);
    }
}

export const RST_28H = {
    mnemonic: 'RST 28H',
    index: 0xef,
    execute(cpu) {
        callFunction(cpu, 0x28);
    }
}

export const RST_38H = {
    mnemonic: 'RST 38H',
    index: 0xff,
    execute(cpu) {
        callFunction(cpu, 0x38);
    }
}



// #endregion