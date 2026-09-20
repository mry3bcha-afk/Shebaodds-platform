// ============================================
// SHEBAODDS - AUTH ROUTES
// Mongoose 8 + TypeScript
// ============================================

import express, {
  NextFunction,
  Request,
  Response,
  Router,
} from 'express';

import jwt, {
  JwtPayload,
  SignOptions,
} from 'jsonwebtoken';

import crypto from 'crypto';

import User, {
  UserDocument,
} from './User';

import {
  PasswordHistory,
  validatePasswordStrength,
} from './passwordValidator';

// speakeasy has incomplete typings.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const speakeasy = require('speakeasy');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const QRCode = require('qrcode');

// ============================================================
// ROUTER
// ============================================================

const router: Router = express.Router();

// ============================================================
// CONFIGURATION
// ============================================================

const ACCESS_TOKEN_EXPIRES_IN =
  (process.env.JWT_ACCESS_EXPIRES_IN || '24h') as SignOptions['expiresIn'];

const REFRESH_TOKEN_EXPIRES_IN =
  (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as SignOptions['expiresIn'];

const SESSION_TTL_MS =
  7 * 24 * 60 * 60 * 1000;

const MAX_LOGIN_ATTEMPTS = 5;

const LOGIN_LOCK_MS =
  30 * 60 * 1000;

// ============================================================
// TYPES
// ============================================================

export interface AuthRequest extends Request {
  user?: UserDocument;

  auth?: {
    userId: string;
    sessionId?: string;
    role?: 'Player' | 'SuperAdmin';
  };
}

interface TokenPayload extends JwtPayload {
  userId: string;
  email?: string;
  role?: 'Player' | 'SuperAdmin';
  sessionId?: string;
  type?: 'refresh';
}

// ============================================================
// JWT SECRETS
// ============================================================

function requiredSecret(
  name: 'JWT_SECRET' | 'JWT_REFRESH_SECRET'
): string {
  const value = process.env[name];

  if (!value || value.length < 32) {
    throw new Error(
      `${name} must be configured and contain at least 32 characters`
    );
  }

  return value;
}

function getAccessSecret(): string {
  return requiredSecret('JWT_SECRET');
}

function getRefreshSecret(): string {
  return requiredSecret('JWT_REFRESH_SECRET');
}

// ============================================================
// HELPERS
// ============================================================

function hashToken(token: string): string {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
}

function normalizeEmail(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

function normalizeUsername(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhone(value: string): boolean {
  return /^\+?[0-9]{10,15}$/.test(value);
}

function validationError(
  message: string,
  path?: string
) {
  return {
    msg: message,
    path,
    value: undefined,
  };
}

// ============================================================
// REGISTRATION VALIDATION
// ============================================================

function validateRegistration(
  body: Record<string, unknown>
) {
  const errors: Array<Record<string, unknown>> = [];

  const username =
    normalizeUsername(body.username);

  const email =
    normalizeEmail(body.email);

  const password =
    String(body.password ?? '');

  const phone =
    String(body.phone ?? '').trim();

  if (
    !/^[a-zA-Z0-9_]{3,20}$/.test(username)
  ) {
    errors.push(
      validationError(
        'Username must be 3-20 characters and contain only letters, numbers and underscore',
        'username'
      )
    );
  }

  if (!isValidEmail(email)) {
    errors.push(
      validationError(
        'Email must be a valid email',
        'email'
      )
    );
  }

  if (!isValidPhone(phone)) {
    errors.push(
      validationError(
        'Phone must be a valid phone number',
        'phone'
      )
    );
  }

  if (!password) {
    errors.push(
      validationError(
        'Password is required',
        'password'
      )
    );
  }

  if (
    body.fullName !== undefined &&
    body.fullName !== null &&
    String(body.fullName).length > 100
  ) {
    errors.push(
      validationError(
        'Full name cannot exceed 100 characters',
        'fullName'
      )
    );
  }

  if (
    body.dateOfBirth !== undefined &&
    body.dateOfBirth !== null &&
    Number.isNaN(
      Date.parse(String(body.dateOfBirth))
    )
  ) {
    errors.push(
      validationError(
        'Date of birth must be a valid date',
        'dateOfBirth'
      )
    );
  }

  if (
    body.referralCode !== undefined &&
    body.referralCode !== null &&
    typeof body.referralCode !== 'string'
  ) {
    errors.push(
      validationError(
        'Referral code must be a string',
        'referralCode'
      )
    );
  }

  return {
    errors,
    username,
    email,
    password,
    phone,
  };
}

// ============================================================
// LOGIN VALIDATION
// ============================================================

function validateLogin(
  body: Record<string, unknown>
) {
  const errors: Array<Record<string, unknown>> = [];

  const email =
    normalizeEmail(body.email);

  const password =
    String(body.password ?? '');

  if (!isValidEmail(email)) {
    errors.push(
      validationError(
        'Email must be a valid email',
        'email'
      )
    );
  }

  if (!password) {
    errors.push(
      validationError(
        'Password is required',
        'password'
      )
    );
  }

  return {
    errors,
    email,
    password,
  };
}

// ============================================================
// TOKEN GENERATION
// ============================================================

export function generateToken(
  user: UserDocument,
  sessionId?: string
): string {
  const payload: Record<string, unknown> = {
    userId: user._id.toString(),

    email: user.email,

    role: user.isAdmin
      ? 'SuperAdmin'
      : 'Player',
  };

  if (sessionId) {
    payload.sessionId = sessionId;
  }

  return jwt.sign(
    payload,
    getAccessSecret(),
    {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    }
  );
}

export function generateRefreshToken(
  user: UserDocument,
  sessionId: string
): string {
  return jwt.sign(
    {
      userId: user._id.toString(),

      sessionId,

      type: 'refresh',
    },
    getRefreshSecret(),
    {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    }
  );
}

// ============================================================
// BEARER TOKEN
// ============================================================

function getBearerToken(
  req: Request
): string | null {
  const header =
    req.get('authorization');

  if (!header) {
    return null;
  }

  const parts =
    header.split(' ');

  if (
    parts.length !== 2 ||
    parts[0].toLowerCase() !== 'bearer'
  ) {
    return null;
  }

  return parts[1].trim();
}

// ============================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token =
      getBearerToken(req);

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Access Token Missing',
        message:
          'Authentication bearer token is required.',
      });

      return;
    }

    const decoded =
      jwt.verify(
        token,
        getAccessSecret()
      ) as TokenPayload;

    if (!decoded.userId) {
      res.status(401).json({
        success: false,
        message:
          'Invalid access token',
      });

      return;
    }

    const user =
      await User.findById(
        decoded.userId
      );

    if (
      !user ||
      !user.isActive ||
      user.isBlocked
    ) {
      res.status(401).json({
        success: false,
        message:
          'User is not authorized',
      });

      return;
    }

    const now =
      new Date();

    if (
      user.isSuspended &&
      (
        !user.suspensionEndDate ||
        user.suspensionEndDate > now
      )
    ) {
      res.status(403).json({
        success: false,
        message:
          'Account is suspended',
      });

      return;
    }

    if (decoded.sessionId) {
      const session =
        user.sessions.find(
          (item) =>
            item.sessionId ===
              decoded.sessionId &&
            (
              !item.expiresAt ||
              item.expiresAt > now
            )
        );

      if (!session) {
        res.status(401).json({
          success: false,
          message:
            'Session has expired or been revoked',
        });

        return;
      }

      session.lastActivity = now;

      user.lastActive = now;

      await user.save();
    }

    req.user = user;

    req.auth = {
      userId:
        user._id.toString(),

      sessionId:
        decoded.sessionId,

      role:
        decoded.role,
    };

    next();
  } catch (error) {
    if (
      error instanceof
      jwt.TokenExpiredError
    ) {
      res.status(401).json({
        success: false,
        message:
          'Access token expired',
      });

      return;
    }

    console.error(
      'Authentication error:',
      error
    );

    res.status(401).json({
      success: false,
      message:
        'Invalid access token',
    });
  }
}

