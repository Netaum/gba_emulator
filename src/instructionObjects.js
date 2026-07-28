const Flags = Object.freeze({
    Zero:         0x80,
    Substraction: 0x40,
    HalfCarry:    0x20,
    Carry:        0x10,
});

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
    index: 0x21,
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
        const newValue = (oldValue + 1) & 0xffff;
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
        const newValue = (oldValue - 1) & 0xffff;
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

function carryBit(cpu) {
    return (cpu.registers.F & Flags.Carry) !== 0 ? 1 : 0;
}

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
        const cbit = carryBit(cpu);

        const newValue = ((value << 1) | cbit) & 0xff;

        cpu.registers.A = newValue;

        cpu.registers.F = 0x00;
        cpu.registers.F |= (value & 0x80) !== 0 ? Flags.Carry : 0x00;

        return 1;
    }
}

export const RRCA = {
    mnemonic: 'RRCA',
    index: 0x0F,
    execute(cpu) {

        const value = cpu.registers.A;
        const bitZero = value & 0b0000001;
        const newValue = ((bitZero << 7) | (value >> 1)) & 0xff;

        cpu.registers.A = newValue;
        cpu.registers.F  = 0x00;
        cpu.registers.F |= bitZero !== 0 ? Flags.Carry : 0x00;

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
        cpu.writeMemory((address+1) & 0xffff, (cpu.sp >> 8) & 0xff);

        return 5;
    }
}

export const ADD_HL_BC = {
    mnemonic: 'ADD HL, BC',
    index: 0x09,
    execute(cpu) {

        const bc = hiLoToU16(cpu.registers.B, cpu.registers.C);
        const hl = hiLoToU16(cpu.registers.H, cpu.registers.L);

        const sum = (bc + hl);

        const halfCarry = ((hl & 0x0fff) + (bc & 0x0fff)) > 0x0fff;
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

export const LD_A_iBC = {
    mnemonic: 'LD A, [BC]',
    index: 0x0A,
    execute(cpu) {

        const bc = hiLoToU16(cpu.registers.B, cpu.registers.C);
        const value = cpu.readMemory(bc);

        cpu.registers.A = value & 0xff;
        
        return 2;
    }
}

export const DEC_BC = {
    mnemonic: 'DEC BC',
    index: 0x0B,
    execute(cpu) {
        const oldValue = hiLoToU16(cpu.registers.B, cpu.registers.C);
        const newValue = (oldValue - 1) & 0xffff;

        const hilo = u16ToHiLo(newValue);

        cpu.registers.B = hilo.Hi;
        cpu.registers.C = hilo.Lo;

        return 2;
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