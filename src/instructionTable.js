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

export const instructionTable = [ 
  I.NOP ,     I.LD_BC_u16 , I.LD_iBC_A,  I.INC_BC, I.INC_B,   I.DEC_B,   I.LD_B_n8,   I.RLCA, I.LD_iu16_SP, I.ADD_HL_BC, I.LD_A_iBC,  I.DEC_BC, I.INC_C, I.DEC_C, I.LD_C_n8, I.RRCA,
  I.STOP,     I.LD_DE_u16 , I.LD_iDE_A,  I.INC_DE, I.INC_D,   I.DEC_D,   I.LD_D_n8,   I.RLA , I.JR_i8,      I.ADD_HL_DE, I.LD_A_iDE,  I.DEC_DE, I.INC_E, I.DEC_E, I.LD_E_n8, I.RRA,
  I.JR_NZ_i8, I.LD_HL_u16 , I.LD_iHLp_A, I.INC_HL, I.INC_H,   I.DEC_H,   I.LD_H_n8,   I.DAA , I.JR_Z_i8,    I.ADD_HL_HL, I.LD_A_iHLp, I.DEC_HL, I.INC_L, I.DEC_L, I.LD_L_n8, I.CPL,
  I.JR_NC_i8, I.LD_SP_u16 , I.LD_iHLn_A, I.INC_SP, I.INC_iHL, I.DEC_iHL, I.LD_iHL_u8, I.SCF,  I.JR_C_i8,    I.ADD_HL_SP, I.LD_A_iHLn, I.DEC_SP, I.INC_A, I.DEC_A, I.LD_A_n8, I.CCF,


  I.LD_B_B,   I.LD_B_C,   I.LD_B_D,   I.LD_B_E,   I.LD_B_H,   I.LD_B_L,   I.LD_B_iHL, I.LD_B_A,   I.LD_C_B, I.LD_C_C, I.LD_C_D, I.LD_C_E, I.LD_C_H, I.LD_C_L, I.LD_C_iHL, I.LD_C_A,
  I.LD_D_B,   I.LD_D_C,   I.LD_D_D,   I.LD_D_E,   I.LD_D_H,   I.LD_D_L,   I.LD_D_iHL, I.LD_D_A,   I.LD_E_B, I.LD_E_C, I.LD_E_D, I.LD_E_E, I.LD_E_H, I.LD_E_L, I.LD_E_iHL, I.LD_E_A,
  I.LD_H_B,   I.LD_H_C,   I.LD_H_D,   I.LD_H_E,   I.LD_H_H,   I.LD_H_L,   I.LD_H_iHL, I.LD_H_A,   I.LD_L_B, I.LD_L_C, I.LD_L_D, I.LD_L_E, I.LD_L_H, I.LD_L_L, I.LD_L_iHL, I.LD_L_A,
  I.LD_iHL_B, I.LD_iHL_C, I.LD_iHL_D, I.LD_iHL_E, I.LD_iHL_H, I.LD_iHL_L, I.HALT,     I.LD_iHL_A, I.LD_A_B, I.LD_A_C, I.LD_A_D, I.LD_A_E, I.LD_A_H, I.LD_A_L, I.LD_A_iHL, I.LD_A_A,

  I.ADD_A_B, I.ADD_A_C, I.ADD_A_D, I.ADD_A_E, I.ADD_A_H, I.ADD_A_L, I.ADD_A_iHL, I.ADD_A_A, I.ADC_A_B, I.ADC_A_C, I.ADC_A_D, I.ADC_A_E, I.ADC_A_H, I.ADC_A_L, I.ADC_A_iHL, I.ADC_A_A,
  I.SUB_A_B, I.SUB_A_C, I.SUB_A_D, I.SUB_A_E, I.SUB_A_H, I.SUB_A_L, I.SUB_A_iHL, I.SUB_A_A, I.SBC_A_B, I.SBC_A_C, I.SBC_A_D, I.SBC_A_E, I.SBC_A_H, I.SBC_A_L, I.SBC_A_iHL, I.SBC_A_A,
  I.AND_A_B, I.AND_A_C, I.AND_A_D, I.AND_A_E, I.AND_A_H, I.AND_A_L, I.AND_A_iHL, I.AND_A_A, I.XOR_A_B, I.XOR_A_C, I.XOR_A_D, I.XOR_A_E, I.XOR_A_H, I.XOR_A_L, I.XOR_A_iHL, I.XOR_A_A,
  I.OR_A_B,  I.OR_A_C,  I.OR_A_D,  I.OR_A_E,  I.OR_A_H,  I.OR_A_L,  I.OR_A_iHL,  I.OR_A_A,  I.CP_A_B,  I.CP_A_C,  I.CP_A_D,  I.CP_A_E,  I.CP_A_H,  I.CP_A_L,  I.CP_A_iHL,  I.CP_A_A,

  I.RET_NZ,           I.POP_BC, I.JP_NZ_n16,      I.JP_n16,       I.CALL_NZ_n16, I.PUSH_BC, I.ADD_A_n8, I.RST_00H, I.RET_Z,       I.RET,        I.JP_Z_n16,  illegal(0xcb), I.CALL_Z_n16,  I.CALL_n16,    I.ADC_A_n8, I.RST_08H,
  I.RET_NC,           I.POP_DE, I.JP_NC_n16,      illegal(0xd3),  I.CALL_NC_n16, I.PUSH_DE, I.SUB_A_n8, I.RST_10H, I.RET_C,       I.RETI,       I.JP_C_n16,  illegal(0xdb), I.CALL_C_n16,  illegal(0xdd), I.SBC_A_n8, I.RST_18H,
  I.LD_iFF00_p_n8_A,  I.POP_HL, I.LD_iFF00_p_C_A, illegal(0xe3),  illegal(0xe4), I.PUSH_HL, I.AND_A_n8, I.RST_20H, I.ADD_SP_i8,   I.JP_HL,      I.LD_in16_A, illegal(0xeb), illegal(0xec), illegal(0xed), I.XOR_A_n8, I.RST_28H,
  I.LD_A_iFF00_p_n8,  I.POP_AF, I.LD_A_iFF00_p_C, I.DI,           illegal(0xf4), I.PUSH_AF, I.OR_A_n8,  I.RST_30H, I.LD_HL_SP_i8, I.LD_SP_HL,   I.LD_A_in16, I.EI,          illegal(0xfc), illegal(0xfd), I.CP_A_n8,  I.RST_38H
];

// CB-prefixed instructions live in their own 256-entry table.
// When the dispatcher sees opcode 0xCB, it reads the next byte and looks
// it up here instead.  Nothing is implemented yet — fill it in as you go.
export const cbInstructionTable = Array.from({ length: 256 }, (_, i) => todo(0xCB00 | i));
