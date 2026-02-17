import mongoose, { Schema, Document, Types } from 'mongoose';
import { DepartmentValue, DEPARTMENT } from '../constant';

export interface VerificationTeam extends Document {
  userId: Types.ObjectId;
  department: DepartmentValue;
  faculties: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const verificationTeamSchema = new Schema<VerificationTeam>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    department: {
      type: String,
      enum: DEPARTMENT.map((option) => option.value),
      required: true,
    },

    faculties: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Create index for faster queries
verificationTeamSchema.index({ userId: 1 });
verificationTeamSchema.index({ department: 1 });

export const VerificationTeam = mongoose.model<VerificationTeam>(
  'VerificationTeam',
  verificationTeamSchema
);
