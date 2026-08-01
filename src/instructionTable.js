import * as I from './instructionObjects.js';

const fmt = (n, digits) => n.toString(16).padStart(digits, '0').toUpperCase();

const illegal = (opcode) => ({
    mnemonic: `ILLEGAL_${fmt(opcode, 2)}`,
    execute(cpu) {
        throw new Error(`Illegal opcode 0x${fmt(opcode, 2)} at PC 0x${fmt(cpu.pc, 4)}`);
    },
});

const todo = (opcode) => ({
    mnemonic: `TODO_${fmt(opcode, 2)}`,
    execute(cpu) {
        throw new Error(`Unimplemented opcode 0x${fmt(opcode, 2)} at PC 0x${fmt(cpu.pc, 4)}`);
    },
});

// These 11 opcodes are permanently illegal on the Game Boy CPU
const ILLEGAL_OPCODES = new Set([0xD3, 0xDB, 0xDD, 0xE3, 0xE4, 0xEB, 0xEC, 0xED, 0xF4, 0xFC, 0xFD]);

export const instructionTable = Array.from({ length: 256 }, (_, i) =>
    ILLEGAL_OPCODES.has(i) ? illegal(i) : todo(i)
);

const instTable = 
[ I.NOP ,     I.LD_BC_u16 , I.LD_iBC_A,  I.INC_BC, I.INC_B,   I.DEC_B,   I.LD_B_n8,   I.RLCA, I.LD_iu16_SP, I.ADD_HL_BC, I.LD_A_iBC,  I.DEC_BC, I.INC_C, I.DEC_C, I.LD_C_n8, I.RRCA,
  I.STOP,     I.LD_DE_u16 , I.LD_iDE_A,  I.INC_DE, I.INC_D,   I.DEC_D,   I.LD_D_n8,   I.RLA , I.JR_i8,      I.ADD_HL_DE, I.LD_A_iDE,  I.DEC_DE, I.INC_E, I.DEC_E, I.LD_E_n8, I.RRA,
  I.JR_NZ_i8, I.LD_HL_u16 , I.LD_iHLp_A, I.INC_HL, I.INC_H,   I.DEC_H,   I.LD_H_n8,   I.DAA , I.JR_Z_i8,    I.ADD_HL_HL, I.LD_A_iHLp, I.DEC_HL, I.INC_L, I.DEC_L, I.LD_L_n8, I.CPL,
  I.JR_NC_i8, I.LD_SP_u16 , I.LD_iHLn_A, I.INC_SP, I.INC_iHL, I.DEC_iHL, I.LD_iHL_u8, I.SCF,  I.JR_C_i8,    I.ADD_HL_SP, I.LD_A_iHLn, I.DEC_SP, I.INC_A, I.DEC_A, I.LD_A_n8, I.CCF,


  I.LD_B_B,   I.LD_B_C,   I.LD_B_D,   I.LD_B_E,   I.LD_B_H,   I.LD_B_L,   I.LD_B_iHL, 
  I.LD_D_B,   I.LD_D_C,   I.LD_D_D,   I.LD_D_E,   I.LD_D_H,   I.LD_D_L,   I.LD_D_iHL, 
  I.LD_H_B,   I.LD_H_C,   I.LD_H_D,   I.LD_H_E,   I.LD_H_H,   I.LD_H_L,   I.LD_H_iHL, 
  I.LD_iHL_B, I.LD_iHL_C, I.LD_iHL_D, I.LD_iHL_E, I.LD_iHL_H, I.LD_iHL_L, I.HALT,
];

// CB-prefixed instructions live in their own 256-entry table.
// When the dispatcher sees opcode 0xCB, it reads the next byte and looks
// it up here instead.  Nothing is implemented yet — fill it in as you go.
export const cbInstructionTable = Array.from({ length: 256 }, (_, i) => todo(0xCB00 | i));
