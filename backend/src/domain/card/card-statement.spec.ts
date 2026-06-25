import { estimateStatement } from './card-statement';

describe('estimateStatement', () => {
  const BASE_INPUT = {
    chargesInCycle: 200_000,
    installmentDueInCycle: 100_000,
    revolvingBase: 0,
    monthlyRate: 0.02,
    managementFeeThisCycle: 0,
    minPaymentPct: 0.05,
  };

  it('calcula el extracto estimado cuando el saldo giratorio previo es cero', () => {
    const result = estimateStatement(BASE_INPUT);
    // interesCiclo = 0 * 0.02 = 0
    // estimatedBalance = 200_000 + 100_000 + 0 + 0 = 300_000
    // estimatedMinPayment = 0.05 * 300_000 + 0 + 0 = 15_000
    expect(result.estimatedBalance).toBe(300_000);
    expect(result.estimatedMinPayment).toBe(15_000);
  });

  it('suma los intereses cuando hay saldo giratorio previo', () => {
    const result = estimateStatement({
      ...BASE_INPUT,
      revolvingBase: 500_000,
    });
    // interesCiclo = 500_000 * 0.02 = 10_000
    // estimatedBalance = 200_000 + 100_000 + 10_000 + 0 = 310_000
    // estimatedMinPayment = 0.05 * 310_000 + 0 + 10_000 = 15_500 + 10_000 = 25_500
    expect(result.estimatedBalance).toBe(310_000);
    expect(result.estimatedMinPayment).toBe(25_500);
  });

  it('incluye la cuota de manejo en el saldo estimado y pago minimo', () => {
    const result = estimateStatement({
      ...BASE_INPUT,
      managementFeeThisCycle: 12_000,
    });
    // interesCiclo = 0 * 0.02 = 0
    // estimatedBalance = 200_000 + 100_000 + 0 + 12_000 = 312_000
    // estimatedMinPayment = 0.05 * 312_000 + 12_000 + 0 = 15_600 + 12_000 = 27_600
    expect(result.estimatedBalance).toBe(312_000);
    expect(result.estimatedMinPayment).toBe(27_600);
  });

  it('acota el pago minimo para que no exceda el saldo estimado', () => {
    const result = estimateStatement({
      ...BASE_INPUT,
      minPaymentPct: 0.5, // 50% del saldo
    });
    // interesCiclo = 0 * 0.02 = 0
    // estimatedBalance = 200_000 + 100_000 + 0 + 0 = 300_000
    // pagoMinimo bruto = 0.5 * 300_000 + 0 + 0 = 150_000
    // acotado = Math.min(150_000, 300_000) = 150_000
    expect(result.estimatedMinPayment).toBe(150_000);
  });

  it('acierta con redondeo de centavos en un caso complejo', () => {
    const result = estimateStatement({
      chargesInCycle: 333_333.33,
      installmentDueInCycle: 111_111.11,
      revolvingBase: 500_000,
      monthlyRate: 0.0213,
      managementFeeThisCycle: 5_500,
      minPaymentPct: 0.0325,
    });
    // interesCiclo = roundMoney(500_000 * 0.0213) = roundMoney(10_650) = 10_650
    // estimatedBalance = roundMoney(333_333.33 + 111_111.11 + 10_650 + 5_500) = roundMoney(460_594.44) = 460_594.44
    // pago minimo bruto = roundMoney(0.0325 * 460_594.44 + 5_500 + 10_650)
    //                  = roundMoney(14_969.32 + 5_500 + 10_650) = roundMoney(31_119.32) = 31_119.32
    // acotado = Math.min(31_119.32, 460_594.44) = 31_119.32
    expect(result.estimatedBalance).toBe(460_594.44);
    expect(result.estimatedMinPayment).toBe(31_119.32);
  });

  it('redondea correctamente con tasas decimales', () => {
    const result = estimateStatement({
      chargesInCycle: 250_000,
      installmentDueInCycle: 50_000,
      revolvingBase: 1_000_000,
      monthlyRate: 0.0167, // 1.67%
      managementFeeThisCycle: 3_000,
      minPaymentPct: 0.03,
    });
    // interesCiclo = roundMoney(1_000_000 * 0.0167) = roundMoney(16_700) = 16_700
    // estimatedBalance = roundMoney(250_000 + 50_000 + 16_700 + 3_000) = roundMoney(319_700) = 319_700
    // pago minimo bruto = roundMoney(0.03 * 319_700 + 3_000 + 16_700)
    //                  = roundMoney(9_591 + 3_000 + 16_700) = roundMoney(29_291) = 29_291
    // acotado = Math.min(29_291, 319_700) = 29_291
    expect(result.estimatedBalance).toBe(319_700);
    expect(result.estimatedMinPayment).toBe(29_291);
  });
});
