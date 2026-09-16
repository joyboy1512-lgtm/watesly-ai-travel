import { Body, Controller, Get, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { LoginDto, RegisterOrganizationDto } from "./auth.dto";
import { CurrentUser, Public } from "./decorators";
import type { AuthUser } from "./auth.types";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("login")
  login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @Public()
  @Post("register")
  register(@Body() body: RegisterOrganizationDto) {
    return this.authService.register(body);
  }

  @Get("me")
  me(@CurrentUser() user: AuthUser) {
    return this.authService.me(user.userId, user.organizationId);
  }
}
