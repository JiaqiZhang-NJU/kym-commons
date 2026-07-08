.globl factorial

.data
n: .word 8

.text
main:
    la t0, n
    lw a0, 0(t0)
    jal ra, factorial

    addi a1, a0, 0
    addi a7, x0, 1
    ecall # Print Result

    addi a7, x0, 10
    ecall # Exit

factorial:
    # 处理 n=0 的情况
    li t0, 1           # 默认结果为 1（处理 n=0 的情况）
    beq a0, x0, ret    # 如果 n=0，直接返回

    # 正常计算逻辑
    mv t0, a0          # 将 n 的值复制到 t0（循环计数器）
    li a0, 1           # 初始化结果为 1
fact_loop:
    mul a0, a0, t0     # 累乘：a0 = a0 * t0
    addi t0, t0, -1    # t0--（递减循环计数器）
    bgt t0, x0, fact_loop # 如果 t0 > 0，继续循环
ret:
    jr ra              # 返回



