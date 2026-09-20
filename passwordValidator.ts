// ============================================
// SHEBAODDS - STRONG PASSWORD VALIDATION
// Enterprise-grade password requirements
// ============================================

import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';

// ==================== PASSWORD STRENGTH ====================

export const PASSWORD_STRENGTH = {
  WEAK: 'weak',
  FAIR: 'fair',
  GOOD: 'good',
  STRONG: 'strong',
  VERY_STRONG: 'very_strong'
} as const;

// ==================== PASSWORD RULES ====================

export const PASSWORD_RULES = {
  minLength: 8,
  maxLength: 128,

  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,

  preventCommonPasswords: true,
  preventPersonalInfo: true,
  preventSequentialChars: true,
  preventRepeatedChars: true,

  maxHistory: 5
};

// ==================== COMMON PASSWORDS ====================

export const COMMON_PASSWORDS = [
  'password',
  '12345678',
  'qwerty123',
  'admin123',
  'letmein123',
  'welcome123',
  'password123',
  'abc123456',
  'shebaodds',
  'ethiopia123',
  '123456789',
  '11111111',
  '00000000',
  'passw0rd',
  'admin@123'
];

// ==================== SPECIAL CHARACTERS ====================

export const SPECIAL_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

// ==================== USER INFO ====================

export interface UserInfo {
  username?: string;
  email?: string;
  fullName?: string;
  phone?: string;
}

// ==================== VALIDATION RESULT ====================

export interface ValidationResult {
  isValid: boolean;
  strength: string;
  score: number;

  errors: string[];
  warnings: string[];

  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumbers: boolean;
  hasSpecial: boolean;
  isLongEnough: boolean;
}

// ==================== VALIDATE PASSWORD ====================

export function validatePasswordStrength(
  password: string,
  userInfo: UserInfo = {}
): ValidationResult {

  const errors: string[] = [];
  const warnings: string[] = [];

  let strength: typeof PASSWORD_STRENGTH[keyof typeof PASSWORD_STRENGTH] = PASSWORD_STRENGTH.WEAK;
  let score = 0;

  // -----------------------------
  // Basic type validation
  // -----------------------------

  if (typeof password !== 'string') {
    return {
      isValid: false,
      strength: PASSWORD_STRENGTH.WEAK,
      score: 0,
      errors: ['Password must be a valid string'],
      warnings: [],
      hasUppercase: false,
      hasLowercase: false,
      hasNumbers: false,
      hasSpecial: false,
      isLongEnough: false
    };
  }

  // -----------------------------
  // Minimum length
  // -----------------------------

  if (password.length < PASSWORD_RULES.minLength) {
    errors.push(
      `Password must be at least ${PASSWORD_RULES.minLength} characters`
    );
  } else if (password.length >= 12) {
    score += 2;
  } else if (password.length >= 10) {
    score += 1;
  } else {
    score += 0.5;
  }

  // -----------------------------
  // Maximum length
  // -----------------------------

  if (password.length > PASSWORD_RULES.maxLength) {
    errors.push(
      `Password cannot exceed ${PASSWORD_RULES.maxLength} characters`
    );
  }

  // -----------------------------
  // Uppercase
  // -----------------------------

  const hasUppercase = /[A-Z]/.test(password);

  if (PASSWORD_RULES.requireUppercase && !hasUppercase) {
    errors.push(
      'Password must contain at least one uppercase letter'
    );
  } else if (hasUppercase) {
    score += 1;
  }

  // -----------------------------
  // Lowercase
  // -----------------------------

  const hasLowercase = /[a-z]/.test(password);

  if (PASSWORD_RULES.requireLowercase && !hasLowercase) {
    errors.push(
      'Password must contain at least one lowercase letter'
    );
  } else if (hasLowercase) {
    score += 1;
  }

  // -----------------------------
  // Numbers
  // -----------------------------

  const hasNumbers = /[0-9]/.test(password);

  if (PASSWORD_RULES.requireNumbers && !hasNumbers) {
    errors.push(
      'Password must contain at least one number'
    );
  } else if (hasNumbers) {
    score += 1;
  }

  // -----------------------------
  // Special characters
  // -----------------------------

  const escapedSpecialChars =
    SPECIAL_CHARS.replace(
      /[-\/\\^$*+?.()|[\]{}]/g,
      '\\$&'
    );

  const specialRegex = new RegExp(
    `[${escapedSpecialChars}]`
  );

  const hasSpecial = specialRegex.test(password);

  if (PASSWORD_RULES.requireSpecialChars && !hasSpecial) {
    errors.push(
      `Password must contain at least one special character (${SPECIAL_CHARS})`
    );
  } else if (hasSpecial) {
    score += 1.5;
  }

  // -----------------------------
  // Common passwords
  // -----------------------------

  if (PASSWORD_RULES.preventCommonPasswords) {

    const lowerPassword = password.toLowerCase();

    if (COMMON_PASSWORDS.includes(lowerPassword)) {
      errors.push(
        'This password is too common. Please choose a more secure password'
      );
    }
  }

  // -----------------------------
  // Sequential characters
  // -----------------------------

  if (PASSWORD_RULES.preventSequentialChars) {

    const sequentialPatterns = [
      'abcdefghijklmnopqrstuvwxyz',
      'qwertyuiop',
      'asdfghjkl',
      'zxcvbnm',
      '1234567890',
      '0123456789'
    ];

    let sequentialFound = false;

    for (const pattern of sequentialPatterns) {

      for (let i = 0; i <= password.length - 4; i++) {

        const substring =
          password.substring(i, i + 4).toLowerCase();

        if (pattern.includes(substring)) {
          sequentialFound = true;
          break;
        }
      }

      if (sequentialFound) {
        break;
      }
    }

    if (sequentialFound) {
      warnings.push(
        'Password contains sequential characters which makes it easier to guess'
      );
    }
  }

  // -----------------------------
  // Repeated characters
  // -----------------------------

  if (PASSWORD_RULES.preventRepeatedChars) {

    if (/(.)\1{3,}/.test(password)) {
      warnings.push(
        'Password contains repeated characters which makes it easier to guess'
      );
    }
  }

  // -----------------------------
  // Personal information
  // -----------------------------

  if (PASSWORD_RULES.preventPersonalInfo) {

    const personalInfo = [
      userInfo.username,
      userInfo.email?.split('@')[0],
      userInfo.fullName,
      userInfo.phone
    ]
      .filter(Boolean)
      .map(value => String(value).toLowerCase());

    const lowerPassword = password.toLowerCase();

    for (const info of personalInfo) {

      if (info && info.length >= 3) {

        if (lowerPassword.includes(info)) {

          errors.push(
            'Password should not contain personal information like username, email, or name'
          );

          break;
        }
      }
    }
  }

  // -----------------------------
  // Strength
  // -----------------------------

  if (score >= 6) {
    strength = PASSWORD_STRENGTH.VERY_STRONG;
  } else if (score >= 4.5) {
    strength = PASSWORD_STRENGTH.STRONG;
  } else if (score >= 3) {
    strength = PASSWORD_STRENGTH.GOOD;
  } else if (score >= 1.5) {
    strength = PASSWORD_STRENGTH.FAIR;
  } else {
    strength = PASSWORD_STRENGTH.WEAK;
  }

  return {
    isValid: errors.length === 0,
    strength,
    score,
    errors,
    warnings,

    hasUppercase,
    hasLowercase,
    hasNumbers,
    hasSpecial,

    isLongEnough:
      password.length >= PASSWORD_RULES.minLength
  };
}