// ============================================================
// COMPATIBILITY HELPERS
// ============================================================

export async function sendEmail({
  to,
  subject,
  template,
  data,
  attachments,
}: {
  to: string;
  subject: string;
  template: string;
  data: unknown;
  attachments?: unknown[];
}) {
  console.log(
    '[NotificationService] Email',
    {
      to,
      subject,
      template,
    }
  );

  return {
    success: true,
    to,
    subject,
    template,
    data,
    attachmentsCount:
      attachments?.length ?? 0,
  };
}

export async function sendSMS({
  to,
  message,
}: {
  to: string;
  message: string;
}) {
  console.log(
    '[NotificationService] SMS',
    {
      to,
      message,
    }
  );

  return {
    success: true,
  };
}

export async function logSecurityEvent({
  userId,
  eventType,
  ipAddress,
  userAgent,
  metadata,
}: {
  userId?: unknown;
  eventType: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: unknown;
}) {
  console.log(
    '[SecurityService]',
    {
      userId,
      eventType,
      ipAddress,
      userAgent,
      metadata,
    }
  );

  return {
    success: true,
  };
}

export function rateLimiter(
  _req: Request,
  _res: Response,
  next: NextFunction
) {
  next();
}

// ============================================================
// PUBLIC USER
// ============================================================

function publicUser(
  user: UserDocument
) {
  return user.toJSON();
}

// ============================================================
// AGE
// ============================================================

function calculateAge(
  dateOfBirth: Date
): number {
  const today =
    new Date();

  let age =
    today.getFullYear() -
    dateOfBirth.getFullYear();

  const month =
    today.getMonth() -
    dateOfBirth.getMonth();

  if (
    month < 0 ||
    (
      month === 0 &&
      today.getDate() <
        dateOfBirth.getDate()
    )
  ) {
    age--;
  }

  return age;
}

// ============================================================
// SESSION
// ============================================================

