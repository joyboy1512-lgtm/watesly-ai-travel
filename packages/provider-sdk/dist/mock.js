"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockTravelProvider = void 0;
const mock_flight_provider_1 = require("./flights/mock-flight-provider");
const mock_hotel_provider_1 = require("./hotels/mock-hotel-provider");
/** Combined mock travel provider stub. */
class MockTravelProvider {
    providerKey = "mock";
    displayName = "Mock";
    liveMode = false;
    flights = new mock_flight_provider_1.MockFlightProvider();
    hotels = new mock_hotel_provider_1.MockHotelProvider();
    searchFlights(...args) {
        return this.flights.searchFlights(...args);
    }
    searchHotels(...args) {
        return this.hotels.searchHotels(...args);
    }
}
exports.MockTravelProvider = MockTravelProvider;
//# sourceMappingURL=mock.js.map