// ==================== PASSWORD HISTORY ====================

export class PasswordHistory {

  userId: string;
  passwordHistory: string[];

  constructor(
    userId: string,
    passwordHistory: string[] = []
  ) {
    this.userId = userId;
    this.passwordHistory = passwordHistory;
  }

  async isPasswordReused(
    newPassword: string
  ): Promise<boolean> {

    if (
      !PASSWORD_RULES.maxHistory ||
      this.passwordHistory.length === 0
    ) {
      return false;
    }

    for (const oldHash of this.passwordHistory) {

      if (
        await bcrypt.compare(
          newPassword,
          oldHash
        )
      ) {
        return true;
      }
    }

    return false;
  }

  async addToHistory(
    newPasswordHash: string
  ): Promise<string[]> {

    this.passwordHistory.unshift(newPasswordHash);

    if (
      this.passwordHistory.length >
      PASSWORD_RULES.maxHistory
    ) {
      this.passwordHistory =
        this.passwordHistory.slice(
          0,
          PASSWORD_RULES.maxHistory
        );
    }

    return this.passwordHistory;
  }
}

// ==================== STRENGTH METER ====================

export function getPasswordStrengthMeter(
  strength: string
) {

  const meters: Record<string, any> = {

    [PASSWORD_STRENGTH.WEAK]: {
      label: 'Weak',
      labelAm: 'ደካማ',
      color: '#F44336',
      percentage: 20,
      suggestions: [
        'Use at least 8 characters',
        'Add uppercase letters',
        'Add numbers',
        'Add special characters'
      ]
    },

    [PASSWORD_STRENGTH.FAIR]: {
      label: 'Fair',
      labelAm: 'መጠነኛ',
      color: '#FF9800',
      percentage: 40,
      suggestions: [
        'Make it longer',
        'Add more variety of characters'
      ]
    },

    [PASSWORD_STRENGTH.GOOD]: {
      label: 'Good',
      labelAm: 'ጥሩ',
      color: '#2196F3',
      percentage: 60,
      suggestions: [
        'Add more special characters',
        'Make it longer for better security'
      ]
    },

    [PASSWORD_STRENGTH.STRONG]: {
      label: 'Strong',
      labelAm: 'ጠንካራ',
      color: '#4CAF50',
      percentage: 80,
      suggestions: []
    },

    [PASSWORD_STRENGTH.VERY_STRONG]: {
      label: 'Very Strong',
      labelAm: 'በጣም ጠንካራ',
      color: '#00E676',
      percentage: 100,
      suggestions: []
    }
  };

  return (
    meters[strength] ||
    meters[PASSWORD_STRENGTH.WEAK]
  );
}

// ==================== EXPRESS MIDDLEWARE ====================

export function validatePassword(
  req: Request,
  res: Response,
  next: NextFunction
) {

  const {
    password,
    username,
    email,
    fullName,
    phone
  } = req.body;

  if (!password) {
    return res.status(400).json({
      success: false,
      message: 'Password is required'
    });
  }

  const validation =
    validatePasswordStrength(
      password,
      {
        username,
        email,
        fullName,
        phone
      }
    );

  if (!validation.isValid) {

    return res.status(400).json({
      success: false,
      message:
        'Password does not meet security requirements',
      errors: validation.errors,
      warnings: validation.warnings,
      strength: validation.strength,
      score: validation.score
    });
  }

  (req as any).passwordWarnings =
    validation.warnings;

  (req as any).passwordStrength =
    validation.strength;

  next();
}