function createSession(
  user: UserDocument,
  req: Request,
  deviceId?: string,
  deviceName?: string
): string {
  const now =
    new Date();

  const sessionId =
    crypto
      .randomBytes(32)
      .toString('hex');

  // ----------------------------------------------------------
  // DEVICE
  // ----------------------------------------------------------

  if (deviceId) {
    const existing =
      user.devices.find(
        (device) =>
          device.deviceId ===
          deviceId
      );

    if (existing) {
      existing.lastUsed =
        now;

      if (deviceName) {
        existing.deviceName =
          deviceName;
      }

      existing.ipAddress =
        req.ip;

      existing.isActive =
        true;
    } else {
      const ua =
        req.get('user-agent') || '';

      let platform:
        | 'web'
        | 'ios'
        | 'android'
        | 'admin' = 'web';

      if (
        /android/i.test(ua)
      ) {
        platform =
          'android';
      } else if (
        /iphone|ipad|ipod/i.test(ua)
      ) {
        platform =
          'ios';
      } else if (
        user.isAdmin
      ) {
        platform =
          'admin';
      }

      user.devices.push({
        deviceId,

        deviceName:
          deviceName ||
          'Unknown Device',

        platform,

        ipAddress:
          req.ip,

        lastUsed: now,

        biometricEnabled:
          false,

        isActive: true,
      });
    }
  }

  // ----------------------------------------------------------
  // CLEAN OLD SESSIONS
  // ----------------------------------------------------------

  user.sessions =
    user.sessions.filter(
      (session) =>
        !session.expiresAt ||
        session.expiresAt > now
    );

  // ----------------------------------------------------------
  // CREATE SESSION
  // ----------------------------------------------------------

  user.sessions.push({
    sessionId,

    ipAddress:
      req.ip,

    userAgent:
      req.get('user-agent') ||
      undefined,

    deviceId,

    loginAt: now,

    lastActivity: now,

    expiresAt:
      new Date(
        now.getTime() +
          SESSION_TTL_MS
      ),
  });

  // ----------------------------------------------------------
  // LIMIT SESSIONS
  // ----------------------------------------------------------

  if (
    user.sessions.length > 10
  ) {
    user.sessions.sort(
      (a, b) =>
        b.lastActivity.getTime() -
        a.lastActivity.getTime()
    );

    user.sessions =
      user.sessions.slice(
        0,
        10
      );
  }

  return sessionId;
}

// ============================================================
// ISSUE TOKENS
// ============================================================

function issueTokens(
  user: UserDocument,
  sessionId: string
) {
  return {
    token:
      generateToken(
        user,
        sessionId
      ),

    refreshToken:
      generateRefreshToken(
        user,
        sessionId
      ),
  };
}

// ============================================================
// REGISTER
// ============================================================

