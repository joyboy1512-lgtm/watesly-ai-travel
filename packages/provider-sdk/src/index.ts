export * from "./types";
export * from "./locations";
export * from "./scenario";
export * from "./mock-catalog";
export * from "./catalog";
export * from "./composite";
export {
  resolveFlightProviderKey,
  resolveHotelProviderKey,
  resolveTransferProviderKey,
  resolveProviderKey,
  getFlightProvider,
  getHotelProvider,
  getTransferProvider,
  getTravelProvider,
} from "./resolve";

export { MockTravelProvider } from "./mock";
export { MockFlightProvider } from "./flights/mock-flight-provider";
export { MockHotelProvider } from "./hotels/mock-hotel-provider";
export { DuffelFlightProvider } from "./flights/duffel-flight-provider";
export { DuffelHotelProvider } from "./hotels/duffel-hotel-provider";
export { HotelbedsHotelProvider } from "./hotels/hotelbeds-hotel-provider";
export { HotelbedsTransferProvider } from "./transfers/hotelbeds-transfer-provider";
export { MockTransferProvider } from "./transfers/mock-transfer-provider";
export {
  hotelbedsHeaders,
  hotelbedsSignature,
  resolveHotelbedsCredentials,
  resolveHotelbedsTransferCredentials,
} from "./hotels/hotelbeds-auth";
export type { HotelbedsCredentials } from "./hotels/hotelbeds-auth";
export { AmadeusFlightProvider } from "./flights/amadeus-flight-provider";
export { TravelportFlightProvider } from "./flights/travelport-flight-provider";
export { TravelfusionFlightProvider } from "./flights/travelfusion-flight-provider";
export { DuffelTravelProvider } from "./duffel";
