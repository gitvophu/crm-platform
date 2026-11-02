import {
  type AuthUser,
  changePasswordInput,
  type ChangePasswordInput,
  loginInput,
  type LoginInput,
} from '@crm/shared';
import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';

import type { Env } from '@/config/env.js';
import { ZodValidationPipe } from '@/validation/zod-validation.pipe.js';
import { clearAuthCookies, readCookie, REFRESH_COOKIE, setAuthCookies } from './auth.cookies.js';
import { CurrentUser, Public } from './auth.decorators.js';
import { AuthService, StaleRefreshError } from './auth.service.js';
import type { SessionUser } from './auth.types.js';

@Controller('auth')
export class AuthController {
  private readonly secureCookies: boolean;

  constructor(
    private readonly auth: AuthService,
    config: ConfigService<Env, true>,
  ) {
    this.secureCookies = config.get('COOKIE_SECURE', { infer: true });
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(
    @Body(new ZodValidationPipe(loginInput)) body: LoginInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthUser> {
    const { user, tokens } = await this.auth.login(body);
    setAuthCookies(res, tokens, this.secureCookies);
    return user;
  }

  @Public()
  @Post('refresh')
  @HttpCode(204)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    try {
      setAuthCookies(
        res,
        await this.auth.refresh(readCookie(req, REFRESH_COOKIE)),
        this.secureCookies,
      );
    } catch (error) {
      // Lost a race: leave the cookies the winning refresh sets (or has set) alone.
      if (!(error instanceof StaleRefreshError)) clearAuthCookies(res, this.secureCookies);
      throw error;
    }
  }

  /** Public: signing out must work with an expired access token. */
  @Public()
  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.auth.logout(readCookie(req, REFRESH_COOKIE));
    clearAuthCookies(res, this.secureCookies);
  }

  @Get('me')
  me(@CurrentUser() user: SessionUser): Promise<AuthUser> {
    return this.auth.me(user.id);
  }

  @Post('change-password')
  @HttpCode(204)
  changePassword(
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(changePasswordInput)) body: ChangePasswordInput,
  ): Promise<void> {
    return this.auth.changePassword(user, body);
  }
}