router.post(
  '/register',
  async (
    req: Request,
    res: Response
  ) => {
    try {
      console.log(
        '=========================================='
      );

      console.log(
        '🟢 REGISTRATION REQUEST RECEIVED'
      );

      console.log(
        'Request body:',
        {
          ...req.body,
          password:
            req.body?.password
              ? '[HIDDEN]'
              : undefined,
        }
      );

      console.log(
        '=========================================='
      );

      const body =
        (
          req.body ||
          {}
        ) as Record<
          string,
          unknown
        >;

      // ------------------------------------------------------
      // VALIDATE INPUT
      // ------------------------------------------------------

      const {
        errors,
        username,
        email,
        password,
        phone,
      } =
        validateRegistration(
          body
        );

      console.log(
        'Registration validation:',
        {
          username,
          email,
          phone,
          errors,
        }
      );

      if (
        errors.length > 0
      ) {
        res.status(400).json({
          success: false,
          errors,
        });

        return;
      }

      const fullName =
        body.fullName;

      const dateOfBirth =
        body.dateOfBirth;

      const referralCode =
        body.referralCode;

      // ------------------------------------------------------
      // PASSWORD
      // ------------------------------------------------------

      console.log(
        '🔐 Checking password strength...'
      );

      const passwordValidation =
        validatePasswordStrength(
          password,
          {
            username,
            email,
            fullName:
              fullName
                ? String(
                    fullName
                  )
                : undefined,
            phone,
          }
        );

      console.log(
        'Password validation:',
        {
          isValid:
            passwordValidation.isValid,
          strength:
            passwordValidation.strength,
          errors:
            passwordValidation.errors,
        }
      );

      if (
        !passwordValidation
          .isValid
      ) {
        res.status(400).json({
          success: false,
          message:
            'Password does not meet security requirements',
          errors:
            passwordValidation.errors,
          strength:
            passwordValidation.strength,
        });

        return;
      }

      // ------------------------------------------------------
      // EXISTING USER
      // ------------------------------------------------------

      console.log(
        '🔎 Checking whether user already exists...'
      );

      const existingUser =
        await User.findOne({
          $or: [
            { email },
            { username },
            { phone },
          ],
        })
          .select(
            '_id email username phone'
          )
          .exec();

      console.log(
        'Existing user:',
        existingUser
          ? {
              id:
                existingUser._id,
              email:
                existingUser.email,
              username:
                existingUser.username,
              phone:
                existingUser.phone,
            }
          : 'NONE'
      );

      if (existingUser) {
        res.status(409).json({
          success: false,
          message:
            'An account already exists with this email, username, or phone number',
        });

        return;
      }

      // ------------------------------------------------------
      // DATE OF BIRTH
      // ------------------------------------------------------

      let parsedDateOfBirth:
        | Date
        | undefined;

      if (dateOfBirth) {
        parsedDateOfBirth =
          new Date(
            String(
              dateOfBirth
            )
          );

        console.log(
          'Date of birth:',
          parsedDateOfBirth
        );

        if (
          Number.isNaN(
            parsedDateOfBirth.getTime()
          )
        ) {
          res.status(400).json({
            success: false,
            message:
              'Invalid date of birth',
          });

          return;
        }

        const age =
          calculateAge(
            parsedDateOfBirth
          );

        console.log(
          'Calculated age:',
          age
        );

        if (age < 18) {
          res.status(400).json({
            success: false,
            message:
              'You must be at least 18 years old',
          });

          return;
        }
      }

      // ------------------------------------------------------
      // REFERRAL
      // ------------------------------------------------------

      let referredByUser:
        | UserDocument
        | null = null;

      if (
        referralCode
      ) {
        console.log(
          '🔗 Checking referral code...'
        );

        referredByUser =
          await User.findOne({
            referralCode:
              String(
                referralCode
              )
                .trim()
                .toUpperCase(),
          })
            .select(
              '_id email username'
            )
            .exec();

        console.log(
          'Referral user:',
          referredByUser
            ? referredByUser.username
            : 'NONE'
        );
      }

      // ------------------------------------------------------
      // WELCOME BONUS
      // ------------------------------------------------------

      const parsedWelcomeBonus =
        Number(
          process.env
            .WELCOME_BONUS_AMOUNT ??
            100
        );

      const welcomeBonus =
        Number.isFinite(
          parsedWelcomeBonus
        )
          ? Math.max(
              0,
              parsedWelcomeBonus
            )
          : 100;

      console.log(
        'Welcome bonus:',
        welcomeBonus
      );

      // ------------------------------------------------------
      // CREATE USER
      // ------------------------------------------------------

      console.log(
        '👤 Creating User document...'
      );

      const user =
        new User({
          username,

          email,

          password,

          phone,

          fullName:
            fullName
              ? String(
                  fullName
                ).trim()
              : undefined,

          dateOfBirth:
            parsedDateOfBirth,

          referredBy:
            referredByUser?._id,

          wallet: {
            balance:
              welcomeBonus,

            bonusBalance:
              welcomeBonus,

            totalBonusReceived:
              welcomeBonus,

            currency:
              'ETB',
          },
        });

      console.log(
        'User document created:',
        {
          username:
            user.username,
          email:
            user.email,
          phone:
            user.phone,
          id:
            user._id,
        }
      );

      // ------------------------------------------------------
      // SESSION
      // ------------------------------------------------------

      console.log(
        '🔑 Creating session...'
      );

      const sessionId =
        createSession(
          user,
          req
        );

      console.log(
        'Session created:',
        sessionId
          ? 'YES'
          : 'NO'
      );

      user.lastLogin =
        new Date();

      user.lastActive =
        new Date();

      user.lastLoginIP =
        req.ip;

      // ------------------------------------------------------
      // SAVE USER
      // ------------------------------------------------------

      console.log(
        '💾 Saving user to MongoDB...'
      );

      await user.save();

      console.log(
        '✅ USER SAVED SUCCESSFULLY'
      );

      // ------------------------------------------------------
      // REFERRAL BONUS
      // ------------------------------------------------------

      if (
        referredByUser
      ) {
        const parsedReferralBonus =
          Number(
            process.env
              .REFERRAL_BONUS_AMOUNT ??
              50
          );

        const referralBonus =
          Number.isFinite(
            parsedReferralBonus
          )
            ? Math.max(
                0,
                parsedReferralBonus
              )
            : 50;

        if (
          referralBonus > 0
        ) {
          console.log(
            '💰 Applying referral bonus...'
          );

          await User.updateOne(
            {
              _id:
                referredByUser._id,
            },
            {
              $inc: {
                'wallet.balance':
                  referralBonus,

                'wallet.bonusBalance':
                  referralBonus,

                'wallet.totalBonusReceived':
                  referralBonus,

                referralCount:
                  1,

                referralEarnings:
                  referralBonus,
              },
            }
          ).exec();

          console.log(
            '✅ Referral bonus applied'
          );
        }
      }

      // ------------------------------------------------------
      // TOKENS
      // ------------------------------------------------------

      console.log(
        '🎟️ Generating tokens...'
      );

      const tokens =
        issueTokens(
          user,
          sessionId
        );

      console.log(
        '✅ Tokens generated'
      );

      // ------------------------------------------------------
      // NOTIFICATIONS
      // ------------------------------------------------------

      console.log(
        '📨 Sending notifications...'
      );

      await Promise.allSettled([
        sendEmail({
          to: user.email,

          subject:
            'Welcome to SHEBAODDS!',

          template:
            'welcome',

          data: {
            username:
              user.username,

            bonusAmount:
              welcomeBonus,

            tagline:
              'Smart Bets. Real Wins.',
          },
        }),

        sendSMS({
          to: user.phone,

          message:
            `Welcome to SHEBAODDS! You've received ${welcomeBonus} ETB bonus.`,
        }),

        logSecurityEvent({
          userId:
            user._id,

          eventType:
            'user_registered',

          ipAddress:
            req.ip,

          userAgent:
            req.get(
              'user-agent'
            ),
        }),
      ]);

      console.log(
        '✅ Registration process completed'
      );

      // ------------------------------------------------------
      // RESPONSE
      // ------------------------------------------------------

      res.status(201).json({
        success: true,

        message:
          'Registration successful! Welcome to SHEBAODDS.',

        ...tokens,

        user:
          publicUser(user),
      });
    } catch (error: unknown) {
      // ======================================================
      // IMPORTANT DEBUG SECTION
      // ======================================================

      console.error(
        '=========================================='
      );

      console.error(
        '❌❌❌ REGISTRATION ERROR ❌❌❌'
      );

      console.error(
        '=========================================='
      );

      console.error(
        'FULL ERROR:',
        error
      );

      const err =
        error as {
          code?: number;
          name?: string;
          message?: string;
          stack?: string;
          keyValue?: unknown;
          errors?: unknown;
        };

      console.error(
        'Error name:',
        err.name
      );

      console.error(
        'Error message:',
        err.message
      );

      console.error(
        'Error code:',
        err.code
      );

      console.error(
        'Error keyValue:',
        err.keyValue
      );

      console.error(
        'Error validation errors:',
        err.errors
      );

      console.error(
        'Error stack:',
        err.stack
      );

      console.error(
        '=========================================='
      );

      // ------------------------------------------------------
      // DUPLICATE KEY
      // ------------------------------------------------------

      if (
        err.code === 11000
      ) {
        res.status(409).json({
          success: false,

          error:
            'Duplicate database value',

          message:
            'Email, username, phone, or referral code is already in use',

          keyValue:
            err.keyValue,
        });

        return;
      }

      // ------------------------------------------------------
      // MONGOOSE VALIDATION ERROR
      // ------------------------------------------------------

      if (
        err.name ===
        'ValidationError'
      ) {
        res.status(400).json({
          success: false,

          error:
            'Mongoose validation error',

          message:
            err.message,

          details:
            err.errors,
        });

        return;
      }

      // ------------------------------------------------------
      // CAST ERROR
      // ------------------------------------------------------

      if (
        err.name ===
        'CastError'
      ) {
        res.status(400).json({
          success: false,

          error:
            'Database CastError',

          message:
            err.message,
        });

        return;
      }

      // ------------------------------------------------------
      // DEVELOPMENT DEBUG RESPONSE
      // ------------------------------------------------------

      res.status(500).json({
        success: false,

        error:
          'Registration failed',

        message:
          err.message ||
          'Unknown registration error',

        debug: {
          name:
            err.name,

          code:
            err.code,

          keyValue:
            err.keyValue,
        },
      });
    }
  }
);

