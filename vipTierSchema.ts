import mongoose, { Schema, Document } from 'mongoose';

interface IVIPTier extends Document {
  userId: string;
  currentTier: 'Bronze' | 'Silver' | 'Gold' | 'Sheba_Black';
  prestigePoints: number;     // Accumulated via wagering volume
  unlockedPrivileges: string[];
  customAvatarBorderHex: string; // Used by frontend mobile apps to show status visually
}

const VIPTierSchema = new Schema<IVIPTier>({
  userId: { type: String, required: true, unique: true, index: true },
  currentTier: { type: String, enum: ['Bronze', 'Silver', 'Gold', 'Sheba_Black'], default: 'Bronze' },
  prestigePoints: { type: Number, default: 0 },
  unlockedPrivileges: [String],
  customAvatarBorderHex: { type: String, default: '#8B5CF6' } // Default sleek purple
}, { timestamps: true });

export const VIPTier = mongoose.model<IVIPTier>('VIPTier', VIPTierSchema);
