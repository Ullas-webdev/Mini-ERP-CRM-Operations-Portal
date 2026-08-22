import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { env } from '../config/env';
import { UnauthorizedError, ForbiddenError, AppError } from '../utils/errors';
import { RequestWithId } from '../middleware/loggerMiddleware';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().optional(),
});

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return next(new UnauthorizedError('Invalid email or password'));
    }

    // 1. Check account active status
    if (!user.isActive) {
      return next(new ForbiddenError('Account is disabled. Please contact your administrator.'));
    }

    // 2. Check account lockout status
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / (60 * 1000));
      return next(
        new AppError(
          423,
          'ACCOUNT_LOCKED',
          `Account is locked due to consecutive failed attempts. Try again in ${remainingMinutes} minute(s).`
        )
      );
    }

    // 3. Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      const failedAttempts = user.failedLoginAttempts + 1;
      const isLocked = failedAttempts >= 5;
      const lockedUntil = isLocked ? new Date(Date.now() + 15 * 60 * 1000) : null;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: failedAttempts,
          lockedUntil,
        },
      });

      // Audit Log failed login
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'LOGIN_FAILED',
          entityType: 'USER',
          entityId: user.id,
          beforeState: JSON.stringify({ failedLoginAttempts: user.failedLoginAttempts }),
          afterState: JSON.stringify({ failedLoginAttempts: failedAttempts, isLocked, lockedUntil }),
          ipAddress,
        },
      });

      if (isLocked) {
        return next(
          new AppError(
            423,
            'ACCOUNT_LOCKED',
            'Account locked for 15 minutes due to 5 consecutive failed login attempts.'
          )
        );
      }

      return next(
        new UnauthorizedError(
          `Invalid email or password. Attempt ${failedAttempts} of 5 before account lock.`
        )
      );
    }

    // 4. Reset lockout counters & update lastLoginAt on successful password
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    // 5. Issue Access Token (15m) & Refresh Token (7d)
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, jti: uuidv4() },
      env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, jti: uuidv4() },
      env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Save refresh token to database
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt,
      },
    });

    // Set Refresh Token httpOnly Cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Audit Log successful login
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN_SUCCESS',
        entityType: 'USER',
        entityId: user.id,
        afterState: JSON.stringify({ role: user.role, lastLoginAt: new Date() }),
        ipAddress,
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!refreshToken) {
      return next(new UnauthorizedError('Refresh token missing'));
    }

    // Verify Refresh Token in DB
    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!tokenRecord || tokenRecord.isRevoked || tokenRecord.expiresAt < new Date()) {
      res.clearCookie('refreshToken');
      return next(new UnauthorizedError('Invalid, expired, or revoked refresh token'));
    }

    if (!tokenRecord.user.isActive) {
      res.clearCookie('refreshToken');
      return next(new ForbiddenError('Account is disabled'));
    }

    // Token Rotation: Revoke current refresh token
    await prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { isRevoked: true },
    });

    // Generate new Access Token & Refresh Token
    const newAccessToken = jwt.sign(
      {
        userId: tokenRecord.user.id,
        email: tokenRecord.user.email,
        role: tokenRecord.user.role,
        jti: uuidv4(),
      },
      env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const newRefreshToken = jwt.sign(
      {
        userId: tokenRecord.user.id,
        email: tokenRecord.user.email,
        role: tokenRecord.user.role,
        jti: uuidv4(),
      },
      env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: {
        userId: tokenRecord.user.id,
        token: newRefreshToken,
        expiresAt: newExpiresAt,
      },
    });

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      data: {
        accessToken: newAccessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (
  req: RequestWithId,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';

    if (refreshToken) {
      await prisma.refreshToken.updateMany({
        where: { token: refreshToken },
        data: { isRevoked: true },
      });
    }

    res.clearCookie('refreshToken');

    if (req.user) {
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'LOGOUT',
          entityType: 'USER',
          entityId: req.user.id,
          ipAddress,
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        message: 'Successfully logged out',
      },
    });
  } catch (error) {
    next(error);
  }
};