// ============================================================
// LOGIN
// ============================================================

router.post(
  '/login',
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const body =
        (
          req.body ||
          {}
        ) as Record<
          string,
          unknown
        >;

      const {
        errors,
        email,
        password,
      } =
        validateLogin(
          body
        );

      if (
        errors.length > 0
      ) {
        res.status(400).json({
          success: false,
          errors,
        });

        return;
      }

      const twoFactorCode =
        body.twoFactorCode;

      const deviceId =
        body.deviceId;

      const deviceName =
        body.deviceName;

      const user =
        await User.findOne({
          email,
        })
          .select(
            '+password +passwordHistory +twoFactorSecret +twoFactorBackupCodes'
          )
          .exec();

      if (
        !user ||
        !(await user.comparePassword(
          password
        ))
      ) {
        if (user) {
          user.loginAttempts =
            (
              user.loginAttempts ||
              0
            ) + 1;

          if (
            user.loginAttempts >=
            MAX_LOGIN_ATTEMPTS
          ) {
            user.lockedUntil =
              new Date(
                Date.now() +
                  LOGIN_LOCK_MS
              );
          }

          await user.save();
        }

        res.status(401).json({
          success: false,
          message:
            'Invalid email or password',
        });

        return;
      }

      const now =
        new Date();

      if (
        user.lockedUntil &&
        user.lockedUntil > now
      ) {
        const remainingMinutes =
          Math.ceil(
            (
              user.lockedUntil.getTime() -
              now.getTime()
            ) /
              60000
          );

        res.status(423).json({
          success: false,
          message:
            `Account locked. Please try again in ${remainingMinutes} minutes.`,
        });

        return;
      }

      if (
        !user.isActive ||
        user.isBlocked
      ) {
        res.status(403).json({
          success: false,
          message:
            'Account is not active',
        });

        return;
      }

      if (
        user.isSuspended &&
        (
          !user.suspensionEndDate ||
          user.suspensionEndDate > now
        )
      ) {
        res.status(403).json({
          success: false,
          message:
            'Account is suspended',
        });

        return;
      }

      if (
        user.responsibleGambling
          ?.selfExcluded &&
        (
          !user.responsibleGambling
            .selfExclusionEndDate ||
          user.responsibleGambling
            .selfExclusionEndDate > now
        )
      ) {
        res.status(403).json({
          success: false,
          message:
            'Self-exclusion is currently active',
        });

        return;
      }

      if (
        user.twoFactorEnabled
      ) {
        if (
          !twoFactorCode
        ) {
          res.status(401).json({
            success: false,
            requiresTwoFactor:
              true,
            message:
              '2FA code required',
          });

          return;
        }

        const code =
          String(
            twoFactorCode
          );

        const validTotp =
          user.verifyTwoFactorToken(
            code
          );

        let validBackup =
          false;

        if (!validTotp) {
          validBackup =
            await user.verifyBackupCode(
              code
            );
        }

        if (
          !validTotp &&
          !validBackup
        ) {
          res.status(401).json({
            success: false,
            message:
              'Invalid 2FA code',
          });

          return;
        }
      }

      user.loginAttempts =
        0;

      user.lockedUntil =
        undefined;

      user.lastLogin =
        now;

      user.lastActive =
        now;

      user.lastLoginIP =
        req.ip;

      const sessionId =
        createSession(
          user,
          req,
          deviceId
            ? String(deviceId)
            : undefined,
          deviceName
            ? String(deviceName)
            : undefined
        );

      await user.save();

      const tokens =
        issueTokens(
          user,
          sessionId
        );

      await logSecurityEvent({
        userId:
          user._id,

        eventType:
          'user_login',

        ipAddress:
          req.ip,

        userAgent:
          req.get(
            'user-agent'
          ),

        metadata: {
          deviceId,
          deviceName,
          sessionId,
        },
      });

      res.json({
        success: true,

        message:
          `Welcome back to SHEBAODDS, ${user.username}!`,

        ...tokens,

        user:
          publicUser(user),
      });
    } catch (error) {
      console.error(
        'Login error:',
        error
      );

      res.status(500).json({
        success: false,
        message:
          'Login failed',
      });
    }
  }
);

// ============================================================
// REFRESH TOKEN
// ============================================================

