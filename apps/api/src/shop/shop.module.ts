import { Module } from "@nestjs/common";
import { BookingsModule } from "../bookings/bookings.module";
import { PipelineModule } from "../pipeline/pipeline.module";
import { AssistantModule } from "../assistant/assistant.module";
import { ShopController } from "./shop.controller";
import { ShopService } from "./shop.service";
import { PublicOrgService } from "./public-org";
import { CustomerAuthGuard } from "./shop-auth";
import { PlatformController } from "./platform.controller";
import { PlatformService } from "./platform.service";

@Module({
  imports: [BookingsModule, PipelineModule, AssistantModule],
  controllers: [ShopController, PlatformController],
  providers: [
    ShopService,
    PublicOrgService,
    CustomerAuthGuard,
    PlatformService,
  ],
  exports: [PlatformService],
})
export class ShopModule {}
