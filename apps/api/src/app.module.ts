import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { HealthController } from "./health.controller";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { OrganizationsModule } from "./organizations/organizations.module";
import { JwtAuthGuard } from "./auth/jwt.guard";
import { PermissionsGuard } from "./auth/permissions.guard";
import { WhatsappModule } from "./whatsapp/whatsapp.module";
import { ContactsModule } from "./contacts/contacts.module";
import { ConversationsModule } from "./conversations/conversations.module";
import { InquiriesModule } from "./inquiries/inquiries.module";
import { ProvidersModule } from "./providers/providers.module";
import { PricingModule } from "./pricing/pricing.module";
import { QuotesModule } from "./quotes/quotes.module";
import { BookingsModule } from "./bookings/bookings.module";
import { CampaignsModule } from "./campaigns/campaigns.module";
import { ReportsModule } from "./reports/reports.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { PipelineModule } from "./pipeline/pipeline.module";
import { AuditModule } from "./audit/audit.module";
import { AuditService } from "./common/audit.service";
import { TravelMetaModule } from "./travel-meta/travel-meta.module";
import { AiModule } from "./ai/ai.module";
import { AssistantModule } from "./assistant/assistant.module";
import { ShopModule } from "./shop/shop.module";

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    AiModule,
    AssistantModule,
    ShopModule,
    PipelineModule,
    WhatsappModule,
    ContactsModule,
    ConversationsModule,
    InquiriesModule,
    ProvidersModule,
    PricingModule,
    QuotesModule,
    BookingsModule,
    CampaignsModule,
    ReportsModule,
    NotificationsModule,
    AuditModule,
    TravelMetaModule,
  ],
  controllers: [HealthController],
  providers: [
    AuditService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
