#include <stdio.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>
#include "lfsr.h"

void lfsr_calculate(uint16_t *reg) {
    /* YOUR CODE HERE */
     // 提取第 0、2、3、5 位的值
    uint16_t bit0 = (*reg >> 0) & 1;
    uint16_t bit2 = (*reg >> 2) & 1;
    uint16_t bit3 = (*reg >> 3) & 1;
    uint16_t bit5 = (*reg >> 5) & 1;

    // 计算反馈位（异或结果）
    uint16_t feedback = bit0 ^ bit2 ^ bit3 ^ bit5;

    // 右移寄存器，并将反馈位插入最高位（第15位）
    *reg = (*reg >> 1) | (feedback << 15);
}