router.post(
  '/refresh-token',
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const refreshToken =
        String(
          req.body?.refreshToken ??
            ''
        );

      if (!refreshToken) {
        res.status(401).json({
          success: false,
          message:
            'Refresh token required',
        });

        return;
      }

      const decoded =
        jwt.verify(
          refreshToken,
          getRefreshSecret()
        ) as TokenPayload;

      if (
        !decoded.userId ||
        !decoded.sessionId ||
        decoded.type !==
          'refresh'
      ) {
        res.status(401).json({
          success: false,
          message:
            'Invalid refresh token',
        });

        return;
      }

      const user =
        await User.findById(
          decoded.userId
        ).exec();

      if (
        !user ||
        !user.isActive ||
        user.isBlocked
      ) {
        res.status(401).json({
          success: false,
          message:
            'Invalid refresh token',
        });

        return;
      }

      const now =
        new Date();

      const session =
        user.sessions.find(
          (item) =>
            item.sessionId ===
              decoded.sessionId &&
            (
              !item.expiresAt ||
              item.expiresAt > now
            )
        );

      if (!session) {
        res.status(401).json({
          success: false,
          message:
            'Session expired or revoked',
        });

        return;
      }

      session.lastActivity =
        now;

      session.expiresAt =
        new Date(
          now.getTime() +
            SESSION_TTL_MS
        );

      user.lastActive =
        now;

      await user.save();

      const tokens =
        issueTokens(
          user,
          session.sessionId
        );

      res.json({
        success: true,
        ...tokens,
      });
    } catch (error) {
      console.error(
        'Refresh token error:',
        error
      );

      res.status(401).json({
        success: false,
        message:
          'Invalid refresh token',
      });
    }
  }
);

// ============================================================
// LOGOUT
// ============================================================

router.post(
  '/logout',
  authenticate,
  async (
    req: AuthRequest,
    res: Response
  ) => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message:
            'Unauthorized',
        });

        return;
      }

      const sessionId =
        String(
          req.body?.sessionId ??
            req.auth?.sessionId ??
            ''
        );

      if (sessionId) {
        req.user.sessions =
          req.user.sessions.filter(
            (session) =>
              session.sessionId !==
              sessionId
          );

        await req.user.save();
      }

      await logSecurityEvent({
        userId:
          req.user._id,

        eventType:
          'user_logout',

        ipAddress:
          req.ip,
      });

      res.json({
        success: true,
        message:
          'Logged out successfully',
      });
    } catch (error) {
      console.error(
        'Logout error:',
        error
      );

      res.status(500).json({
        success: false,
        message:
          'Logout failed',
      });
    }
  }
);

// ============================================================
// GET CURRENT USER
// ============================================================

router.get(
  '/me',
  authenticate,
  async (
    req: AuthRequest,
    res: Response
  ) => {
    res.json({
      success: true,
      user:
        req.user
          ? publicUser(
              req.user
            )
          : null,
    });
  }
);

// ============================================================
// UPDATE PROFILE
// ============================================================

router.put(
  '/profile',
  authenticate,
  async (
    req: AuthRequest,
    res: Response
  ) => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message:
            'Unauthorized',
        });

        return;
      }

      const user =
        req.user;

      const {
        fullName,
        phone,
        address,
        city,
        country,
        language,
        timezone,
        currency,
      } =
        req.body || {};

      if (
        fullName !==
        undefined
      ) {
        user.fullName =
          String(
            fullName
          ).trim();
      }

      if (
        phone !==
        undefined
      ) {
        const normalizedPhone =
          String(
            phone
          ).trim();

        if (
          !isValidPhone(
            normalizedPhone
          )
        ) {
          res.status(400).json({
            success: false,
            message:
              'Invalid phone number',
          });

          return;
        }

        const existing =
          await User.findOne({
            phone:
              normalizedPhone,

            _id: {
              $ne: user._id,
            },
          })
            .select('_id')
            .exec();

        if (existing) {
          res.status(409).json({
            success: false,
            message:
              'Phone number already in use',
          });

          return;
        }

        user.phone =
          normalizedPhone;
      }

      if (
        address !==
        undefined
      ) {
        user.address =
          String(
            address
          );
      }

      if (
        city !==
        undefined
      ) {
        user.city =
          String(
            city
          );
      }

      if (
        country !==
        undefined
      ) {
        user.country =
          String(
            country
          );
      }

      if (
        language !==
        undefined
      ) {
        user.language =
          String(
            language
          ) as typeof user.language;
      }

      if (
        timezone !==
        undefined
      ) {
        user.timezone =
          String(
            timezone
          );
      }

      if (
        currency !==
        undefined
      ) {
        user.currency =
          String(
            currency
          ) as typeof user.currency;
      }

      user.lastActive =
        new Date();

      await user.save();

      res.json({
        success: true,
        message:
          'Profile updated successfully',
        user:
          publicUser(user),
      });
    } catch (error) {
      console.error(
        'Profile update error:',
        error
      );

      const err =
        error as {
          code?: number;
        };

      if (
        err.code === 11000
      ) {
        res.status(409).json({
          success: false,
          message:
            'Phone number already in use',
        });

        return;
      }

      res.status(500).json({
        success: false,
        message:
          'Failed to update profile',
      });
    }
  }
);

// ============================================================
// CHANGE PASSWORD
// ============================================================

