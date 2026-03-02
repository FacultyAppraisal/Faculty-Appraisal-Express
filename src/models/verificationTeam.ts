import mongoose, { Schema, Document } from 'mongoose';
import { DepartmentValue, DEPARTMENT } from '../constant';

export interface VerificationTeam extends Document {
  userId: string;
  department: DepartmentValue;
  faculties: string[];
  createdAt: Date;
  updatedAt: Date;
}

const verificationTeamSchema = new Schema<VerificationTeam>(
  {
    userId: {
      type: String,
      required: true,
    },

    department: {
      type: String,
      enum: DEPARTMENT.map((option) => option.value),
      required: true,
    },

    faculties: [
      {
        type: String,
        required: true,
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
