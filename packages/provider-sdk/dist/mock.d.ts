import { MockFlightProvider } from "./flights/mock-flight-provider";
import { MockHotelProvider } from "./hotels/mock-hotel-provider";
/** Combined mock travel provider stub. */
export declare class MockTravelProvider {
    readonly providerKey = "mock";
    readonly displayName = "Mock";
    readonly liveMode = false;
    private flights;
    private hotels;
    searchFlights(...args: Parameters<MockFlightProvider["searchFlights"]>): Promise<import("@watesly-travel/shared").FlightOffer[]>;
    searchHotels(...args: Parameters<MockHotelProvider["searchHotels"]>): Promise<import("@watesly-travel/shared").HotelOffer[]>;
}
//# sourceMappingURL=mock.d.ts.map