router.put(
  '/change-password',
  authenticate,
  async (
    req: AuthRequest,
    res: Response
  ) => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message:
            'Unauthorized',
        });

        return;
      }

      const currentPassword =
        String(
          req.body
            ?.currentPassword ??
            ''
        );

      const newPassword =
        String(
          req.body
            ?.newPassword ??
            ''
        );

      if (
        !currentPassword ||
        !newPassword
      ) {
        res.status(400).json({
          success: false,
          message:
            'Current and new passwords are required',
        });

        return;
      }

      const user =
        await User.findById(
          req.user._id
        )
          .select(
            '+password +passwordHistory'
          )
          .exec();

      if (
        !user ||
        !(await user.comparePassword(
          currentPassword
        ))
      ) {
        res.status(401).json({
          success: false,
          message:
            'Current password is incorrect',
        });

        return;
      }

      const passwordValidation =
        validatePasswordStrength(
          newPassword,
          user
        );

      if (
        !passwordValidation
          .isValid
      ) {
        res.status(400).json({
          success: false,
          message:
            'Password does not meet security requirements',
          errors:
            passwordValidation.errors,
          strength:
            passwordValidation.strength,
        });

        return;
      }

      const history =
        new PasswordHistory(
          user._id.toString(),
          user.passwordHistory ||
            []
        );

      const reused =
        await history.isPasswordReused(
          newPassword
        );

      const samePassword =
        await user.comparePassword(
          newPassword
        );

      if (
        reused ||
        samePassword
      ) {
        res.status(400).json({
          success: false,
          message:
            'You cannot reuse one of your recent passwords',
        });

        return;
      }

      user.password =
        newPassword;

      user.sessions =
        req.auth?.sessionId
          ? user.sessions.filter(
              (session) =>
                session.sessionId ===
                req.auth?.sessionId
            )
          : [];

      await user.save();

      await sendEmail({
        to: user.email,

        subject:
          'Password Changed',

        template:
          'password_changed',

        data: {
          username:
            user.username,
        },
      });

      res.json({
        success: true,
        message:
          'Password changed successfully',
      });
    } catch (error) {
      console.error(
        'Change password error:',
        error
      );

      res.status(500).json({
        success: false,
        message:
          'Failed to change password',
      });
    }
  }
);

// ============================================================
// FORGOT PASSWORD
// ============================================================

router.post(
  '/forgot-password',
  async (
    req: Request,
    res: Response
  ) => {
    const generic = {
      success: true,
      message:
        'If your email is registered, you will receive a reset link',
    };

    try {
      const email =
        normalizeEmail(
          req.body?.email
        );

      if (
        !isValidEmail(email)
      ) {
        res.json(
          generic
        );

        return;
      }

      const user =
        await User.findOne({
          email,
        }).exec();

      if (!user) {
        res.json(
          generic
        );

        return;
      }

      const rawToken =
        crypto
          .randomBytes(32)
          .toString('hex');

      user.resetPasswordToken =
        hashToken(
          rawToken
        );

      user.resetPasswordExpires =
        new Date(
          Date.now() +
            60 * 60 * 1000
        );

      await user.save();

      const baseUrl =
        process.env.BASE_URL ||
        'http://localhost:3000';

      const resetUrl =
        `${baseUrl.replace(
          /\/$/,
          ''
        )}/reset-password?token=${encodeURIComponent(
          rawToken
        )}`;

      await sendEmail({
        to: user.email,

        subject:
          'Reset Your SHEBAODDS Password',

        template:
          'reset_password',

        data: {
          username:
            user.username,

          resetUrl,

          tagline:
            'Smart Bets. Real Wins.',
        },
      });

      res.json(
        generic
      );
    } catch (error) {
      console.error(
        'Forgot password error:',
        error
      );

      res.json(
        generic
      );
    }
  }
);

// ============================================================
// RESET PASSWORD
// ============================================================

router.post(
  '/reset-password',
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const token =
        String(
          req.body?.token ??
            ''
        );

      const newPassword =
        String(
          req.body
            ?.newPassword ??
            ''
        );

      if (
        !token ||
        !newPassword
      ) {
        res.status(400).json({
          success: false,
          message:
            'Token and new password are required',
        });

        return;
      }

      const user =
        await User.findOne({
          resetPasswordToken:
            hashToken(
              token
            ),

          resetPasswordExpires:
            {
              $gt: new Date(),
            },
        })
          .select(
            '+password +passwordHistory'
          )
          .exec();

      if (!user) {
        res.status(400).json({
          success: false,
          message:
            'Invalid or expired reset token',
        });

        return;
      }

      const passwordValidation =
        validatePasswordStrength(
          newPassword,
          user
        );

      if (
        !passwordValidation
          .isValid
      ) {
        res.status(400).json({
          success: false,
          message:
            'Password does not meet security requirements',
          errors:
            passwordValidation.errors,
          strength:
            passwordValidation.strength,
        });

        return;
      }

      const history =
        new PasswordHistory(
          user._id.toString(),
          user.passwordHistory ||
            []
        );

      const reused =
        await history.isPasswordReused(
          newPassword
        );

      const samePassword =
        await user.comparePassword(
          newPassword
        );

      if (
        reused ||
        samePassword
      ) {
        res.status(400).json({
          success: false,
          message:
            'You cannot reuse one of your recent passwords',
        });

        return;
      }

      user.password =
        newPassword;

      user.resetPasswordToken =
        undefined;

      user.resetPasswordExpires =
        undefined;

      user.loginAttempts =
        0;

      user.lockedUntil =
        undefined;

      user.sessions =
        [];

      await user.save();

      res.json({
        success: true,
        message:
          'Password reset successfully',
      });
    } catch (error) {
      console.error(
        'Reset password error:',
        error
      );

      res.status(500).json({
        success: false,
        message:
          'Failed to reset password',
      });
    }
  }
);

// ============================================================
// 2FA SETUP
// ============================================================

