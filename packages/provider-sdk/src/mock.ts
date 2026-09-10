import { MockFlightProvider } from "./flights/mock-flight-provider";
import { MockHotelProvider } from "./hotels/mock-hotel-provider";

/** Combined mock travel provider stub. */
export class MockTravelProvider {
  readonly providerKey = "mock";
  readonly displayName = "Mock";
  readonly liveMode = false;
  private flights = new MockFlightProvider();
  private hotels = new MockHotelProvider();

  searchFlights(...args: Parameters<MockFlightProvider["searchFlights"]>) {
    return this.flights.searchFlights(...args);
  }

  searchHotels(...args: Parameters<MockHotelProvider["searchHotels"]>) {
    return this.hotels.searchHotels(...args);
  }
}
