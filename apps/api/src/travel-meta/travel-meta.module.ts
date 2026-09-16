import { Module } from "@nestjs/common";
import { TravelMetaController } from "./travel-meta.controller";

@Module({
  controllers: [TravelMetaController],
})
export class TravelMetaModule {}