router.post(
  '/2fa/setup',
  authenticate,
  async (
    req: AuthRequest,
    res: Response
  ) => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message:
            'Unauthorized',
        });

        return;
      }

      const user =
        req.user;

      if (
        user.twoFactorEnabled
      ) {
        res.status(400).json({
          success: false,
          message:
            '2FA is already enabled',
        });

        return;
      }

      const secret =
        user.generateTwoFactorSecret();

      const backupCodes =
        user.generateBackupCodes();

      await user.save();

      const otpauthUrl =
        speakeasy.otpauthURL({
          secret:
            secret.base32,

          label:
            `SHEBAODDS (${user.email})`,

          issuer:
            'SHEBAODDS',
        });

      const qrCode =
        await QRCode.toDataURL(
          otpauthUrl
        );

      res.json({
        success: true,

        secret:
          secret.base32,

        qrCode,

        backupCodes,
      });
    } catch (error) {
      console.error(
        '2FA setup error:',
        error
      );

      res.status(500).json({
        success: false,
        message:
          'Failed to setup 2FA',
      });
    }
  }
);

// ============================================================
// 2FA VERIFY
// ============================================================

router.post(
  '/2fa/verify',
  authenticate,
  async (
    req: AuthRequest,
    res: Response
  ) => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message:
            'Unauthorized',
        });

        return;
      }

      const token =
        String(
          req.body?.token ??
            ''
        );

      if (
        !req.user.verifyTwoFactorToken(
          token
        )
      ) {
        res.status(400).json({
          success: false,
          message:
            'Invalid 2FA code',
        });

        return;
      }

      req.user.twoFactorEnabled =
        true;

      await req.user.save();

      res.json({
        success: true,
        message:
          '2FA enabled successfully',
      });
    } catch (error) {
      console.error(
        '2FA verification error:',
        error
      );

      res.status(500).json({
        success: false,
        message:
          'Failed to verify 2FA',
      });
    }
  }
);

// ============================================================
// 2FA DISABLE
// ============================================================

router.post(
  '/2fa/disable',
  authenticate,
  async (
    req: AuthRequest,
    res: Response
  ) => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message:
            'Unauthorized',
        });

        return;
      }

      const token =
        String(
          req.body?.token ??
            ''
        );

      const validTotp =
        req.user.verifyTwoFactorToken(
          token
        );

      let validBackup =
        false;

      if (!validTotp) {
        validBackup =
          await req.user.verifyBackupCode(
            token
          );
      }

      if (
        !validTotp &&
        !validBackup
      ) {
        res.status(400).json({
          success: false,
          message:
            'Invalid 2FA code',
        });

        return;
      }

      req.user.twoFactorEnabled =
        false;

      req.user.twoFactorSecret =
        undefined;

      req.user.twoFactorBackupCodes =
        undefined;

      await req.user.save();

      res.json({
        success: true,
        message:
          '2FA disabled successfully',
      });
    } catch (error) {
      console.error(
        '2FA disable error:',
        error
      );

      res.status(500).json({
        success: false,
        message:
          'Failed to disable 2FA',
      });
    }
  }
);

// ============================================================
// VERIFY EMAIL
// ============================================================

router.get(
  '/verify-email/:token',
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const token =
        String(
          req.params.token ??
            ''
        );

      const tokenHash =
        hashToken(
          token
        );

      const user =
        await User.findOneAndUpdate(
          {
            emailVerificationToken:
              tokenHash,

            emailVerificationExpires:
              {
                $gt: new Date(),
              },

            emailVerified:
              false,
          },

          {
            $set: {
              emailVerified:
                true,
            },

            $unset: {
              emailVerificationToken:
                1,

              emailVerificationExpires:
                1,
            },

            $inc: {
              'wallet.balance':
                50,

              'wallet.bonusBalance':
                50,

              'wallet.totalBonusReceived':
                50,
            },
          },

          {
            new: true,
          }
        ).exec();

      if (!user) {
        res.status(400).json({
          success: false,
          message:
            'Invalid or expired verification token',
        });

        return;
      }

      res.json({
        success: true,
        message:
          'Email verified successfully! You received 50 ETB bonus.',
      });
    } catch (error) {
      console.error(
        'Email verification error:',
        error
      );

      res.status(500).json({
        success: false,
        message:
          'Failed to verify email',
      });
    }
  }
);

// ============================================================
// RESEND EMAIL VERIFICATION
// ============================================================

router.post(
  '/resend-verification',
  authenticate,
  async (
    req: AuthRequest,
    res: Response
  ) => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message:
            'Unauthorized',
        });

        return;
      }

      if (
        req.user.emailVerified
      ) {
        res.status(400).json({
          success: false,
          message:
            'Email already verified',
        });

        return;
      }

      const token =
        req.user.generateEmailVerificationToken();

      await req.user.save();

      const baseUrl =
        process.env.BASE_URL ||
        'http://localhost:3000';

      const verificationUrl =
        `${baseUrl.replace(
          /\/$/,
          ''
        )}/verify-email/${encodeURIComponent(
          token
        )}`;

      await sendEmail({
        to:
          req.user.email,

        subject:
          'Verify Your SHEBAODDS Email',

        template:
          'verify_email',

        data: {
          username:
            req.user.username,

          verificationUrl,

          tagline:
            'Smart Bets. Real Wins.',
        },
      });

      res.json({
        success: true,
        message:
          'Verification email sent',
      });
    } catch (error) {
      console.error(
        'Resend verification error:',
        error
      );

      res.status(500).json({
        success: false,
        message:
          'Failed to send verification email',
      });
    }
  }
);

// ============================================================
// EXPORT
// ============================================================

export default router;