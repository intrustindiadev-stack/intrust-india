export const WALLET_TOPUP_FALLBACK_MOBILE = '9999999999';
export const TOPUP_UDF1_VALUES = ['WALLET_TOPUP', 'MERCHANT_TOPUP'];

export function isTopupUdf1(udf1) {
    return TOPUP_UDF1_VALUES.includes(udf1);
}
