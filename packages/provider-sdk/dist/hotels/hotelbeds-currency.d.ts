/** Hotelbeds contract/sandbox prices are typically EUR; display uses org currency. */
export declare function hotelbedsDisplayCurrency(requested?: string | null): string;
export declare function hotelbedsSourceMarket(currency?: string | null): string;
export declare function convertHotelbedsAmount(amount: number, fromCurrency: string, toCurrency: string): number;
export declare function canConvertHotelbedsCurrency(from: string, to: string): boolean;
//# sourceMappingURL=hotelbeds-currency.d.ts.map