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

function loadRegister16U16(cpu, registerHi, registerLo) {
    const lo = cpu.readMemoryFromProgramCounter();
    cpu.incProgramCounter();
    const hi = cpu.readMemoryFromProgramCounter();
    cpu.incProgramCounter();

    cpu.registers[registerHi] = hi & 0xff;
    cpu.registers[registerLo] = lo & 0xff;
    return 3;
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
        const lo = cpu.readMemoryFromProgramCounter();
        cpu.incProgramCounter();
        const hi = cpu.readMemoryFromProgramCounter();
        cpu.incProgramCounter();

        cpu.sp = hiLoToU16(hi, lo);

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

        const lo = cpu.readMemoryFromProgramCounter();
        cpu.incProgramCounter();
        const hi = cpu.readMemoryFromProgramCounter();
        cpu.incProgramCounter();

        const address = hiLoToU16(hi, lo);
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

// #region LD r8, r8

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

// #endregion

function loadRegisterFromHLMemory(cpu, registerTo) {
    const address = hiLoToU16(cpu.registers.H, cpu.registers.L);
    const value = cpu.readMemory(address);
    cpu.registers[registerTo] = value & 0xff;
    return 2;
}

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

// #endregion